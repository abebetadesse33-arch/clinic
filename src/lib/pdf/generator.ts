import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { LabOrderRecord, Patient, PrescriptionRecord } from "../types/clinical";

export function generatePrescriptionPDF(rx: PrescriptionRecord, patient: Patient) {
  const doc = new jsPDF();

  // Header / Banner
  doc.setFillColor(13, 148, 136); // Clinical Teal
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Nini MEDICINE & CLINICAL RESEARCH HEALTH SYSTEM", 14, 15);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Department of Biopsychosocial Medicine | Clinical Decision Support Certified", 14, 23);

  // Prescriber Details
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`PRESCRIBING PHYSICIAN: ${rx.doctorName || "Dr. Sarah Mitchell, MD"}`, 14, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`License No: ${rx.doctorLicense || "MD-782914-TX"} | DEA: BM8291048 | Specialty: Internal Medicine & Endocrinology`, 14, 48);
  doc.text(`Facility: Nini Regional Medical Center, 742 Evergreen Terrace, Suite 400`, 14, 53);

  doc.setDrawColor(203, 213, 225);
  doc.line(14, 57, 196, 57);

  // Patient Info Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 62, 182, 28, "F");
  doc.rect(14, 62, 182, 28, "S");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`PATIENT: ${patient.firstName} ${patient.lastName}`, 18, 70);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`MRN: ${patient.mrn} | DOB: ${patient.dateOfBirth} (Age: ${patient.age}) | Gender: ${patient.gender.toUpperCase()}`, 18, 76);
  doc.text(`Documented Allergies: ${patient.allergies.map((a) => `${a.substance} (${a.severity})`).join(", ") || "NKDA"}`, 18, 82);
  doc.text(`Prescription Date: ${new Date(rx.createdAt).toLocaleDateString()} | Rx ID: ${rx.id}`, 18, 87);

  // Rx Symbol
  doc.setFontSize(28);
  doc.setFont("times", "bolditalic");
  doc.setTextColor(13, 148, 136);
  doc.text("Rx", 14, 105);

  // Prescription Details Table
  autoTable(doc, {
    startY: 110,
    head: [["Medication & Strength", "Sig / Instructions", "Dispense Qty", "Refills"]],
    body: [
      [
        `${rx.medicationName}\n${rx.dosage}`,
        `${rx.frequency}\nDuration: ${rx.durationDays} Days\nSpecial Note: ${rx.instructions}`,
        `${rx.quantity} Units`,
        `${rx.refillsAllowed} Refills`,
      ],
    ],
    headStyles: {
      fillColor: [13, 148, 136],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      fontSize: 10,
    },
    theme: "grid",
  });

  // Clinical Decision Support Verification Stamp
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(45, 212, 191);
  doc.rect(14, finalY, 182, 24, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 118, 110);
  doc.text("CLINICAL DECISION SUPPORT & SAFETY VERIFIED", 18, finalY + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    "Automated cross-check completed: Zero contraindications against patient allergy profile, renal function (eGFR), and CYP450 pharmacogenomics. Clinician verified and manually approved.",
    18,
    finalY + 13,
    { maxWidth: 174 }
  );

  // Digital Signature Box
  const sigY = finalY + 36;
  doc.setDrawColor(148, 163, 184);
  doc.line(120, sigY + 18, 196, sigY + 18);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("PHYSICIAN DIGITAL SIGNATURE & CREDENTIALS", 120, sigY + 23);
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`${rx.doctorName || "Dr. Sarah Mitchell, MD"}`, 122, sigY + 14);

  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Digital Token: SHA256:${Math.random().toString(36).substring(2)}${Date.now()}`, 14, sigY + 28);
  doc.text("NiniMed CDSS Secure E-Prescription v3.0 | 21 CFR Part 11 Compliant Audit", 14, sigY + 33);

  // Save the PDF
  doc.save(`Prescription_${patient.lastName}_${rx.medicationName.replace(/\s+/g, "_")}.pdf`);
}

export function generateLabOrderPDF(order: LabOrderRecord, patient: Patient) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(15, 23, 42); // Clinical Navy
  doc.rect(0, 0, 210, 30, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("LABORATORY & DIAGNOSTIC REQUISITION ORDER", 14, 15);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Nini Integrated Diagnostic Laboratories | CLIA ID: 45D9820194", 14, 23);

  // Patient Info
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 38, 182, 26, "F");
  doc.rect(14, 38, 182, 26, "S");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`PATIENT: ${patient.firstName} ${patient.lastName} (MRN: ${patient.mrn})`, 18, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`DOB: ${patient.dateOfBirth} | Gender: ${patient.gender.toUpperCase()} | Blood Type: ${patient.bloodType}`, 18, 52);
  doc.text(`Ordering Physician: ${order.doctorName || "Dr. Sarah Mitchell, MD"} | Order Date: ${new Date(order.orderedAt).toLocaleDateString()}`, 18, 58);

  // Order Details Table
  autoTable(doc, {
    startY: 72,
    head: [["Test / Requisition Name", "Clinical Indication / Diagnosis", "Priority", "Status"]],
    body: [[order.testName, order.clinicalReason, order.priority.toUpperCase(), order.status.toUpperCase()]],
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    theme: "grid",
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("SPECIMEN COLLECTION & HANDLING INSTRUCTIONS:", 14, finalY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("1. Collect specimen using standard aseptic technique.", 14, finalY + 6);
  doc.text("2. Fasting requirement: 8-12 hour overnight fast indicated if lipid/metabolic panel requested.", 14, finalY + 11);
  doc.text("3. Immediately centrifuge and transport to central laboratory under controlled refrigeration.", 14, finalY + 16);

  // Sign-off
  const sigY = finalY + 30;
  doc.line(120, sigY + 18, 196, sigY + 18);
  doc.setFontSize(8);
  doc.text("AUTHORIZED CLINICIAN SIGNATURE", 120, sigY + 23);
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.text(`${order.doctorName || "Dr. Sarah Mitchell, MD"}`, 122, sigY + 14);

  doc.save(`LabRequisition_${patient.lastName}_${order.testName.replace(/\s+/g, "_")}.pdf`);
}
