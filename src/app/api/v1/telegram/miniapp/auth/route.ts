import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramIntegrations, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, setSessionCookie } from "@/lib/security/auth-session";
import { verifyMiniAppInitData } from "@/lib/notifications/telegram-security";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/telegram/miniapp/auth   { initData: string }
 *
 * The Mini App runs in Telegram's webview where the user has no NiniMed
 * session cookie, so every API call it made (appointments, …) returned 401 and
 * the app showed an empty queue. Telegram signs the identity of whoever opened
 * the Mini App (initData); once that signature checks out, an account that has
 * already been linked to that Telegram user (via the bot's /start link flow)
 * gets a normal session.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid_request" }, { status: 400 });
  }

  const identity = verifyMiniAppInitData(typeof body?.initData === "string" ? body.initData : "");
  if (!identity) {
    return NextResponse.json({ success: false, error: "invalid_init_data" }, { status: 401 });
  }

  // In a private chat the Telegram user id is the chat id the account was linked from.
  const [row] = await db
    .select({
      userId: users.id,
      fullName: users.fullName,
      role: users.role,
      department: users.department,
      licenseNumber: users.licenseNumber,
      isActive: users.isActive,
      isAdminGrantedBySuperAdmin: users.isAdminGrantedBySuperAdmin,
      isOnDuty: telegramIntegrations.isNotificationsEnabled,
    })
    .from(telegramIntegrations)
    .innerJoin(users, eq(users.id, telegramIntegrations.userId))
    .where(eq(telegramIntegrations.telegramChatId, identity.telegramUserId))
    .limit(1);

  if (!row) {
    return NextResponse.json({ success: false, error: "not_linked" }, { status: 404 });
  }
  if (!row.isActive) {
    return NextResponse.json({ success: false, error: "inactive" }, { status: 403 });
  }
  // Same gate as password sign-in.
  if (row.role === "tenant_admin" && !row.isAdminGrantedBySuperAdmin) {
    return NextResponse.json({ success: false, error: "admin_not_granted" }, { status: 403 });
  }

  const token = await createSession(row.userId, req);
  const response = NextResponse.json({
    success: true,
    user: {
      fullName: row.fullName,
      role: row.role,
      department: row.department,
      licenseNumber: row.licenseNumber,
    },
    isOnDuty: Boolean(row.isOnDuty),
  });
  setSessionCookie(response, token);
  return response;
}
