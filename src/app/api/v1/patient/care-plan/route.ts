import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { carePlans, patients, users } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const explicitPatientId = searchParams.get("patientId") || searchParams.get("id");
  const sessionId = req.cookies.get("Nini_session")?.value;

  try {
    let pat: any = null;

    if (explicitPatientId) {
      const [found] = await db.select().from(patients).where(eq(patients.id, explicitPatientId)).limit(1);
      pat = found;
    }

    if (!pat && sessionId) {
      const [u] = await db.select().from(users).where(eq(users.id, sessionId)).limit(1);
      if (u) {
        const [found] = await db
          .select()
          .from(patients)
          .where(or(eq(patients.userId, u.id), eq(patients.email, u.email)))
          .limit(1);
        pat = found;
      }
    }

    if (!pat) {
      const [anyPat] = await db.select().from(patients).limit(1);
      pat = anyPat;
    }

    if (pat) {
      const [plan] = await db
        .select()
        .from(carePlans)
        .where(eq(carePlans.patientId, pat.id))
        .limit(1);

      if (plan) {
        return NextResponse.json({
          success: true,
          data: {
            patientId: pat.id,
            overallTitle: plan.primaryDiagnosis || "Personalized Health Care Plan",
            lastUpdated: plan.updatedAt ? new Date(plan.updatedAt).toISOString() : new Date().toISOString(),
            goals: Array.isArray(plan.goals) ? plan.goals : [],
            lifestyleDirectives: [],
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        patientId: pat?.id || null,
        overallTitle: "Primary Health & Prevention Plan",
        lastUpdated: new Date().toISOString(),
        goals: [],
        lifestyleDirectives: [
          { category: "Hydration", icon: "Droplets", text: "Maintain optimal daily hydration." },
          { category: "Physical Activity", icon: "Activity", text: "Target at least 150 minutes of moderate aerobic activity weekly." },
          { category: "Dietary", icon: "Utensils", text: "Prioritize whole grains, fresh vegetables, and lean protein." },
        ],
      },
    });
  } catch (error: any) {
    console.error("Error fetching care plan:", error);
    return NextResponse.json({
      success: true,
      data: {
        patientId: null,
        overallTitle: "Primary Health Care Plan",
        lastUpdated: new Date().toISOString(),
        goals: [],
        lifestyleDirectives: [],
      },
    });
  }
}
