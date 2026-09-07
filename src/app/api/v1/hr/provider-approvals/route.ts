import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providerProfiles, providerSchedules, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/hr/provider-approvals
export async function GET(req: NextRequest) {
  try {
    const rawProfiles = await db
      .select({
        id: providerProfiles.id,
        userId: providerProfiles.userId,
        bio: providerProfiles.bio,
        specialties: providerProfiles.specialties,
        languages: providerProfiles.languages,
        licenseNumber: providerProfiles.licenseNumber,
        licenseIssuingBody: providerProfiles.licenseIssuingBody,
        licenseVerified: providerProfiles.licenseVerified,
        consultationFeeEtb: providerProfiles.consultationFeeEtb,
        approvalStatus: providerProfiles.approvalStatus,
        hrFeedback: providerProfiles.hrFeedback,
        metadata: providerProfiles.metadata,
        submittedAt: providerProfiles.submittedAt,
        approvedAt: providerProfiles.approvedAt,
        createdAt: providerProfiles.createdAt,
        updatedAt: providerProfiles.updatedAt,
        // Clinician user metadata
        providerName: users.fullName,
        providerEmail: users.email,
        providerRole: users.role,
        providerDept: users.department,
      })
      .from(providerProfiles)
      .leftJoin(users, eq(providerProfiles.userId, users.id))
      .orderBy(desc(providerProfiles.updatedAt));

    const enriched = await Promise.all(
      rawProfiles.map(async (p) => {
        const schedules = await db
          .select()
          .from(providerSchedules)
          .where(eq(providerSchedules.providerId, p.userId));
        return {
          ...p,
          schedules,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (error: any) {
    console.error("GET HR provider approvals error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch approvals" }, { status: 500 });
  }
}
