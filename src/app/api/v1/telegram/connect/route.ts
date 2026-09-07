import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/telegram/connect
 * Generates a time-limited magic token for linking the user's Telegram account.
 * The token is embedded in a t.me deep link returned to the client.
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUserId = req.cookies.get("Nini_session")?.value;
    if (!sessionUserId || sessionUserId.length !== 36) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select({ id: users.id, fullName: users.fullName, role: users.role })
      .from(users)
      .where(eq(users.id, sessionUserId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Create a short-lived token (1 hour) — in production store in Redis/DB
    const token = Buffer.from(
      JSON.stringify({ userId: user.id, exp: Date.now() + 3600_000 })
    ).toString("base64url");

    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "NiniMedClinicBot";
    const deepLink = `https://t.me/${botUsername}?start=${token}`;

    return NextResponse.json({
      success: true,
      data: { deepLink, token, botUsername },
    });
  } catch (error: any) {
    console.error("Telegram connect error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
