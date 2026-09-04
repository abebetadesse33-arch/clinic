import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = await QueueService.enqueue(body);
    return NextResponse.json({ success: true, data: entry });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to enqueue" }, { status: 500 });
  }
}
