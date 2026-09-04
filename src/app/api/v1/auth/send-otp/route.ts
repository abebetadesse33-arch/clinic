import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { authVerificationCodes, systemAuthSettings, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createHash, randomInt } from "crypto";

export const dynamic = "force-dynamic";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * POST /api/v1/auth/send-otp
 * Generates and dispatches a 6-digit verification code via Email or SMS
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      identifier, // email (e.g. user@gmail.com) or phone (e.g. +251911234567)
      channel = "email", // "email" | "sms"
      purpose = "account_registration", // "account_registration" | "login_mfa" | "password_reset"
      fullName,
    } = body;

    if (!identifier || !identifier.trim()) {
      return NextResponse.json(
        { success: false, error: "Email address or phone number is required." },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const isEmail = cleanIdentifier.includes("@");
    const resolvedChannel = isEmail ? "email" : "sms";

    // 1. Fetch system auth settings
    const [settings] = await db.select().from(systemAuthSettings).limit(1);
    const requireEmail = settings ? settings.requireEmailVerification : true;
    const requireSms = settings ? settings.requireSmsVerification : false;
    const expiryMinutes = settings?.otpExpiryMinutes || 10;

    // 2. Check if admin has disabled verification for this channel
    if (resolvedChannel === "email" && !requireEmail) {
      return NextResponse.json({
        success: true,
        bypassed: true,
        message: "Email verification is currently disabled by administrator. Instant activation enabled.",
        channel: resolvedChannel,
      });
    }

    if (resolvedChannel === "sms" && !requireSms) {
      return NextResponse.json({
        success: true,
        bypassed: true,
        message: "SMS verification is currently disabled by administrator. Instant activation enabled.",
        channel: resolvedChannel,
      });
    }

    // 3. Generate secure 6-digit OTP code
    const rawCode = randomInt(100000, 999999).toString();
    const codeHash = sha256Hex(rawCode);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // 4. Invalidate any previous pending OTPs for this identifier and purpose
    await db
      .update(authVerificationCodes)
      .set({ status: "expired" })
      .where(
        and(
          eq(authVerificationCodes.identifier, cleanIdentifier),
          eq(authVerificationCodes.purpose, purpose),
          eq(authVerificationCodes.status, "pending")
        )
      );

    // 5. Store new OTP record
    const [insertedRecord] = await db
      .insert(authVerificationCodes)
      .values({
        identifier: cleanIdentifier,
        channel: resolvedChannel,
        codeHash,
        rawCode, // preserved in dev/sandbox for immediate testing
        purpose,
        status: "pending",
        attempts: 0,
        expiresAt,
        metadata: {
          requestedAt: new Date().toISOString(),
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          userAgent: req.headers.get("user-agent") || "NiniMed Client",
          fullName: fullName || null,
        },
      })
      .returning();

    // 6. Simulate / Dispatch notification
    console.log(
      `[NiniMed Auth] Dispatched ${resolvedChannel.toUpperCase()} OTP ${rawCode} to ${cleanIdentifier} (Valid for ${expiryMinutes} mins)`
    );

    const maskedIdentifier = isEmail
      ? cleanIdentifier.replace(/^(.{2})(.*)(@.*)$/, (_: string, a: string, b: string, c: string): string => `${a}${"*".repeat(Math.min(b.length, 5))}${c}`)
      : cleanIdentifier.replace(/^(\+?\d{3,4})(\d{3,4})(\d{3,4})$/, "$1-***-$3");

    return NextResponse.json({
      success: true,
      data: {
        codeId: insertedRecord.id,
        identifier: maskedIdentifier,
        channel: resolvedChannel,
        expiresInSeconds: expiryMinutes * 60,
        // In dev or sandbox mode, return code for instant copy/fill
        debugCode: process.env.NODE_ENV !== "production" || settings?.allowDemoBypass ? rawCode : undefined,
      },
      message: `A 6-digit verification code has been dispatched to ${maskedIdentifier}. Valid for ${expiryMinutes} minutes.`,
    });
  } catch (error: any) {
    console.error("Error generating OTP:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to send verification code." },
      { status: 500 }
    );
  }
}
