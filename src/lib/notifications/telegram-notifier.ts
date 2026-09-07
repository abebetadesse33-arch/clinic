/**
 * Telegram Bot Notification Engine — High-Efficiency Enterprise Edition
 * 
 * Features:
 * - High-throughput controlled parallel batching (concurrency throttling)
 * - Automatic 429 rate-limit backoff and transient error retries
 * - Robust HTML entity escaping with automatic plaintext fallback
 * - Telegram Mini App (TMA) inline keyboard integration
 * - Short-window idempotency deduplication (5-second cache)
 * - Connection timeout protection (AbortSignal)
 * - Live bot diagnostics and telemetry metrics
 */

export interface TelegramInlineButton {
  text: string;
  url?: string;
  web_app?: { url: string };
  callback_data?: string;
}

export interface TelegramNotificationPayload {
  chatId: string | number;
  title: string;
  body: string;
  priority?: "low" | "normal" | "high" | "critical";
  actionUrl?: string;
  actionText?: string;
  isMiniApp?: boolean;
  inlineKeyboard?: TelegramInlineButton[][];
  metadata?: Record<string, any>;
}

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  error?: string;
  chatId: string | number;
  isSimulated?: boolean;
  retryCount?: number;
}

// Global In-Memory Bot Telemetry
interface BotTelemetry {
  totalDispatched: number;
  totalSuccess: number;
  totalFailed: number;
  totalRetried429: number;
  totalDeduplicated: number;
  lastActive: string | null;
}

const botTelemetry: BotTelemetry = {
  totalDispatched: 0,
  totalSuccess: 0,
  totalFailed: 0,
  totalRetried429: 0,
  totalDeduplicated: 0,
  lastActive: null,
};

// 5-second in-memory deduplication cache
const recentMessagesCache = new Map<string, number>();

function cleanDeduplicationCache() {
  const now = Date.now();
  for (const [key, expiresAt] of recentMessagesCache.entries()) {
    if (expiresAt <= now) {
      recentMessagesCache.delete(key);
    }
  }
}

// Bot info cache (5 minutes TTL)
let cachedBotInfo: { username?: string; firstName?: string; valid: boolean; checkedAt: number } | null = null;

/**
 * Escape HTML special characters for Telegram HTML parse_mode
 */
export function escapeTelegramHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Strip all HTML tags for fallback delivery if Telegram entity parsing fails
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

/**
 * Low-level HTTP fetch to Telegram API with timeout, retry, and 429 handling
 */
