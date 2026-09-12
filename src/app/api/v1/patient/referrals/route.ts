import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { referrals } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { resolveAuthorizedPatient } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const explicitPatientId = searchParams.get("patientId") || searchParams.get("id");

  try {
    const auth = await resolveAuthorizedPatient(req, explicitPatientId);
    if ("response" in auth) {
      return auth.response;
    }

    const pat = auth.patient;
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
  const { searchParams } = new URL(req.url);
  const explicitPatientId = searchParams.get("patientId") || searchParams.get("id");

  try {
    const auth = await resolveAuthorizedPatient(req, explicitPatientId);
    if ("response" in auth) {
      return auth.response;
    }

    const pat = auth.patient;
    const user = auth.user;
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
        referringRole: user.role || "patient",
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

