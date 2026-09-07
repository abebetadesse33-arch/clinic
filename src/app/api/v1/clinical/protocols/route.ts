import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clinicalCatalogProtocols } from "@/db/schema";
import { CLINICAL_ORDER_SETS } from "@/lib/services/clinical-order-sets";
import { LABORATORY_PROTOCOLS_CATALOGUE } from "@/lib/catalogue/laboratory-protocols-catalogue";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const CATALOG_ROLES = new Set(["system_admin", "lab_technician", "pharmacist"]);

function canManageCatalog(request: NextRequest, body?: Record<string, unknown>) {
  const role = request.headers.get("x-clinic-role") || request.headers.get("x-user-role") || body?.role;
  return typeof role === "string" && CATALOG_ROLES.has(role);
}

function fallbackProtocols() {
  const seededOrderSets = CLINICAL_ORDER_SETS.map((set) => ({
    id: set.id,
    departmentId: set.category === "infectious" ? "laboratory" : set.category === "cardiovascular" ? "pharmacy" : "admission",
    name: set.name,
    items: set.items.map((item) => item.name),
    defaultIndication: set.indication,
    isActive: true,
    isSeeded: true,
  }));

  const laboratoryProtocols = LABORATORY_PROTOCOLS_CATALOGUE.map((lab) => ({
    id: `lab-protocol-${lab.testCode.toLowerCase().replace(/[\/\s-]/g, '_')}`,
    departmentId: "laboratory",
    name: `${lab.testName} (${lab.testCode})`,
    items: [
      `Specimen: ${lab.specimen}`,
      `Container: ${lab.tubeContainer}`,
      `Collection: ${lab.collectionProtocol}`,
      `Storage: ${lab.handlingStorage}`,
      `Turnaround: ${lab.turnaroundTime}`,
      `Methodology: ${lab.methodology}`,
      lab.criticalValues ? `Critical Alert: ${lab.criticalValues}` : "Routine limits apply",
    ],
    defaultIndication: `Diagnostic protocol for ${lab.testName} (${lab.category}). Ref: ${lab.referenceRangeAdult}`,
    metadata: {
      testCode: lab.testCode,
      testName: lab.testName,
      specimen: lab.specimen,
      tubeContainer: lab.tubeContainer,
      collectionProtocol: lab.collectionProtocol,
      handlingStorage: lab.handlingStorage,
      referenceRangeAdult: lab.referenceRangeAdult,
      criticalValues: lab.criticalValues,
      turnaroundTime: lab.turnaroundTime,
      methodology: lab.methodology,
      category: lab.category,
      priceEtb: lab.priceEtb,
      isStatAvailable: lab.isStatAvailable || false,
    },
    isActive: true,
    isSeeded: true,
  }));

  return [...laboratoryProtocols, ...seededOrderSets];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const departmentId = searchParams.get("departmentId");
  const includeDisabled = searchParams.get("includeDisabled") === "true";

  try {
    const conditions = [eq(clinicalCatalogProtocols.tenantId, DEFAULT_TENANT_ID)];
    if (kind === "protocol" || kind === "formulary") conditions.push(eq(clinicalCatalogProtocols.kind, kind));
    if (departmentId) conditions.push(eq(clinicalCatalogProtocols.departmentId, departmentId));
    if (!includeDisabled) conditions.push(eq(clinicalCatalogProtocols.isActive, true));

    const rows = await db
      .select()
      .from(clinicalCatalogProtocols)
      .where(and(...conditions))
      .orderBy(desc(clinicalCatalogProtocols.updatedAt));

    const persistedData = rows.map((row) => ({ ...row, defaultIndication: row.indication }));
    const fallbackData = fallbackProtocols();
    const persistedIds = new Set(persistedData.map((row) => row.id));
    const data = [
      ...persistedData,
      ...fallbackData.filter((protocol) => !persistedIds.has(protocol.id)),
    ];
    return NextResponse.json({ success: true, data, seededFallback: persistedData.length === 0 });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: fallbackProtocols(), storageUnavailable: true, error: error.message });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!canManageCatalog(request, body)) {
    return NextResponse.json({ success: false, error: "Catalog management requires system_admin, lab_technician, or pharmacist." }, { status: 403 });
  }

  const { name, departmentId, indication = body.defaultIndication, items = [], kind = "protocol", metadata = {}, tenantId = DEFAULT_TENANT_ID, actorId = body.createdBy } = body;
  if (!name?.trim() || !departmentId || !indication?.trim() || !Array.isArray(items) || !["protocol", "formulary"].includes(kind)) {
    return NextResponse.json({ success: false, error: "name, departmentId, indication, kind, and items are required." }, { status: 400 });
  }

  try {
    const [created] = await db.insert(clinicalCatalogProtocols).values({
      tenantId,
      kind,
      departmentId,
      name: name.trim(),
      indication: indication.trim(),
      items,
      metadata,
      createdBy: actorId || null,
      updatedBy: actorId || null,
    }).returning();
    return NextResponse.json({ success: true, data: { ...created, defaultIndication: created.indication } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!canManageCatalog(request, body)) {
    return NextResponse.json({ success: false, error: "Catalog management requires system_admin, lab_technician, or pharmacist." }, { status: 403 });
  }
  if (!body.id) return NextResponse.json({ success: false, error: "id is required." }, { status: 400 });

  try {
    const [updated] = await db.update(clinicalCatalogProtocols).set({
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.departmentId !== undefined ? { departmentId: body.departmentId } : {}),
      ...(body.indication !== undefined ? { indication: String(body.indication).trim() } : {}),
      ...(Array.isArray(body.items) ? { items: body.items } : {}),
      ...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      updatedBy: body.actorId || null,
      updatedAt: new Date(),
    }).where(and(eq(clinicalCatalogProtocols.id, body.id), eq(clinicalCatalogProtocols.tenantId, body.tenantId || DEFAULT_TENANT_ID))).returning();
    if (!updated) return NextResponse.json({ success: false, error: "Catalog entry not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}