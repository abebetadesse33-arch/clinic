import { NextRequest, NextResponse } from "next/server";
import { processPatientChatMessage, ChatMessage } from "@/lib/ai/patient-chatbot-guardrails";
import { requireAuthenticatedUser } from "@/lib/security/auth-session";

export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth.response;

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
