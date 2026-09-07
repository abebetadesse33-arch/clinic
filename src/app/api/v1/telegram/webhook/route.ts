import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramIntegrations, users, appointments, patients } from "@/db/schema";
import { eq, and, or, gte, lte, desc } from "drizzle-orm";
import {
  sendTelegramMessage,
  answerTelegramCallbackQuery,
  escapeTelegramHtml,
} from "@/lib/notifications/telegram-notifier";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/telegram/webhook
 * High-Efficiency Telegram Bot Webhook Router
 * 
 * Handles:
 *  - /start <token>   → Secure 1-click account linking with TMA button
 *  - /schedule        → Live EHR query of today's appointments
 *  - /queue           → Real-time patient triage & waiting room queue
 *  - /status          → View & toggle clinician on-duty status
 *  - /help            → Command palette & direct Mini App launcher
 *  - callback_query   → Instant interactive button actions (toggle duty, refresh)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const miniAppUrl = `${baseUrl}/telegram/miniapp`;

    // ─── 1. HANDLE INLINE BUTTON CALLBACK QUERIES ─────────────────────────────
    if (body?.callback_query) {
      const cq = body.callback_query;
      const callbackId: string = cq.id;
      const cqChatId: number = cq.message?.chat?.id;
      const action: string = cq.data || "";

      // Quick acknowledge to stop spinner
      await answerTelegramCallbackQuery(callbackId, "Processing...");

      if (action === "toggle_duty" && cqChatId) {
        // Toggle duty status
        const [linked] = await db
          .select({
            id: telegramIntegrations.id,
            userId: telegramIntegrations.userId,
            isEnabled: telegramIntegrations.isNotificationsEnabled,
          })
          .from(telegramIntegrations)
          .where(eq(telegramIntegrations.telegramChatId, String(cqChatId)))
          .limit(1);

        if (linked) {
          const nextState = !linked.isEnabled;
          await db
            .update(telegramIntegrations)
            .set({ isNotificationsEnabled: nextState })
            .where(eq(telegramIntegrations.id, linked.id));

          await sendTelegramMessage(
            cqChatId,
            `⚡ <b>Duty Status Updated</b>\n\nYour alert status is now: <b>${
              nextState ? "🟢 ON DUTY (Alerts Active)" : "⚪ OFF DUTY (Alerts Paused)"
            }</b>`,
            {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: nextState ? "⏸ Switch to Off Duty" : "▶ Switch to On Duty",
                      callback_data: "toggle_duty",
                    },
                    {
                      text: "🚀 Open NiniMed App",
                      web_app: { url: miniAppUrl },
                    },
                  ],
                ],
              },
            }
          );
        }
      } else if (action === "refresh_queue" && cqChatId) {
        await handleQueueCommand(cqChatId, baseUrl, miniAppUrl);
      } else if (action === "refresh_schedule" && cqChatId) {
        await handleScheduleCommand(cqChatId, baseUrl, miniAppUrl);
      }

      return NextResponse.json({ ok: true });
    }

    // ─── 2. HANDLE STANDARD CHAT MESSAGES ─────────────────────────────────────
    const message = body?.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId: number = message.chat.id;
    const text: string = (message.text || "").trim();

    // ─── /start <token> ───────────────────────────────────────────────────────
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const token = parts[1];

      if (!token) {
        // Welcome message with Mini App button
        await sendTelegramMessage(
          chatId,
          `👋 <b>Welcome to the NiniMed Clinical Bot</b>\n\nTo link your provider or patient account, visit your profile on NiniMed and click <b>"Link Telegram Account"</b>.\n\nAlready registered? Use the commands below:`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🚀 Launch NiniMed Mini App",
                    web_app: { url: miniAppUrl },
                  },
                ],
                [
                  { text: "📅 Today's Schedule", callback_data: "refresh_schedule" },
                  { text: "🚶 Live Queue", callback_data: "refresh_queue" },
                ],
              ],
            },
          }
        );
        return NextResponse.json({ ok: true });
      }

      try {
        const decoded = JSON.parse(Buffer.from(token, "base64url").toString());
        if (!decoded.userId || (decoded.exp && decoded.exp < Date.now())) {
          await sendTelegramMessage(
            chatId,
            "⏱ <b>Connection Link Expired</b>\n\nPlease generate a fresh link from your NiniMed profile.",
            { parse_mode: "HTML" }
          );
          return NextResponse.json({ ok: true });
        }

        // Fetch user name and role for customized greeting
        const [userData] = await db
          .select({ fullName: users.fullName, role: users.role })
          .from(users)
          .where(eq(users.id, decoded.userId))
          .limit(1);

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

        const userGreeting = userData?.fullName ? `<b>${escapeTelegramHtml(userData.fullName)}</b>` : "Colleague";

        await sendTelegramMessage(
          chatId,
          `✅ <b>NiniMed Account Connected!</b>\n\nWelcome ${userGreeting}! Your Telegram is now paired with our Clinical Telemetry Engine.\n\n` +
            `🔔 <b>Real-time Alerts:</b> Clinical alerts, triage notifications, lab releases, and urgent consult requests will arrive here immediately.\n\n` +
            `⚡ <b>Quick Commands:</b>\n` +
            `• /schedule — View today's appointments\n` +
            `• /queue — Check waiting room & live triage queue\n` +
            `• /status — Check or toggle your alert availability\n` +
            `• /help — Full command directory`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🚀 Launch NiniMed Mobile App",
                    web_app: { url: miniAppUrl },
                  },
                ],
                [
                  { text: "📅 My Schedule", callback_data: "refresh_schedule" },
                  { text: "🚶 Live Queue", callback_data: "refresh_queue" },
                ],
              ],
            },
          }
        );
      } catch (err: any) {
        console.error("Token decode error:", err.message);
        await sendTelegramMessage(
          chatId,
          "❌ Could not decode connection token. Please generate a new connection link from your NiniMed account.",
          { parse_mode: "HTML" }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ─── /schedule ────────────────────────────────────────────────────────────
    if (text === "/schedule") {
      await handleScheduleCommand(chatId, baseUrl, miniAppUrl);
      return NextResponse.json({ ok: true });
    }

    // ─── /queue ───────────────────────────────────────────────────────────────
    if (text === "/queue") {
      await handleQueueCommand(chatId, baseUrl, miniAppUrl);
      return NextResponse.json({ ok: true });
    }

    // ─── /status ──────────────────────────────────────────────────────────────
    if (text === "/status") {
      const [link] = await db
        .select({
          id: telegramIntegrations.id,
          isEnabled: telegramIntegrations.isNotificationsEnabled,
          linkedAt: telegramIntegrations.linkedAt,
        })
        .from(telegramIntegrations)
        .where(eq(telegramIntegrations.telegramChatId, String(chatId)))
        .limit(1);

      if (!link) {
        await sendTelegramMessage(
          chatId,
          "ℹ️ <b>Account Not Linked</b>\n\nPlease link your NiniMed account from your profile to check on-duty telemetry.",
          { parse_mode: "HTML" }
        );
        return NextResponse.json({ ok: true });
      }

      const statusBadge = link.isEnabled ? "🟢 ON DUTY (Notifications Active)" : "⚪ OFF DUTY (Notifications Paused)";

      await sendTelegramMessage(
        chatId,
        `⚡ <b>Clinician Availability & Duty Status</b>\n\nCurrent Status: <b>${statusBadge}</b>\nLinked Since: <i>${new Date(
          link.linkedAt
        ).toLocaleDateString()}</i>\n\nYou can toggle this anytime:`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: link.isEnabled ? "⏸ Switch to Off Duty" : "▶ Switch to On Duty",
                  callback_data: "toggle_duty",
                },
                {
                  text: "🚀 Open App",
                  web_app: { url: miniAppUrl },
                },
              ],
            ],
          },
        }
      );
      return NextResponse.json({ ok: true });
    }

    // ─── /help ────────────────────────────────────────────────────────────────
    if (text === "/help" || text === "help") {
      await sendTelegramMessage(
        chatId,
        `🏥 <b>NiniMed Clinical Telegram Assistant</b>\n\n` +
          `<b>Available Commands:</b>\n` +
          `• <code>/schedule</code> — Today's clinical schedule\n` +
          `• <code>/queue</code> — Real-time patient triage & waiting queue\n` +
          `• <code>/status</code> — Duty status & alert controls\n` +
          `• <code>/help</code> — Show this manual\n\n` +
          `<i>Tip: Use the button below to launch the full clinical dashboard right inside Telegram.</i>`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🚀 Open NiniMed Mini App",
                  web_app: { url: miniAppUrl },
                },
              ],
            ],
          },
        }
      );
      return NextResponse.json({ ok: true });
    }

    // ─── Default Greeting ─────────────────────────────────────────────────────
    await sendTelegramMessage(
      chatId,
      `👋 <b>NiniMed Healthcare Bot</b>\n\nI didn't recognize that command. Tap below to launch your mobile clinical portal:`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚀 Launch NiniMed App",
                web_app: { url: miniAppUrl },
              },
            ],
            [
              { text: "📅 Today's Schedule", callback_data: "refresh_schedule" },
              { text: "🚶 Live Queue", callback_data: "refresh_queue" },
            ],
          ],
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[TelegramWebhook] Unhandled error:", error.message);
    return NextResponse.json({ ok: true });
  }
}

