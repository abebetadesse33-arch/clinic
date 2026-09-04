import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientRegistrationPasses, patients, servicePricingCatalog, systemPaymentSettings, users } from "@/db/schema";
import { desc, eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/patient/registration-status
export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get("Nini_session")?.value;

  try {
    // 1. Fetch system pricing & global settings
    const [settingsList, regServiceList] = await Promise.all([
      db.select().from(systemPaymentSettings).limit(1),
      db.select().from(servicePricingCatalog).where(eq(servicePricingCatalog.serviceCode, "REGISTRATION_3MO")).limit(1),
    ]);

    const settings = settingsList[0] || { globalFreeMode: false, registrationValidityDays: 90, gracePeriodDays: 7 };
    const regService = regServiceList[0] || { basePrice: "350.00", currency: "ETB", isFree: false, validityDays: 90 };

    const isGlobalFree = Boolean(settings.globalFreeMode) || Boolean(regService.isFree);

    const { searchParams } = new URL(req.url);
    const explicitPatientId = searchParams.get("patientId");
    const queryMrn = searchParams.get("mrn");

    // 2. Identify patient
    let pat: any = null;
    if (explicitPatientId) {
      const [found] = await db.select().from(patients).where(eq(patients.id, explicitPatientId)).limit(1);
      pat = found;
    } else if (queryMrn) {
      const [found] = await db.select().from(patients).where(eq(patients.mrn, queryMrn)).limit(1);
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
      return NextResponse.json({
        success: true,
        data: {
          patientId: null,
          isActive: isGlobalFree,
          isFreeGlobal: isGlobalFree,
          status: isGlobalFree ? "active" : "none",
          daysRemaining: isGlobalFree ? 90 : 0,
          expiresAt: null,
          basePrice: regService.basePrice,
          currency: regService.currency,
          validityDays: regService.validityDays || 90,
        },
      });
    }

    // 3. Find latest registration record
    const [latestReg] = await db
      .select()
      .from(patientRegistrationPasses)
      .where(eq(patientRegistrationPasses.patientId, pat.id))
      .orderBy(desc(patientRegistrationPasses.expiresAt))
      .limit(1);

    if (isGlobalFree) {
      return NextResponse.json({
        success: true,
        data: {
          patientId: pat.id,
          isActive: true,
          isFreeGlobal: true,
          status: "active",
          daysRemaining: 90,
          startsAt: latestReg?.startsAt ? new Date(latestReg.startsAt).toISOString() : new Date().toISOString(),
          expiresAt: latestReg?.expiresAt ? new Date(latestReg.expiresAt).toISOString() : null,
          basePrice: regService.basePrice,
          currency: regService.currency,
          validityDays: regService.validityDays || 90,
          message: "Registration fee is currently waived under Global Free Healthcare policy.",
        },
      });
    }

    if (latestReg) {
      const now = new Date().getTime();
      const expiry = new Date(latestReg.expiresAt).getTime();
      const diffMs = expiry - now;
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isActive = daysRemaining > 0 && latestReg.status === "active";

      return NextResponse.json({
        success: true,
        data: {
          patientId: pat.id,
          registrationId: latestReg.id,
          isActive,
          isFreeGlobal: false,
          status: isActive ? "active" : "expired",
          daysRemaining: Math.max(0, daysRemaining),
          startsAt: new Date(latestReg.startsAt).toISOString(),
          expiresAt: new Date(latestReg.expiresAt).toISOString(),
          basePrice: regService.basePrice,
          currency: regService.currency,
          validityDays: regService.validityDays || 90,
          message: isActive
            ? `Your 3-month registration is active with ${daysRemaining} days remaining.`
            : "Your 3-month registration has expired. Please renew to continue seamless access.",
        },
      });
    }

    // No registration record found yet
    return NextResponse.json({
      success: true,
      data: {
        patientId: pat.id,
        isActive: false,
        isFreeGlobal: false,
        status: "unregistered",
        daysRemaining: 0,
        startsAt: null,
        expiresAt: null,
        basePrice: regService.basePrice,
        currency: regService.currency,
        validityDays: regService.validityDays || 90,
        message: "Initial 3-month registration required before appointment booking.",
      },
    });
  } catch (error: any) {
    console.error("Error checking registration status:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to check registration status" },
      { status: 500 }
    );
  }
}
