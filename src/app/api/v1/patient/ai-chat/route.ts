import { NextRequest, NextResponse } from "next/server";
import { processPatientChatMessage, ChatMessage } from "@/lib/ai/patient-chatbot-guardrails";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, language = "en" } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const response = await processPatientChatMessage(messages as ChatMessage[], language);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Patient AI chat error:", error);
    return NextResponse.json({ error: "AI assistant service unavailable" }, { status: 500 });
  }
}
