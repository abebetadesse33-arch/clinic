
/**
 * ═══════════════════════════════════════════════════════════════════
 * CLINICAL WORKFLOW EXECUTOR
 * ═══════════════════════════════════════════════════════════════════
 * Resolves active workflows matching a trigger event, executes each
 * pipeline step in sequence, and dispatches a real-time notification
 * to the patient (and optionally the care team) for every step.
 * ═══════════════════════════════════════════════════════════════════
 */

import { db } from "@/db";
import { workflowDefinitions, patients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { dispatchNotification } from "@/lib/notifications/notification-service";
import { STEP_ACTIONS } from "@/lib/workflow/workflow-definitions";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkflowExecutionContext {
  /** The trigger event that fired, e.g. "LAB_ORDER_SUBMITTED" */
  triggerEvent: string;
  /** The patient this workflow was triggered for */
  patientId: string;
  /** Optional: the user (staff/provider) that triggered this event */
  triggeredByUserId?: string;
  /** Human-readable subject for notifications, e.g. "CBC - Blood Count" */
  subjectLabel?: string;
  /** Extra metadata forwarded to each step notification */
  metadata?: Record<string, unknown>;
  /** Action URL in patient notifications (defaults to /patient/dashboard) */
  patientActionUrl?: string;
}

export interface WorkflowStepResult {
  step: number;
  action: string;
  label: string;
  status: "success" | "skipped" | "error";
  notificationId?: string;
  latencyMs: number;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  workflowName: string;
  triggerEvent: string;
  patientId: string;
  stepsExecuted: number;
  stepResults: WorkflowStepResult[];
  totalDurationMs: number;
  executedAt: string;
}

function matchesWorkflowConditions(
  conditions: unknown,
  context: WorkflowExecutionContext
): boolean {
  if (!conditions || typeof conditions !== "object" || Array.isArray(conditions)) return true;

  const values = {
    triggerEvent: context.triggerEvent,
    patientId: context.patientId,
    ...(context.metadata || {}),
  } as Record<string, unknown>;

  return Object.entries(conditions as Record<string, unknown>).every(([key, expected]) => {
    const actual = values[key];
    if (actual === undefined || actual === null) return false;
    if (Array.isArray(expected)) return expected.includes(actual);
    return actual === expected;
  });
}

// ─── Step → Patient Notification Mapping ─────────────────────────────────────

function buildPatientNotification(
  action: string,
  context: WorkflowExecutionContext
): { title: string; body: string; priority: "low" | "normal" | "high" | "critical" } {
  const s = context.subjectLabel || "your clinical care";

  const map: Record<string, { title: string; body: string; priority: "low" | "normal" | "high" | "critical" }> = {
    // AI & Decision Support
    TRIGGER_AI_TRIAGE: { title: "🤖 AI Triage Complete", body: `An AI-assisted triage assessment for ${s} has been completed. Your care priority has been determined.`, priority: "normal" },
    CALCULATE_RISK_SCORE: { title: "📊 Clinical Risk Score Calculated", body: `Your clinical risk profile for ${s} has been assessed by our AI system.`, priority: "normal" },
    SUGGEST_DIAGNOSIS: { title: "🧠 AI Diagnosis Suggestions Ready", body: `Your physician is reviewing AI-assisted diagnostic suggestions for ${s}.`, priority: "normal" },
    SUGGEST_TREATMENT_PLAN: { title: "💡 Treatment Plan Suggested", body: `An evidence-based treatment plan for ${s} has been proposed and is under physician review.`, priority: "normal" },
    RUN_DRUG_INTERACTION_CHECK: { title: "⚠️ Medication Safety Check Done", body: `A drug interaction check for your ${s} medications has been completed.`, priority: "normal" },
    DRUG_INTERACTION_DETECTED: { title: "🚨 Medication Safety Alert", body: `Your care team identified a potential medication interaction involving ${s} and is reviewing it now.`, priority: "critical" },
    GENERATE_PROACTIVE_INSIGHT: { title: "💡 Care Insight Available", body: `Your care team has received a proactive health insight about ${s}. Please check your care plan.`, priority: "normal" },
    IDENTIFY_CARE_GAPS: { title: "📋 Care Gap Identified", body: `Your care team identified a care gap for ${s}. A follow-up has been scheduled for you.`, priority: "high" },

    // Patient Engagement & Self-Service
    SEND_PATIENT_EDUCATION: { title: "📚 Educational Materials Sent", body: `Patient education materials about ${s} have been sent to your portal.`, priority: "low" },
    SEND_GOAL_REMINDER: { title: "🎯 Health Goal Reminder", body: `Reminder: Don't forget your health goal for ${s}. You can do it!`, priority: "low" },
    SEND_SATISFACTION_SURVEY: { title: "⭐ Share Your Feedback", body: `Please take a moment to complete your satisfaction survey regarding your ${s} experience.`, priority: "low" },
    SEND_QUESTIONNAIRE: { title: "📝 Health Questionnaire Sent", body: `Please complete the health questionnaire regarding ${s} in your patient portal.`, priority: "normal" },
    CREATE_PATIENT_GOAL: { title: "🎯 New Health Goal Set", body: `A new health goal for ${s} has been established. Check your portal to track your progress.`, priority: "normal" },
    TRACK_GOAL_PROGRESS: { title: "📈 Goal Progress Updated", body: `Your progress towards your ${s} goal has been recorded. Keep up the good work!`, priority: "normal" },
    CREATE_REGISTRATION_PASS: { title: "🎫 Registration Pass Created", body: `Your digital registration pass for ${s} is ready. Use it for quick check-in.`, priority: "normal" },
    UPDATE_PATIENT_JOURNEY: { title: "🗺️ Care Journey Updated", body: `Your patient journey has been updated: ${s} progress has advanced to the next stage.`, priority: "normal" },
    SEND_REFILL_REMINDER: { title: "⏰ Medication Refill Reminder", body: `Your ${s} prescription is running low. Please contact the clinic or pharmacy for a refill.`, priority: "normal" },
    SEND_APPOINTMENT_REMINDER: { title: "⏰ Appointment Reminder", body: `Reminder: You have an upcoming appointment for ${s}. Please arrive on time or join the video session promptly.`, priority: "normal" },
    ADD_TO_SMART_LIST: { title: "📋 Added to Care Program", body: `You have been added to a specialized care program for ${s}. Your team will reach out soon.`, priority: "normal" },

    // Telemedicine & Virtual Care
    INITIATE_VIDEO_CALL: { title: "📹 Video Consultation Started", body: `Your video consultation has begun. Please join from your patient portal now.`, priority: "critical" },
    SEND_TELEHEALTH_LINK: { title: "🔗 Your Video Visit Link", body: `Your telehealth session link has been sent. Click to join your virtual consultation.`, priority: "high" },
    CREATE_TELEHEALTH_ROOM: { title: "📹 Telehealth Room Created", body: `A secure video consultation room has been set up for you. Your access link is in your portal.`, priority: "high" },
    START_TELEHEALTH_SESSION: { title: "▶️ Telehealth Session Started", body: `Your telehealth session for ${s} has officially started.`, priority: "high" },
    END_TELEHEALTH_SESSION: { title: "⏹️ Telehealth Session Ended", body: `Your telehealth session for ${s} has concluded. Your post-visit summary will be available soon.`, priority: "normal" },
    RECORD_CONSULTATION: { title: "🎙️ Consultation Recorded", body: `Your consultation session for ${s} has been securely recorded with your prior consent.`, priority: "low" },
    TRANSCRIBE_CONSULTATION: { title: "✍️ Consultation Transcribed", body: `A transcript of your ${s} consultation has been generated and added to your health record.`, priority: "low" },
    GENERATE_TELEHEALTH_SUMMARY: { title: "📝 Visit Summary Ready", body: `A summary of your telehealth consultation for ${s} is now available in your medical records.`, priority: "normal" },
    PRESCRIBE_DURING_TELEHEALTH: { title: "💊 Prescription Issued", body: `Your doctor has issued an electronic prescription for ${s} during your telehealth session.`, priority: "high" },
    ORDER_LAB_FROM_TELEHEALTH: { title: "🔬 Lab Ordered During Consultation", body: `Your doctor ordered a ${s} lab test during your telehealth visit.`, priority: "normal" },
    SCHEDULE_FOLLOW_UP_TELEHEALTH: { title: "📅 Follow-up Scheduled", body: `A follow-up telehealth appointment has been booked. Check your portal for the date and time.`, priority: "normal" },
    SEND_REMOTE_MONITORING_ALERT: { title: "🚨 Remote Monitoring Alert", body: `An alert has been triggered based on your remote monitoring data for ${s}. A care team member will contact you.`, priority: "high" },
    SYNC_REMOTE_DEVICE_DATA: { title: "🔄 Device Data Synced", body: `Data from your remote monitoring device for ${s} has been successfully synced with your medical record.`, priority: "low" },
    SEND_E_PRESCRIPTION: { title: "📬 E-Prescription Sent", body: `Your electronic prescription for ${s} has been transmitted to the pharmacy.`, priority: "normal" },
    SEND_VIRTUAL_WAITING_ROOM_LINK: { title: "⏳ Join Virtual Waiting Room", body: `Your provider is almost ready. Please join the virtual waiting room for your ${s} appointment.`, priority: "high" },
    ENABLE_SCREEN_SHARING: { title: "🖥️ Screen Sharing Enabled", body: `Your provider is now sharing your lab results or imaging on the video call.`, priority: "low" },
    ENABLE_DEVICE_CAMERA: { title: "📷 Camera Access Requested", body: `Your provider has requested access to your camera for a closer look during your ${s} consultation.`, priority: "normal" },
    CAPTURE_PATIENT_PHOTO: { title: "📸 Clinical Photo Captured", body: `A clinical photo has been securely captured and added to your chart for ${s}.`, priority: "low" },

    // Remote Patient Monitoring & Devices
    CONNECT_DEVICE: { title: "🔗 Medical Device Connected", body: `Your home monitoring device has been successfully paired to your account.`, priority: "normal" },
    DISCONNECT_DEVICE: { title: "🔌 Device Disconnected", body: `Your medical device for ${s} has been disconnected. Please contact support if this was unexpected.`, priority: "normal" },
    READ_DEVICE_DATA: { title: "📈 Device Data Read", body: `A new reading from your device for ${s} has been securely logged to your chart.`, priority: "low" },
    ENROLL_IN_RPM_PROGRAM: { title: "📡 Remote Monitoring Enrolled", body: `You have been enrolled in a remote monitoring program. Your care team will track your vitals from home.`, priority: "high" },
    COMPLETE_RPM_PROGRAM: { title: "🏁 Monitoring Program Complete", body: `Congratulations! You have successfully completed your remote monitoring program. A final report is ready.`, priority: "normal" },
    SEND_RPM_REMINDER: { title: "⏰ Vitals Reading Reminder", body: `Please take your daily readings (blood pressure / blood glucose) as part of your remote monitoring program.`, priority: "normal" },
    TRIGGER_RPM_CHECK_AI: { title: "🤖 RPM Health Check Started", body: `Your remote monitoring health check for ${s} has started. Please answer the care questions in your portal.`, priority: "normal" },

    // Laboratory & Biochemical
    CREATE_LAB_ORDER: { title: "📋 Lab Order Placed", body: `A diagnostic lab order for ${s} has been placed and sent to the laboratory.`, priority: "normal" },
    CREATE_LAB_REQUEST: { title: "🔬 Lab Request Submitted", body: `Your ${s} lab request has been sent to the laboratory team for processing.`, priority: "normal" },
    RECEIVE_SPECIMEN: { title: "🧪 Specimen Received", body: `Your specimen for ${s} has been logged and accepted by the lab.`, priority: "normal" },
    VERIFY_BARCODE: { title: "✅ Sample Verified", body: `Your sample barcode for ${s} has been scanned and verified by lab staff.`, priority: "normal" },
    ORDER_METABOLIC_PANEL: { title: "⚗️ Analysis Started", body: `Your ${s} sample is currently being analyzed in our laboratory.`, priority: "normal" },
    ORDER_LIPID_PROFILE: { title: "🩸 Lipid Profile Ordered", body: `A lipid profile test has been ordered for your ${s} checkup.`, priority: "normal" },
    ORDER_LIVER_FUNCTION_TEST: { title: "🩸 Liver Function Test Ordered", body: `A liver function test has been ordered for your ${s} evaluation.`, priority: "normal" },
    ORDER_RENAL_FUNCTION_TEST: { title: "🩸 Renal Function Test Ordered", body: `A renal function test has been ordered for your ${s} evaluation.`, priority: "normal" },
    ORDER_ELECTROLYTE_PANEL: { title: "🩸 Electrolyte Panel Ordered", body: `An electrolyte panel has been ordered for your ${s} assessment.`, priority: "normal" },
    ORDER_TOXICOLOGY_SCREEN: { title: "🧪 Toxicology Screen Ordered", body: `A toxicology screen has been ordered for your ${s} assessment.`, priority: "normal" },
    ORDER_GENETIC_TEST: { title: "🧬 Genetic Test Ordered", body: `A genetic test has been ordered for your ${s} evaluation.`, priority: "normal" },
    VALIDATE_LAB_RESULT: { title: "🔎 Results Under Review", body: `Your ${s} results are being reviewed by a certified medical technologist.`, priority: "normal" },
    FLAG_CRITICAL_LAB_VALUE: { title: "🚨 STAT: Critical Lab Result", body: `A critical value was detected in your ${s} results. Your care team is responding immediately.`, priority: "critical" },
    FLAG_CRITICAL_BIOCHEMICAL_VALUE: { title: "🚨 Critical Biochemical Alert", body: `Your care team has been alerted about a critical finding in your ${s} report. You will be contacted shortly.`, priority: "critical" },
    INTERPRET_BIOCHEMICAL_RESULTS: { title: "📊 Biochemical Interpretation", body: `A specialist is interpreting your ${s} biochemical profile for clinical accuracy.`, priority: "normal" },
    CALCULATE_ANION_GAP: { title: "🧬 Metabolic Calculation Complete", body: `An acid-base analysis of your ${s} results has been completed.`, priority: "normal" },
    CALCULATE_OSMOLALITY: { title: "🧬 Osmolality Calculated", body: `Serum osmolality calculations for your ${s} labs have been completed.`, priority: "normal" },
    CHECK_DRUG_LEVELS: { title: "💊 Drug Levels Checked", body: `Therapeutic drug monitoring for ${s} has been completed.`, priority: "normal" },
    SUGGEST_BIOCHEMICAL_FOLLOWUP: { title: "📅 Follow-up Tests Recommended", body: `Your doctor recommends follow-up laboratory tests based on your ${s} results.`, priority: "normal" },
    SEND_BIOCHEMICAL_ALERT: { title: "⚠️ Clinical Alert on Your Labs", body: `Your medical team has been notified of important findings in your ${s} lab report.`, priority: "high" },
    REFER_TO_BIOCHEMIST: { title: "🔬 Specialist Biochemist Consulted", body: `A specialist biochemist has been asked to review your ${s} results for an expert opinion.`, priority: "high" },
    CREATE_BIOCHEMICAL_CONSULT: { title: "📋 Expert Consultation Ready", body: `A formal biochemical consultation report for ${s} has been added to your medical record.`, priority: "normal" },
    DOCUMENT_MEDICAL_NECESSITY: { title: "📄 Clinical Documentation Updated", body: `Required clinical documentation for ${s} has been prepared for care and coverage review.`, priority: "low" },
    UPLOAD_IMAGING_STUDY: { title: "🖼️ Imaging Study Uploaded", body: `Your ${s} imaging study has been successfully uploaded to the system.`, priority: "normal" },
    CREATE_RADIOLOGY_REPORT: { title: "📸 Radiology Report Prepared", body: `A radiologist has completed your imaging study analysis. Your doctor will review the findings shortly.`, priority: "normal" },
    FLAG_CRITICAL_IMAGING_FINDING: { title: "🚨 Critical Imaging Finding", body: `An urgent finding has been identified in your imaging study. Your care team is responding immediately.`, priority: "critical" },

    // Pharmacy & Medication
    CREATE_PRESCRIPTION: { title: "💊 Prescription Ready", body: `A new prescription for ${s} has been prepared. Please collect from the pharmacy.`, priority: "normal" },
    ENQUEUE_PHARMACY: { title: "⏳ Prescription in Queue", body: `Your prescription for ${s} has been added to the pharmacy dispensing queue.`, priority: "low" },
    MARK_PRESCRIPTION_CLEARED: { title: "✅ Prescription Safety Cleared", body: `Your pharmacist has verified the safety of your ${s} prescription.`, priority: "normal" },
    ALERT_PHARMACIST_DISPENSE: { title: "🔔 Pharmacist Alerted", body: `The pharmacist has been alerted to prioritize dispensing your ${s} medication.`, priority: "high" },
    DISPENSE_MEDICATION: { title: "💊 Medication Ready for Pickup", body: `Your ${s} medication has been dispensed. Please collect from the pharmacy counter.`, priority: "high" },
    ADMINISTER_MEDICATION: { title: "💉 Medication Administered", body: `Your scheduled ${s} medication has been administered by nursing staff.`, priority: "normal" },
    CHECK_DRUG_INVENTORY: { title: "📦 Inventory Checked", body: `The pharmacy has confirmed availability of your ${s} medication.`, priority: "low" },
    REORDER_DRUG: { title: "🚚 Medication Reordered", body: `Your pharmacy has initiated a restock order for ${s}. You will be notified when it arrives.`, priority: "normal" },
    TRACK_BATCH_EXPIRY: { title: "📅 Expiry Tracked", body: `Batch details and expiration dates for your ${s} medication have been logged.`, priority: "low" },
    RECONCILE_MEDICATION: { title: "📋 Medication Review Complete", body: `A medication reconciliation for ${s} has been completed. Your updated list is in your care plan.`, priority: "normal" },

    // Specialist Referrals & MDT
    CREATE_SPECIALIST_REFERRAL: { title: "📨 Specialist Referral Submitted", body: `A referral to a specialist for ${s} has been submitted. You will be contacted to schedule an appointment.`, priority: "high" },
    ACCEPT_SPECIALIST_REFERRAL: { title: "✅ Referral Accepted", body: `Your specialist referral for ${s} has been accepted. An appointment will be scheduled shortly.`, priority: "high" },
    SCHEDULE_SPECIALIST_APPOINTMENT: { title: "📅 Specialist Appointment Booked", body: `You have been scheduled for a specialist consultation for ${s}. Details are in your patient portal.`, priority: "high" },
    COMPLETE_SPECIALIST_CONSULT: { title: "📋 Specialist Consultation Done", body: `Your specialist consultation report for ${s} has been completed and shared with your care team.`, priority: "normal" },
    SCHEDULE_MDT_MEETING: { title: "📅 MDT Review Scheduled", body: `A multidisciplinary team meeting has been arranged to discuss your ${s} care plan.`, priority: "high" },
    INVITE_MDT_MEMBERS: { title: "👥 MDT Members Invited", body: `Specialists have been invited to review your ${s} case in the upcoming multidisciplinary meeting.`, priority: "normal" },
    GENERATE_MDT_SUMMARY: { title: "📝 MDT Summary Generated", body: `The summary from your multidisciplinary team review for ${s} has been added to your chart.`, priority: "normal" },
    REQUEST_SECOND_OPINION: { title: "🔍 Second Opinion Requested", body: `A second expert opinion has been requested for your ${s} case for added clinical confidence.`, priority: "high" },
    UPLOAD_SECOND_OPINION_REPORT: { title: "📄 Expert Opinion Received", body: `An independent expert evaluation for ${s} has been added to your medical record.`, priority: "normal" },
    CREATE_SHARED_CARE_PLAN: { title: "👥 Shared Care Plan Created", body: `A collaborative care plan for ${s} has been set up between your primary team and specialists.`, priority: "normal" },

    // Billing & Payments
    AUTO_CALCULATE_PRICE: { title: "💳 Pricing Calculated", body: `The cost for ${s} has been calculated. Your itemized bill is ready to review.`, priority: "normal" },
    CREATE_INVOICE: { title: "🧾 Invoice Generated", body: `An invoice for ${s} has been created and is available in your portal.`, priority: "normal" },
    GENERATE_FISCAL_RECEIPT: { title: "🧾 Official Receipt Generated", body: `An official tax receipt for ${s} has been generated and added to your records.`, priority: "normal" },
    POST_GENERAL_LEDGER: { title: "💼 Transaction Posted", body: `Your payment for ${s} has been posted to the general ledger.`, priority: "low" },
    PROCESS_PAYMENT: { title: "💳 Payment Processed", body: `Your payment for ${s} has been successfully processed. A receipt is available in your portal.`, priority: "normal" },
    ISSUE_REFUND: { title: "💸 Refund Issued", body: `A refund has been processed for ${s}. Please allow 2–3 business days for it to reflect.`, priority: "normal" },
    SEND_PAYMENT_LINK: { title: "🔗 Payment Link Sent", body: `A secure payment link for ${s} has been sent to you. Please complete payment within the grace period.`, priority: "high" },
    VERIFY_INSURANCE_ELIGIBILITY: { title: "🛡️ Insurance Verified", body: `Your insurance eligibility for ${s} has been verified successfully.`, priority: "low" },
    SUBMIT_INSURANCE_CLAIM: { title: "📤 Insurance Claim Submitted", body: `An insurance claim for ${s} has been submitted on your behalf.`, priority: "normal" },
    CHECK_PRIOR_AUTHORIZATION: { title: "🛡️ Prior Auth Checked", body: `Prior authorization status for your ${s} procedure has been verified with your insurance.`, priority: "normal" },
    UPDATE_PATIENT_BALANCE: { title: "💰 Account Balance Updated", body: `Your patient account balance for ${s} has been updated. Please check your billing portal.`, priority: "normal" },
    CANCEL_SUBSCRIPTION: { title: "⛔ Subscription Suspended", body: `Your healthcare subscription has been suspended due to a payment issue. Please contact billing to restore access.`, priority: "high" },

    // Notifications & Communication
    NOTIFY_PATIENT_PAYMENT_DUE: { title: "💳 Payment Due", body: `A payment for ${s} services is now due. Please settle via the patient portal or at the billing counter.`, priority: "high" },
    SEND_SMS_NOTIFICATION: { title: "📱 SMS Notification Sent", body: `An SMS update about ${s} has been dispatched to your registered phone number.`, priority: "low" },
    SEND_EMAIL_NOTIFICATION: { title: "📧 Email Notification Sent", body: `An email update about ${s} has been sent to your registered email address.`, priority: "low" },
    SEND_PUSH_NOTIFICATION: { title: "🔔 Care Update", body: `A new update about ${s} has been added to your patient portal.`, priority: "normal" },
    SEND_WHATSAPP_MESSAGE: { title: "💬 WhatsApp Message Sent", body: `A WhatsApp notification regarding ${s} has been sent to your verified number.`, priority: "low" },
    NOTIFY_CARE_TEAM: { title: "👥 Care Team Notified", body: `Your entire care team has been informed about your ${s} situation.`, priority: "normal" },
    ALERT_ATTENDING_PHYSICIAN: { title: "🚨 Physician Alerted", body: `Your attending physician has been urgently notified about your ${s} situation.`, priority: "critical" },
    ALERT_ATTENDING_NURSE: { title: "🚨 Nurse Alerted", body: `Your attending nurse has been notified regarding your ${s} status.`, priority: "high" },
    ESCALATE_TO_SUPERVISOR: { title: "⬆️ Care Escalated to Supervisor", body: `Your care has been escalated to the department head for urgent review regarding ${s}.`, priority: "high" },
    PAGE_ON_CALL_STAFF: { title: "🆘 Emergency Team Paged", body: `The on-call emergency team has been paged about your condition. Help is on the way.`, priority: "critical" },
    SEND_REMINDER: { title: "⏰ Care Reminder", body: `Reminder: Please complete your scheduled action for ${s} as advised by your care team.`, priority: "normal" },
    SEND_TELEHEALTH_REMINDER: { title: "⏰ Telehealth Reminder", body: `Your telehealth appointment for ${s} is starting soon. Check your portal for the link.`, priority: "high" },
    SEND_POST_CONSULT_SURVEY: { title: "📝 Post-Consult Survey", body: `We value your feedback. Please complete a brief survey regarding your ${s} visit.`, priority: "low" },
    SEND_EDUCATIONAL_VIDEO: { title: "🎓 Educational Video Sent", body: `An educational video about ${s} management has been sent to your portal.`, priority: "low" },
    SEND_BIOCHEMICAL_EXPLANATION: { title: "📄 Lab Explanation Leaflet", body: `An easy-to-understand explanation of your ${s} lab results has been sent to you.`, priority: "normal" },
    NOTIFY_BIOCHEMIST: { title: "👨‍🔬 Biochemist Notified", body: `A clinical biochemist has been notified to review your ${s} results.`, priority: "normal" },
    NOTIFY_SPECIALIST: { title: "👨‍⚕️ Specialist Notified", body: `A specialist has been alerted regarding your ${s} case.`, priority: "high" },
    ESCALATE_TO_BIOCHEMICAL_EXPERT: { title: "⬆️ Escalated to Expert", body: `Your ${s} lab results have been escalated to a biochemical expert for detailed review.`, priority: "high" },

    // Documentation & Compliance
    CREATE_AUDIT_LOG: { title: "🔐 Compliance Record Created", body: `A secure compliance log for your ${s} procedure has been recorded per hospital regulations.`, priority: "low" },
    CREATE_CLINICAL_NOTE: { title: "📝 Clinical Note Added", body: `Your doctor has added a new clinical note about ${s} to your medical record.`, priority: "low" },
    GENERATE_SOAP_NOTE: { title: "📝 Visit Note Generated", body: `A structured clinical note from your ${s} visit has been added to your health record.`, priority: "low" },
    UPDATE_CARE_PLAN: { title: "📋 Care Plan Updated", body: `Your clinical care plan for ${s} has been revised by your care team.`, priority: "normal" },
    RECORD_CONSENT: { title: "✅ Consent Recorded", body: `Your medical consent for ${s} has been recorded in your file.`, priority: "low" },
    REVOKE_CONSENT: { title: "⛔ Consent Revoked", body: `Your revocation of consent for ${s} has been processed and logged.`, priority: "high" },
    FLAG_FOR_REVIEW: { title: "⚠️ Record Flagged for Review", body: `Your record for ${s} has been flagged for a secondary clinical review.`, priority: "normal" },
    ESCALATE_TO_COMPLIANCE: { title: "⚖️ Escalated to Compliance", body: `An issue regarding ${s} has been escalated to the compliance officer for review.`, priority: "high" },
    GENERATE_COMPLIANCE_REPORT: { title: "📄 Compliance Report Generated", body: `A regulatory compliance report involving ${s} has been successfully generated.`, priority: "low" },
    LOCK_RECORD: { title: "🔒 Medical Record Finalized", body: `Your medical record for ${s} has been finalized and securely locked.`, priority: "low" },

    // Operational & Case Management
    ASSIGN_CARE_COORDINATOR: { title: "👩‍⚕️ Care Coordinator Assigned", body: `A dedicated care coordinator has been assigned to oversee your ${s} care journey.`, priority: "normal" },
    CREATE_TASK: { title: "📌 Care Action Assigned", body: `A care task related to ${s} has been assigned to your care team on your behalf.`, priority: "low" },
    COMPLETE_TASK: { title: "✅ Task Completed", body: `A workflow task for your ${s} care has been marked as complete.`, priority: "low" },
    ESCALATE_TASK: { title: "⬆️ Task Escalated", body: `An overdue task regarding your ${s} care has been escalated for immediate action.`, priority: "high" },
    UPDATE_DASHBOARD: { title: "🔄 Care Status Updated", body: `Your clinical care status for ${s} has been updated in the system.`, priority: "low" },
    SEND_DAILY_REPORT: { title: "📊 Daily Report Generated", body: `A daily operational report including your ${s} status has been sent to administration.`, priority: "low" },
    SYNC_WITH_EHR: { title: "🔄 Health Records Synced", body: `Your clinical data for ${s} has been synchronized with your electronic health record.`, priority: "low" },
    EXPORT_DATA: { title: "📤 Data Exported", body: `A secure data export for ${s} has been generated as requested.`, priority: "low" },
    CREATE_CASE: { title: "📁 Case Opened", body: `A new clinical case file for ${s} has been opened by your care team.`, priority: "normal" },
    CLOSE_CASE: { title: "📁 Case Closed", body: `Your clinical case for ${s} has been formally closed.`, priority: "normal" },
    ASSIGN_PROVIDER: { title: "👨‍⚕️ Provider Assigned", body: `A primary provider has been assigned to manage your ${s} case.`, priority: "normal" },
    CHANGE_PROVIDER: { title: "👨‍⚕️ Provider Reassigned", body: `Your primary provider for ${s} has been updated. Please check your portal for details.`, priority: "normal" },
    CREATE_IMAGING_ORDER: { title: "📸 Imaging Ordered", body: `An imaging order for ${s} has been created and sent to the radiology department.`, priority: "normal" },
    CREATE_REFERRAL: { title: "📨 Internal Referral Created", body: `An internal referral for ${s} has been submitted to another department.`, priority: "normal" },
    SCHEDULE_APPOINTMENT: { title: "📅 Appointment Scheduled", body: `An appointment for ${s} has been booked. Check your portal for details.`, priority: "normal" },
    ADMIT_PATIENT: { title: "🏥 Admission Confirmed", body: `Your inpatient admission for ${s} has been confirmed. A bed has been assigned.`, priority: "high" },
    ASSIGN_WARD_BED: { title: "🛏️ Bed Assigned", body: `A ward bed has been allocated for you. Nursing staff will escort you to your room shortly.`, priority: "high" },
    INITIATE_DISCHARGE: { title: "📋 Discharge in Progress", body: `Your discharge process for ${s} has been initiated. Please wait for final clearance from your care team.`, priority: "normal" },
    COMPLETE_DISCHARGE: { title: "🏠 Discharge Complete", body: `You have been officially discharged. A discharge summary and follow-up instructions are in your portal.`, priority: "high" },
    TRANSFER_PATIENT: { title: "🚑 Transfer in Progress", body: `You are being transferred to another ward or unit. Your care team has been notified.`, priority: "high" },
  };

  const found = map[action];
  if (found) return found;

  // Generic fallback
  const meta = STEP_ACTIONS.find((a) => a.value === action);
  return {
    title: `🏥 Clinical Update: ${meta?.label || action}`,
    body: `Your care team has completed a workflow step (${meta?.label || action}) related to ${s}. Please check your patient portal for details.`,
    priority: "normal",
  };
}

// ─── Main Executor ────────────────────────────────────────────────────────────

/**
 * Fires all active workflows that match the given trigger event.
 * Dispatches a real-time patient notification for every pipeline step.
 */
export async function executeWorkflowsForTrigger(
  ctx: WorkflowExecutionContext
): Promise<WorkflowExecutionResult[]> {
  const results: WorkflowExecutionResult[] = [];

  try {
    // 1. Fetch active workflows matching this trigger
    const candidateWorkflows = await db
      .select()
      .from(workflowDefinitions)
      .where(
        and(
          eq(workflowDefinitions.tenantId, TENANT_ID),
          eq(workflowDefinitions.triggerEvent, ctx.triggerEvent),
          eq(workflowDefinitions.isActive, true)
        )
      );

    const matchedWorkflows = candidateWorkflows.filter((workflow) =>
      matchesWorkflowConditions(workflow.conditions, ctx)
    );

    if (matchedWorkflows.length === 0) {
      return [];
    }

    // 2. Resolve patient for notification targeting
    const [patient] = await db
      .select({ id: patients.id, userId: patients.userId, firstName: patients.firstName, lastName: patients.lastName })
      .from(patients)
      .where(eq(patients.id, ctx.patientId))
      .limit(1);

    const patientUserId = patient?.userId ?? null;
    const patientActionUrl = ctx.patientActionUrl ?? "/patient/dashboard";

    console.log(
      `[WorkflowExecutor] Trigger "${ctx.triggerEvent}" matched ${matchedWorkflows.length} workflow(s) for patient ${ctx.patientId} (Triggered by user ID: ${ctx.triggeredByUserId || "SYSTEM/AUTOMATED"})`
    );

    // 3. Execute each workflow
    for (const wf of matchedWorkflows) {
      const execStart = Date.now();
      const steps = Array.isArray(wf.steps) ? (wf.steps as any[]) : [];
      const stepResults: WorkflowStepResult[] = [];

      for (let i = 0; i < steps.length; i++) {
        const stepDef = steps[i];
        const action = typeof stepDef === "string" ? stepDef : (stepDef.action ?? `STEP_${i + 1}`);
        const stepLabel =
          (typeof stepDef === "object" && stepDef?.label)
            ? stepDef.label
            : STEP_ACTIONS.find((a) => a.value === action)?.label ?? action;

        const stepStart = Date.now();
        try {
          const { title, body, priority } = buildPatientNotification(action, ctx);
          let notificationId: string | undefined;

          if (patientUserId) {
            // Explicitly pass ctx.triggeredByUserId down to dispatchNotification as senderUserId.
            // This guarantees the notification DB record reflects the true session actor rather than defaulting to system/random user.
            const notifResult = await dispatchNotification({
              category: "clinical_alerts",
              type: "workflow_step_executed",
              title,
              body,
              priority,
              recipientUserId: patientUserId,
              senderUserId: ctx.triggeredByUserId || undefined,
              actionUrl: patientActionUrl,
              actionText: "View in My Portal",
              relatedEntityType: "workflow_definitions",
              relatedEntityId: wf.id,
              metadata: {
                workflowId: wf.id,
                workflowName: wf.name,
                triggerEvent: ctx.triggerEvent,
                stepNumber: i + 1,
                stepAction: action,
                stepLabel,
                patientId: ctx.patientId,
                triggeredByUserId: ctx.triggeredByUserId || null,
                ...ctx.metadata,
              },
            });
            notificationId = notifResult.notificationIds[0];
          }

          stepResults.push({ step: i + 1, action, label: stepLabel, status: "success", notificationId, latencyMs: Date.now() - stepStart });
        } catch (stepErr) {
          console.error(`[WorkflowExecutor] Step ${i + 1} (${action}) error:`, stepErr);
          stepResults.push({ step: i + 1, action, label: stepLabel, status: "error", latencyMs: Date.now() - stepStart });
        }
      }

      results.push({
        workflowId: wf.id,
        workflowName: wf.name,
        triggerEvent: ctx.triggerEvent,
        patientId: ctx.patientId,
        stepsExecuted: stepResults.filter((s) => s.status === "success").length,
        stepResults,
        totalDurationMs: Date.now() - execStart,
        executedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("[WorkflowExecutor] Critical error:", err);
  }

  return results;
}

