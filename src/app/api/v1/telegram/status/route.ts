import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramIntegrations } from "@/db/schema";
import { sql } from "drizzle-orm";
import {
  getTelegramBotInfo,
  getTelegramBotTelemetry,
} from "@/lib/notifications/telegram-notifier";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/telegram/status
 * Diagnostic and health-check endpoint for the Telegram notification engine.
 */
export async function GET(req: NextRequest) {
  try {
    const botInfo = await getTelegramBotInfo();
    const telemetry = getTelegramBotTelemetry();

    // Count linked active accounts in DB
    let totalLinked = 0;
    try {
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(telegramIntegrations);
      totalLinked = countRow?.count || 0;
    } catch { }

    return NextResponse.json({
      success: true,
      data: {
        bot: {
          configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
          connected: botInfo.connected,
          username: botInfo.botUsername || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || null,
          firstName: botInfo.botFirstName || null,
          error: botInfo.error || null,
        },
        telemetry: {
          totalDispatched: telemetry.totalDispatched,
          totalSuccess: telemetry.totalSuccess,
          totalFailed: telemetry.totalFailed,
          totalRetried429: telemetry.totalRetried429,
          totalDeduplicated: telemetry.totalDeduplicated,
          lastActive: telemetry.lastActive,
          cacheSize: telemetry.dedupCacheSize,
        },
        integrations: {
          totalLinkedAccounts: totalLinked,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
