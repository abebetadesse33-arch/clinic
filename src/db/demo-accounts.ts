import type { Pool } from "mysql2/promise";
import { randomUUID } from "crypto";

type DemoStaff = [department: string, name: string, role: string, email: string, designation: string];
type DemoPatient = [name: string, gender: "male" | "female", age: number, email: string, guardianEmail?: string];

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_PASSWORD = "123456";

const STAFF: DemoStaff[] = [
  ["executive", "Mekonnen Alemu", "tenant_admin", "executive.mekonnen@gmail.com", "Chief Executive Officer (CEO)"],
  ["executive", "Selam Tesfaye", "tenant_admin", "executive.selam@gmail.com", "Chief Medical Officer (CMO)"],
  ["executive", "Dawit Bekele", "tenant_admin", "executive.dawit@gmail.com", "Chief Operations Officer (COO)"],
  ["executive", "Hirut Lemma", "tenant_admin", "executive.hirut@gmail.com", "Chief Financial Officer (CFO)"],
  ["executive", "Getachew Assefa", "system_admin", "executive.getachew@gmail.com", "Chief Information Officer (CIO)"],
  ["internal_medicine", "Aster Solomon", "physician", "internal_medicine.aster@gmail.com", "Senior Physician (General Internist)"],
  ["internal_medicine", "Yonas Haile", "physician", "internal_medicine.yonas@gmail.com", "Physician"],
  ["internal_medicine", "Bethlehem Girma", "nurse_practitioner", "internal_medicine.bethlehem@gmail.com", "Nurse Practitioner"],
  ["internal_medicine", "Amina Mohammed", "nurse", "internal_medicine.amina@gmail.com", "Registered Nurse (RN)"],
  ["internal_medicine", "Tigist Assefa", "nurse", "internal_medicine.tigist@gmail.com", "Licensed Practical Nurse (LPN)"],
  ["pediatrics", "Samuel Tadesse", "physician", "pediatrics.samuel@gmail.com", "Pediatrician"],
  ["pediatrics", "Hana Bekele", "physician", "pediatrics.hana@gmail.com", "Pediatrician"],
  ["pediatrics", "Genet Alemu", "nurse", "pediatrics.genet@gmail.com", "Pediatric Nurse"],
  ["surgery", "Daniel Worku", "physician", "surgery.daniel@gmail.com", "General Surgeon"],
  ["surgery", "Lidya Tesfaye", "physician", "surgery.lidya@gmail.com", "Orthopedic Surgeon"],
  ["surgery", "Abdi Hassan", "physician", "surgery.abdi@gmail.com", "Anesthesiologist"],
  ["surgery", "Selamawit Kassa", "nurse", "surgery.selamawit@gmail.com", "Surgical Nurse"],
  ["obgyn", "Meron Desta", "physician", "obgyn.meron@gmail.com", "Obstetrician/Gynecologist"],
  ["obgyn", "Rahel Gebre", "physician", "obgyn.rahel@gmail.com", "Gynecologist"],
  ["obgyn", "Bethlehem Tadesse", "nurse", "obgyn.bethlehem@gmail.com", "Midwife"],
  ["emergency", "Kaleab Mekonnen", "physician", "emergency.kaleab@gmail.com", "Emergency Physician"],
  ["emergency", "Samrawit Alemu", "physician", "emergency.samrawit@gmail.com", "Emergency Physician"],
  ["emergency", "Meseret Haile", "nurse", "emergency.meseret@gmail.com", "Emergency Nurse"],
  ["emergency", "Dawit Girma", "nurse", "emergency.dawit@gmail.com", "Emergency Nurse"],
  ["cardiology", "Yared Tesfaye", "physician", "cardiology.yared@gmail.com", "Cardiologist"],
  ["cardiology", "Sara Bekele", "physician", "cardiology.sara@gmail.com", "Cardiologist"],
  ["cardiology", "Hiwot Alemu", "nurse", "cardiology.hiwot@gmail.com", "Cardiac Nurse"],
  ["neurology", "Abel Kebede", "physician", "neurology.abel@gmail.com", "Neurologist"],
  ["neurology", "Liya Haile", "physician", "neurology.liya@gmail.com", "Neurologist"],
  ["psychiatry", "Yohannes Tadesse", "physician", "psychiatry.yohannes@gmail.com", "Psychiatrist"],
  ["psychiatry", "Selam Assefa", "psychologist", "psychiatry.selam@gmail.com", "Clinical Psychologist"],
  ["psychiatry", "Bethlehem Girma", "nurse", "psychiatry.bethlehem@gmail.com", "Psychiatric Nurse"],
  ["dermatology", "Samrawit Bekele", "physician", "dermatology.samrawit@gmail.com", "Dermatologist"],
  ["ophthalmology", "Abel Worku", "physician", "ophthalmology.abel@gmail.com", "Ophthalmologist"],
  ["ent", "Dawit Alemu", "physician", "ent.dawit@gmail.com", "ENT Specialist"],
  ["laboratory", "Getachew Kebede", "pathologist", "lab.getachew@gmail.com", "Lab Manager / Pathologist"],
  ["laboratory", "Biruk Tesfaye", "lab_technician", "lab.biruk@gmail.com", "Medical Laboratory Technologist"],
  ["laboratory", "Selam Haile", "lab_technician", "lab.selam@gmail.com", "Medical Laboratory Technician"],
  ["laboratory", "Hiwot Alemu", "lab_technician", "lab.hiwot@gmail.com", "Phlebotomist"],
  ["radiology", "Samrawit Desta", "radiologist", "radiology.samrawit@gmail.com", "Radiologist"],
  ["radiology", "Kaleab Girma", "radiologist", "radiology.kaleab@gmail.com", "Radiologic Technologist"],
  ["radiology", "Bethlehem Tadesse", "radiologist", "radiology.bethlehem@gmail.com", "Sonographer"],
  ["pathology", "Rahel Gebre", "pathologist", "pathology.rahel@gmail.com", "Pathologist"],
  ["pathology", "Dawit Mekonnen", "pathologist", "pathology.dawit@gmail.com", "Histotechnician"],
  ["pharmacy", "Samuel Assefa", "pharmacist", "pharmacy.samuel@gmail.com", "Chief Pharmacist"],
  ["pharmacy", "Bethlehem Bekele", "pharmacist", "pharmacy.bethlehem@gmail.com", "Clinical Pharmacist"],
  ["pharmacy", "Yonas Tadesse", "pharmacist", "pharmacy.yonas@gmail.com", "Pharmacy Technician"],
  ["pharmacy", "Selam Tesfaye", "pharmacist", "pharmacy.selam@gmail.com", "Pharmacy Assistant"],
  ["physiotherapy", "Dawit Girma", "physiotherapist", "physiotherapy.dawit@gmail.com", "Senior Physiotherapist"],
  ["physiotherapy", "Hana Alemu", "physiotherapist", "physiotherapy.hana@gmail.com", "Physiotherapist"],
  ["occupational_therapy", "Selam Bekele", "occupational_therapist", "occupational_therapy.selam@gmail.com", "Occupational Therapist"],
  ["nutrition", "Rahel Tesfaye", "dietitian", "nutrition.rahel@gmail.com", "Chief Dietitian"],
  ["nutrition", "Abel Haile", "dietitian", "nutrition.abel@gmail.com", "Nutritionist"],
  ["social_work", "Meron Alemu", "social_worker", "social_work.meron@gmail.com", "Medical Social Worker"],
  ["case_management", "Kaleab Desta", "care_coordinator", "case_management.kaleab@gmail.com", "Case Manager / Care Coordinator"],
  ["respiratory", "Yared Bekele", "respiratory_therapist", "respiratory.yared@gmail.com", "Respiratory Therapist"],
  ["genetics", "Bethlehem Assefa", "genetic_counselor", "genetics.bethlehem@gmail.com", "Genetic Counselor"],
  ["nursing_admin", "Selamawit Kassa", "tenant_admin", "nursing_admin.selamawit@gmail.com", "Chief Nursing Officer (CNO)"],
  ["nursing_admin", "Genet Alemu", "nurse", "nursing_admin.genet@gmail.com", "Nurse Manager - Medical Ward"],
  ["nursing_admin", "Meseret Haile", "nurse", "nursing_admin.meseret@gmail.com", "Nurse Manager - ICU"],
  ["front_desk", "Hiwot Girma", "care_coordinator", "front_desk.hiwot@gmail.com", "Front Desk Receptionist"],
  ["front_desk", "Dawit Bekele", "care_coordinator", "front_desk.dawit@gmail.com", "Patient Registration Clerk"],
  ["front_desk", "Selam Tadesse", "care_coordinator", "front_desk.selam@gmail.com", "Appointment Scheduler"],
  ["billing", "Getachew Assefa", "tenant_admin", "billing.getachew@gmail.com", "Billing Manager"],
  ["billing", "Rahel Lemma", "tenant_admin", "billing.rahel@gmail.com", "Medical Billing Specialist"],
  ["billing", "Abel Worku", "tenant_admin", "billing.abel@gmail.com", "Insurance Coordinator"],
  ["it", "Dawit Mekonnen", "system_admin", "it.dawit@gmail.com", "IT Manager / System Admin"],
  ["it", "Selam Haile", "system_admin", "it.selam@gmail.com", "Database Administrator"],
  ["it", "Kaleab Girma", "tenant_admin", "it.kaleab@gmail.com", "Support Engineer"],
];

