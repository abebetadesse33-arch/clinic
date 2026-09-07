import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificationPrivileges, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const SYSTEM_ROLES = [
  "physician",
  "nurse",
  "pharmacist",
  "lab_technician",
  "physiotherapist",
  "dietitian",
  "patient",
  "billing",
  "triage_staff",
  "system_admin",
];

export const NOTIFICATION_CATEGORIES = [
  { id: "appointments", label: "Appointments & Treat Me Now", description: "Booking, cancellation, waitlist tokens, telehealth queues" },
  { id: "orders", label: "Clinical Orders & Diagnostics", description: "Laboratory requests, e-prescriptions, ward referrals, imaging" },
  { id: "billing", label: "Payments & Invoicing", description: "Waiting payments, invoice creation, payment confirmations & receipts" },
  { id: "clinical_alerts", label: "Clinical Safety & PGx Alerts", description: "Critical lab flags, drug-drug interactions, CYP2C19 warnings" },
  { id: "auth_shifts", label: "Staff Shifts & Role Assignments", description: "Clinician sign-in/out, role switching, security authentications" },
  { id: "system", label: "System & Infrastructure", description: "Platform notices, compliance audits, maintenance announcements" },
];

// GET /api/v1/notifications/privileges
export async function GET(req: NextRequest) {
  try {
    const existing = await db.select().from(notificationPrivileges);

    // Build complete matrix, filling in defaults if not yet in DB
    const matrix: Record<string, Record<string, { isEnabled: boolean; channels: { inApp: boolean; telegram: boolean } }>> = {};

    for (const r of SYSTEM_ROLES) {
      matrix[r] = {};
      for (const cat of NOTIFICATION_CATEGORIES) {
        const found = existing.find((p) => p.role === r && p.category === cat.id);
        if (found) {
          matrix[r][cat.id] = {
            isEnabled: found.isEnabled,
            channels: (found.channels as any) || { inApp: true, telegram: true },
          };
        } else {
          // Defaults: enabled by default for respective roles
          matrix[r][cat.id] = {
            isEnabled: true,
            channels: { inApp: true, telegram: true },
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        roles: SYSTEM_ROLES,
        categories: NOTIFICATION_CATEGORIES,
        matrix,
      },
    });
  } catch (error: any) {
    console.error("GET notification privileges error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/v1/notifications/privileges - Admin updates a specific privilege
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, category, isEnabled, channels } = body;

    if (!role || !category || typeof isEnabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "role, category, and isEnabled are required" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(notificationPrivileges)
      .where(and(eq(notificationPrivileges.role, role), eq(notificationPrivileges.category, category)))
      .limit(1);

    if (existing) {
      await db
        .update(notificationPrivileges)
        .set({
          isEnabled,
          channels: channels || existing.channels,
          updatedAt: new Date(),
        })
        .where(eq(notificationPrivileges.id, existing.id));
    } else {
      await db.insert(notificationPrivileges).values({
        role,
        category,
        isEnabled,
        channels: channels || { inApp: true, telegram: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: { role, category, isEnabled, channels: channels || { inApp: true, telegram: true } },
    });
  } catch (error: any) {
    console.error("PUT notification privileges error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
