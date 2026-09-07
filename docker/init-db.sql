-- =========================================================
-- NiniMED ENTERPRISE CDSS - POSTGRESQL 16 SCHEMA & SEED
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

GRANT ALL PRIVILEGES ON DATABASE clinic_enterprise TO postgres;

-- 1. ORGANIZATIONS & FACILITIES
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. USERS & ROLES
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    department TEXT,
    license_number TEXT,
    scope_of_practice JSONB DEFAULT '{}',
    is_admin_granted_by_super_admin BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS professional_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    professional_type TEXT NOT NULL,
    license_number TEXT,
    specialty TEXT,
    certifications JSONB DEFAULT '[]',
    hospital_affiliation TEXT,
    dea_number TEXT,
    digital_signature_ref TEXT,
    scope_of_practice JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. PATIENTS & CARE TEAMS
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    mrn TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL,
    blood_type TEXT,
    phone TEXT,
    email TEXT,
    allergies JSONB DEFAULT '[]',
    emergency_contact TEXT,
    primary_doctor_id UUID REFERENCES users(id),
    triage_priority TEXT DEFAULT 'routine',
    avatar TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS care_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS care_team_members (
    care_team_id UUID NOT NULL REFERENCES care_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (care_team_id, user_id)
);

CREATE TABLE IF NOT EXISTS encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinician_id UUID NOT NULL REFERENCES users(id),
    encounter_type TEXT NOT NULL,
    status TEXT DEFAULT 'planned' NOT NULL,
    admission_status TEXT DEFAULT 'outpatient' NOT NULL,
    current_step TEXT DEFAULT 'front_desk' NOT NULL,
    assigned_nurse_id UUID REFERENCES users(id),
    assigned_physician_id UUID REFERENCES users(id),
    assigned_care_coordinator_id UUID REFERENCES users(id),
    workflow_progress JSONB DEFAULT '{}',
    chief_complaint TEXT,
    clinical_notes TEXT,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. MEDIA ASSETS
CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    modality TEXT NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size_kb INT,
    metadata JSONB DEFAULT '{}',
    preprocessed_summary TEXT,
    confidence_score NUMERIC,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. CLINICAL ASSESSMENTS
CREATE TABLE IF NOT EXISTS vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    bmi NUMERIC,
    systolic_bp INT,
    diastolic_bp INT,
    heart_rate INT,
    respiratory_rate INT,
    temperature_c NUMERIC,
    oxygen_saturation NUMERIC,
    ecg_summary TEXT,
    recorded_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS symptoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    severity TEXT NOT NULL,
    onset_date DATE,
    duration TEXT,
    body_location TEXT,
    description TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    category TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT NOT NULL,
    reference_range_low NUMERIC,
    reference_range_high NUMERIC,
    is_abnormal BOOLEAN DEFAULT FALSE NOT NULL,
    interpretation TEXT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    source_lab TEXT,
    report_url TEXT
);

CREATE TABLE IF NOT EXISTS genetic_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    gene TEXT NOT NULL,
    variant TEXT NOT NULL,
    phenotype TEXT NOT NULL,
    clinical_significance TEXT NOT NULL,
    source_panel TEXT,
    vcf_asset_id UUID REFERENCES media_assets(id),
    tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS imaging_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    media_asset_id UUID REFERENCES media_assets(id),
    modality TEXT NOT NULL,
    body_site TEXT NOT NULL,
    finding_summary TEXT NOT NULL,
    impression TEXT NOT NULL,
    image_url TEXT,
    radiologist_name TEXT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS nursing_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id),
    morse_fall_score INT,
    fall_risk_category TEXT,
    braden_pressure_score INT,
    pain_score INT,
    intake_output_ml JSONB DEFAULT '{"intake": 0, "output": 0}',
    nursing_care_notes TEXT,
    assessed_by UUID NOT NULL REFERENCES users(id),
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS physiotherapy_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    berg_balance_score INT,
    gait_speed_meters_per_sec NUMERIC,
    mobility_status TEXT,
    strength_grading JSONB DEFAULT '{}',
    rehab_goals TEXT,
    exercise_plan JSONB DEFAULT '{}',
    assessed_by UUID NOT NULL REFERENCES users(id),
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS occupational_therapy_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    barthel_index_score INT,
    home_safety_risk TEXT,
    adaptive_equipment_needs JSONB DEFAULT '[]',
    cognitive_support_notes TEXT,
    assessed_by UUID NOT NULL REFERENCES users(id),
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS nutrition_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    nutritional_risk_score TEXT,
    daily_calorie_target INT,
    protein_target_grams INT,
    sodium_limit_mg INT,
    diet_type TEXT,
    food_insecurity_accommodation TEXT,
    meal_plan_details JSONB DEFAULT '{}',
    assessed_by UUID NOT NULL REFERENCES users(id),
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS social_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    indicator TEXT NOT NULL,
    severity_level TEXT NOT NULL,
    description TEXT NOT NULL,
    recommended_action TEXT,
    community_resources_connected JSONB DEFAULT '[]',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS respiratory_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    abg_ph NUMERIC,
    abg_paco2 NUMERIC,
    abg_pao2 NUMERIC,
    abg_hco3 NUMERIC,
    abg_sao2 NUMERIC,
    ventilator_settings JSONB DEFAULT '{}',
    airway_clearance_regimen TEXT,
    assessed_by UUID NOT NULL REFERENCES users(id),
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS psychological_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    score INT NOT NULL,
    severity TEXT NOT NULL,
    breakdown JSONB,
    clinical_notes TEXT,
    adherence_risk TEXT DEFAULT 'low',
    assessed_by UUID REFERENCES users(id),
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. MEDICATIONS, PRESCRIPTIONS, & ORDERS
CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    route TEXT DEFAULT 'Oral',
    indication TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    prescribed_by UUID REFERENCES users(id),
    pharmacist_verified BOOLEAN DEFAULT FALSE,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id),
    ai_suggestion_id UUID,
    status TEXT DEFAULT 'draft' NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration_days INT NOT NULL,
    quantity INT NOT NULL,
    refills_allowed INT DEFAULT 0 NOT NULL,
    instructions TEXT NOT NULL,
    prescriber_signature TEXT,
    signed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id),
    ai_suggestion_id UUID,
    test_name TEXT NOT NULL,
    clinical_reason TEXT NOT NULL,
    priority TEXT DEFAULT 'routine' NOT NULL,
    status TEXT DEFAULT 'ordered' NOT NULL,
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP
);

