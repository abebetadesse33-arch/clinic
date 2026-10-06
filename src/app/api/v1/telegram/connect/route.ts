import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";
import { getTelegramBotInfo } from "@/lib/notifications/telegram-notifier";
import { createLinkToken, getBotToken } from "@/lib/notifications/telegram-security";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/telegram/connect
 * Generates a time-limited magic token for linking the user's Telegram account.
 * The token is embedded in a t.me deep link returned to the client.
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUserId = await getAuthenticatedSessionUserId(req);
    if (!sessionUserId) {
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

    if (!getBotToken()) {
      return NextResponse.json(
        { success: false, error: "The Telegram bot is not configured on the server (TELEGRAM_BOT_TOKEN is missing)." },
        { status: 503 }
      );
    }

    // Signed, 1-hour, 45-char token (Telegram drops /start payloads over 64 chars).
    const token = createLinkToken(user.id);
    if (!token) {
      return NextResponse.json({ success: false, error: "Could not issue a link token for this account." }, { status: 500 });
    }

    // Ask Telegram who the bot actually is rather than trusting a hand-set env
    // var: a wrong username here produces a link that opens a stranger's bot.
    const botInfo = await getTelegramBotInfo();
    const botUsername = botInfo.botUsername || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "Ninimedbot";
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
