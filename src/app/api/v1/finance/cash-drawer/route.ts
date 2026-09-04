import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cashDrawers, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/finance/cash-drawer?tenantId=&cashierId=&status=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const tenantId = searchParams.get("tenantId");
    const cashierId = searchParams.get("cashierId");
    const status = searchParams.get("status");

    const drawers = await db
      .select({
        id: cashDrawers.id,
        cashierId: cashDrawers.cashierId,
        shiftLabel: cashDrawers.shiftLabel,
        openingCashEtb: cashDrawers.openingCashEtb,
        totalCollectedCashEtb: cashDrawers.totalCollectedCashEtb,
        totalCollectedMobileEtb: cashDrawers.totalCollectedMobileEtb,
        totalCollectedCardEtb: cashDrawers.totalCollectedCardEtb,
        totalCollectedInsuranceEtb: cashDrawers.totalCollectedInsuranceEtb,
        closingCashExpectedEtb: cashDrawers.closingCashExpectedEtb,
        closingCashActualEtb: cashDrawers.closingCashActualEtb,
        discrepancyEtb: cashDrawers.discrepancyEtb,
        denominationBreakdown: cashDrawers.denominationBreakdown,
        transactionCount: cashDrawers.transactionCount,
        status: cashDrawers.status,
        supervisorApprovedAt: cashDrawers.supervisorApprovedAt,
        discrepancyNotes: cashDrawers.discrepancyNotes,
        openedAt: cashDrawers.openedAt,
        closedAt: cashDrawers.closedAt,
        cashierName: users.fullName,
      })
      .from(cashDrawers)
      .innerJoin(users, eq(cashDrawers.cashierId, users.id))
      .where(
        tenantId
          ? and(
              eq(cashDrawers.tenantId, tenantId),
              cashierId ? eq(cashDrawers.cashierId, cashierId) : undefined
            )
          : undefined
      )
      .orderBy(desc(cashDrawers.openedAt));

    const filtered = status ? drawers.filter((d) => d.status === status) : drawers;
    return NextResponse.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error("[CASH DRAWER GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// POST /api/v1/finance/cash-drawer — open or close drawer session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, tenantId, cashierId, shiftLabel, openingCashEtb } = body;

    if (action === "open") {
      if (!tenantId || !cashierId || !shiftLabel) {
        return NextResponse.json({ success: false, error: "tenantId, cashierId, shiftLabel required." }, { status: 400 });
      }

      // Check if cashier already has an open drawer
      const existing = await db
        .select()
        .from(cashDrawers)
        .where(and(eq(cashDrawers.cashierId, cashierId), eq(cashDrawers.status, "open")))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json({ success: false, error: "Cashier already has an open register session." }, { status: 409 });
      }

      const [drawer] = await db
        .insert(cashDrawers)
        .values({
          tenantId,
          cashierId,
          shiftLabel,
          openingCashEtb: (openingCashEtb || 0).toString(),
          status: "open",
          openedAt: new Date(),
        })
        .returning();

      return NextResponse.json({ success: true, data: drawer, message: "Register opened. You are ready to accept payments." }, { status: 201 });
    }

    if (action === "close") {
      const {
        drawerId, closingCashActualEtb, denominationBreakdown,
        supervisorApprovedBy, discrepancyNotes,
        totalCollectedCashEtb, totalCollectedMobileEtb,
        totalCollectedCardEtb, totalCollectedInsuranceEtb, transactionCount,
      } = body;

      const [drawer] = await db
        .select()
        .from(cashDrawers)
        .where(eq(cashDrawers.id, drawerId))
        .limit(1);

      if (!drawer) {
        return NextResponse.json({ success: false, error: "Drawer session not found." }, { status: 404 });
      }

      const collectedCash = parseFloat(totalCollectedCashEtb || "0");
      const opening = parseFloat(drawer.openingCashEtb || "0");
      const expectedClosing = opening + collectedCash;
      const actualClosing = parseFloat(closingCashActualEtb || "0");
      const discrepancy = actualClosing - expectedClosing;

      const [updated] = await db
        .update(cashDrawers)
        .set({
          status: "closed",
          totalCollectedCashEtb: collectedCash.toFixed(2),
          totalCollectedMobileEtb: (parseFloat(totalCollectedMobileEtb || "0")).toFixed(2),
          totalCollectedCardEtb: (parseFloat(totalCollectedCardEtb || "0")).toFixed(2),
          totalCollectedInsuranceEtb: (parseFloat(totalCollectedInsuranceEtb || "0")).toFixed(2),
          closingCashExpectedEtb: expectedClosing.toFixed(2),
          closingCashActualEtb: actualClosing.toFixed(2),
          discrepancyEtb: discrepancy.toFixed(2),
          denominationBreakdown: denominationBreakdown || {},
          transactionCount: transactionCount || 0,
          closedAt: new Date(),
          supervisorApprovedBy: supervisorApprovedBy || null,
          supervisorApprovedAt: supervisorApprovedBy ? new Date() : null,
          discrepancyNotes: discrepancyNotes || null,
        })
        .where(eq(cashDrawers.id, drawerId))
        .returning();

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Shift closed. Discrepancy: ${discrepancy >= 0 ? "+" : ""}${discrepancy.toFixed(2)} ETB.`,
        hasDiscrepancy: Math.abs(discrepancy) > 1,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action. Use open or close." }, { status: 400 });
  } catch (error: any) {
    console.error("[CASH DRAWER POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
