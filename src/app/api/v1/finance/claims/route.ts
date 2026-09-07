import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  insuranceClaims, insurancePayers, invoices, patients, encounters,
  journalEntries, journalEntryLines, chartOfAccounts,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/finance/claims?status=&payerId=&tenantId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const payerId = searchParams.get("payerId");
    const tenantId = searchParams.get("tenantId");

    const claims = await db
      .select({
        id: insuranceClaims.id,
        claimNumber: insuranceClaims.claimNumber,
        invoiceId: insuranceClaims.invoiceId,
        patientId: insuranceClaims.patientId,
        payerId: insuranceClaims.payerId,
        preAuthCode: insuranceClaims.preAuthCode,
        icd10Codes: insuranceClaims.icd10Codes,
        cptCodes: insuranceClaims.cptCodes,
        totalClaimAmountEtb: insuranceClaims.totalClaimAmountEtb,
        approvedAmountEtb: insuranceClaims.approvedAmountEtb,
        patientCopayAmountEtb: insuranceClaims.patientCopayAmountEtb,
        reimbursedAmountEtb: insuranceClaims.reimbursedAmountEtb,
        denialCode: insuranceClaims.denialCode,
        denialReason: insuranceClaims.denialReason,
        appealNotes: insuranceClaims.appealNotes,
        status: insuranceClaims.status,
        submittedAt: insuranceClaims.submittedAt,
        adjudicatedAt: insuranceClaims.adjudicatedAt,
        reimbursedAt: insuranceClaims.reimbursedAt,
        createdAt: insuranceClaims.createdAt,
        payerName: insurancePayers.name,
        payerCode: insurancePayers.payerCode,
        patientName: patients.firstName,
        patientLastName: patients.lastName,
        mrn: patients.mrn,
      })
      .from(insuranceClaims)
      .innerJoin(insurancePayers, eq(insuranceClaims.payerId, insurancePayers.id))
      .innerJoin(patients, eq(insuranceClaims.patientId, patients.id))
      .where(tenantId ? eq(insuranceClaims.tenantId, tenantId) : undefined)
      .orderBy(desc(insuranceClaims.createdAt));

    let filtered = claims;
    if (status) filtered = filtered.filter((c) => c.status === status);
    if (payerId) filtered = filtered.filter((c) => c.payerId === payerId);

    return NextResponse.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error("[FINANCE CLAIMS GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// POST /api/v1/finance/claims — file a new claim
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId, invoiceId, patientId, payerId, encounterId,
      preAuthCode, icd10Codes, cptCodes, totalClaimAmountEtb,
      patientCopayAmountEtb, processedBy,
    } = body;

    if (!tenantId || !patientId || !payerId || !totalClaimAmountEtb) {
      return NextResponse.json({ success: false, error: "Missing required claim fields." }, { status: 400 });
    }

    const claimNumber = `CLM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const [claim] = await db
      .insert(insuranceClaims)
      .values({
        tenantId,
        claimNumber,
        invoiceId: invoiceId || null,
        patientId,
        payerId,
        encounterId: encounterId || null,
        preAuthCode: preAuthCode || null,
        icd10Codes: icd10Codes || [],
        cptCodes: cptCodes || [],
        totalClaimAmountEtb: totalClaimAmountEtb.toString(),
        approvedAmountEtb: "0.00",
        patientCopayAmountEtb: (patientCopayAmountEtb || 0).toString(),
        reimbursedAmountEtb: "0.00",
        status: "submitted",
        processedBy: processedBy || null,
        submittedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, data: claim, claimNumber }, { status: 201 });
  } catch (error: any) {
    console.error("[FINANCE CLAIMS POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// PATCH /api/v1/finance/claims — adjudicate claim
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      claimId, action, approvedAmountEtb, reimbursedAmountEtb,
      denialCode, denialReason, appealNotes, tenantId, processedBy,
    } = body;

    if (!claimId || !action) {
      return NextResponse.json({ success: false, error: "claimId and action required." }, { status: 400 });
    }

    let updateData: any = { updatedAt: new Date() };

    if (action === "approve") {
      updateData.status = "approved";
      updateData.approvedAmountEtb = approvedAmountEtb?.toString() || "0.00";
      updateData.adjudicatedAt = new Date();
    } else if (action === "partially_approve") {
      updateData.status = "partially_approved";
      updateData.approvedAmountEtb = approvedAmountEtb?.toString() || "0.00";
      updateData.adjudicatedAt = new Date();
    } else if (action === "reject") {
      updateData.status = "rejected";
      updateData.denialCode = denialCode || null;
      updateData.denialReason = denialReason || null;
      updateData.adjudicatedAt = new Date();
    } else if (action === "reimburse") {
      updateData.status = "reimbursed";
      updateData.reimbursedAmountEtb = reimbursedAmountEtb?.toString() || "0.00";
      updateData.reimbursedAt = new Date();

      // Auto-journal entry: DR Insurance AR, CR Bank
      if (tenantId && reimbursedAmountEtb) {
        const arAccount = await db
          .select()
          .from(chartOfAccounts)
          .where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.accountCode, "1200")))
          .limit(1);
        const bankAccount = await db
          .select()
          .from(chartOfAccounts)
          .where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.accountCode, "1110")))
          .limit(1);

        if (arAccount.length > 0 && bankAccount.length > 0) {
          const [je] = await db
            .insert(journalEntries)
            .values({
              tenantId,
              entryNumber: `JE-INS-${Date.now()}`,
              entryDate: new Date().toISOString().split("T")[0],
              description: `Insurance reimbursement – Claim #${claimId.slice(0, 8)}`,
              referenceType: "insurance_claim",
              referenceId: claimId,
              totalDebit: reimbursedAmountEtb.toString(),
              totalCredit: reimbursedAmountEtb.toString(),
              status: "posted",
              postedBy: processedBy || null,
              postedAt: new Date(),
            })
            .returning();

          await db.insert(journalEntryLines).values([
            { journalEntryId: je.id, accountId: bankAccount[0].id, debit: reimbursedAmountEtb.toString(), credit: "0.00", memo: "Insurance payment received", lineOrder: 1 },
            { journalEntryId: je.id, accountId: arAccount[0].id, debit: "0.00", credit: reimbursedAmountEtb.toString(), memo: "Insurance AR cleared", lineOrder: 2 },
          ]);
        }
      }
    } else if (action === "appeal") {
      updateData.status = "appealed";
      updateData.appealNotes = appealNotes || null;
    } else {
      return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
    }

    const [updated] = await db
      .update(insuranceClaims)
      .set(updateData)
      .where(eq(insuranceClaims.id, claimId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[FINANCE CLAIMS PATCH]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
