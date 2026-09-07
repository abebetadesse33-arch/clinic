import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posCashierShifts, posTransactions, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "active";
    const cashierId = searchParams.get("cashierId");
    const shiftId = searchParams.get("shiftId");

    if (view === "active") {
      const shifts = await db
        .select({
          id: posCashierShifts.id,
          cashierId: posCashierShifts.cashierId,
          terminalId: posCashierShifts.terminalId,
          openedAt: posCashierShifts.openedAt,
          closedAt: posCashierShifts.closedAt,
          openingFloat: posCashierShifts.openingFloat,
          expectedCash: posCashierShifts.expectedCash,
          totalCashSales: posCashierShifts.totalCashSales,
          totalTelebirrSales: posCashierShifts.totalTelebirrSales,
          totalCardSales: posCashierShifts.totalCardSales,
          totalInsuranceSales: posCashierShifts.totalInsuranceSales,
          totalTransactions: posCashierShifts.totalTransactions,
          status: posCashierShifts.status,
          cashierName: users.fullName,
        })
        .from(posCashierShifts)
        .leftJoin(users, eq(posCashierShifts.cashierId, users.id))
        .where(
          and(
            eq(posCashierShifts.tenantId, TENANT_ID),
            eq(posCashierShifts.status, "open"),
            ...(cashierId ? [eq(posCashierShifts.cashierId, cashierId)] : [])
          )
        );
      return NextResponse.json({ success: true, data: shifts });
    }

    if (view === "z_report" && shiftId) {
      const [shift] = await db
        .select()
        .from(posCashierShifts)
        .where(eq(posCashierShifts.id, shiftId));
      if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

      const transactions = await db
        .select()
        .from(posTransactions)
        .where(eq(posTransactions.shiftId, shiftId));

      const zReport = {
        shift,
        transactions,
        summary: {
          totalTransactions: transactions.length,
          totalRevenue: transactions.reduce((s, t) => s + parseFloat(t.totalAmount?.toString() ?? "0"), 0),
          totalDiscount: transactions.reduce((s, t) => s + parseFloat(t.discountAmount?.toString() ?? "0"), 0),
          totalTax: transactions.reduce((s, t) => s + parseFloat(t.taxAmount?.toString() ?? "0"), 0),
          byMethod: {
            cash: parseFloat(shift.totalCashSales?.toString() ?? "0"),
            telebirr: parseFloat(shift.totalTelebirrSales?.toString() ?? "0"),
            card: parseFloat(shift.totalCardSales?.toString() ?? "0"),
            insurance: parseFloat(shift.totalInsuranceSales?.toString() ?? "0"),
          },
        },
      };
      return NextResponse.json({ success: true, data: zReport });
    }

    return NextResponse.json({ error: "Invalid view" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "open_shift") {
      const { cashierId, openingFloat, terminalId } = body;
      if (!cashierId) return NextResponse.json({ error: "cashierId required" }, { status: 400 });

      // Check for already open shift
      const existing = await db.select().from(posCashierShifts)
        .where(and(
          eq(posCashierShifts.cashierId, cashierId),
          eq(posCashierShifts.status, "open"),
          eq(posCashierShifts.tenantId, TENANT_ID)
        ));
      if (existing.length > 0) {
        return NextResponse.json({ success: true, data: existing[0], alreadyOpen: true });
      }

      const float = parseFloat(openingFloat ?? "1000");
      const [shift] = await db.insert(posCashierShifts).values({
        tenantId: TENANT_ID,
        cashierId,
        terminalId: terminalId ?? "POS-TERM-01",
        openingFloat: float.toFixed(2),
        expectedCash: float.toFixed(2),
        status: "open",
      }).returning();
      return NextResponse.json({ success: true, data: shift });
    }

    if (action === "close_shift") {
      const { shiftId, actualCash, notes } = body;
      if (!shiftId) return NextResponse.json({ error: "shiftId required" }, { status: 400 });

      const [shift] = await db.select().from(posCashierShifts).where(eq(posCashierShifts.id, shiftId));
      if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

      const actual = parseFloat(actualCash ?? "0");
      const expected = parseFloat(shift.expectedCash?.toString() ?? "0");
      const variance = actual - expected;

      const [closed] = await db.update(posCashierShifts)
        .set({
          status: "closed",
          closedAt: new Date(),
          actualCash: actual.toFixed(2),
          cashVariance: variance.toFixed(2),
          notes: notes ?? null,
        })
        .where(eq(posCashierShifts.id, shiftId))
        .returning();
      return NextResponse.json({ success: true, data: closed });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
