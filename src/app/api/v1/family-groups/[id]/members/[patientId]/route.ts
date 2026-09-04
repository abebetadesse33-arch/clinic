import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { familyMembers, familyGroups } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; patientId: string } }
) {
  try {
    const [group] = await db
      .select()
      .from(familyGroups)
      .where(eq(familyGroups.id, params.id));

    if (!group) {
      return NextResponse.json({ success: false, error: "Family group not found" }, { status: 404 });
    }

    if (group.primaryPatientId === params.patientId) {
      return NextResponse.json(
        { success: false, error: "Cannot remove primary account holder from family group" },
        { status: 400 }
      );
    }

    const [removed] = await db
      .update(familyMembers)
      .set({ isActive: false })
      .where(
        and(
          eq(familyMembers.familyGroupId, params.id),
          eq(familyMembers.patientId, params.patientId)
        )
      )
      .returning();

    return NextResponse.json({ success: true, data: removed });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
