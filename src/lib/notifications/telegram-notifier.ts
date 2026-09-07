/**
 * Telegram Bot Notification Engine
 * Transmits real-time clinical, triage, order, and billing alerts directly to Telegram users.
 */

export interface TelegramNotificationPayload {
  chatId: string;
  title: string;
  body: string;
  priority?: "low" | "normal" | "high" | "critical";
  actionUrl?: string;
  actionText?: string;
}

export async function sendTelegramNotification(payload: TelegramNotificationPayload): Promise<{
  success: boolean;
  messageId?: number;
  error?: string;
}> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Format priority header emoji
  const priorityHeader =
    payload.priority === "critical"
      ? "🚨 *CRITICAL MEDICAL ALERT*"
      : payload.priority === "high"
      ? "⚠️ *HIGH PRIORITY CLINICAL ACTION*"
      : payload.priority === "low"
      ? "ℹ️ *NiniMed Notice*"
      : "📋 *NiniMed Healthcare Notification*";

  // Build resolved action URL
  let fullActionUrl = payload.actionUrl;
  if (fullActionUrl && fullActionUrl.startsWith("/")) {
    fullActionUrl = `${baseUrl}${fullActionUrl}`;
  }

  const messageText = [
    priorityHeader,
    "",
    `*${escapeMarkdown(payload.title)}*`,
    "",
    escapeMarkdown(payload.body),
    "",
    `🕒 _${new Date().toLocaleTimeString()} • NiniMed CDSS System_`,
  ].join("\n");

  // If no bot token configured, simulate successfully and log
  if (!token) {
    console.log(
      `[TelegramNotifier Simulated] Chat: ${payload.chatId} | ${payload.title} -> ${payload.actionUrl || "No Link"}`
    );
    return { success: true, messageId: Math.floor(Math.random() * 100000) };
  }

  try {
    const bodyObj: Record<string, any> = {
      chat_id: payload.chatId,
      text: messageText,
      parse_mode: "Markdown",
    };

    if (fullActionUrl) {
      bodyObj.reply_markup = {
        inline_keyboard: [
          [
            {
              text: `⚡ ${payload.actionText || "Open & Act in Portal"}`,
              url: fullActionUrl,
            },
          ],
        ],
      };
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj),
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true, messageId: data.result?.message_id };
    } else {
      console.warn("[TelegramNotifier] Telegram API error:", data.description);
      return { success: false, error: data.description };
    }
  } catch (err: any) {
    console.error("[TelegramNotifier] Network exception:", err.message);
    return { success: false, error: err.message };
  }
}

// Escape special Markdown characters for Telegram V1
function escapeMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/\[/g, "\\[")
    .replace(/`/g, "\\`");
}

/**
 * Simple low-level bot reply — used by the webhook handler.
 * @param chatId  Telegram chat / user ID
 * @param text    Message text (Markdown supported)
 * @param opts    Additional sendMessage options (e.g. { parse_mode: "Markdown" })
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  opts: Record<string, any> = {}
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log(`[TelegramBot Simulated] To ${chatId}: ${text.slice(0, 80)}`);
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, ...opts }),
    });
  } catch (e: any) {
    console.error("[TelegramBot] sendMessage error:", e.message);
  }
}