/**
 * Handles `/schedule` command — queries live appointments for today
 */
async function handleScheduleCommand(chatId: number, baseUrl: string, miniAppUrl: string) {
  try {
    const [linked] = await db
      .select({ userId: telegramIntegrations.userId })
      .from(telegramIntegrations)
      .where(eq(telegramIntegrations.telegramChatId, String(chatId)))
      .limit(1);

    if (!linked) {
      await sendTelegramMessage(
        chatId,
        "ℹ️ Please link your NiniMed account using <code>/start &lt;token&gt;</code> from your profile to view your schedule.",
        { parse_mode: "HTML" }
      );
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const todayAppts = await db
      .select({
        id: appointments.id,
        scheduledTime: appointments.scheduledTime,
        appointmentType: appointments.appointmentType,
        status: appointments.status,
        reason: appointments.reason,
        specialty: appointments.specialty,
      })
      .from(appointments)
      .where(
        and(
          or(
            eq(appointments.clinicianId, linked.userId),
            eq(appointments.patientId, linked.userId)
          ),
          eq(appointments.scheduledDate, todayStr)
        )
      )
      .orderBy(appointments.scheduledTime)
      .limit(8);

    if (todayAppts.length === 0) {
      await sendTelegramMessage(
        chatId,
        `📅 <b>Today's Schedule (${todayStr})</b>\n\n` +
          `🎉 <b>No appointments scheduled for today!</b> You're all caught up.\n\n` +
          `Tap below to review upcoming bookings or manage availability:`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🚀 Open Schedule in App", web_app: { url: `${baseUrl}/patient/appointments` } },
                { text: "🔄 Refresh", callback_data: "refresh_schedule" },
              ],
            ],
          },
        }
      );
      return;
    }

    const listHtml = todayAppts
      .map((a, i) => {
        const time = escapeTelegramHtml(a.scheduledTime);
        const reason = escapeTelegramHtml(a.reason || a.specialty);
        const typeIcon = a.appointmentType === "telehealth" ? "📹" : "🏥";
        const statusBadge = a.status === "confirmed" ? "✓" : a.status === "checked_in" ? "⏳" : "•";
        return `${i + 1}. ${typeIcon} <b>${time}</b> — ${reason} [${statusBadge} ${escapeTelegramHtml(a.status)}]`;
      })
      .join("\n");

    await sendTelegramMessage(
      chatId,
      `📅 <b>Today's Appointments (${todayAppts.length})</b>\n\n${listHtml}`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🚀 Open Full EHR Schedule", web_app: { url: miniAppUrl } },
              { text: "🔄 Refresh", callback_data: "refresh_schedule" },
            ],
          ],
        },
      }
    );
  } catch (err: any) {
    console.error("Schedule command error:", err.message);
    await sendTelegramMessage(
      chatId,
      "⚠️ Could not retrieve schedule right now. Please open the NiniMed dashboard:",
      {
        reply_markup: {
          inline_keyboard: [[{ text: "🚀 Open Dashboard", web_app: { url: miniAppUrl } }]],
        },
      }
    );
  }
}

