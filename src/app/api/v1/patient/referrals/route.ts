import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { referrals, patients, users } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getPatientFromRequest(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const explicitPatientId = searchParams.get("patientId") || searchParams.get("id");
  if (explicitPatientId) {
    const [pat] = await db.select().from(patients).where(eq(patients.id, explicitPatientId)).limit(1);
    if (pat) return { user: null, pat };
  }

  const sessionId = req.cookies.get("Nini_session")?.value;
  if (!sessionId) return { user: null, pat: null };
  const [u] = await db.select().from(users).where(eq(users.id, sessionId)).limit(1);
  if (!u) return { user: null, pat: null };
  const [pat] = await db
    .select()
    .from(patients)
    .where(or(eq(patients.userId, u.id), eq(patients.email, u.email)))
    .limit(1);
  return { user: u, pat: pat || null };
}

export async function GET(req: NextRequest) {
  try {
    const { pat } = await getPatientFromRequest(req);
    if (!pat) {
      return NextResponse.json({ success: true, data: [] });
    }

    const dbRefs = await db
      .select()
      .from(referrals)
      .where(eq(referrals.patientId, pat.id))
      .orderBy(desc(referrals.createdAt));

    return NextResponse.json({
      success: true,
      data: dbRefs.map((r) => ({
        id: r.id,
        patientId: r.patientId,
        type: r.type,
        source: r.source,
        specialty: r.receivingRole?.replace("_", " ").toUpperCase() || "Specialist",
        providerName: "Assigned Specialist",
        receivingRole: r.receivingRole,
        status: r.status,
        urgency: r.priority,
        clinicalReason: r.clinicalReason,
        nextSteps: r.responseNotes || (r.status === "approved" ? "Referral accepted by receiving specialist." : "Under clinical review."),
        createdAt: r.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("Error fetching patient referrals:", err);
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, pat } = await getPatientFromRequest(req);
    if (!pat || !user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { specialty, requestedProvider, reason, urgency, attachedNotes } = body;

    if (!specialty || !reason) {
      return NextResponse.json(
        { success: false, error: "Specialty and clinical reason are required" },
        { status: 400 }
      );
    }

    const [newRef] = await db
      .insert(referrals)
      .values({
        organizationId: pat.tenantId,
        patientId: pat.id,
        type: "self",
        source: "patient",
        referringUserId: user.id,
        referringRole: "patient",
        receivingRole: specialty.toLowerCase().includes("nutrition") ? "dietitian" : specialty.toLowerCase().includes("therapy") ? "physiotherapist" : "physician",
        priority: (urgency as any) || "routine",
        status: "pending_review",
        clinicalReason: reason,
        notes: attachedNotes || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        id: newRef.id,
        type: newRef.type,
        specialty,
        providerName: requestedProvider || "To be assigned by care team",
        status: newRef.status,
        urgency: newRef.priority,
        clinicalReason: newRef.clinicalReason,
        nextSteps: "Your self-referral request has been submitted to your primary physician for review and authorization.",
        createdAt: newRef.createdAt,
      },
      message: "Referral request submitted successfully to your care team!",
    });
  } catch (err: any) {
    console.error("Error creating referral:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
