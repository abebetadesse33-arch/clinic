import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientMessages, patients, users } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getSessionUser(req: NextRequest) {
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
    const { pat } = await getSessionUser(req);
    if (!pat) {
      return NextResponse.json({ success: true, data: [] });
    }

    const msgs = await db
      .select()
      .from(patientMessages)
      .where(eq(patientMessages.patientId, pat.id))
      .orderBy(desc(patientMessages.createdAt));

    // Resolve sender names if sender is clinician/user
    const userIds = msgs
      .map((m) => m.senderId)
      .filter((id, idx, arr): id is string => typeof id === "string" && id.length > 0 && arr.indexOf(id) === idx);
    const userMap: Record<string, string> = {};
    for (const uid of userIds) {
      const [u] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, uid)).limit(1);
      if (u) userMap[uid] = u.fullName;
    }

    return NextResponse.json({
      success: true,
      data: msgs.map((m) => ({
        id: m.id,
        patientId: m.patientId,
        senderId: m.senderId,
        senderName: m.senderType === "patient" ? `${pat.firstName} ${pat.lastName}` : (userMap[m.senderId] || "Care Team Clinician"),
        senderType: m.senderType || "clinician",
        subject: m.subject || "Message from Care Team",
        body: m.body,
        createdAt: m.createdAt,
        isRead: m.isRead,
      })),
    });
  } catch (err: any) {
    console.error("Error fetching messages:", err);
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, pat } = await getSessionUser(req);
    if (!pat || !user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { recipientId, subject, messageText } = body;

    if (!messageText?.trim()) {
      return NextResponse.json({ success: false, error: "Message body is required" }, { status: 400 });
    }

    const targetRecipientId = recipientId || pat.primaryDoctorId || user.id;

    const [newMsg] = await db
      .insert(patientMessages)
      .values({
        organizationId: pat.tenantId,
        patientId: pat.id,
        senderId: user.id,
        senderType: "patient",
        recipientId: targetRecipientId,
        recipientType: "clinician",
        subject: subject || "Message to Care Team",
        body: messageText.trim(),
        isRead: false,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        ...newMsg,
        senderName: `${pat.firstName} ${pat.lastName}`.trim(),
      },
      message: "Message sent to your care team.",
    });
  } catch (err: any) {
    console.error("Error sending message:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
