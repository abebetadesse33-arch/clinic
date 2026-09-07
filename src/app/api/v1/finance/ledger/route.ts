import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  chartOfAccounts, journalEntries, journalEntryLines,
} from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/finance/ledger?tenantId=&type=accounts|transactions|balance_sheet|pl
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const tenantId = searchParams.get("tenantId");
    const type = searchParams.get("type") || "accounts";

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "tenantId is required." }, { status: 400 });
    }

    if (type === "accounts") {
      const accounts = await db
        .select()
        .from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.isActive, true)))
        .orderBy(chartOfAccounts.accountCode);

      return NextResponse.json({ success: true, data: accounts });
    }

    if (type === "transactions") {
      const entries = await db
        .select({
          id: journalEntries.id,
          entryNumber: journalEntries.entryNumber,
          entryDate: journalEntries.entryDate,
          description: journalEntries.description,
          referenceType: journalEntries.referenceType,
          totalDebit: journalEntries.totalDebit,
          totalCredit: journalEntries.totalCredit,
          status: journalEntries.status,
          postedAt: journalEntries.postedAt,
          createdAt: journalEntries.createdAt,
        })
        .from(journalEntries)
        .where(and(eq(journalEntries.tenantId, tenantId), eq(journalEntries.status, "posted")))
        .orderBy(desc(journalEntries.entryDate));

      return NextResponse.json({ success: true, data: entries });
    }

    if (type === "balance_sheet") {
      const accounts = await db
        .select()
        .from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.isActive, true)))
        .orderBy(chartOfAccounts.accountType, chartOfAccounts.accountCode);

      const grouped: Record<string, typeof accounts> = {};
      for (const acc of accounts) {
        if (!grouped[acc.accountType]) grouped[acc.accountType] = [];
        grouped[acc.accountType].push(acc);
      }

      const summarize = (type: string) =>
        (grouped[type] || []).reduce((sum, a) => sum + parseFloat(a.currentBalance || "0"), 0);

      const totalAssets = summarize("asset");
      const totalLiabilities = summarize("liability");
      const totalEquity = summarize("equity");
      const totalRevenue = summarize("revenue");
      const totalCOGS = summarize("cogs");
      const totalExpenses = summarize("expense");
      const netIncome = totalRevenue - totalCOGS - totalExpenses;

      return NextResponse.json({
        success: true,
        data: {
          assets: grouped["asset"] || [],
          liabilities: grouped["liability"] || [],
          equity: grouped["equity"] || [],
          revenue: grouped["revenue"] || [],
          cogs: grouped["cogs"] || [],
          expenses: grouped["expense"] || [],
          totals: {
            totalAssets,
            totalLiabilities,
            totalEquity,
            totalRevenue,
            totalCOGS,
            totalExpenses,
            netIncome,
            totalLiabilitiesAndEquity: totalLiabilities + totalEquity + netIncome,
          },
        },
      });
    }

    if (type === "pl") {
      // Profit & Loss grouped by department
      const accounts = await db
        .select()
        .from(chartOfAccounts)
        .where(
          and(
            eq(chartOfAccounts.tenantId, tenantId),
            eq(chartOfAccounts.isActive, true)
          )
        );

      const revenueAccounts = accounts.filter((a) => a.accountType === "revenue");
      const cogsAccounts = accounts.filter((a) => a.accountType === "cogs");
      const expenseAccounts = accounts.filter((a) => a.accountType === "expense");

      const totalRevenue = revenueAccounts.reduce((s, a) => s + parseFloat(a.currentBalance || "0"), 0);
      const totalCOGS = cogsAccounts.reduce((s, a) => s + parseFloat(a.currentBalance || "0"), 0);
      const totalExpenses = expenseAccounts.reduce((s, a) => s + parseFloat(a.currentBalance || "0"), 0);
      const grossProfit = totalRevenue - totalCOGS;
      const netIncome = grossProfit - totalExpenses;
      const margin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : "0.0";

      return NextResponse.json({
        success: true,
        data: {
          revenue: revenueAccounts,
          cogs: cogsAccounts,
          expenses: expenseAccounts,
          totals: { totalRevenue, totalCOGS, totalExpenses, grossProfit, netIncome, netMarginPct: margin },
        },
      });
    }

    return NextResponse.json({ success: false, error: "Invalid type. Use: accounts, transactions, balance_sheet, pl" }, { status: 400 });
  } catch (error: any) {
    console.error("[FINANCE LEDGER GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// POST /api/v1/finance/ledger — manual journal entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, description, referenceType, entryDate, lines, postedBy } = body;

    if (!tenantId || !lines || lines.length < 2) {
      return NextResponse.json({ success: false, error: "tenantId and at least 2 journal lines required." }, { status: 400 });
    }

    const totalDebit = lines
      .filter((l: any) => l.debit > 0)
      .reduce((s: number, l: any) => s + parseFloat(l.debit), 0);
    const totalCredit = lines
      .filter((l: any) => l.credit > 0)
      .reduce((s: number, l: any) => s + parseFloat(l.credit), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({
        success: false,
        error: `Journal entry is unbalanced: Debit ${totalDebit.toFixed(2)} ≠ Credit ${totalCredit.toFixed(2)}.`,
      }, { status: 400 });
    }

    const entryNumber = `JE-MAN-${Date.now()}`;
    const [je] = await db
      .insert(journalEntries)
      .values({
        tenantId,
        entryNumber,
        entryDate: entryDate || new Date().toISOString().split("T")[0],
        description: description || "Manual journal entry",
        referenceType: referenceType || "manual_adjustment",
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
        status: "posted",
        postedBy: postedBy || null,
        postedAt: new Date(),
      })
      .returning();

    const lineRows = lines.map((l: any, i: number) => ({
      journalEntryId: je.id,
      accountId: l.accountId,
      debit: (parseFloat(l.debit) || 0).toFixed(2),
      credit: (parseFloat(l.credit) || 0).toFixed(2),
      department: l.department || null,
      memo: l.memo || null,
      lineOrder: i + 1,
    }));

    await db.insert(journalEntryLines).values(lineRows);

    return NextResponse.json({ success: true, data: { entry: je, lines: lineRows }, entryNumber });
  } catch (error: any) {
    console.error("[FINANCE LEDGER POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
