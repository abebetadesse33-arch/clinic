import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramIntegrations } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/telegram/webhook
 * Telegram Bot webhook — receives updates from Telegram servers.
 * Bot commands supported:
 *  /start <token>  → link user account
 *  /schedule       → today's appointments
 *  /queue          → live patient queue
 *  /status         → duty status
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId: number = message.chat.id;
    const text: string = message.text || "";
    const { sendTelegramMessage } = await import("@/lib/notifications/telegram-notifier");

    // ─── /start <token> ────────────────────────────────────────────────────────
    if (text.startsWith("/start ")) {
      const token = text.split(" ")[1];
      if (!token) {
        await sendTelegramMessage(chatId, "❌ Invalid link. Please generate a new connection link from your profile.");
        return NextResponse.json({ ok: true });
      }
      try {
        const decoded = JSON.parse(Buffer.from(token, "base64url").toString());
        if (!decoded.userId || decoded.exp < Date.now()) {
          await sendTelegramMessage(chatId, "⏱ This link has expired. Please generate a new one from your NiniMed profile.");
          return NextResponse.json({ ok: true });
        }
        // Upsert into telegram_integrations table
        await db
          .insert(telegramIntegrations)
          .values({
            userId: decoded.userId,
            telegramChatId: String(chatId),
            telegramUsername: message.from?.username || null,
            isNotificationsEnabled: true,
            linkedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: telegramIntegrations.userId,
            set: {
              telegramChatId: String(chatId),
              telegramUsername: message.from?.username || null,
              isNotificationsEnabled: true,
              linkedAt: new Date(),
            },
          });

        await sendTelegramMessage(
          chatId,
          `✅ *NiniMed account connected!*\n\nYou'll now receive real-time alerts here based on your role and notification preferences.\n\nCommands:\n/schedule – Today's appointments\n/queue – Live patient queue\n/status – Your on-duty status`,
          { parse_mode: "Markdown" }
        );
      } catch {
        await sendTelegramMessage(chatId, "❌ Could not decode connection token. Please try generating a fresh link.");
      }
      return NextResponse.json({ ok: true });
    }

    // ─── /schedule ─────────────────────────────────────────────────────────────
    if (text === "/schedule") {
      await sendTelegramMessage(
        chatId,
        "📅 *Today's Appointments*\n\nPlease log in to your NiniMed dashboard to see your full schedule:\nhttps://clinic.nimined.com/provider/schedule",
        { parse_mode: "Markdown" }
      );
      return NextResponse.json({ ok: true });
    }

    // ─── /queue ────────────────────────────────────────────────────────────────
    if (text === "/queue") {
      await sendTelegramMessage(
        chatId,
        "🚶 *Live Patient Queue*\n\nView the live queue on your dashboard:\nhttps://clinic.nimined.com/provider",
        { parse_mode: "Markdown" }
      );
      return NextResponse.json({ ok: true });
    }

    // ─── /status ───────────────────────────────────────────────────────────────
    if (text === "/status") {
      await sendTelegramMessage(
        chatId,
        "⚡ Your on-duty status can be updated from the NiniMed dashboard header.",
        {}
      );
      return NextResponse.json({ ok: true });
    }

    // ─── Default echo ──────────────────────────────────────────────────────────
    await sendTelegramMessage(
      chatId,
      "👋 Welcome to *NiniMed Bot*. Use /start <token> from your profile to link your account.",
      { parse_mode: "Markdown" }
    );
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
