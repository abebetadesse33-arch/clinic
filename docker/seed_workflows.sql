-- ==============================================================================
-- ENTERPRISE CLINICAL WORKFLOW DEFINITIONS & END-TO-END LABORATORY PIPELINES SEED
-- ==============================================================================

-- 1. End-to-End Clinical Laboratory Diagnostic Pipeline
INSERT INTO workflow_definitions (
  id, tenant_id, name, description, trigger_event, conditions, steps, is_active, created_at, updated_at
) VALUES (
  'aa233b6d-1b7c-416e-bfe6-eac7af490f1e',
  '00000000-0000-0000-0000-000000000001',
  'End-to-End Clinical Laboratory Diagnostic Pipeline',
  'Complete laboratory workflow covering order placement, price calculation, specimen accessioning, barcode verification, metabolic analysis, biochemical interpretation, and EHR updates.',
  'LAB_ORDER_SUBMITTED',
  '{"department": "Laboratory", "priority": "routine_or_stat"}',
  '[
    {"step": 1, "action": "AUTO_CALCULATE_PRICE", "label": "Calculate Lab Pricing", "description": "Check laboratory fee catalog and membership coverage"},
    {"step": 2, "action": "CREATE_INVOICE", "label": "Generate Lab Invoice", "description": "Create itemized billing slip for ordered test panels"},
    {"step": 3, "action": "VERIFY_INSURANCE_ELIGIBILITY", "label": "Verify Insurance", "description": "Check third-party payer diagnostic coverage"},
    {"step": 4, "action": "CREATE_LAB_REQUEST", "label": "Route to Lab Worklist", "description": "Transmit requisition to phlebotomy & specimen collection station"},
    {"step": 5, "action": "RECEIVE_SPECIMEN", "label": "Specimen Accessioning", "description": "Phlebotomy logs sample collection tube, volume, and draw time"},
    {"step": 6, "action": "VERIFY_BARCODE", "label": "Scan Sample Barcode", "description": "Validate physical specimen barcode matches patient requisition"},
    {"step": 7, "action": "ORDER_METABOLIC_PANEL", "label": "Execute Analyzer Assay", "description": "Run automated biochemical / hematology analyzer assay"},
    {"step": 8, "action": "VALIDATE_LAB_RESULT", "label": "Technologist Validation", "description": "Medical technologist reviews raw values against biological reference ranges"},
    {"step": 9, "action": "INTERPRET_BIOCHEMICAL_RESULTS", "label": "Biochemical Interpretation", "description": "Algorithmic review of metabolic ratios and organ function markers"},
    {"step": 10, "action": "CALCULATE_ANION_GAP", "label": "Calculate Anion Gap", "description": "Compute metabolic parameters for acid-base equilibrium"},
    {"step": 11, "action": "UPDATE_PATIENT_JOURNEY", "label": "Update Patient Journey", "description": "Advance patient progress status to Diagnostics Complete"},
    {"step": 12, "action": "CREATE_AUDIT_LOG", "label": "CLIA / ISO Compliance Log", "description": "Record complete chain-of-custody and analytical timestamp in audit ledger"}
  ]',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  trigger_event = EXCLUDED.trigger_event,
  conditions = EXCLUDED.conditions,
  steps = EXCLUDED.steps,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 2. Critical Biochemical Alert & Rapid Telehealth Escalation
