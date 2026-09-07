import { NextResponse } from "next/server";
import { db } from "@/db";
import { patientRegistrations, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone, firstName, lastName, invitedByUserId } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const inviteToken = `inv-${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36).substring(4)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    // Verify valid user id if provided for FK safety
    let validUserId: string | null = null;
    if (invitedByUserId) {
      const [userMatch] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, invitedByUserId))
        .limit(1);
      if (userMatch) validUserId = userMatch.id;
    }

    const [inserted] = await db
      .insert(patientRegistrations)
      .values({
        organizationId: DEFAULT_ORGANIZATION_ID,
        email: cleanEmail,
        phone: phone ? phone.trim() : null,
        status: "invited",
        verificationToken: inviteToken,
        verificationExpiresAt: expiresAt,
        submittedData: {
          firstName: firstName || "",
          lastName: lastName || "",
          email: cleanEmail,
          phone: phone || "",
        },
        invitedByUserId: validUserId,
      })
      .returning();

    const registrationUrl = `/register?token=${inviteToken}`;

    return NextResponse.json({
      success: true,
      data: {
        registrationId: inserted.id,
        inviteToken,
        registrationUrl,
        email: cleanEmail,
        expiresAt: inserted.verificationExpiresAt,
        message: `Invitation generated and saved to registry for ${cleanEmail}`,
      },
    });
  } catch (err: any) {
    console.error("[admin/patients/invite error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
