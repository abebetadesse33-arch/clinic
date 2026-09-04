import { NextRequest, NextResponse } from "next/server";
import { SagaOrchestrator } from "@/lib/services/saga-orchestrator";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { reason = "Manual administrator compensation rollback" } = body;

    const result = await SagaOrchestrator.compensateSagaTransaction(params.id, reason);

    if (!result) {
      return NextResponse.json({ error: "Saga transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, compensatedSaga: result });
  } catch (error: any) {
    console.error("Saga compensation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to compensate saga transaction" },
      { status: 500 }
    );
  }
}
