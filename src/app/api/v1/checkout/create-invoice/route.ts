import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, servicePricingCatalog, systemPaymentSettings, patients, users } from "@/db/schema";
import { eq, or, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

// POST /api/v1/checkout/create-invoice
export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get("Nini_session")?.value;

  try {
    const body = await req.json();
    const { patientId, items = [], discountCode } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one billable line item is required." },
        { status: 400 }
      );
    }

    // 1. Resolve Patient
    let targetPatientId = patientId;
    if (!targetPatientId && sessionId) {
      const [u] = await db.select().from(users).where(eq(users.id, sessionId)).limit(1);
      if (u) {
        const [p] = await db.select().from(patients).where(or(eq(patients.userId, u.id), eq(patients.email, u.email))).limit(1);
        if (p) targetPatientId = p.id;
      }
    }

    if (!targetPatientId) {
      const [anyP] = await db.select().from(patients).limit(1);
      if (anyP) targetPatientId = anyP.id;
    }

    if (!targetPatientId) {
      return NextResponse.json(
        { success: false, error: "No valid patient profile found to generate invoice." },
        { status: 404 }
      );
    }

    // 2. Fetch Pricing Catalog & Global Settings
    const [settingsList, catalogList] = await Promise.all([
      db.select().from(systemPaymentSettings).limit(1),
      db.select().from(servicePricingCatalog),
    ]);

    const isGlobalFree = Boolean(settingsList[0]?.globalFreeMode);
    const catalogMap = new Map(catalogList.map((c) => [c.serviceCode, c]));

    // 3. Calculate Line Items
    let subtotal = 0;
    const computedItems: Array<{
      serviceCode: string;
      description: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
    }> = [];

    for (const rawItem of items) {
      const catalogEntry = catalogMap.get(rawItem.serviceCode);
      const qty = Math.max(1, Number(rawItem.quantity) || 1);

      let price = 0;
      let desc = rawItem.description || catalogEntry?.name || rawItem.serviceCode;

      if (!isGlobalFree && (!catalogEntry || !catalogEntry.isFree)) {
        if (rawItem.unitPrice !== undefined && rawItem.unitPrice !== null) {
          price = Number(rawItem.unitPrice);
        } else if (catalogEntry) {
          price = parseFloat(catalogEntry.basePrice) || 0;
        }
      }

      const lineTotal = price * qty;
      subtotal += lineTotal;

      computedItems.push({
        serviceCode: rawItem.serviceCode,
        description: desc,
        unitPrice: price,
        quantity: qty,
        totalPrice: lineTotal,
      });
    }

    // 4. Apply Discounts
    let discountAmount = 0;
    if (discountCode) {
      const code = discountCode.toUpperCase().trim();
      if (code === "COMMUNITY2026" || code === "STAFF100" || code === "FREECARE") {
        discountAmount = subtotal; // 100% discount
      } else if (code === "SENIOR50" || code === "STUDENT50") {
        discountAmount = subtotal * 0.5; // 50% discount
      } else if (code === "CARE20") {
        discountAmount = subtotal * 0.2; // 20% discount
      }
    }

    if (isGlobalFree) {
      discountAmount = subtotal;
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    // 5. Create Invoice Record
    const [newInvoice] = await db
      .insert(invoices)
      .values({
        tenantId: "00000000-0000-0000-0000-000000000001",
        patientId: targetPatientId,
        invoiceNumber,
        subtotal: subtotal.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        currency: "ETB",
        status: totalAmount === 0 ? "paid" : "unpaid",
        paidAt: totalAmount === 0 ? new Date() : null,
        paymentMethod: totalAmount === 0 ? "free_tier" : null,
      })
      .returning();

    // 6. Insert Line Items
    if (computedItems.length > 0) {
      await db.insert(invoiceItems).values(
        computedItems.map((item) => ({
          invoiceId: newInvoice.id,
          serviceCode: item.serviceCode,
          description: item.description,
          unitPrice: item.unitPrice.toFixed(2),
          quantity: item.quantity,
          totalPrice: item.totalPrice.toFixed(2),
        }))
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        invoice: newInvoice,
        items: computedItems,
        isGlobalFree,
        isFullyPaid: totalAmount === 0,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