INSERT INTO workflow_definitions (
  id, tenant_id, name, description, trigger_event, conditions, steps, is_active, created_at, updated_at
) VALUES (
  'b2c3d4e5-f6a7-4890-bcde-112233445566',
  '00000000-0000-0000-0000-000000000001',
  'Critical Biochemical Alert & Rapid Telehealth Escalation',
  'Instantaneous emergency escalation pipeline triggered by panic lab values (severe hyperkalemia, profound hypoglycemia, troponin spikes), triggering STAT notifications, chemist review, and virtual consultation.',
  'BIOCHEMICAL_CRITICAL_VALUE',
  '{"severity": "critical", "alertImmediate": true}',
  '[
    {"step": 1, "action": "FLAG_CRITICAL_BIOCHEMICAL_VALUE", "label": "Flag Panic Value in Red", "description": "Set urgent flashing STAT indicator across all EHR interfaces"},
    {"step": 2, "action": "ALERT_ATTENDING_PHYSICIAN", "label": "Alert Attending Physician (STAT)", "description": "Dispatch audio/visual alarm and urgent push alert to primary doctor"},
    {"step": 3, "action": "ALERT_ATTENDING_NURSE", "label": "Alert Bedside Nurse", "description": "Trigger nursing station alarm for immediate bedside patient reassessment"},
    {"step": 4, "action": "PAGE_ON_CALL_STAFF", "label": "Page On-Call Hospitalist", "description": "Broadcast code notification to on-call emergency hospitalist"},
    {"step": 5, "action": "REFER_TO_BIOCHEMIST", "label": "Clinical Chemist Consult", "description": "Notify clinical biochemist for analytical verification & differential"},
    {"step": 6, "action": "CREATE_TELEHEALTH_ROOM", "label": "Create Emergency Virtual Room", "description": "Launch encrypted video bridge for urgent remote clinician consultation"},
    {"step": 7, "action": "SEND_TELEHEALTH_LINK", "label": "Dispatch Telehealth Access Link", "description": "Send video consultation bridge link to physician and patient emergency contact"},
    {"step": 8, "action": "INITIATE_VIDEO_CALL", "label": "Initiate Emergency Video Call", "description": "Connect on-call doctor with bedside clinician or remote patient"},
    {"step": 9, "action": "SEND_SMS_NOTIFICATION", "label": "Dispatch STAT SMS", "description": "Send immediate notification to patient emergency contact"},
    {"step": 10, "action": "CREATE_AUDIT_LOG", "label": "Critical Escalation Audit", "description": "Log compliance timestamp verifying critical value was communicated within 15 min"}
  ]',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  trigger_event = EXCLUDED.trigger_event,
  conditions = EXCLUDED.conditions,
  steps = EXCLUDED.steps,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 3. Molecular Genomics & Pharmacogenomics Advisory Pipeline
INSERT INTO workflow_definitions (
  id, tenant_id, name, description, trigger_event, conditions, steps, is_active, created_at, updated_at
) VALUES (
  'c3d4e5f6-a7b8-4901-cdef-223344556677',
  '00000000-0000-0000-0000-000000000001',
  'Molecular Genomics & Pharmacogenomics Advisory Pipeline',
  'End-to-end pipeline connecting genetic variant detection with biochemist review, drug safety reconciliation, attending physician alerts, and clinical documentation.',
  'PHARMACOGENOMIC_ALERT',
  '{"riskLevel": "high_toxicity_or_inefficacy"}',
  '[
    {"step": 1, "action": "RUN_PHARMACOGENOMIC_CHECK", "label": "CPIC Allele Verification", "description": "Cross-reference detected CYP2C19, CYP2D6, or SLCO1B1 alleles with CPIC guidelines"},
    {"step": 2, "action": "REFER_TO_BIOCHEMIST", "label": "Refer to Molecular Biologist", "description": "Route profile to molecular laboratory director for expert clinical sign-off"},
    {"step": 3, "action": "CREATE_BIOCHEMICAL_CONSULT", "label": "Draft Pharmacogenomic Report", "description": "Generate formal precision medicine consult letter detailing variant implications"},
    {"step": 4, "action": "ALERT_ATTENDING_PHYSICIAN", "label": "Alert Prescribing Physician", "description": "Prompt clinician with alternative medication and dosing recommendations"},
    {"step": 5, "action": "RECONCILE_MEDICATION", "label": "Reconcile Drug Regimen", "description": "Substitute contra-indicated medication with genetically compatible alternative"},
    {"step": 6, "action": "NOTIFY_CARE_TEAM", "label": "Notify Clinical Pharmacist", "description": "Inform dispensing pharmacist of safety clearance and amended dosing"},
    {"step": 7, "action": "GENERATE_SOAP_NOTE", "label": "Generate Precision Note", "description": "Document genetic variant rationale into official EHR progress record"},
    {"step": 8, "action": "UPDATE_CARE_PLAN", "label": "Update Precision Care Plan", "description": "Add permanent pharmacogenomic contraindication to patient lifetime record"}
  ]',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  trigger_event = EXCLUDED.trigger_event,
  conditions = EXCLUDED.conditions,
  steps = EXCLUDED.steps,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 4. Remote Telemedicine On-Demand Triage & E-Prescription
