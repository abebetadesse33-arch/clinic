import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const sessionUserId = req.cookies.get("Nini_session")?.value;

    // Dispatch sign-out notification for clinicians (non-blocking)
    if (sessionUserId && sessionUserId.length === 36) {
      try {
        const [dbUser] = await db.select({ id: users.id, fullName: users.fullName, role: users.role, department: users.department }).from(users).where(eq(users.id, sessionUserId)).limit(1);
        if (dbUser) {
          const isClinical = ["physician", "nurse", "nurse_practitioner", "care_coordinator", "triage_staff"].includes(dbUser.role);
          if (isClinical) {
            const { dispatchNotification } = await import("@/lib/notifications/notification-service");
            await dispatchNotification({
              category: "auth_shifts",
              type: "clinician_signed_out",
              title: `🔴 ${dbUser.fullName} Signed Out`,
              body: `${dbUser.fullName} (${dbUser.role.replace(/_/g, " ")}, ${dbUser.department || "General"}) has ended their shift at ${new Date().toLocaleTimeString()}.`,
              priority: "low",
              targetRole: "system_admin",
              senderUserId: dbUser.id,
              actionUrl: `/admin`,
              actionText: "View Staff Directory",
              relatedEntityType: "users",
              relatedEntityId: dbUser.id,
              metadata: { role: dbUser.role, department: dbUser.department },
            });
          }
        }
      } catch { /* non-blocking */ }
    }

    const response = NextResponse.json({
      success: true,
      message: "Signed out successfully",
    });

    response.cookies.delete("Nini_session");
    return response;
  } catch (error: any) {
    const response = NextResponse.json({ success: true, message: "Signed out" });
    response.cookies.delete("Nini_session");
    return response;
  }
}
