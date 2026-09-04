import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providerProfiles, providerSchedules, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/provider/profile/me?userId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // If no userId passed, grab first physician / user or default
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const [u] = await db
        .select({ id: users.id, name: users.fullName, role: users.role, dept: users.department })
        .from(users)
        .where(eq(users.role, "physician"))
        .limit(1);
      resolvedUserId = u?.id || "00000000-0000-0000-0000-000000000001";
    }

    const [profile] = await db
      .select()
      .from(providerProfiles)
      .where(eq(providerProfiles.userId, resolvedUserId))
      .limit(1);

    const schedules = await db
      .select()
      .from(providerSchedules)
      .where(eq(providerSchedules.providerId, resolvedUserId));

    const [user] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        department: users.department,
      })
      .from(users)
      .where(eq(users.id, resolvedUserId))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        user,
        profile: profile || {
          id: null,
          userId: resolvedUserId,
          bio: "Dedicated healthcare clinician focused on holistic care, rapid diagnostics, and preventative wellness.",
          specialties: ["Internal Medicine", "Preventative Care"],
          languages: ["English", "Amharic"],
          licenseNumber: "MD-782914",
          licenseIssuingBody: "Federal Ministry of Health & Medical Board",
          licenseVerified: true,
          consultationFeeEtb: "500.00",
          approvalStatus: "approved",
          hrFeedback: null,
          metadata: {
            academicTitle: "MD, FACP",
            yearsOfExperience: 9,
            medicalSchool: "Addis Ababa University School of Medicine",
            residencyFellowship: "Tikur Anbessa Specialized Hospital / St. Paul's",
            licenseExpiryDate: "2028-12-31",
            npiNumber: "ETH-MED-84920",
            hospitalAffiliations: "NiniMed Debre Birhan Center, Tikur Anbessa Hospital",
            boardCertifications: "Ethiopian Medical Association Board Certified in Internal Medicine",
            clinicalInterests: "Preventative Cardiology, Type 2 Diabetes Remission, Tele-Triage",
            followUpGracePeriodDays: 7,
            acceptedInsurances: ["Ethiopian Community Health Insurance (CBHI)", "MedNet Global", "Jubilee Life", "Self-Pay Direct"],
            cancellationPolicyNotice: "Free cancellation & full reschedule flexibility up to 2 hours prior to start time.",
            currency: "ETB",
            clinicalServices: [
              { id: "telehealth_consult", name: "Virtual Video Consultation", durationMinutes: 30, feeEtb: 500, isActive: true },
              { id: "in_person_exam", name: "Comprehensive In-Person Physical Exam", durationMinutes: 45, feeEtb: 750, isActive: true },
              { id: "urgent_triage", name: "Rapid Urgent Triage & Follow-up", durationMinutes: 15, feeEtb: 350, isActive: true },
              { id: "second_opinion", name: "Specialist Second Opinion & Lab Review", durationMinutes: 60, feeEtb: 1200, isActive: true },
              { id: "chronic_care", name: "Chronic Care Plan & Prescription Renewal", durationMinutes: 20, feeEtb: 400, isActive: true },
              { id: "emergency_telehealth", name: "Emergency / Off-Hours Virtual Consultation", durationMinutes: 30, feeEtb: 900, isActive: true },
            ],
          },
        },
        schedules: schedules.length > 0 ? schedules : [
          { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isTelehealthAvailable: true, isInPersonAvailable: true, isActive: true },
          { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isTelehealthAvailable: true, isInPersonAvailable: true, isActive: true },
          { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isTelehealthAvailable: true, isInPersonAvailable: true, isActive: true },
          { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isTelehealthAvailable: true, isInPersonAvailable: true, isActive: true },
          { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isTelehealthAvailable: true, isInPersonAvailable: true, isActive: true },
        ],
      },
    });
  } catch (error: any) {
    console.error("GET provider profile error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch profile" }, { status: 500 });
  }
}

// PUT /api/v1/provider/profile/me
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      bio,
      specialties,
      languages,
      licenseNumber,
      licenseIssuingBody,
      consultationFeeEtb,
      metadata,
      schedules,
    } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    // 1. Upsert Profile
    const [existing] = await db
      .select()
      .from(providerProfiles)
      .where(eq(providerProfiles.userId, userId))
      .limit(1);

    let savedProfile;
    if (existing) {
      [savedProfile] = await db
        .update(providerProfiles)
        .set({
          bio,
          specialties,
          languages,
          licenseNumber,
          licenseIssuingBody,
          consultationFeeEtb: String(consultationFeeEtb || "500"),
          metadata: metadata || existing.metadata,
          approvalStatus: "draft", // Stays in draft until submitted for HR approval
          updatedAt: new Date(),
        })
        .where(eq(providerProfiles.id, existing.id))
        .returning();
    } else {
      [savedProfile] = await db
        .insert(providerProfiles)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          userId,
          bio,
          specialties: specialties || ["General Medicine"],
          languages: languages || ["English", "Amharic"],
          licenseNumber,
          licenseIssuingBody,
          consultationFeeEtb: String(consultationFeeEtb || "500"),
          metadata: metadata || {},
          approvalStatus: "draft",
        })
        .returning();
    }

    // 2. Upsert Schedules
    if (Array.isArray(schedules) && schedules.length > 0) {
      await db.delete(providerSchedules).where(eq(providerSchedules.providerId, userId));
      for (const s of schedules) {
        await db.insert(providerSchedules).values({
          providerId: userId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime || "09:00",
          endTime: s.endTime || "17:00",
          slotDurationMinutes: s.slotDurationMinutes || 30,
          isTelehealthAvailable: s.isTelehealthAvailable ?? true,
          isInPersonAvailable: s.isInPersonAvailable ?? true,
          isApprovedByHr: false,
          isActive: s.isActive ?? true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Profile and schedule saved in draft mode.",
      data: { profile: savedProfile },
    });
  } catch (error: any) {
    console.error("PUT provider profile error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update profile" }, { status: 500 });
  }
}
