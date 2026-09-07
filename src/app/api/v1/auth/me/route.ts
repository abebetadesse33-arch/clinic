import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get("Nini_session")?.value;

  if (!sessionId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionId))
      .limit(1);

    if (user && user.isActive) {
      return NextResponse.json({
        success: true,
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
  } catch (error) {
    console.error("Error retrieving authenticated session:", error);
  }

  const response = NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 401 });
  response.cookies.delete("Nini_session");
  return response;
}
