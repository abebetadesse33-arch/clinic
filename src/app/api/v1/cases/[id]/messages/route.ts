import { NextRequest, NextResponse } from "next/server";
import { CaseWorkflowService } from "@/lib/services/case-workflow-service";
import { requireCaseAccess } from "@/lib/security/tenant-resource";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireCaseAccess(req, params.id);
  if ("response" in access) return access.response;

  try {
    const { id } = params; // caseId
    const messages = await CaseWorkflowService.getMessages(access.row.caseId);
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
  const access = await requireCaseAccess(req, params.id);
  if ("response" in access) return access.response;

  try {
    const { id } = params;
    const body = await req.json();
    const { message, attachments = [] } = body;
    // The sender is always the signed-in user, never a value supplied by the client.
    const senderId = access.user.id;
    const senderName = access.user.fullName || "User";
    const senderType = access.user.role === "patient" ? "patient" : "provider";

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Message content is required" },
        { status: 400 }
      );
    }

    const createdMsg = await CaseWorkflowService.sendMessage({
      caseId: access.row.caseId,
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
