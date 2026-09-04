import { NextRequest, NextResponse } from "next/server";
import { PaymentGateService, EnterprisePaymentSettings } from "@/lib/services/payment-gate-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || "00000000-0000-0000-0000-000000000001";
    const settings = await PaymentGateService.getSettings(tenantId);
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to load payment settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, adminId, globalPolicy, gates, telebirrMerchantId, telebirrShortCode, cbeAccountNumber, cbeAccountName, awashAccountNumber, awashAccountName } = body;

    const updated = await PaymentGateService.updateSettings(
      {
        ...(globalPolicy ? { globalPolicy } : {}),
        ...(gates ? { gates } : {}),
        ...(telebirrMerchantId ? { telebirrMerchantId } : {}),
        ...(telebirrShortCode ? { telebirrShortCode } : {}),
        ...(cbeAccountNumber ? { cbeAccountNumber } : {}),
        ...(cbeAccountName ? { cbeAccountName } : {}),
        ...(awashAccountNumber ? { awashAccountNumber } : {}),
        ...(awashAccountName ? { awashAccountName } : {}),
      },
      tenantId || "00000000-0000-0000-0000-000000000001",
      adminId
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Payment gate configuration updated successfully across all clinical workflows.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to update payment settings" }, { status: 500 });
  }
}
