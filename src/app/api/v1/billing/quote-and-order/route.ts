import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  servicePricingCatalog,
  invoices,
  invoiceItems,
  labOrders,
  prescriptions,
  patients,
  patientRegistrationPasses,
  systemPaymentSettings,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Standard lab test pricing table (fallback if catalog not populated)
const DEFAULT_LAB_PRICES: Record<string, { code: string; name: string; price: number }> = {
  hba1c: { code: "LAB_HBA1C", name: "Hemoglobin A1c (HbA1c) Glycated Blood Test", price: 380 },
  lipid: { code: "LAB_LIPID_PANEL", name: "Comprehensive Lipid Profile (Cholesterol, HDL, LDL, Triglycerides)", price: 420 },
  renal: { code: "LAB_RENAL_PANEL", name: "Renal Function Panel & eGFR (Creatinine, BUN, Electrolytes)", price: 350 },
  cbc: { code: "LAB_CBC", name: "Complete Blood Count (CBC) with Differential", price: 280 },
  liver: { code: "LAB_LIVER_PANEL", name: "Hepatic Function Panel (LFT)", price: 400 },
  xray: { code: "IMAGING_CHEST_XRAY", name: "PA Digital Chest Radiograph", price: 650 },
  ultrasound: { code: "IMAGING_ULTRASOUND", name: "Abdominal & Renal Diagnostic Ultrasound", price: 950 },
  urinalysis: { code: "LAB_URINALYSIS", name: "Clinical Urinalysis & Microscopy", price: 180 },
  glucose: { code: "LAB_FASTING_GLUCOSE", name: "Fasting Blood Glucose", price: 150 },
  thyroid: { code: "LAB_TSH", name: "Thyroid Stimulating Hormone (TSH)", price: 390 },
};

// Standard medication unit pricing table in Birr (ETB)
const DEFAULT_MED_PRICES: Record<string, number> = {
  metformin: 8.5,
  amoxicillin: 15.0,
  atorvastatin: 14.0,
  lisinopril: 9.0,
  omeprazole: 12.0,
  amlodipine: 7.5,
  losartan: 11.0,
  paracetamol: 3.5,
  ibuprofen: 5.0,
  azithromycin: 28.0,
  ciprofloxacin: 22.0,
  salbutamol: 180.0,
  insulin: 450.0,
  empagliflozin: 38.0,
  clopidogrel: 16.0,
};

