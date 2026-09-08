import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemPaymentSettings } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/payments/poc-qr
 * Generates Point-of-Care (PoC) dynamic QR payload for Telebirr, CBE Birr, and Chapa.
 * Used by phlebotomy stations, pharmacy counters, and checkout desks.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department") || "outpatient";
    const amount = Number(searchParams.get("amount") || 0);
    const orderId = searchParams.get("orderId") || `ORD-${Date.now()}`;
    const patientName = searchParams.get("patientName") || "Patient Member";
    const invoiceId = searchParams.get("invoiceId");

    const [settings] = await db.select().from(systemPaymentSettings).limit(1);

    const merchantId = "TB-NINI-99201";
    const shortCode = "88210";
    const cbeAccount = "1000293848192";
    const cbeName = "NiniMed Health Ltd";
    const txRef = `POC-${department.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    // Generate dynamic QR strings according to National Ethiopian Mobile Money standard specs
    const telebirrPayload = `telebirr://pay?shortCode=${shortCode}&merchantId=${merchantId}&amount=${amount}&ref=${txRef}&desc=${encodeURIComponent(
      `NiniMed ${department.toUpperCase()} Service`
    )}`;

    const cbeBirrPayload = `cbebirr://transfer?account=${cbeAccount}&name=${encodeURIComponent(
      cbeName
    )}&amount=${amount}&ref=${txRef}`;

    const chapaCheckoutUrl = `https://checkout.chapa.co/checkout/payment/${txRef}`;

    return NextResponse.json({
      success: true,
      data: {
        department,
        amountEtb: amount,
        orderId,
        invoiceId,
        patientName,
        transactionRef: txRef,
        isPoCEnabled: settings?.enablePoCQRPayments !== false,
        qrCodes: {
          telebirr: {
            method: "telebirr",
            label: "Telebirr SuperApp QR",
            rawPayload: telebirrPayload,
            ussdCode: `*127*${shortCode}*${amount}#`,
            merchantId,
            shortCode,
          },
          cbeBirr: {
            method: "cbe_birr",
            label: "CBE Birr Instant QR",
            rawPayload: cbeBirrPayload,
            accountNumber: cbeAccount,
            accountName: cbeName,
          },
          chapa: {
            method: "chapa_card",
            label: "Chapa Visa / Mastercard / Mobile",
            checkoutUrl: chapaCheckoutUrl,
          },
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to generate PoC QR code" }, { status: 500 });
  }
}