-- 7. CARE PLANS, TASKS, & MESSAGES
CREATE TABLE IF NOT EXISTS care_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    status TEXT DEFAULT 'active' NOT NULL,
    primary_diagnosis TEXT NOT NULL,
    goals JSONB DEFAULT '[]',
    interventions JSONB DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id),
    task_type TEXT DEFAULT 'general' NOT NULL,
    assigned_to_role TEXT NOT NULL,
    assigned_to_user_id UUID REFERENCES users(id),
    assigned_by_user_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'routine' NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    sla_minutes INT DEFAULT 60 NOT NULL,
    is_escalated BOOLEAN DEFAULT FALSE NOT NULL,
    due_date DATE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS team_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_role TEXT NOT NULL,
    content TEXT NOT NULL,
    is_urgent_consult BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. AI SUGGESTIONS & RULES
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES encounters(id),
    analysis_type TEXT DEFAULT 'comprehensive_multidisciplinary' NOT NULL,
    model_name TEXT DEFAULT 'gemini-1.5-pro' NOT NULL,
    model_version TEXT DEFAULT '2026.2-multidisciplinary',
    input_summary JSONB NOT NULL,
    raw_data_refs JSONB DEFAULT '[]' NOT NULL,
    ai_response JSONB NOT NULL,
    status TEXT DEFAULT 'pending_review' NOT NULL,
    review_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS biological_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    curated_by UUID NOT NULL REFERENCES users(id),
    category TEXT NOT NULL,
    rule_title TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence_grade TEXT NOT NULL,
    source_citation TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. AUDIT LOGS & USER ROLES
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    user_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    diff JSONB,
    ip_address TEXT DEFAULT '127.0.0.1',
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP
);