const PATIENTS: DemoPatient[] = [
  ["Abebe Kebede", "male", 45, "patient.abebe@gmail.com"],
  ["Aster Solomon", "female", 38, "patient.aster@gmail.com"],
  ["Dawit Haile", "male", 52, "patient.dawit@gmail.com"],
  ["Hana Girma", "female", 30, "patient.hana@gmail.com"],
  ["Samuel Tadesse", "male", 8, "patient.dawit@gmail.com", "patient.dawit@gmail.com"],
  ["Rahel Bekele", "female", 67, "patient.rahel@gmail.com"],
];

function dateOfBirth(age: number) {
  const birthYear = new Date().getUTCFullYear() - age;
  return `${birthYear}-01-15`;
}

/**
 * Demo accounts share one well-known password and are re-written on every run,
 * so they are only seeded outside production unless explicitly requested with
 * NINIMED_SEED_DEMO_ACCOUNTS=true.
 */
export function shouldSeedDemoAccounts(): boolean {
  if (process.env.NINIMED_SEED_DEMO_ACCOUNTS === "true") return true;
  if (process.env.NINIMED_SEED_DEMO_ACCOUNTS === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export async function seedDemoAccounts(client: Pool) {
  if (!shouldSeedDemoAccounts()) {
    console.log("ℹ️ Skipping demo account seed (production). Set NINIMED_SEED_DEMO_ACCOUNTS=true to override.");
    return;
  }
  const [[hashRow]] = await client.query<any[]>("SELECT SHA2(?, 256) AS hash", [DEMO_PASSWORD]);
  const hash = hashRow.hash as string;
  const staffIds = new Map<string, string>();

  for (const [index, staff] of STAFF.entries()) {
    const [department, name, role, email, designation] = staff;
    const candidateId = randomUUID();
    const isAdmin = role === "system_admin" || role === "tenant_admin";
    await client.query(
      `INSERT INTO users (id, organization_id, email, password_hash, full_name, role, department, is_admin_granted_by_super_admin, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         full_name = VALUES(full_name),
         role = VALUES(role),
         department = VALUES(department),
         is_admin_granted_by_super_admin = VALUES(is_admin_granted_by_super_admin),
         is_active = TRUE`,
      [candidateId, TENANT_ID, email, hash, name, role, department, isAdmin]
    );
    const [[userRow]] = await client.query<any[]>("SELECT id FROM users WHERE email = ?", [email]);
    const userId = userRow.id as string;
    staffIds.set(email, userId);

    await client.query(
      `INSERT INTO staff_profiles (id, user_id, tenant_id, employee_code, department, designation, specialization, employment_type, status, hired_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'full_time', 'active', CURDATE(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE department = VALUES(department), designation = VALUES(designation), specialization = VALUES(specialization), status = 'active'`,
      [randomUUID(), userId, TENANT_ID, `DEMO-${String(index + 1).padStart(3, "0")}`, department, designation, designation]
    );
  }

  for (const [index, patient] of PATIENTS.entries()) {
    const [name, gender, age, email, guardianEmail] = patient;
    const [firstName, ...lastNameParts] = name.split(" ");
    const lastName = lastNameParts.join(" ") || "Patient";
    const accountEmail = guardianEmail || email;
    let userId = guardianEmail ? staffIds.get(guardianEmail) : undefined;

    if (guardianEmail && !userId) {
      const [[guardianUser]] = await client.query<any[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [guardianEmail]);
      userId = guardianUser?.id;
    }

    if (!userId) {
      const candidateId = randomUUID();
      await client.query(
        `INSERT INTO users (id, organization_id, email, password_hash, full_name, role, department, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'patient', 'patient_services', TRUE, NOW(), NOW())
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), full_name = VALUES(full_name), role = 'patient', is_active = TRUE`,
        [candidateId, TENANT_ID, email, hash, name]
      );
      const [[userRow]] = await client.query<any[]>("SELECT id FROM users WHERE email = ?", [email]);
      userId = userRow.id as string;
    }

    await client.query(
      `INSERT INTO patients (id, tenant_id, user_id, mrn, first_name, last_name, date_of_birth, gender, blood_type, email, triage_priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'O+', ?, 'routine', NOW(), NOW())
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), first_name = VALUES(first_name), last_name = VALUES(last_name), date_of_birth = VALUES(date_of_birth), gender = VALUES(gender), email = VALUES(email)`,
      [randomUUID(), TENANT_ID, userId ?? null, `DEMO-${String(index + 1).padStart(5, "0")}`, firstName, lastName, dateOfBirth(age), gender, accountEmail]
    );
  }

  console.log(`✅ Demo account seed synchronized: ${STAFF.length} staff and ${PATIENTS.length} patient records.`);
}
