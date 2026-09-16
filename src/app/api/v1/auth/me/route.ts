import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  getAuthenticatedSessionUser,
} from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE_NAME)?.value) {
    return NextResponse.json({ success: false, authenticated: false, user: null });
  }

  const user = await getAuthenticatedSessionUser(req);

  if (user) {
    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        licenseNumber: user.licenseNumber,
        department: user.department,
        organizationId: user.organizationId,
        isAdminGrantedBySuperAdmin: Boolean(user.isAdminGrantedBySuperAdmin),
      },
    });
  }

  const response = NextResponse.json(
    { success: false, authenticated: false, error: "Invalid or expired session" },
    { status: 401 }
  );
  clearSessionCookie(response);
  return response;
}