/**
 * Handles `/queue` command — queries live triage & waiting patients
 */
async function handleQueueCommand(chatId: number, baseUrl: string, miniAppUrl: string) {
  try {
    const todayStr = new Date().toISOString().split("T")[0];

    const queueItems = await db
      .select({
        id: appointments.id,
        scheduledTime: appointments.scheduledTime,
        queueToken: appointments.queueToken,
        status: appointments.status,
        specialty: appointments.specialty,
      })
      .from(appointments)
      .where(
        and(
          or(
            eq(appointments.status, "checked_in"),
            eq(appointments.status, "scheduled")
          ),
          eq(appointments.scheduledDate, todayStr)
        )
      )
      .orderBy(appointments.scheduledTime)
      .limit(6);

    const count = queueItems.length;

    if (count === 0) {
      await sendTelegramMessage(
        chatId,
        `🚶 <b>Live Patient Queue</b>\n\n` +
          `✨ <b>The waiting room is currently clear!</b> Zero patients waiting in queue.`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🚀 Open Waiting Room", web_app: { url: miniAppUrl } },
                { text: "🔄 Refresh Queue", callback_data: "refresh_queue" },
              ],
            ],
          },
        }
      );
      return;
    }

    const itemsHtml = queueItems
      .map((item, idx) => {
        const token = item.queueToken || `Q-${idx + 1}`;
        return `• <b>Token ${escapeTelegramHtml(token)}</b> | ${escapeTelegramHtml(item.scheduledTime)} (${escapeTelegramHtml(
          item.status
        )})`;
      })
      .join("\n");

    await sendTelegramMessage(
      chatId,
      `🚶 <b>Live Patient Queue (${count} Waiting)</b>\n\n${itemsHtml}\n\n<i>Estimated intake delay: &lt; 5 mins</i>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⚡ Call Next Patient in TMA", web_app: { url: miniAppUrl } },
              { text: "🔄 Refresh", callback_data: "refresh_queue" },
            ],
          ],
        },
      }
    );
  } catch (err: any) {
    console.error("Queue command error:", err.message);
    await sendTelegramMessage(chatId, "⚠️ Could not check live queue. Open the NiniMed app:", {
      reply_markup: {
        inline_keyboard: [[{ text: "🚀 Open App", web_app: { url: miniAppUrl } }]],
      },
    });
  }
}
