import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/security/auth-session";
import { telegramApi } from "@/lib/notifications/telegram-notifier";
import { getBotToken, getWebhookSecret, resolveBaseUrl } from "@/lib/notifications/telegram-security";

export const dynamic = "force-dynamic";

const BOT_COMMANDS = [
  { command: "start", description: "Link your NiniMed account / open the app" },
  { command: "schedule", description: "Today's appointments" },
  { command: "queue", description: "Live waiting-room queue (staff)" },
  { command: "status", description: "Check or toggle your on-duty alerts" },
  { command: "help", description: "Show all commands" },
];

/**
 * GET /api/v1/telegram/setup  (admin)
 * What Telegram currently has registered for this bot, vs. what it should be.
 * `last_error_message` here is the single most useful field when the bot is silent.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("response" in auth) return auth.response;

  if (!getBotToken()) {
    return NextResponse.json(
      { success: false, error: "TELEGRAM_BOT_TOKEN is not set in the server environment." },
      { status: 503 }
    );
  }

  const expectedUrl = `${resolveBaseUrl(req)}/api/v1/telegram/webhook`;
  const [me, info] = await Promise.all([telegramApi("getMe"), telegramApi("getWebhookInfo")]);

  return NextResponse.json({
    success: Boolean(me.ok && info.ok),
    data: {
      bot: me.ok ? { username: me.result?.username, name: me.result?.first_name } : { error: me.description },
      webhook: info.ok
        ? {
            registeredUrl: info.result?.url || null,
            expectedUrl,
            matches: info.result?.url === expectedUrl,
            pendingUpdates: info.result?.pending_update_count,
            lastErrorDate: info.result?.last_error_date
              ? new Date(info.result.last_error_date * 1000).toISOString()
              : null,
            lastErrorMessage: info.result?.last_error_message || null,
          }
        : { error: info.description },
    },
  });
}

/**
 * POST /api/v1/telegram/setup  (admin)
 * Idempotent. Registers the webhook (with the secret the webhook handler
 * enforces), the slash-command menu, and the Mini App launcher button. Nothing
 * else in the codebase does this, so a fresh deploy or a changed domain leaves
 * the bot silently deaf until this is run.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("response" in auth) return auth.response;

  const secret = getWebhookSecret();
  if (!getBotToken() || !secret) {
    return NextResponse.json(
      { success: false, error: "TELEGRAM_BOT_TOKEN is not set in the server environment." },
      { status: 503 }
    );
  }

  const baseUrl = resolveBaseUrl(req);
  if (!/^https:\/\//i.test(baseUrl)) {
    return NextResponse.json(
      {
        success: false,
        error: `Telegram requires an https URL but this server resolves its public URL as "${baseUrl}". Set NEXT_PUBLIC_APP_URL to the public https address.`,
      },
      { status: 400 }
    );
  }

  const webhookUrl = `${baseUrl}/api/v1/telegram/webhook`;
  const miniAppUrl = `${baseUrl}/telegram/miniapp`;

  const webhook = await telegramApi("setWebhook", {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    max_connections: 10,
  });
  const commands = await telegramApi("setMyCommands", { commands: BOT_COMMANDS });
  const menuButton = await telegramApi("setChatMenuButton", {
    menu_button: { type: "web_app", text: "NiniMed", web_app: { url: miniAppUrl } },
  });

  const ok = Boolean(webhook.ok && commands.ok && menuButton.ok);
  return NextResponse.json(
    {
      success: ok,
      data: {
        webhookUrl,
        miniAppUrl,
        setWebhook: webhook.ok ? "ok" : webhook.description,
        setMyCommands: commands.ok ? "ok" : commands.description,
        setChatMenuButton: menuButton.ok ? "ok" : menuButton.description,
      },
    },
    { status: ok ? 200 : 502 }
  );
}
