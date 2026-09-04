-- ============================================================
-- Feedback, E2EE Audit, Patient Journey & Clinical Flow Migration
-- Run inside the postgres container:
--   Get-Content "docker\feedback_and_workflow_migration.sql" | docker exec -i Nini_postgres_db psql -U postgres -d clinic_enterprise
-- ============================================================

-- ─── 1. FEEDBACK RECORDS (AI-DRIVEN NLP ANALYZED) ──────────────────────────
CREATE TABLE IF NOT EXISTS feedback_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  submitter_type TEXT NOT NULL DEFAULT 'patient'
    CHECK (submitter_type IN ('patient', 'family', 'staff_physician', 'staff_nurse', 'staff_admin', 'anonymous')),
  submitter_user_id UUID REFERENCES users(id),
  submitter_name TEXT,
  submitter_contact TEXT,
  encounter_id UUID REFERENCES encounters(id),
  department TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'consultation', 'nursing', 'pharmacy', 'laboratory', 'radiology', 'billing', 'facilities', 'telehealth')),
  
  -- AI NLP Analysis Fields
  sentiment TEXT NOT NULL DEFAULT 'neutral'
    CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score NUMERIC(4,2) DEFAULT 0.00, -- -1.00 to +1.00
  confidence_score NUMERIC(4,2) DEFAULT 0.85,
  extracted_themes JSONB DEFAULT '[]', -- ['wait_times', 'triage_speed', 'bedside_manner']
  action_recommendations JSONB DEFAULT '[]', -- [{ "action": "...", "priority": "high", "department": "Pharmacy" }]
  urgency_level TEXT NOT NULL DEFAULT 'normal'
    CHECK (urgency_level IN ('low', 'normal', 'elevated', 'critical_safety')),
  is_safety_hazard BOOLEAN NOT NULL DEFAULT FALSE,

  -- Administrative Workflow & Resolution
  resolution_status TEXT NOT NULL DEFAULT 'open'
    CHECK (resolution_status IN ('open', 'under_investigation', 'action_taken', 'closed', 'dismissed')),
  assigned_admin_id UUID REFERENCES users(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. TAMPER-EVIDENT ADMIN AUDIT LOGS (HMAC CHAINED) ────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  actor_user_id UUID NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL,
  actor_ip_address TEXT,
  actor_user_agent TEXT,
  action_type TEXT NOT NULL
    CHECK (action_type IN (
      'decrypt_sensitive_field',
      'rotate_encryption_key',
      'override_security_gate',
      'bulk_phi_export',
      'modify_rbac_permission',
      'grant_temporary_elevation',
      'revoke_user_access',
      'view_unmasked_record',
      'system_configuration_change',
      'emergency_break_glass'
    )),
  target_resource_type TEXT NOT NULL, -- 'patient', 'user', 'encounter', 'encryption_key', 'system'
  target_resource_id TEXT,
  details JSONB DEFAULT '{}',
  previous_entry_hash TEXT,
  entry_hash TEXT NOT NULL,
  is_tamper_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. ENCRYPTION KEY REGISTRY & METADATA ────────────────────────────────
CREATE TABLE IF NOT EXISTS encryption_key_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  key_alias TEXT NOT NULL UNIQUE,
  key_version INTEGER NOT NULL DEFAULT 1,
  algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'rotated', 'revoked', 'compromised')),
  created_by UUID NOT NULL REFERENCES users(id),
  rotated_by UUID REFERENCES users(id),
  rotated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. PATIENT JOURNEY EVENTS (REAL-TIME TIMELINE) ───────────────────────
CREATE TABLE IF NOT EXISTS patient_journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES encounters(id),
  current_stage TEXT NOT NULL
    CHECK (current_stage IN ('triage', 'waiting', 'consultation', 'lab_pending', 'lab_ready', 'radiology_pending', 'pharmacy', 'ward_admission', 'discharged')),
  previous_stage TEXT,
  location_room TEXT, -- e.g. 'Exam Room 104', 'Lab Draw Station B', 'Ward 2 Bed 04'
  attending_staff_id UUID REFERENCES users(id),
  transit_duration_seconds INTEGER DEFAULT 0,
  stage_status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (stage_status IN ('pending', 'in_progress', 'completed', 'escalated', 'on_hold')),
  notes TEXT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 5. CLINICAL WARD ROUNDS & HANDOVER ───────────────────────────────────
CREATE TABLE IF NOT EXISTS clinical_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES encounters(id),
  bed_number TEXT NOT NULL,
  ward_department TEXT NOT NULL DEFAULT 'General Inpatient',
  rounding_clinician_id UUID NOT NULL REFERENCES users(id),
  acuity_score TEXT NOT NULL DEFAULT 'stable'
    CHECK (acuity_score IN ('stable', 'monitoring', 'deteriorating', 'critical', 'discharge_ready')),
  vital_summary JSONB DEFAULT '{}', -- { "bp": "120/80", "hr": 78, "spo2": 98, "temp": 37.0 }
  clinical_notes TEXT NOT NULL,
  active_concerns TEXT,
  plan_of_care TEXT NOT NULL,
  critical_alerts JSONB DEFAULT '[]', -- ['High Potassium 6.2 mmol/L', 'Fall Risk']
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
  next_round_scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 6. PATIENT WAYFINDING & QUEUE NOTIFICATIONS ──────────────────────────
CREATE TABLE IF NOT EXISTS patient_wayfinding_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES encounters(id),
  ticket_number TEXT NOT NULL, -- e.g. 'A-104'
  target_location TEXT NOT NULL, -- e.g. 'Room 204 - Lab Draw Station B'
  floor_level TEXT DEFAULT 'Ground Floor',
  direction_guidance TEXT, -- e.g. 'Take elevator to 2nd floor, turn left after Station A'
  estimated_wait_minutes INTEGER DEFAULT 5,
  channel TEXT NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('sms', 'whatsapp', 'in_app', 'digital_signage', 'audio_call')),
  recipient_phone TEXT,
  message_content TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'sent'
    CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'failed', 'read')),
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_sentiment ON feedback_records(tenant_id, sentiment);
CREATE INDEX IF NOT EXISTS idx_feedback_urgency ON feedback_records(urgency_level);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON admin_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_patient_journey_patient ON patient_journey_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_journey_stage ON patient_journey_events(current_stage);
CREATE INDEX IF NOT EXISTS idx_clinical_rounds_patient ON clinical_rounds(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_rounds_acuity ON clinical_rounds(acuity_score);
CREATE INDEX IF NOT EXISTS idx_wayfinding_patient ON patient_wayfinding_notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_wayfinding_ticket ON patient_wayfinding_notifications(ticket_number);

SELECT 'Feedback, E2EE Audit, Patient Journey & Clinical Flow migration completed successfully.' AS result;
