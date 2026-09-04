import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  payrollRuns, payrollItems, staffProfiles, staffAttendance, users,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Ethiopian PAYE Tax bands (FY2024 ETB/month):
 * 0 – 600       → 0%
 * 601 – 1,650   → 10%
 * 1,651 – 3,200 → 15%
 * 3,201 – 5,250 → 20%
 * 5,251 – 7,800 → 25%
 * 7,801 – 10,900 → 30%
 * 10,901+       → 35%
 */
function calculatePAYE(grossMonthly: number): number {
  if (grossMonthly <= 600) return 0;
  if (grossMonthly <= 1650) return (grossMonthly - 600) * 0.10;
  if (grossMonthly <= 3200) return 105 + (grossMonthly - 1650) * 0.15;
  if (grossMonthly <= 5250) return 337.5 + (grossMonthly - 3200) * 0.20;
  if (grossMonthly <= 7800) return 747.5 + (grossMonthly - 5250) * 0.25;
  if (grossMonthly <= 10900) return 1385 + (grossMonthly - 7800) * 0.30;
  return 2315 + (grossMonthly - 10900) * 0.35;
}

// GET /api/v1/hr/payroll?tenantId=&status=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const tenantId = searchParams.get("tenantId");
    const status = searchParams.get("status");

    const runs = await db
      .select()
      .from(payrollRuns)
      .where(tenantId ? eq(payrollRuns.tenantId, tenantId) : undefined)
      .orderBy(desc(payrollRuns.periodYear), desc(payrollRuns.periodMonth));

    const filtered = status ? runs.filter((r) => r.status === status) : runs;

    return NextResponse.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error("[HR PAYROLL GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// POST /api/v1/hr/payroll — compute or approve a payroll run
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, tenantId, periodMonth, periodYear, processedBy } = body;

    if (action === "compute") {
      if (!tenantId || !periodMonth || !periodYear) {
        return NextResponse.json({ success: false, error: "tenantId, periodMonth, periodYear required." }, { status: 400 });
      }

      // Fetch all active staff for this tenant
      const allStaff = await db
        .select()
        .from(staffProfiles)
        .where(and(eq(staffProfiles.tenantId, tenantId), eq(staffProfiles.status, "active")));

      if (allStaff.length === 0) {
        return NextResponse.json({ success: false, error: "No active staff found for this tenant." }, { status: 404 });
      }

      // Create payroll run (draft)
      const [run] = await db
        .insert(payrollRuns)
        .values({
          tenantId, periodMonth, periodYear,
          status: "draft",
          staffCount: allStaff.length,
          processedBy: processedBy || null,
          processedAt: new Date(),
        })
        .returning();

      let totalGross = 0, totalNet = 0, totalTax = 0, totalPensionEmp = 0, totalPensionEmpr = 0;
      let totalOnCall = 0, totalOT = 0;

      const items = [];
      for (const staff of allStaff) {
        const baseSalary = parseFloat(staff.baseSalaryEtb?.toString() || "0");
        const onCallRate = parseFloat(staff.onCallAllowanceRate?.toString() || "0");
        const revenueSharePct = parseFloat(staff.consultationRevenueSharePct?.toString() || "0");

        // Simplified: mock on-call allowance (3 on-call nights × rate)
        const onCallAllowance = onCallRate * 3;
        // Mock overtime — in production: sum from staffAttendance for the period
        const overtimePay = baseSalary * 0.05; // ~5% overtime estimate
        const revenueShare = (baseSalary * revenueSharePct) / 100;
        const bonus = 0;
        const otherAllowances = 0;

        const grossPay = baseSalary + onCallAllowance + overtimePay + revenueShare + bonus + otherAllowances;
        const payeTax = calculatePAYE(grossPay);
        const pensionEmployee = grossPay * 0.07;  // 7%
        const pensionEmployer = grossPay * 0.11;  // 11%
        const totalDeductions = payeTax + pensionEmployee;
        const netPay = grossPay - totalDeductions;

        totalGross += grossPay;
        totalNet += netPay;
        totalTax += payeTax;
        totalPensionEmp += pensionEmployee;
        totalPensionEmpr += pensionEmployer;
        totalOnCall += onCallAllowance;
        totalOT += overtimePay;

        items.push({
          payrollRunId: run.id,
          staffId: staff.id,
          baseSalaryEtb: baseSalary.toFixed(2),
          onCallAllowanceEtb: onCallAllowance.toFixed(2),
          overtimePayEtb: overtimePay.toFixed(2),
          revenueShareEtb: revenueShare.toFixed(2),
          bonusEtb: bonus.toFixed(2),
          otherAllowancesEtb: otherAllowances.toFixed(2),
          grossPayEtb: grossPay.toFixed(2),
          payeTaxEtb: payeTax.toFixed(2),
          pensionEmployeeEtb: pensionEmployee.toFixed(2),
          pensionEmployerEtb: pensionEmployer.toFixed(2),
          voluntaryDeductionsEtb: "0.00",
          totalDeductionsEtb: totalDeductions.toFixed(2),
          netPayEtb: netPay.toFixed(2),
          disbursementMethod: (staff.mobileWalletProvider !== "none" ? "mobile_wallet" : "bank_transfer") as "bank_transfer" | "mobile_wallet" | "cash",
        });
      }

      if (items.length > 0) {
        await db.insert(payrollItems).values(items);
      }

      // Update run totals and set to calculated
      const [updatedRun] = await db
        .update(payrollRuns)
        .set({
          totalGrossEtb: totalGross.toFixed(2),
          totalNetEtb: totalNet.toFixed(2),
          totalPayeTaxEtb: totalTax.toFixed(2),
          totalPensionEmployeeEtb: totalPensionEmp.toFixed(2),
          totalPensionEmployerEtb: totalPensionEmpr.toFixed(2),
          totalOnCallAllowanceEtb: totalOnCall.toFixed(2),
          totalOvertimePaidEtb: totalOT.toFixed(2),
          status: "calculated",
        })
        .where(eq(payrollRuns.id, run.id))
        .returning();

      return NextResponse.json({ success: true, data: { run: updatedRun, itemCount: items.length } }, { status: 201 });
    }

    if (action === "approve") {
      const { runId, approvedBy } = body;
      const [updated] = await db
        .update(payrollRuns)
        .set({ status: "approved", approvedBy, approvedAt: new Date() })
        .where(eq(payrollRuns.id, runId))
        .returning();
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "disburse") {
      const { runId } = body;
      const [updated] = await db
        .update(payrollRuns)
        .set({ status: "disbursed", disbursedAt: new Date() })
        .where(eq(payrollRuns.id, runId))
        .returning();
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: "Unknown action. Use compute, approve, or disburse." }, { status: 400 });
  } catch (error: any) {
    console.error("[HR PAYROLL POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// PATCH — fetch payroll items for a given run
export async function PATCH(req: NextRequest) {
  try {
    const { runId } = await req.json();
    const items = await db
      .select({
        id: payrollItems.id,
        staffId: payrollItems.staffId,
        baseSalaryEtb: payrollItems.baseSalaryEtb,
        onCallAllowanceEtb: payrollItems.onCallAllowanceEtb,
        overtimePayEtb: payrollItems.overtimePayEtb,
        grossPayEtb: payrollItems.grossPayEtb,
        payeTaxEtb: payrollItems.payeTaxEtb,
        pensionEmployeeEtb: payrollItems.pensionEmployeeEtb,
        netPayEtb: payrollItems.netPayEtb,
        disbursementMethod: payrollItems.disbursementMethod,
        fullName: users.fullName,
        employeeCode: staffProfiles.employeeCode,
        department: staffProfiles.department,
        designation: staffProfiles.designation,
      })
      .from(payrollItems)
      .innerJoin(staffProfiles, eq(payrollItems.staffId, staffProfiles.id))
      .innerJoin(users, eq(staffProfiles.userId, users.id))
      .where(eq(payrollItems.payrollRunId, runId));

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
