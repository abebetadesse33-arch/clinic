import { NextRequest, NextResponse } from "next/server";
import { executeClinicalCopilot, CopilotRequest } from "@/lib/ai/universal-copilot";

export async function POST(req: NextRequest) {
  try {
    const body: CopilotRequest = await req.json();

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json(
        { error: "A valid message string is required." },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const result = await executeClinicalCopilot(body);
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        latencyMs,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("AI Copilot Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
