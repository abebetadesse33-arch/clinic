import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getAuthenticatedSessionUser } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getAuthenticatedSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: a valid authenticated session is required." },
        { status: 401 },
      );
    }

    const clinicianRoles = [
      "physician",
      "nurse_practitioner",
      "physiotherapist",
      "dietitian",
      "psychologist",
      "social_worker",
      "pharmacist",
      "radiologist",
      "system_admin",
    ];

    const clinicians = await db
      .select({
        id: users.id,
        name: users.fullName,
        role: users.role,
        department: users.department,
        avatarUrl: users.avatarUrl,
        email: users.email,
        phone: users.phone,
      })
      .from(users)
      .where(and(
        inArray(users.role, clinicianRoles as any),
        eq(users.organizationId, sessionUser.organizationId),
        eq(users.isActive, true),
      ));

    const shaped = clinicians.map((c) => {
      const providerName = c.name || "Clinical Provider";
      const initials = providerName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);

      const titleMap: Record<string, string> = {
        physician: "Attending Physician, MD",
        nurse_practitioner: "Family Nurse Practitioner, DNP",
        physiotherapist: "Doctor of Physical Therapy, DPT",
        dietitian: "Registered Dietitian & Nutritionist, RD",
        psychologist: "Clinical Psychologist, PsyD",
        social_worker: "Licensed Clinical Social Worker, LCSW",
        pharmacist: "Clinical Pharmacist, PharmD",
        radiologist: "Diagnostic Radiologist, MD",
        system_admin: "Chief Medical Officer & Lead Clinical Director",
      };

      return {
        id: c.id,
        name: providerName,
        role: c.role,
        title: titleMap[c.role] || "Clinical Specialist",
        specialty: c.department || "Primary Healthcare & Multidisciplinary Medicine",
        location: "NiniMed Pavilion & Virtual Video Room",
        initials: initials || "DR",
        rating: 4.95,
        reviewsCount: 120,
      };
    });

    return NextResponse.json({
      success: true,
      data: shaped,
    });
  } catch (error: any) {
    console.error("Error fetching providers:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load clinicians right now." },
      { status: 500 },
    );
  }
}
