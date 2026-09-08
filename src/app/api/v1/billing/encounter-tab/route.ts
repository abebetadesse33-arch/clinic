import { NextRequest, NextResponse } from "next/server";
import { EncounterTabService } from "@/lib/services/encounter-tab-service";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/billing/encounter-tab?encounterId=...
 * Returns active tab status, itemized charges, and discharge statement (refund or balance due).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const encounterId = searchParams.get("encounterId");

    if (!encounterId) {
      return NextResponse.json({ success: false, error: "encounterId is required" }, { status: 400 });
    }

    const statement = await EncounterTabService.calculateDischargeStatement(encounterId);

    if (!statement) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No Encounter Tab active for this encounter.",
      });
    }

    return NextResponse.json({
      success: true,
      data: statement,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to load encounter tab" }, { status: 500 });
  }
}

/**
 * POST /api/v1/billing/encounter-tab
 * Opens a new encounter tab or adds additional deposit at registration / check-in.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { encounterId, patientId, depositAmountEtb, depositMethod = "cash", depositTxRef, tenantId } = body;

    if (!encounterId || !patientId) {
      return NextResponse.json({ success: false, error: "encounterId and patientId are required" }, { status: 400 });
    }

    const sessionUserId = await getAuthenticatedSessionUserId(req);

    const tab = await EncounterTabService.openTab({
      tenantId,
      encounterId,
      patientId,
      depositAmountEtb: Number(depositAmountEtb) || 0,
      depositMethod,
      depositTxRef,
      actorId: sessionUserId || undefined,
    });

    return NextResponse.json({
      success: true,
      data: tab,
      message: `Encounter Tab opened successfully with ETB ${Number(depositAmountEtb) || 0} deposit.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to open encounter tab" }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/billing/encounter-tab
 * Settles the encounter tab at patient discharge (processes refund or collects final balance).
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { encounterId, finalPaymentMethod, finalTxRef, settlementNotes } = body;

    if (!encounterId) {
      return NextResponse.json({ success: false, error: "encounterId is required" }, { status: 400 });
    }

    const sessionUserId = await getAuthenticatedSessionUserId(req);

    const updatedTab = await EncounterTabService.settleTab({
      encounterId,
      finalPaymentMethod,
      finalTxRef,
      settledBy: sessionUserId || undefined,
      settlementNotes,
    });

    return NextResponse.json({
      success: true,
      data: updatedTab,
      message: "Encounter Tab settled successfully at discharge.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to settle encounter tab" }, { status: 500 });
  }
}