INSERT INTO workflow_definitions (
  id, tenant_id, name, description, trigger_event, conditions, steps, is_active, created_at, updated_at
) VALUES (
  'd4e5f6a7-b8c9-4012-defa-334455667788',
  '00000000-0000-0000-0000-000000000001',
  'Remote Telemedicine On-Demand Triage & E-Prescription',
  'Automated virtual clinic journey from patient remote consultation request through virtual waiting room, video consult, e-prescribing, and post-visit survey.',
  'REMOTE_CONSULTATION_REQUESTED',
  '{"channel": "telehealth_virtual_urgent_care"}',
  '[
    {"step": 1, "action": "TRIGGER_AI_TRIAGE", "label": "Virtual AI Triage", "description": "Assess chief complaint, acuity, and contraindications for virtual care"},
    {"step": 2, "action": "CREATE_TELEHEALTH_ROOM", "label": "Create WebRTC Virtual Room", "description": "Spin up secure encrypted clinical video bridge"},
    {"step": 3, "action": "SEND_VIRTUAL_WAITING_ROOM_LINK", "label": "Queue into Waiting Room", "description": "Send patient link to virtual waiting room with queue position"},
    {"step": 4, "action": "ALERT_ATTENDING_PHYSICIAN", "label": "Alert Available Provider", "description": "Notify on-duty telemedicine physician of queued patient"},
    {"step": 5, "action": "INITIATE_VIDEO_CALL", "label": "Launch Video Encounter", "description": "Connect provider and patient in real-time video session"},
    {"step": 6, "action": "TRANSCRIBE_CONSULTATION", "label": "Real-time Voice Scribe", "description": "AI clinical transcription converts conversation to draft SOAP note"},
    {"step": 7, "action": "SEND_E_PRESCRIPTION", "label": "Transmit E-Prescription", "description": "Directly route authorized prescription to pharmacy fulfillment queue"},
    {"step": 8, "action": "AUTO_CALCULATE_PRICE", "label": "Settle Visit Charges", "description": "Calculate consultation fee and process digital payment"},
    {"step": 9, "action": "SEND_SATISFACTION_SURVEY", "label": "Post-Visit Patient Survey", "description": "Request feedback on video quality and provider care"}
  ]',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  trigger_event = EXCLUDED.trigger_event,
  conditions = EXCLUDED.conditions,
  steps = EXCLUDED.steps,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 5. Remote Patient Monitoring (RPM) Vitals Critical Escalation
INSERT INTO workflow_definitions (
  id, tenant_id, name, description, trigger_event, conditions, steps, is_active, created_at, updated_at
) VALUES (
  'e5f6a7b8-c9d0-4123-efab-445566778899',
  '00000000-0000-0000-0000-000000000001',
  'Remote Patient Monitoring (RPM) Vitals Critical Escalation',
  'Monitors continuous wearable telemetry; when critical vitals thresholds are breached, automatically triggers AI triage, nurse alerting, and immediate telehealth video outreach.',
  'DEVICE_READING_CRITICAL',
  '{"alertTier": "tier_1_life_critical"}',
  '[
    {"step": 1, "action": "SEND_REMOTE_MONITORING_ALERT", "label": "Log Sensor Violation", "description": "Capture exact biometric values and baseline divergence"},
    {"step": 2, "action": "TRIGGER_AI_TRIAGE", "label": "AI Decompensation Analysis", "description": "Analyze trend data to estimate immediate hospitalization risk"},
    {"step": 3, "action": "ALERT_ATTENDING_NURSE", "label": "Alert Care Coordinator Nurse", "description": "Route priority alert to assigned remote monitoring nurse"},
    {"step": 4, "action": "CREATE_TELEHEALTH_ROOM", "label": "Generate Video Room", "description": "Create immediate virtual outreach bridge"},
    {"step": 5, "action": "SEND_TELEHEALTH_LINK", "label": "Send Outreach Link via SMS", "description": "Urgent SMS link prompting patient to connect with nurse"},
    {"step": 6, "action": "INITIATE_VIDEO_CALL", "label": "Conduct Video Assessment", "description": "Visual inspection of patient respiratory effort, color, and mentation"},
    {"step": 7, "action": "CREATE_AUDIT_LOG", "label": "Compliance & Safety Log", "description": "Record RPM emergency intervention into clinical audit log"}
  ]',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  trigger_event = EXCLUDED.trigger_event,
  conditions = EXCLUDED.conditions,
  steps = EXCLUDED.steps,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 6. Specialist Multidisciplinary Team (MDT) & Second Opinion
