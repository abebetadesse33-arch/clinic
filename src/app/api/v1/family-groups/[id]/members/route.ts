import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { db } from "@/db";
import { familyGroups, familyMembers, patients } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { patientId, relationship } = body;

    const [group] = await db
      .select()
      .from(familyGroups)
      .where(eq(familyGroups.id, params.id));

    if (!group) {
      return NextResponse.json({ success: false, error: "Family group not found" }, { status: 404 });
    }

    const member = await SubscriptionService.addFamilyDependent({
      tenantId: group.tenantId,
      familyGroupId: params.id,
      patientId,
      relationship: relationship || "child",
    });

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
