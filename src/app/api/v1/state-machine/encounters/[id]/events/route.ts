import { NextRequest, NextResponse } from "next/server";
import { CentralStateMachineService } from "@/lib/services/central-state-machine";
import { requireRoles, STAFF_ROLES } from "@/lib/security/auth-session";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoles(req, STAFF_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const replayUpToEventId = searchParams.get("replayUpTo");

    if (replayUpToEventId) {
      const replayResult = await CentralStateMachineService.replayEncounterEvents(
        params.id,
        parseInt(replayUpToEventId, 10)
      );
      return NextResponse.json({ success: true, replay: replayResult });
    }

    const events = await CentralStateMachineService.getEncounterEventStream(params.id);
    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    console.error("Fetch encounter events error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch encounter event stream" },
      { status: 500 }
    );
  }
}
