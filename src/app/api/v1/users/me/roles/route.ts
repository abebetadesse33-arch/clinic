import { NextResponse } from "next/server";

// In production this would query user_roles table joined with users.
// Here we return the full role catalogue from the seed dataset.
const ALL_ROLES = [
  { role: "physician", displayName: "Physician / MD", department: "Department of Medicine", isPrimary: true },
  { role: "nurse_practitioner", displayName: "Nurse Practitioner (NP)", isPrimary: false },
  { role: "nurse", displayName: "Registered Nurse (RN)", department: "Cardiometabolic Unit", isPrimary: false },
  { role: "pharmacist", displayName: "Clinical Pharmacist (PharmD)", isPrimary: false },
  { role: "physiotherapist", displayName: "Physiotherapist (DPT)", isPrimary: false },
  { role: "occupational_therapist", displayName: "Occupational Therapist (OTD)", isPrimary: false },
  { role: "dietitian", displayName: "Clinical Dietitian (RD)", isPrimary: false },
  { role: "social_worker", displayName: "Medical Social Worker (LCSW)", isPrimary: false },
  { role: "radiologist", displayName: "Radiologist (MD)", isPrimary: false },
  { role: "pathologist", displayName: "Pathologist (MD)", isPrimary: false },
  { role: "lab_technician", displayName: "Lab Technician (MLS)", isPrimary: false },
  { role: "genetic_counselor", displayName: "Genetic Counselor (CGC)", isPrimary: false },
  { role: "respiratory_therapist", displayName: "Respiratory Therapist (RRT)", isPrimary: false },
  { role: "psychologist", displayName: "Clinical Psychologist (PsyD)", isPrimary: false },
  { role: "biologist", displayName: "Clinical Biologist (PhD)", isPrimary: false },
  { role: "care_coordinator", displayName: "Care Coordinator (RN, CCM)", isPrimary: false },
  { role: "patient", displayName: "Patient Portal", isPrimary: false },
  { role: "tenant_admin", displayName: "Tenant Admin", isPrimary: false },
  { role: "system_admin", displayName: "System Administrator", isPrimary: false },
  { role: "auditor", displayName: "Compliance Auditor", isPrimary: false },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeRole = searchParams.get("activeRole") ?? "physician";

  const roles = ALL_ROLES.map((r) => ({
    ...r,
    isActive: r.role === activeRole,
  }));

  return NextResponse.json({
    success: true,
    data: { roles, activeRole },
  });
}
