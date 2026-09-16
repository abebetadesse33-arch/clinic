import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  getAuthenticatedSessionUser,
  revokeSession,
} from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: "Signed out successfully" });
  clearSessionCookie(response);

  try {
    const user = await getAuthenticatedSessionUser(req);
    await revokeSession(req);

    // Shift notification for clinicians: best-effort, never blocks sign-out.
    if (user && ["physician", "nurse", "nurse_practitioner", "care_coordinator", "triage_staff"].includes(user.role)) {
      import("@/lib/notifications/notification-service")
        .then(({ dispatchNotification }) =>
          dispatchNotification({
            category: "auth_shifts",
            type: "clinician_signed_out",
            title: `🔴 ${user.fullName} Signed Out`,
            body: `${user.fullName} (${user.role.replace(/_/g, " ")}, ${user.department || "General"}) has ended their shift at ${new Date().toLocaleTimeString()}.`,
            priority: "low",
            targetRole: "system_admin",
            senderUserId: user.id,
            actionUrl: "/admin",
            actionText: "View Staff Directory",
            relatedEntityType: "users",
            relatedEntityId: user.id,
            metadata: { role: user.role, department: user.department },
          })
        )
        .catch(() => {});
    }
  } catch (error) {
    console.error("[Auth] Sign-out cleanup failed (cookie still cleared):", error);
  }

  return response;
}
