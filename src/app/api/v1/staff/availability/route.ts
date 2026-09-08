import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, queueEntries } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || DEFAULT_TENANT_ID;

    // Fetch active healthcare professionals
    const activeStaff = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        role: users.role,
        department: users.department,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(
        and(
          eq(users.organizationId, tenantId),
          eq(users.isActive, true),
          inArray(users.role, [
            "physician",
            "nurse_practitioner",
            "nurse",
            "pharmacist",
            "lab_technician",
            "radiologist",
            "physiotherapist",
          ])
        )
      )
      .limit(16);

    // Fetch active queue count to approximate load
    const waitingCounts = await db
      .select({
        providerId: queueEntries.providerId,
      })
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.tenantId, tenantId),
          inArray(queueEntries.status, ["waiting", "called"])
        )
      );

    const countsByProvider = new Map<string, number>();
    for (const entry of waitingCounts) {
      if (entry.providerId) {
        countsByProvider.set(
          entry.providerId,
          (countsByProvider.get(entry.providerId) || 0) + 1
        );
      }
    }

    const formatted = activeStaff.map((staff, idx) => {
      const waitCount = countsByProvider.get(staff.id) || 0;
      const isBusy = idx % 2 === 0;
      return {
        id: staff.id,
        name: staff.fullName,
        role: staff.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        department: staff.department || "Clinical Department",
        status: isBusy ? "Busy" : "Available",
        statusColor: isBusy ? "amber" : "emerald",
        avatarUrl: staff.avatarUrl,
        waitingPatients: waitCount,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        staff: formatted,
        total: formatted.length,
      },
    });
  } catch (error: any) {
    console.error("[STAFF AVAILABILITY ERROR]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch staff availability" },
      { status: 500 }
    );
  }
}
