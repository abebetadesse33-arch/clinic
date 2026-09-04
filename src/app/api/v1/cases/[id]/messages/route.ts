import { NextRequest, NextResponse } from "next/server";
import { CaseWorkflowService } from "@/lib/services/case-workflow-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params; // caseId
    const messages = await CaseWorkflowService.getMessages(id);
    return NextResponse.json({
      success: true,
      data: {
        messages,
        total: messages.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const {
      senderId,
      senderName = "User",
      senderType = "patient",
      message,
      attachments = [],
    } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Message content is required" },
        { status: 400 }
      );
    }

    const createdMsg = await CaseWorkflowService.sendMessage({
      caseId: id,
      senderId,
      senderName,
      senderType,
      message: message.trim(),
      attachments,
    });

    return NextResponse.json({
      success: true,
      data: createdMsg,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