INSERT INTO workflow_definitions (
  id, tenant_id, name, description, trigger_event, conditions, steps, is_active, created_at, updated_at
) VALUES (
  'f6a7b8c9-d0e1-4234-fabc-556677889900',
  '00000000-0000-0000-0000-000000000001',
  'Specialist Multidisciplinary Team (MDT) & Second Opinion',
  'Complex case referral pipeline triggering multidisciplinary conference scheduling, dossier distribution, video conference recording, and shared care plan creation.',
  'SECOND_OPINION_REQUESTED',
  '{"caseComplexity": "tertiary_specialist_review"}',
  '[
    {"step": 1, "action": "CREATE_SPECIALIST_REFERRAL", "label": "Compile Clinical Dossier", "description": "Aggregate chart, histopathology, and imaging for expert panel"},
    {"step": 2, "action": "SCHEDULE_MDT_MEETING", "label": "Schedule Case Conference", "description": "Coordinate multi-provider calendar availability"},
    {"step": 3, "action": "INVITE_MDT_MEMBERS", "label": "Invite Specialist Panel", "description": "Send secure invitations to oncology, surgery, pathology, and radiology leads"},
    {"step": 4, "action": "CREATE_TELEHEALTH_ROOM", "label": "Create Virtual Boardroom", "description": "Launch secure high-definition multi-party consultation bridge"},
    {"step": 5, "action": "RECORD_CONSULTATION", "label": "Record Conference Deliberation", "description": "Record clinical panel discussion for medical records"},
    {"step": 6, "action": "GENERATE_MDT_SUMMARY", "label": "Draft Consensus Document", "description": "Synthesize specialist consensus into actionable care strategy"},
    {"step": 7, "action": "CREATE_SHARED_CARE_PLAN", "label": "Publish Shared Care Plan", "description": "Commit unified multidisciplinary protocol to patient EHR"},
    {"step": 8, "action": "UPDATE_CARE_PLAN", "label": "Notify Primary Care Clinician", "description": "Update referring doctor with completed second opinion report"}
  ]',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  trigger_event = EXCLUDED.trigger_event,
  conditions = EXCLUDED.conditions,
  steps = EXCLUDED.steps,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 7. Automated Prescription-to-Dispense Pipeline
INSERT INTO workflow_definitions (
  id, tenant_id, name, description, trigger_event, conditions, steps, is_active, created_at, updated_at
) VALUES (
  'f8d67f7c-9a39-4230-bfed-6bdd73c15356',
  '00000000-0000-0000-0000-000000000001',
  'Automated Prescription-to-Dispense Pipeline',
  'Standard hospital pharmacy automation executing price calculation, clinical drug interaction verification, electronic invoicing, and bedside dispensing notification.',
  'PRESCRIPTION_SIGNED',
  '{"source": "outpatient_or_inpatient"}',
  '[
    {"step": 1, "action": "AUTO_CALCULATE_PRICE", "label": "Calculate Drug Price", "description": "Compute cost based on dosage, unit packaging, and insurance tier"},
    {"step": 2, "action": "RUN_DRUG_INTERACTION_CHECK", "label": "Verify Drug Safety", "description": "Automated check against patient allergy list and current medications"},
    {"step": 3, "action": "CREATE_INVOICE", "label": "Generate Dispensary Invoice", "description": "Generate pharmacy billing ticket for cashier or insurance claim"},
    {"step": 4, "action": "ENQUEUE_PHARMACY", "label": "Enqueue in Dispensary Carousel", "description": "Transmit order to pharmacy dispensing queue"},
    {"step": 5, "action": "ALERT_PHARMACIST_DISPENSE", "label": "Alert Pharmacy Technician", "description": "Notify technician to pick, count, and label medication"},
    {"step": 6, "action": "NOTIFY_PATIENT_PAYMENT_DUE", "label": "Notify Patient to Collect", "description": "Send SMS or app notice when prescription is ready for pickup"}
  ]',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  trigger_event = EXCLUDED.trigger_event,
  conditions = EXCLUDED.conditions,
  steps = EXCLUDED.steps,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
