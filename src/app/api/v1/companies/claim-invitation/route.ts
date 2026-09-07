import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/lib/services/subscription-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, patientId } = body;

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
