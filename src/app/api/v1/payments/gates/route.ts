import { NextRequest, NextResponse } from "next/server";
import { PaymentGateService, EnterprisePaymentSettings } from "@/lib/services/payment-gate-service";
import { requireAuthenticatedUser, requireAdminUser } from "@/lib/security/auth-session";

export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth.response;

  try {
    const tenantId = auth.user.organizationId;
    const settings = await PaymentGateService.getSettings(tenantId);
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to load payment settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { globalPolicy, gates, telebirrMerchantId, telebirrShortCode, cbeAccountNumber, cbeAccountName, awashAccountNumber, awashAccountName } = body;

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
      auth.user.organizationId,
      auth.user.id
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
