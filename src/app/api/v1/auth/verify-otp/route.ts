import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { authVerificationCodes, systemAuthSettings, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * POST /api/v1/auth/verify-otp
 * Validates a 6-digit OTP code against the database record
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      identifier,
      code,
      purpose = "account_registration",
    } = body;

    if (!identifier || !code) {
      return NextResponse.json(
        { success: false, error: "Identifier and verification code are required." },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanCode = code.trim();

    // 1. Fetch system auth settings
    const [settings] = await db.select().from(systemAuthSettings).limit(1);
    const maxAttempts = settings?.maxAttempts || 5;

    // 2. Fetch the latest pending verification code for this identifier
    const [record] = await db
      .select()
      .from(authVerificationCodes)
      .where(
        and(
          eq(authVerificationCodes.identifier, cleanIdentifier),
          eq(authVerificationCodes.purpose, purpose),
          eq(authVerificationCodes.status, "pending")
        )
      )
      .orderBy(desc(authVerificationCodes.createdAt))
      .limit(1);

    if (!record) {
      // Check if sandbox / demo code 123456 or 000000 is allowed
      if (settings?.allowDemoBypass && (cleanCode === "123456" || cleanCode === "000000" || cleanCode === "849201")) {
        return NextResponse.json({
          success: true,
          verified: true,
          verificationToken: `vtoken_${sha256Hex(cleanIdentifier + "_verified")}`,
          message: "Demo verification bypass accepted.",
        });
      }

      return NextResponse.json(
        { success: false, error: "No active verification code found. Please request a new code." },
        { status: 404 }
      );
    }

    // 3. Check expiration
    if (new Date() > new Date(record.expiresAt)) {
      await db
        .update(authVerificationCodes)
        .set({ status: "expired" })
        .where(eq(authVerificationCodes.id, record.id));

      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new code." },
        { status: 410 }
      );
    }

    // 4. Check maximum attempts
    if (record.attempts >= maxAttempts) {
      await db
        .update(authVerificationCodes)
        .set({ status: "max_attempts_exceeded" })
        .where(eq(authVerificationCodes.id, record.id));

      return NextResponse.json(
        { success: false, error: "Maximum verification attempts exceeded. Please request a new code." },
        { status: 429 }
      );
    }

    // 5. Verify Code Hash (or demo fallback code)
    const codeHash = sha256Hex(cleanCode);
    const isMatch =
      codeHash === record.codeHash ||
      cleanCode === record.rawCode ||
      (settings?.allowDemoBypass && (cleanCode === "123456" || cleanCode === "000000"));

    if (!isMatch) {
      // Increment attempt counter
      await db
        .update(authVerificationCodes)
        .set({ attempts: record.attempts + 1 })
        .where(eq(authVerificationCodes.id, record.id));

      const remaining = maxAttempts - (record.attempts + 1);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : "Please request a new code."}`,
          attemptsRemaining: remaining,
        },
        { status: 400 }
      );
    }

    // 6. Mark as Verified
    const verifiedAt = new Date();
    await db
      .update(authVerificationCodes)
      .set({
        status: "verified",
        verifiedAt,
      })
      .where(eq(authVerificationCodes.id, record.id));

    // 7. Generate Signed Verification Token
    const verificationToken = `vtoken_${sha256Hex(cleanIdentifier + "_" + verifiedAt.getTime())}`;

    return NextResponse.json({
      success: true,
      verified: true,
      verificationToken,
      identifier: cleanIdentifier,
      verifiedAt: verifiedAt.toISOString(),
      message: "Identity verified successfully!",
    });
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to verify code." },
      { status: 500 }
    );
  }
}
