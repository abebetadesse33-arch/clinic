import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemAuthSettings, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/auth-settings
 * Returns current verification requirements and security settings
 */
export async function GET(req: NextRequest) {
  try {
    const [settings] = await db.select().from(systemAuthSettings).limit(1);

    if (!settings) {
      return NextResponse.json({
        success: true,
        data: {
          requireEmailVerification: true,
          requireSmsVerification: false,
          enableTwoFactorLogin: false,
          allowDemoBypass: true,
          smsGatewayProvider: "simulator",
          otpExpiryMinutes: 10,
          maxAttempts: 5,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load auth settings." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/admin/auth-settings
 * Allows Admins to enable/disable Email Verification, SMS Verification, and 2FA
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminId, ...updates } = body;

    const allowedFields = [
      "requireEmailVerification",
      "requireSmsVerification",
      "enableTwoFactorLogin",
      "twoFactorTargetRoles",
      "requireNationalIdVerification",
      "allowDemoBypass",
      "smsGatewayProvider",
      "otpExpiryMinutes",
      "maxAttempts",
      "lockoutDurationMinutes",
    ];

    const sanitized: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in updates) sanitized[key] = updates[key];
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid settings provided to update." },
        { status: 400 }
      );
    }

    sanitized.updatedAt = new Date();

    const [existing] = await db.select().from(systemAuthSettings).limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(systemAuthSettings)
        .set(sanitized)
        .where(eq(systemAuthSettings.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(systemAuthSettings)
        .values({
          id: "00000000-0000-0000-0000-000000000001",
          requireEmailVerification: true,
          requireSmsVerification: false,
          enableTwoFactorLogin: false,
          allowDemoBypass: true,
          smsGatewayProvider: "simulator",
          otpExpiryMinutes: 10,
          maxAttempts: 5,
          ...sanitized,
        })
        .returning();
    }

    // Log admin audit trail
    try {
      await db.insert(auditLogs).values({
        tenantId: "00000000-0000-0000-0000-000000000001",
        userId: adminId || null,
        action: "AUTH_VERIFICATION_SETTINGS_UPDATED",
        entityType: "system_auth_settings",
        entityId: result.id,
        summary: `Admin updated account verification settings: Email=${result.requireEmailVerification}, SMS=${result.requireSmsVerification}, 2FA=${result.enableTwoFactorLogin}`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: result,
      message: "Account creation verification settings updated successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update settings." },
      { status: 500 }
    );
  }
}
