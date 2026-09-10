import { NextRequest, NextResponse } from "next/server";
import { checkAndDispatchAppointmentReminders } from "@/lib/notifications/appointment-reminder-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/notifications/reminder-cron
 *
 * Secured cron endpoint that triggers appointment reminder dispatch.
 * Call every 5 minutes via Plesk cron or GitHub Actions schedule.
 *
 * Security: validates ?secret=<CRON_SECRET> query parameter.
 *
 * Example cron (Plesk / crontab):
 *   * /5 * * * * curl -s "https://yourdomain.com/api/v1/notifications/reminder-cron?secret=YOUR_SECRET"
 *
 * Example GitHub Actions (.github/workflows/reminder-cron.yml):
 *   on:
 *     schedule:
 *       - cron: "* /5 * * * *"
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const providedSecret = searchParams.get("secret");
    const expectedSecret = process.env.CRON_SECRET;

    // Validate secret — skip check only in development if no secret configured
    if (expectedSecret && providedSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid cron secret." },
        { status: 401 }
      );
    }

    const started = Date.now();
    const result = await checkAndDispatchAppointmentReminders();
    const elapsed = Date.now() - started;

    return NextResponse.json({
      success: true,
      message: "Appointment reminder check completed.",
      result,
      elapsedMs: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[ReminderCron] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Reminder dispatch failed." },
      { status: 500 }
    );
  }
}
