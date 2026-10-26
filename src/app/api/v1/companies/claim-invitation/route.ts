import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { requireAuthenticatedUser } from "@/lib/security/auth-session";
import { findOwnPatient } from "@/lib/security/tenant-resource";

export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { token } = body;
    // Invitations can only be claimed for the signed-in patient's own record.
    const own = auth.user.role === "patient" ? await findOwnPatient(auth.user) : null;
    const patientId = own?.id ?? body.patientId;
    if (auth.user.role !== "patient" && auth.user.role !== "system_admin" && auth.user.role !== "tenant_admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (!token || !patientId) {
      return NextResponse.json({ success: false, error: "Token and patientId are required" }, { status: 400 });
    }

    const member = await SubscriptionService.claimEmployeeInvitation({
      token,
      patientId,
    });

    return NextResponse.json({
      success: true,
      data: member,
      message: "Successfully linked employee patient account to corporate healthcare benefits",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