async function callTelegramApi(
  endpoint: string,
  bodyObj: Record<string, any>,
  maxRetries = 2
): Promise<{ ok: boolean; result?: any; description?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, description: "TELEGRAM_BOT_TOKEN is not configured" };
  }

  const url = `https://api.telegram.org/bot${token}/${endpoint}`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7500);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Connection": "keep-alive",
        },
        body: JSON.stringify(bodyObj),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // Handle HTTP 429 Too Many Requests
      if (response.status === 429) {
        botTelemetry.totalRetried429++;
        const retryAfterSeconds = data?.parameters?.retry_after || 1;
        const waitMs = Math.min(retryAfterSeconds * 1000, 4000); // Wait max 4 seconds
        console.warn(`[TelegramNotifier] Rate limited (429). Retrying after ${waitMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      // If Telegram complains about entities/formatting in HTML mode, retry without formatting
      if (!data.ok && data.description && data.description.toLowerCase().includes("can't parse entities") && bodyObj.parse_mode) {
        console.warn("[TelegramNotifier] Entity parsing failed, re-transmitting as raw plain text...");
        delete bodyObj.parse_mode;
        bodyObj.text = stripHtmlTags(bodyObj.text);
        return callTelegramApi(endpoint, bodyObj, 0);
      }

      return data;
    } catch (err: any) {
      if (attempt === maxRetries) {
        return { ok: false, description: err.name === "AbortError" ? "Telegram API timeout (7.5s)" : err.message };
      }
      // Brief exponential backoff for network blips
      await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
    }
  }

  return { ok: false, description: "Exceeded max retry attempts" };
}

/**
 * Sends a single high-priority clinical or system notification to a Telegram user.
 */
export async function sendTelegramNotification(
  payload: TelegramNotificationPayload
): Promise<TelegramSendResult> {
  botTelemetry.totalDispatched++;
  botTelemetry.lastActive = new Date().toISOString();

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Check deduplication (same chat, same title, within 5 seconds)
  const dedupKey = `${payload.chatId}:${payload.title}:${payload.body.slice(0, 40)}`;
  const now = Date.now();
  if (recentMessagesCache.has(dedupKey) && (recentMessagesCache.get(dedupKey) || 0) > now) {
    botTelemetry.totalDeduplicated++;
    return {
      success: true,
      chatId: payload.chatId,
      messageId: -1,
      isSimulated: true,
      error: "Deduplicated identical notification within 5s window",
    };
  }
  recentMessagesCache.set(dedupKey, now + 5000);
  if (recentMessagesCache.size > 200) cleanDeduplicationCache();

  // If no bot token is configured in environment, simulate safely
  if (!token) {
    botTelemetry.totalSuccess++;
    console.log(
      `[TelegramNotifier Simulated] Chat: ${payload.chatId} | ${payload.title} -> ${payload.actionUrl || "No Link"}`
    );
    return {
      success: true,
      chatId: payload.chatId,
      messageId: Math.floor(Math.random() * 100000),
      isSimulated: true,
    };
  }

  // Priority Header Formatter
  const priorityHeader =
    payload.priority === "critical"
      ? "🚨 <b>CRITICAL MEDICAL ALERT</b>"
      : payload.priority === "high"
      ? "⚠️ <b>HIGH PRIORITY CLINICAL ACTION</b>"
      : payload.priority === "low"
      ? "ℹ️ <b>NiniMed Notice</b>"
      : "📋 <b>NiniMed Healthcare Notification</b>";

  // Truncate body if exceeding Telegram's 4096-character limit
  const maxBodyLength = 3400;
  const safeBody =
    payload.body.length > maxBodyLength
      ? payload.body.substring(0, maxBodyLength) + "… [truncated]"
      : payload.body;

  // Build resolved action URL
  let fullActionUrl = payload.actionUrl;
  if (fullActionUrl && fullActionUrl.startsWith("/")) {
    fullActionUrl = `${baseUrl}${fullActionUrl}`;
  }

  // Build message HTML
  const messageHtml = [
    priorityHeader,
    "",
    `<b>${escapeTelegramHtml(payload.title)}</b>`,
    "",
    escapeTelegramHtml(safeBody),
    "",
    `🕒 <i>${new Date().toLocaleTimeString()} • NiniMed Care Telemetry</i>`,
  ].join("\n");

  // Construct inline keyboard
  let replyMarkup: Record<string, any> | undefined;

  if (payload.inlineKeyboard && payload.inlineKeyboard.length > 0) {
    replyMarkup = { inline_keyboard: payload.inlineKeyboard };
  } else if (fullActionUrl) {
    const isInternalTma = payload.isMiniApp || fullActionUrl.includes("/telegram/miniapp") || fullActionUrl.startsWith(baseUrl);
    const buttonText = `⚡ ${payload.actionText || (isInternalTma ? "Open in NiniMed App" : "Open Portal Link")}`;

    // If Mini App enabled, launch directly in Telegram TMA web_app
    const buttonObj: TelegramInlineButton = isInternalTma
      ? { text: buttonText, web_app: { url: fullActionUrl } }
      : { text: buttonText, url: fullActionUrl };

    replyMarkup = {
      inline_keyboard: [[buttonObj]],
    };
  }

  const sendPayload: Record<string, any> = {
    chat_id: payload.chatId,
    text: messageHtml,
    parse_mode: "HTML",
    disable_web_page_preview: false,
  };

  if (replyMarkup) {
    sendPayload.reply_markup = replyMarkup;
  }

  const res = await callTelegramApi("sendMessage", sendPayload);

  if (res.ok) {
    botTelemetry.totalSuccess++;
    return {
      success: true,
      chatId: payload.chatId,
      messageId: res.result?.message_id,
    };
  } else {
    botTelemetry.totalFailed++;
    console.warn(`[TelegramNotifier] Failed sending to chat ${payload.chatId}:`, res.description);
    return {
      success: false,
      chatId: payload.chatId,
      error: res.description,
    };
  }
}

/**
 * Dispatches an array of notifications concurrently in controlled chunks.
 * Prevents serial delay while respecting Telegram's global message rate limits.
 */
export async function sendBatchTelegramNotifications(
  payloads: TelegramNotificationPayload[],
  options: { concurrency?: number; delayBetweenChunksMs?: number } = {}
): Promise<{
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: TelegramSendResult[];
}> {
  if (!payloads || payloads.length === 0) {
    return { total: 0, sent: 0, failed: 0, skipped: 0, results: [] };
  }

  const concurrency = options.concurrency || 10;
  const delayMs = options.delayBetweenChunksMs || 100;
  const results: TelegramSendResult[] = [];

  // Process in concurrent chunks
  for (let i = 0; i < payloads.length; i += concurrency) {
    const chunk = payloads.slice(i, i + concurrency);
    const chunkPromises = chunk.map((p) => sendTelegramNotification(p));
    const settled = await Promise.allSettled(chunkPromises);

    for (const item of settled) {
      if (item.status === "fulfilled") {
        results.push(item.value);
      } else {
        results.push({
          success: false,
          chatId: "unknown",
          error: item.reason?.message || "Promise rejected",
        });
      }
    }

    // Inter-chunk throttle if more chunks remain
    if (i + concurrency < payloads.length && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  const sent = results.filter((r) => r.success && !r.error?.includes("Deduplicated")).length;
  const skipped = results.filter((r) => r.success && r.error?.includes("Deduplicated")).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    total: payloads.length,
    sent,
    failed,
    skipped,
    results,
  };
}

/**
 * Fast low-level bot reply — used by webhooks and quick command responses.
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  opts: Record<string, any> = {}
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log(`[TelegramBot Simulated] To ${chatId}: ${text.slice(0, 80)}`);
    return { success: true };
  }

  const body: Record<string, any> = {
    chat_id: chatId,
    text,
    ...opts,
  };

  const res = await callTelegramApi("sendMessage", body);
  return {
    success: Boolean(res.ok),
    messageId: res.result?.message_id,
    error: res.description,
  };
}

/**
 * Acknowledges a Telegram callback query (button tap) to remove client-side spinner.
 */
export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert = false
): Promise<boolean> {
  const res = await callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
  return Boolean(res.ok);
}

/**
 * Checks Telegram Bot credentials and connection health with 5-minute memory caching.
 */
export async function getTelegramBotInfo(): Promise<{
  connected: boolean;
  botUsername?: string;
  botFirstName?: string;
  error?: string;
}> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { connected: false, error: "TELEGRAM_BOT_TOKEN environment variable is not set." };
  }

  const now = Date.now();
  if (cachedBotInfo && now - cachedBotInfo.checkedAt < 300_000) {
    return {
      connected: cachedBotInfo.valid,
      botUsername: cachedBotInfo.username,
      botFirstName: cachedBotInfo.firstName,
    };
  }

  const res = await callTelegramApi("getMe", {}, 1);
  if (res.ok && res.result) {
    cachedBotInfo = {
      valid: true,
      username: res.result.username,
      firstName: res.result.first_name,
      checkedAt: now,
    };
    return {
      connected: true,
      botUsername: res.result.username,
      botFirstName: res.result.first_name,
    };
  } else {
    return {
      connected: false,
      error: res.description || "Failed to contact Telegram API",
    };
  }
}

/**
 * Returns real-time metrics and telemetry on bot performance.
 */
export function getTelegramBotTelemetry(): BotTelemetry & {
  dedupCacheSize: number;
} {
  return {
    ...botTelemetry,
    dedupCacheSize: recentMessagesCache.size,
  };
}