-- 10. REFERRALS & EXTERNAL PROVIDERS
CREATE TABLE IF NOT EXISTS external_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    facility_name TEXT,
    address TEXT,
    email TEXT,
    phone TEXT,
    fax TEXT,
    npi TEXT,
    fhir_endpoint TEXT,
    preferred_transport TEXT DEFAULT 'email' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id),
    care_plan_id UUID REFERENCES care_plans(id),
    type TEXT DEFAULT 'internal' NOT NULL,
    source TEXT DEFAULT 'manual' NOT NULL,
    referring_user_id UUID NOT NULL REFERENCES users(id),
    referring_role TEXT NOT NULL,
    receiving_role TEXT NOT NULL,
    receiving_user_id UUID REFERENCES users(id),
    target_type TEXT DEFAULT 'professional' NOT NULL,
    target_id TEXT,
    external_provider_id UUID REFERENCES external_providers(id),
    priority TEXT DEFAULT 'routine' NOT NULL,
    status TEXT DEFAULT 'pending_review' NOT NULL,
    clinical_reason TEXT NOT NULL,
    clinical_summary TEXT,
    notes TEXT,
    insurance_auth_number TEXT,
    scheduled_appointment_id TEXT,
    attached_data_refs JSONB DEFAULT '[]',
    due_by TIMESTAMP,
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP,
    response_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS referral_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    performed_by UUID NOT NULL REFERENCES users(id),
    performer_role TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 11. SUBSCRIPTIONS, FAMILY GROUPS, & COMPANIES
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    billing_cycle TEXT NOT NULL,
    base_price NUMERIC NOT NULL,
    currency TEXT DEFAULT 'ETB' NOT NULL,
    max_members INT,
    additional_member_price NUMERIC DEFAULT '0',
    included_services JSONB DEFAULT '{"consultations": 0, "labTests": 0, "discountPercent": 0, "coveredCategories": []}' NOT NULL,
    trial_period_days INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    version INT DEFAULT 1 NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS family_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    primary_patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    can_view_shared_billing BOOLEAN DEFAULT FALSE NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tin_number TEXT,
    industry TEXT,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    billing_address TEXT,
    billing_email TEXT,
    preferred_payment_method TEXT DEFAULT 'bank_transfer',
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS company_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'hr_manager' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS company_employee_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    phone TEXT,
    employee_id_number TEXT,
    department TEXT,
    status TEXT DEFAULT 'pending' NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    claimed_patient_id UUID REFERENCES patients(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    subscriber_type TEXT NOT NULL,
    family_group_id UUID REFERENCES family_groups(id),
    company_id UUID REFERENCES companies(id),
    patient_id UUID REFERENCES patients(id),
    seat_count INT DEFAULT 1 NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE NOT NULL,
    cancelled_at TIMESTAMP,
    trial_ends_at TIMESTAMP,
    paused_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'employee' NOT NULL,
    department TEXT,
    employee_id_number TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    removed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscription_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    base_amount NUMERIC NOT NULL,
    additional_seats_amount NUMERIC DEFAULT '0' NOT NULL,
    discount_amount NUMERIC DEFAULT '0' NOT NULL,
    tax_amount NUMERIC DEFAULT '0' NOT NULL,
    total_amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'ETB' NOT NULL,
    status TEXT DEFAULT 'open' NOT NULL,
    payment_method TEXT,
    payment_reference TEXT,
    gateway_transaction_id TEXT,
    due_date TIMESTAMP NOT NULL,
    paid_at TIMESTAMP,
    pdf_url TEXT,
    dunning_attempts INT DEFAULT 0 NOT NULL,
    last_dunning_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    service_type TEXT NOT NULL CHECK (service_type IN ('consultation','lab_test','medication','procedure','telehealth','physiotherapy')),
    service_id UUID,
    quantity INT DEFAULT 1 NOT NULL,
    nominal_price NUMERIC NOT NULL,
    covered_amount NUMERIC NOT NULL,
    patient_copay_amount NUMERIC DEFAULT '0' NOT NULL,
    billing_period_start TIMESTAMP NOT NULL,
    billing_period_end TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 12. CENTRAL STATE MACHINE TABLES
CREATE TABLE IF NOT EXISTS encounter_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    workflow TEXT NOT NULL,
    state TEXT NOT NULL,
    entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    exited_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS encounter_events (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    payload JSONB DEFAULT '{}' NOT NULL,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actor_id UUID REFERENCES users(id),
    actor_role TEXT,
    correlation_id TEXT
);

CREATE TABLE IF NOT EXISTS state_slas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow TEXT NOT NULL,
    state TEXT NOT NULL,
    max_duration_seconds INT NOT NULL,
    escalation_action TEXT DEFAULT 'notify_supervisor' NOT NULL,
    escalation_target_role TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS state_sla_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    workflow TEXT NOT NULL,
    state TEXT NOT NULL,
    max_duration_seconds INT NOT NULL,
    actual_duration_seconds INT NOT NULL,
    escalated_to UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS saga_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    saga_type TEXT NOT NULL,
    status TEXT DEFAULT 'in_progress' NOT NULL,
    steps JSONB DEFAULT '[]' NOT NULL,
    error_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_state_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    workflow TEXT NOT NULL,
    state TEXT NOT NULL,
    entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    exited_at TIMESTAMP,
    duration_seconds INT,
    entered_by UUID REFERENCES users(id),
    exit_reason TEXT,
    metadata JSONB DEFAULT '{}'
);

-- =========================================================
-- SEED DATA INITIALIZATION
-- =========================================================

-- Insert Master Organization
INSERT INTO organizations (id, name, slug, status, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'NiniMed Enterprise Health System',
    'org-Nini',
    'active',
    '{"theme": "dark", "multitenancy": true, "auditLevel": "21CFR11"}'
) ON CONFLICT (slug) DO NOTHING;

-- Insert Main Facility
INSERT INTO facilities (id, organization_id, name, address, timezone)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'NiniMed Clinic& Clinic',
    'Bole Sub-City, Addis Ababa, Ethiopia',
    'Africa/Addis_Ababa'
) ON CONFLICT DO NOTHING;

