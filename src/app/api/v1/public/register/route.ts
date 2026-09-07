import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

let registrationsStore: Record<string, any> = {};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone, firstName, lastName } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    // Generate a 6-digit OTP token
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const regId = `reg-${Date.now()}`;

    const newReg = {
      id: regId,
      organizationId: "00000000-0000-0000-0000-000000000001",
      email,
      phone,
      status: "started",
      verificationToken: otp,
      verificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      submittedData: {
        firstName,
        lastName,
        email,
        phone,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    registrationsStore[regId] = newReg;

    return NextResponse.json({
      success: true,
      data: {
        registrationId: regId,
        email,
        expiresInSeconds: 900,
        // In local development/demo environment, include token for testing
        verificationToken: otp,
      },
      message: `Verification code sent to ${email}`,
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id || !registrationsStore[id]) {
    return NextResponse.json({ success: false, error: "Registration session not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: registrationsStore[id],
  });
}