// POST /api/v1/billing/quote-and-order
// Dynamically generates price quotes, calculates total price, and creates pending invoices for Lab & Pharmacy
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientId,
      department, // "laboratory" | "pharmacy" | "combined"
      labTests = [], // Array of string test names or objects { testName, priority, clinicalReason }
      medications = [], // Array of objects { medicationName, dosage, frequency, quantity, durationDays, instructions }
      doctorId,
    } = body;

    if (!patientId || !department) {
      return NextResponse.json(
        { success: false, error: "patientId and department are required." },
        { status: 400 }
      );
    }

    // 1. Fetch Patient & Check Membership Validity
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient record not found." },
        { status: 404 }
      );
    }

    // 2. Fetch Master Settings & Active Registration Pass
    const [settings] = await db.select().from(systemPaymentSettings).limit(1);
    const isGlobalFree = Boolean(settings?.globalFreeMode);

    const [activePass] = await db
      .select()
      .from(patientRegistrationPasses)
      .where(
        and(
          eq(patientRegistrationPasses.patientId, patientId),
          eq(patientRegistrationPasses.status, "active"),
          sql`${patientRegistrationPasses.expiresAt} > NOW()`
        )
      )
      .limit(1);

    const hasActiveMembership = Boolean(activePass);

    // 3. Fetch Service Pricing Catalog
    const catalogRows = await db.select().from(servicePricingCatalog).where(eq(servicePricingCatalog.isActive, true));
    const catalogMap = new Map(catalogRows.map((r) => [r.serviceCode, r]));

    const lineItems: Array<{
      serviceCode: string;
      description: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
      category: string;
      meta?: any;
    }> = [];

    // 4. Calculate Laboratory Items
    if (department === "laboratory" || department === "combined") {
      for (const t of labTests) {
        const testName = typeof t === "string" ? t : t.testName;
        const normalized = testName.toLowerCase();

        let match = Object.entries(DEFAULT_LAB_PRICES).find(([key]) => normalized.includes(key))?.[1];
        let basePrice = match?.price || 300.0;
        let serviceCode = match?.code || `LAB_${testName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
        let description = match?.name || `Diagnostic Laboratory Panel: ${testName}`;

        const catalogItem = catalogMap.get(serviceCode);
        if (catalogItem) {
          basePrice = Number(catalogItem.basePrice);
          description = catalogItem.name;
          if (catalogItem.isFree) basePrice = 0.0;
        }

        if (isGlobalFree) basePrice = 0.0;

        lineItems.push({
          serviceCode,
          description,
          unitPrice: basePrice,
          quantity: 1,
          totalPrice: basePrice,
          category: "laboratory",
          meta: typeof t === "object" ? t : { testName },
        });
      }
    }

    // 5. Calculate Pharmacy Items
    if (department === "pharmacy" || department === "combined") {
      for (const m of medications) {
        const medName = m.medicationName || "Medication";
        const normalized = medName.toLowerCase();
        const quantity = Number(m.quantity) || 30;

        let unitPrice = Object.entries(DEFAULT_MED_PRICES).find(([key]) => normalized.includes(key))?.[1] || 10.0;

        if (isGlobalFree) unitPrice = 0.0;

        const totalMedPrice = Number((unitPrice * quantity).toFixed(2));
        const serviceCode = `RX_${medName.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 32)}`;

        lineItems.push({
          serviceCode,
          description: `Prescription: ${medName} ${m.dosage || ""} (${quantity} units · ${m.durationDays || 30} days)`,
          unitPrice,
          quantity,
          totalPrice: totalMedPrice,
          category: "pharmacy",
          meta: m,
        });
      }
    }

    // 6. Compute Totals, Discounts, and Net Payable
    const subtotal = lineItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

    // Apply 20% pharmacy discount and 10% lab discount for members with active registration pass
    let discountAmount = 0;
    let discountReason = "";

    if (isGlobalFree) {
      discountAmount = subtotal;
      discountReason = "100% Emergency Clinical Waiver Active";
    } else if (hasActiveMembership) {
      // 20% discount on pharmacy, 10% on labs
      const rxSubtotal = lineItems.filter((i) => i.category === "pharmacy").reduce((acc, curr) => acc + curr.totalPrice, 0);
      const labSubtotal = lineItems.filter((i) => i.category === "laboratory").reduce((acc, curr) => acc + curr.totalPrice, 0);
      discountAmount = Number((rxSubtotal * 0.2 + labSubtotal * 0.1).toFixed(2));
      discountReason = "NiniMed Health Shield 3-Month Member Benefit (20% Rx / 10% Lab)";
    }

    const totalAmount = Number(Math.max(0, subtotal - discountAmount).toFixed(2));

    // 7. Generate Itemized Invoice
    const invoicePrefix = department === "laboratory" ? "INV-LAB" : department === "pharmacy" ? "INV-RX" : "INV-CLINIC";
    const invoiceNumber = `${invoicePrefix}-${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`;

    const [newInvoice] = await db
      .insert(invoices)
      .values({
        tenantId: patient.tenantId || "00000000-0000-0000-0000-000000000001",
        patientId,
        invoiceNumber,
        status: totalAmount === 0 ? "paid" : "draft",
        paymentMethod: totalAmount === 0 ? "waived" : null,
        subtotal: subtotal.toString(),
        taxAmount: "0.00",
        discountAmount: discountAmount.toString(),
        totalAmount: totalAmount.toString(),
        currency: "ETB",
        paidAt: totalAmount === 0 ? new Date() : null,
      })
      .returning();

    // 8. Insert Invoice Line Items
    for (const item of lineItems) {
      await db.insert(invoiceItems).values({
        invoiceId: newInvoice.id,
        serviceCode: item.serviceCode,
        description: item.description,
        unitPrice: item.unitPrice.toString(),
        quantity: item.quantity,
        totalPrice: item.totalPrice.toString(),
      });
    }

    // 9. Persist Lab Orders linked to Invoice
    const createdLabOrders = [];
    if (department === "laboratory" || department === "combined") {
      const doc = doctorId || "00000000-0000-0000-0000-000000000001";
      for (const item of lineItems.filter((i) => i.category === "laboratory")) {
        const [order] = await db
          .insert(labOrders)
          .values({
            tenantId: patient.tenantId || "00000000-0000-0000-0000-000000000001",
            patientId,
            doctorId: doc,
            testName: item.meta?.testName || item.description,
            clinicalReason: item.meta?.clinicalReason || "Comprehensive clinical evaluation",
            priority: item.meta?.priority || "routine",
            status: totalAmount === 0 ? "payment_cleared" : "pending_payment",
            price: item.totalPrice.toString(),
            currency: "ETB",
            paymentStatus: totalAmount === 0 ? "free" : "unpaid",
            invoiceId: newInvoice.id,
          })
          .returning();
        createdLabOrders.push(order);
      }
    }

    // 10. Persist Prescriptions linked to Invoice
    const createdPrescriptions = [];
    if (department === "pharmacy" || department === "combined") {
      const doc = doctorId || "00000000-0000-0000-0000-000000000001";
      for (const item of lineItems.filter((i) => i.category === "pharmacy")) {
        const m = item.meta || {};
        const [rx] = await db
          .insert(prescriptions)
          .values({
            tenantId: patient.tenantId || "00000000-0000-0000-0000-000000000001",
            patientId,
            doctorId: doc,
            status: totalAmount === 0 ? "payment_cleared" : "pending_payment",
            medicationName: m.medicationName || "Medication",
            dosage: m.dosage || "Standard",
            frequency: m.frequency || "Once daily",
            route: m.route || "Oral",
            indication: m.indication || "Clinical maintenance",
            durationDays: Number(m.durationDays) || 30,
            quantity: Number(m.quantity) || 30,
            instructions: m.instructions || "Take as directed by clinician with water.",
            unitPrice: item.unitPrice.toString(),
            totalPrice: item.totalPrice.toString(),
            currency: "ETB",
            paymentStatus: totalAmount === 0 ? "free" : "unpaid",
            invoiceId: newInvoice.id,
          })
          .returning();
        createdPrescriptions.push(rx);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        invoiceId: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        department,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientMrn: patient.mrn,
        itemsCount: lineItems.length,
        items: lineItems,
        subtotalEtb: subtotal,
        discountEtb: discountAmount,
        discountReason,
        totalAmountEtb: totalAmount,
        currency: "ETB",
        status: newInvoice.status,
        labOrders: createdLabOrders,
        prescriptions: createdPrescriptions,
      },
      message: `Generated dynamic quote of ${totalAmount} Birr for ${lineItems.length} items.`,
    });
  } catch (error: any) {
    console.error("Error generating dynamic billing quote:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate dynamic quote" },
      { status: 500 }
    );
  }
}
