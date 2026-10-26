import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { authVerificationCodes, systemAuthSettings, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { enforceRateLimit, clientIp } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Demo codes are a development convenience only; they must never work in production. */
const DEMO_CODES_ALLOWED = process.env.NODE_ENV !== "production";

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

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const cleanCode = String(code).trim();

    const limited = enforceRateLimit("verify-otp", [
      { key: `ip:${clientIp(req)}`, limit: 20, windowMs: 15 * 60 * 1000 },
      { key: `id:${cleanIdentifier}`, limit: 10, windowMs: 15 * 60 * 1000 },
    ]);
    if (limited) return limited;

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
      if (DEMO_CODES_ALLOWED && settings?.allowDemoBypass && (cleanCode === "123456" || cleanCode === "000000" || cleanCode === "849201")) {
        return NextResponse.json({
          success: true,
          verified: true,
          verificationToken: `vtoken_demo_${sha256Hex(cleanIdentifier + "_verified")}`,
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
      (DEMO_CODES_ALLOWED && settings?.allowDemoBypass && (cleanCode === "123456" || cleanCode === "000000"));

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
    // 7. Issue an unguessable one-time token; only its hash is stored, and signup redeems it.
    const verificationToken = `vtoken_${randomBytes(24).toString("hex")}`;
    await db
      .update(authVerificationCodes)
      .set({
        status: "verified",
        verifiedAt,
        metadata: { ...((record.metadata as object) || {}), tokenHash: sha256Hex(verificationToken) },
      })
      .where(eq(authVerificationCodes.id, record.id));

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