-- -- Insert Primary Super Administrator
INSERT INTO users (id, organization_id, email, password_hash, full_name, role, department, is_admin_granted_by_super_admin, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000099',
    '00000000-0000-0000-0000-000000000001',
    'admin@Ninimed.org',
    encode(digest('Admin@2026!', 'sha256'), 'hex'),
    'System Super Administrator',
    'system_admin',
    'Enterprise IT & Clinical Governance',
    TRUE,
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    role = 'system_admin',
    full_name = 'System Super Administrator',
    password_hash = encode(digest('Admin@2026!', 'sha256'), 'hex'),
    is_admin_granted_by_super_admin = TRUE,
    is_active = TRUE;

-- -- Insert Super Administrator Abebe Tadesse
INSERT INTO users (id, organization_id, email, password_hash, full_name, role, department, is_admin_granted_by_super_admin, is_active)
VALUES (
    '5c254614-7cb0-4e72-a7cb-7bbe0a98c42d',
    '00000000-0000-0000-0000-000000000001',
    'abebetadesse1@gmail.com',
    encode(digest('Ninielda@&1', 'sha256'), 'hex'),
    'Abebe Tadesse',
    'system_admin',
    'System Administration',
    TRUE,
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    role = 'system_admin',
    full_name = 'Abebe Tadesse',
    password_hash = encode(digest('Ninielda@&1', 'sha256'), 'hex'),
    is_admin_granted_by_super_admin = TRUE,
    is_active = TRUE;

-- Insert Subscription Plans
INSERT INTO subscription_plans (id, tenant_id, name, slug, description, type, billing_cycle, base_price, currency, max_members, included_services)
VALUES
    ('55555555-5555-5555-5555-555555555501', '00000000-0000-0000-0000-000000000001', 'Comprehensive Individual Care', 'individual-standard', 'Unlimited CDSS telemedicine and chronic monitoring', 'individual', 'monthly', 1200, 'ETB', 1, '{"consultations": 4, "labTests": 2, "discountPercent": 15}'),
    ('55555555-5555-5555-5555-555555555502', '00000000-0000-0000-0000-000000000001', 'Multidisciplinary Family Shield', 'family-premium', 'Covers up to 6 family members with chronic care management', 'family', 'monthly', 2800, 'ETB', 6, '{"consultations": 12, "labTests": 6, "discountPercent": 25}'),
    ('55555555-5555-5555-5555-555555555503', '00000000-0000-0000-0000-000000000001', 'Enterprise Corporate Health Plan', 'corporate-platinum', 'B2B corporate employee health benefit coverage', 'company', 'yearly', 150000, 'ETB', 100, '{"consultations": 250, "labTests": 100, "discountPercent": 35}')
ON CONFLICT DO NOTHING;

-- =========================================================
-- NOTIFICATION PRIVILEGES (Role × Category Channel Matrix)
-- =========================================================
CREATE TABLE IF NOT EXISTS notification_privileges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    category TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    channels JSONB DEFAULT '{"inApp": true, "telegram": true}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (role, category)
);

-- =========================================================
-- TELEGRAM INTEGRATIONS (Per-user Telegram Account Linking)
-- =========================================================
CREATE TABLE IF NOT EXISTS telegram_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_chat_id TEXT NOT NULL,
    telegram_username TEXT,
    is_notifications_enabled BOOLEAN DEFAULT TRUE,
    auth_link_token VARCHAR(64),
    token_expires_at TIMESTAMP,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_notified_at TIMESTAMP,
    UNIQUE (user_id)
);


-- Add national_id to users if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id TEXT;

-- =========================================================
-- NOTIFICATIONS TABLE (Central Alert Inbox)
-- =========================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT,
    body TEXT NOT NULL DEFAULT '',
    priority TEXT DEFAULT 'normal' NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    action_url TEXT,
    action_text TEXT,
    target_role TEXT,
    target_department TEXT,
    related_entity_type TEXT,
    related_entity_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    read_at TIMESTAMP,
    expires_at TIMESTAMP
);

ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN message DROP NOT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_role TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_department TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_text TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

CREATE OR REPLACE FUNCTION trg_sync_notifications_columns()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := COALESCE(NEW.user_id, NEW.recipient_user_id);
  NEW.recipient_user_id := COALESCE(NEW.recipient_user_id, NEW.user_id);
  NEW.message := COALESCE(NEW.message, NEW.body);
  NEW.body := COALESCE(NEW.body, NEW.message);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_notifications_columns_trigger ON notifications;
CREATE TRIGGER sync_notifications_columns_trigger
BEFORE INSERT OR UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION trg_sync_notifications_columns();


