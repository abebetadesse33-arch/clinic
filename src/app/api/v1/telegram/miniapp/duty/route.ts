import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramIntegrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/telegram/miniapp/duty   { enabled: boolean }
 * The Mini App's On/Off Duty switch was local React state only — it never
 * touched the same flag the bot's /status button toggles, so flipping it in the
 * app changed nothing. This persists it on the caller's own Telegram link.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid_request" }, { status: 400 });
  }
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ success: false, error: "enabled must be a boolean" }, { status: 422 });
  }

  const [link] = await db
    .select({ id: telegramIntegrations.id })
    .from(telegramIntegrations)
    .where(eq(telegramIntegrations.userId, auth.user.id))
    .limit(1);
  if (!link) {
    return NextResponse.json({ success: false, error: "not_linked" }, { status: 404 });
  }

  await db
    .update(telegramIntegrations)
    .set({ isNotificationsEnabled: body.enabled })
    .where(eq(telegramIntegrations.id, link.id));

  return NextResponse.json({ success: true, isOnDuty: body.enabled });
}
