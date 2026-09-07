import { NextResponse } from "next/server";
import { db } from "@/db";
import { patientRegistrations } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ success: false, error: "Registration token is required" }, { status: 400 });
  }

  try {
    // 1. Lookup active registration token from database
    const [reg] = await db
      .select()
      .from(patientRegistrations)
      .where(eq(patientRegistrations.verificationToken, token))
      .limit(1);

    if (reg) {
      const isExpired = reg.verificationExpiresAt && new Date(reg.verificationExpiresAt) < new Date();
      if (isExpired) {
        return NextResponse.json(
          { success: false, error: "This registration invitation link has expired. Please request a new invitation." },
          { status: 410 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          id: reg.id,
          email: reg.email,
          phone: reg.phone,
          status: reg.status,
          submittedData: reg.submittedData || {},
          expiresAt: reg.verificationExpiresAt,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: "Invitation token not found. Please verify the invitation link or register as a new patient.",
    }, { status: 404 });
  } catch (err: any) {
    console.error("[public/register/[token] error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to retrieve registration data" }, { status: 500 });
  }
}
