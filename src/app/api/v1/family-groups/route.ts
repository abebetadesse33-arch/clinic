import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  familyGroups,
  familyMembers,
  subscriptions,
  subscriptionPlans,
  patients,
  organizations,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

const isValidUUID = (id?: string | null) =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json({ success: false, error: "patientId is required" }, { status: 400 });
    }

    if (!isValidUUID(patientId)) {
      return NextResponse.json({ success: true, data: null });
    }

    // Find the family group this patient belongs to (either as primary or dependent)
    const [membership] = await db
      .select({
        familyGroup: familyGroups,
        relationship: familyMembers.relationship,
      })
      .from(familyMembers)
      .innerJoin(familyGroups, eq(familyMembers.familyGroupId, familyGroups.id))
      .where(and(eq(familyMembers.patientId, patientId), eq(familyMembers.isActive, true)));

    if (!membership) {
      return NextResponse.json({ success: true, data: null });
    }

    const { familyGroup } = membership;

    // Get all members of the family
    const members = await db
      .select({
        member: familyMembers,
        patient: patients,
      })
      .from(familyMembers)
      .innerJoin(patients, eq(familyMembers.patientId, patients.id))
      .where(and(eq(familyMembers.familyGroupId, familyGroup.id), eq(familyMembers.isActive, true)));

    // Get active subscription for family
    const [activeSub] = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(and(eq(subscriptions.familyGroupId, familyGroup.id), eq(subscriptions.status, "active")));

    return NextResponse.json({
      success: true,
      data: {
        familyGroup,
        myRole: membership.relationship,
        members,
        subscription: activeSub || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { primaryPatientId, name, tenantId } = body;

    const [org] = await db.select().from(organizations).limit(1);
    const resolvedTenantId = tenantId || org?.id;

    if (!primaryPatientId || !name) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const [newGroup] = await db
      .insert(familyGroups)
      .values({
        tenantId: resolvedTenantId,
        primaryPatientId,
        name,
      })
      .returning();

    await db.insert(familyMembers).values({
      familyGroupId: newGroup.id,
      patientId: primaryPatientId,
      relationship: "primary",
      isActive: true,
      canViewSharedBilling: true,
    });

    return NextResponse.json({ success: true, data: newGroup }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
