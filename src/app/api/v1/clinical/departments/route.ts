import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEPARTMENTS = [
  { id: "laboratory", label: "Laboratory & Diagnostics", badge: "Pathology / LIS", iconName: "FlaskConical", iconColor: "text-blue-400", bgGradient: "from-blue-500/10 to-indigo-500/10 border-blue-500/30", description: "Blood panels, urine, microbiology cultures, pathology and molecular assays." },
  { id: "laboratory_services", label: "Laboratory Services", badge: "Biomedical Science", iconName: "Beaker", iconColor: "text-cyan-400", bgGradient: "from-cyan-500/10 to-blue-500/10 border-cyan-500/30", description: "Full-cycle specimen processing, culture & sensitivity, STAT results and LIS quality control." },
  { id: "imaging", label: "Radiology & Diagnostic Imaging", badge: "Imaging Suite", iconName: "FileImage", iconColor: "text-cyan-400", bgGradient: "from-cyan-500/10 to-blue-500/10 border-cyan-500/30", description: "X-ray, CT, ultrasound and magnetic resonance imaging." },
  { id: "pharmacy", label: "Pharmacy & Medication Dispense", badge: "Dispensing", iconName: "Pill", iconColor: "text-emerald-400", bgGradient: "from-emerald-500/10 to-teal-500/10 border-emerald-500/30", description: "Electronic prescriptions, IV therapy and medication dispensing." },
  { id: "physiotherapy", label: "Physiotherapy & Physical Rehab", badge: "Rehab Clinic", iconName: "Activity", iconColor: "text-amber-400", bgGradient: "from-amber-500/10 to-orange-500/10 border-amber-500/30", description: "Mobility, rehabilitation and therapeutic exercise services." },
  { id: "specialist", label: "Specialist & MD Referral", badge: "Consultation", iconName: "Stethoscope", iconColor: "text-indigo-400", bgGradient: "from-indigo-500/10 to-blue-500/10 border-indigo-500/30", description: "Specialist consultations and multidisciplinary referrals." },
  { id: "nutrition", label: "Clinical Nutrition & Dietetics", badge: "Dietetics", iconName: "Utensils", iconColor: "text-emerald-300", bgGradient: "from-emerald-500/10 to-green-500/10 border-emerald-500/30", description: "Medical nutrition therapy and dietetic care plans." },
  { id: "psychology", label: "Behavioral Health & Psychology", badge: "Behavioral Health", iconName: "Brain", iconColor: "text-purple-400", bgGradient: "from-purple-500/10 to-fuchsia-500/10 border-purple-500/30", description: "Behavioral health assessment and psychological support." },
  { id: "social_work", label: "Medical Social Work & SDOH", badge: "Support Services", iconName: "Users", iconColor: "text-rose-400", bgGradient: "from-rose-500/10 to-pink-500/10 border-rose-500/30", description: "Social needs screening, resources and care coordination." },
  { id: "admission", label: "Hospital & Inpatient Admission", badge: "Inpatient / Ward", iconName: "Building", iconColor: "text-amber-300", bgGradient: "from-amber-500/10 to-yellow-500/10 border-amber-500/30", description: "Observation, inpatient admission and ward placement." },
] as const;


export async function GET() {
  return NextResponse.json({ success: true, data: DEPARTMENTS });
}