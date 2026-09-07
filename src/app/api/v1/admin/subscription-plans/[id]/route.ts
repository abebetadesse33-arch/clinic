import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, params.id));

    if (!plan) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    const [updatedPlan] = await db
      .update(subscriptionPlans)
      .set({
        name: body.name,
        description: body.description,
        basePrice: body.basePrice ? body.basePrice.toString() : undefined,
        maxMembers: body.maxMembers !== undefined ? Number(body.maxMembers) : undefined,
        additionalMemberPrice: body.additionalMemberPrice !== undefined ? body.additionalMemberPrice.toString() : undefined,
        includedServices: body.includedServices,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        version: body.version ? Number(body.version) + 1 : undefined,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPlans.id, params.id))
      .returning();

    if (!updatedPlan) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedPlan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [deactivatedPlan] = await db
      .update(subscriptionPlans)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, params.id))
      .returning();

    return NextResponse.json({ success: true, data: deactivatedPlan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
