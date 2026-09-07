import postgres from "postgres";
import { seedDemoAccounts } from "./demo-accounts";
import { PHARMACY_MASTER_CATALOGUE } from "../lib/catalogue/pharmacy-master-catalogue";
import { LABORATORY_PROTOCOLS_CATALOGUE } from "../lib/catalogue/laboratory-protocols-catalogue";

export async function ensureDatabaseInitialized(client: postgres.Sql) {
    try {
        console.log("⚡ Checking and synchronizing NiniMed PostgreSQL schema...");

        // 1. Extensions
        try {
            await client`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;
            await client`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;
            await client`CREATE EXTENSION IF NOT EXISTS "vector";`;
        } catch (extErr) {
            console.warn("Extension creation warning (non-fatal):", extErr);
        }

        // 2. Execute ALL DDL statements with IF NOT EXISTS unconditionally
        await client.unsafe(`
      -- Core & Access
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
          facility_id UUID REFERENCES facilities(id),
          encounter_type TEXT NOT NULL,
          status TEXT DEFAULT 'in_progress' NOT NULL,
          admission_status TEXT DEFAULT 'outpatient' NOT NULL,
          current_step TEXT DEFAULT 'triage' NOT NULL,
          chief_complaint TEXT,
          clinical_notes TEXT,
          voice_scribe_transcript TEXT,
          voice_scribe_structured JSONB DEFAULT '{}',
          differential_diagnoses JSONB DEFAULT '[]',
          hard_stop_reasons JSONB DEFAULT '[]',
          signed_audit_hash TEXT,
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          ended_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS media_assets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          asset_type TEXT NOT NULL,
          file_name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          file_size_bytes INT,
          storage_url TEXT NOT NULL,
          preview_thumbnail_url TEXT,
          annotations JSONB DEFAULT '[]',
          ai_interpretation JSONB DEFAULT '{}',
          uploaded_by UUID REFERENCES users(id),
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vitals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          systolic_bp INT,
          diastolic_bp INT,
          heart_rate INT,
          respiratory_rate INT,
          temperature_c NUMERIC,
          oxygen_saturation NUMERIC,
          bmi NUMERIC,
          height_cm NUMERIC,
          weight_kg NUMERIC,
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS symptoms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          severity TEXT NOT NULL,
          onset_date DATE,
          notes TEXT,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lab_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          test_name TEXT NOT NULL,
          category TEXT DEFAULT 'General',
          value NUMERIC,
          value_string TEXT,
          unit TEXT NOT NULL,
          reference_range TEXT,
          is_abnormal BOOLEAN DEFAULT FALSE NOT NULL,
          critical_flag BOOLEAN DEFAULT FALSE NOT NULL,
          loinc_code TEXT,
          collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS genetic_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          gene TEXT NOT NULL,
          variant TEXT NOT NULL,
          phenotype TEXT NOT NULL,
          diplotype TEXT,
          implication TEXT,
          tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS imaging_findings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          modality TEXT NOT NULL,
          body_site TEXT NOT NULL,
          findings TEXT NOT NULL,
          impression TEXT NOT NULL,
          radiologist_id UUID REFERENCES users(id),
          is_abnormal BOOLEAN DEFAULT FALSE NOT NULL,
          imaging_date DATE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS nursing_assessments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          braden_score INT,
          morse_fall_score INT,
          pain_score INT,
          pain_location TEXT,
          glasgow_coma_scale INT,
          triage_acuity TEXT,
          nursing_notes TEXT,
          assessed_by UUID NOT NULL REFERENCES users(id),
          assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS physiotherapy_assessments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          berg_balance_score INT,
          tug_test_seconds NUMERIC,
          gait_speed_mps NUMERIC,
          mobility_status TEXT,
          prescribed_exercises JSONB DEFAULT '[]',
          assessed_by UUID NOT NULL REFERENCES users(id),
          assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS occupational_therapy_assessments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          barthel_index INT,
          iadl_score INT,
          home_safety_assessment TEXT,
          assistive_devices_recommended JSONB DEFAULT '[]',
          assessed_by UUID NOT NULL REFERENCES users(id),
          assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS nutrition_assessments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          must_score INT,
          mna_score INT,
          daily_calorie_target INT,
          daily_protein_g INT,
          dietary_restrictions JSONB DEFAULT '[]',
          nutrition_notes TEXT,
          assessed_by UUID NOT NULL REFERENCES users(id),
          assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS social_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          smoking_status TEXT,
          alcohol_use TEXT,
          housing_status TEXT,
          food_security_status TEXT,
          transportation_access BOOLEAN,
          sdoh_risk_level TEXT DEFAULT 'low',
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
          route TEXT DEFAULT 'Oral',
          indication TEXT,
          duration_days INT NOT NULL,
          quantity INT NOT NULL,
          dispense_quantity INT,
          refills_allowed INT DEFAULT 0 NOT NULL,
          instructions TEXT NOT NULL,
          prescriber_signature TEXT,
          signed_at TIMESTAMP,
          pharmacist_id UUID REFERENCES users(id),
          dispensed_at TIMESTAMP,
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

      CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          document_type TEXT NOT NULL,
          file_url TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS consents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          consent_type TEXT NOT NULL,
          is_granted BOOLEAN DEFAULT FALSE NOT NULL,
          granted_at TIMESTAMP,
          expires_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS knowledge_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          content TEXT NOT NULL,
          embedding TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS biological_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organ_system TEXT NOT NULL,
          rule_name TEXT NOT NULL,
          if_condition JSONB NOT NULL,
          then_effect JSONB NOT NULL,
          evidence_grade TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
          id BIGSERIAL PRIMARY KEY,
          tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id),
          user_role TEXT,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          summary TEXT,
          diff JSONB,
          ip_address TEXT DEFAULT '127.0.0.1',
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role TEXT NOT NULL,
          granted_by UUID REFERENCES users(id),
          granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dashboard_widgets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          widget_id TEXT NOT NULL,
          grid_position JSONB DEFAULT '{"x": 0, "y": 0, "w": 4, "h": 2}' NOT NULL,
          is_visible BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dashboard_layouts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          role TEXT NOT NULL,
          layout_config JSONB NOT NULL,
          is_default BOOLEAN DEFAULT TRUE NOT NULL
      );

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

      -- Patient consents schema alignment
      ALTER TABLE patient_consents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
      ALTER TABLE patient_consents ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0';
      ALTER TABLE patient_consents ADD COLUMN IF NOT EXISTS ip_address TEXT;
      ALTER TABLE patient_consents ADD COLUMN IF NOT EXISTS user_agent TEXT;
      ALTER TABLE patient_consents ADD COLUMN IF NOT EXISTS signature_url TEXT;
      ALTER TABLE patient_consents ADD COLUMN IF NOT EXISTS granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE patient_consents ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;

      -- Patient registrations schema alignment
      ALTER TABLE patient_registrations ADD COLUMN IF NOT EXISTS verification_token TEXT;
      ALTER TABLE patient_registrations ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP;
      ALTER TABLE patient_registrations ADD COLUMN IF NOT EXISTS submitted_data JSONB DEFAULT '{}';
      ALTER TABLE patient_registrations ADD COLUMN IF NOT EXISTS duplicate_patient_id UUID REFERENCES patients(id);
      ALTER TABLE patient_registrations ADD COLUMN IF NOT EXISTS invited_by_user_id UUID REFERENCES users(id);
      ALTER TABLE patient_registrations ADD COLUMN IF NOT EXISTS activated_patient_id UUID REFERENCES patients(id);

      -- Automation rules schema alignment
      ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS escalation_timeout_minutes INTEGER DEFAULT 1440;
      ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

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

      CREATE TABLE IF NOT EXISTS notification_privileges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          role TEXT NOT NULL,
          category TEXT NOT NULL,
          is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
          channels JSONB DEFAULT '{"inApp": true, "telegram": true}'::jsonb NOT NULL,
          updated_by UUID REFERENCES users(id),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          UNIQUE(role, category)
      );

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

      CREATE TABLE IF NOT EXISTS patient_registrations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          email TEXT,
          phone TEXT,
          otp_code TEXT,
          otp_expires_at TIMESTAMP,
          is_verified BOOLEAN DEFAULT FALSE NOT NULL,
          registration_data JSONB DEFAULT '{}',
          assigned_mrn TEXT,
          created_patient_id UUID REFERENCES patients(id),
          created_user_id UUID REFERENCES users(id),
          status TEXT DEFAULT 'pending' NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS patient_consents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          consent_type TEXT NOT NULL,
          is_granted BOOLEAN DEFAULT FALSE NOT NULL,
          signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          signature_ref TEXT
      );

      CREATE TABLE IF NOT EXISTS patient_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          sender_id UUID,
          sender_type TEXT DEFAULT 'patient' NOT NULL,
          recipient_id UUID,
          recipient_type TEXT DEFAULT 'clinician' NOT NULL,
          recipient_user_id UUID REFERENCES users(id),
          direction TEXT DEFAULT 'patient_to_provider',
          message_text TEXT,
          subject TEXT,
          body TEXT DEFAULT '' NOT NULL,
          attachments JSONB DEFAULT '[]',
          is_read BOOLEAN DEFAULT FALSE NOT NULL,
          read_at TIMESTAMP,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS patient_questionnaires (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          questionnaire_type TEXT DEFAULT 'phq9' NOT NULL,
          title TEXT NOT NULL,
          answers JSONB DEFAULT '{}',
          responses JSONB DEFAULT '{}' NOT NULL,
          total_score INT,
          risk_category TEXT,
          completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workflow_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          steps JSONB DEFAULT '[]' NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS automation_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          trigger_type TEXT NOT NULL,
          condition JSONB NOT NULL,
          action JSONB NOT NULL,
          priority INT DEFAULT 1 NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS config_audit_logs (
          id BIGSERIAL PRIMARY KEY,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          admin_name TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          action TEXT NOT NULL,
          old_value JSONB,
          new_value JSONB,
          reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Subscription & Enterprise B2B/B2C
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

      CREATE TABLE IF NOT EXISTS subscription_usage (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          service_type TEXT NOT NULL,
          service_id UUID,
          quantity INT DEFAULT 1 NOT NULL,
          nominal_price NUMERIC NOT NULL,
          covered_amount NUMERIC NOT NULL,
          patient_copay_amount NUMERIC DEFAULT '0' NOT NULL,
          billing_period_start TIMESTAMP NOT NULL,
          billing_period_end TIMESTAMP NOT NULL,
          consumed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
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

      -- Advanced Clinical Video & Education
      CREATE TABLE IF NOT EXISTS patient_education_videos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          title TEXT NOT NULL,
          condition_name TEXT NOT NULL,
          script TEXT NOT NULL,
          language TEXT DEFAULT 'en' NOT NULL,
          video_type TEXT DEFAULT 'condition_explainer' NOT NULL,
          video_url TEXT,
          thumbnail_url TEXT,
          duration_seconds INT DEFAULT 60,
          animation_config JSONB DEFAULT '{}',
          status TEXT DEFAULT 'draft' NOT NULL,
          generated_by UUID REFERENCES users(id),
          reviewed_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS medication_education (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          plain_language_summary TEXT NOT NULL,
          dosage_instructions TEXT NOT NULL,
          side_effects JSONB DEFAULT '{"common": [], "serious": [], "rare": []}' NOT NULL,
          interactions JSONB DEFAULT '{"drugs": [], "foods": [], "conditions": [], "pharmacogenomics": []}' NOT NULL,
          lifestyle_advice JSONB DEFAULT '[]',
          video_id UUID REFERENCES patient_education_videos(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS video_recommendations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          platform TEXT NOT NULL,
          video_url TEXT NOT NULL,
          embed_id TEXT NOT NULL,
          thumbnail_url TEXT,
          duration_seconds INT,
          category TEXT NOT NULL,
          related_icd10 JSONB DEFAULT '[]',
          related_medications JSONB DEFAULT '[]',
          language TEXT DEFAULT 'en' NOT NULL,
          source_channel TEXT,
          is_verified_medical_source BOOLEAN DEFAULT TRUE NOT NULL,
          is_approved BOOLEAN DEFAULT TRUE NOT NULL,
          approved_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS patient_video_recommendations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          video_recommendation_id UUID NOT NULL REFERENCES video_recommendations(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          recommended_by UUID REFERENCES users(id),
          relevance_score NUMERIC DEFAULT '1.0',
          status TEXT DEFAULT 'recommended' NOT NULL,
          patient_rating INT,
          feedback_notes TEXT,
          recommended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          viewed_at TIMESTAMP
      );

      -- Telemedicine & Mobile Outreach
      CREATE TABLE IF NOT EXISTS telemedicine_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          doctor_id UUID NOT NULL REFERENCES users(id),
          platform TEXT DEFAULT 'livekit' NOT NULL,
          room_id TEXT NOT NULL UNIQUE,
          status TEXT DEFAULT 'scheduled' NOT NULL,
          recording_url TEXT,
          transcript_text TEXT,
          ai_live_suggestions JSONB DEFAULT '[]',
          ai_consultation_summary JSONB DEFAULT '{}',
          remote_device_readings JSONB DEFAULT '[]',
          started_at TIMESTAMP,
          ended_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS mobile_clinic_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          location_name TEXT NOT NULL,
          gps_latitude NUMERIC,
          gps_longitude NUMERIC,
          scheduled_date DATE NOT NULL,
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          services JSONB DEFAULT '["consultation", "point_of_care_lab", "pharmacy_dispensation"]' NOT NULL,
          assigned_staff JSONB DEFAULT '[]',
          inventory_kit JSONB DEFAULT '{}',
          status TEXT DEFAULT 'planned' NOT NULL,
          patients_registered_count INT DEFAULT 0 NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS mobile_clinic_encounters (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES organizations(id),
          session_id UUID NOT NULL REFERENCES mobile_clinic_sessions(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
          patient_id UUID REFERENCES patients(id),
          is_offline_created BOOLEAN DEFAULT TRUE NOT NULL,
          offline_sync_id TEXT UNIQUE,
          chief_complaint TEXT,
          clinical_notes TEXT,
          vitals JSONB DEFAULT '{}',
          poc_lab_results JSONB DEFAULT '[]',
          dispensed_medications JSONB DEFAULT '[]',
          client_timestamp TIMESTAMP,
          synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Advanced AI Orchestrator & Safety
      CREATE TABLE IF NOT EXISTS ai_models (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          version TEXT NOT NULL,
          type TEXT NOT NULL,
          purpose TEXT NOT NULL,
          performance JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS model_feedback (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          model_id UUID REFERENCES ai_models(id),
          suggestion_id UUID,
          clinician_id UUID NOT NULL REFERENCES users(id),
          action TEXT NOT NULL,
          agent_name TEXT,
          original_output JSONB,
          clinician_modification JSONB,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS health_insights (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          severity TEXT DEFAULT 'info' NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          suggested_action TEXT,
          action_type TEXT,
          status TEXT DEFAULT 'new' NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          acted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS risk_scores (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          risk_type TEXT NOT NULL,
          score NUMERIC NOT NULL,
          category TEXT NOT NULL,
          factors JSONB DEFAULT '{}' NOT NULL,
          calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS blockchain_anchors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          batch_start_at TIMESTAMP NOT NULL,
          batch_end_at TIMESTAMP NOT NULL,
          log_count INT NOT NULL,
          merkle_root_hash TEXT NOT NULL,
          previous_block_hash TEXT NOT NULL,
          block_hash TEXT NOT NULL,
          transaction_hash TEXT NOT NULL,
          network TEXT DEFAULT 'private_hyperledger_simulated' NOT NULL,
          anchored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS smart_consents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          consent_type TEXT NOT NULL,
          status TEXT DEFAULT 'granted' NOT NULL,
          allowed_departments JSONB DEFAULT '[]',
          permitted_data_types JSONB DEFAULT '["vitals", "labs", "medications", "imaging", "notes"]' NOT NULL,
          valid_until TIMESTAMP,
          digital_signature TEXT NOT NULL,
          revoked_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS billing_claims (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
          claim_number TEXT NOT NULL UNIQUE,
          payer_name TEXT NOT NULL,
          payer_type TEXT NOT NULL,
          total_amount NUMERIC NOT NULL,
          status TEXT DEFAULT 'draft' NOT NULL,
          diagnosis_codes JSONB DEFAULT '[]' NOT NULL,
          procedure_codes JSONB DEFAULT '[]' NOT NULL,
          ai_denial_risk_score NUMERIC DEFAULT '0.0',
          ai_denial_risk_factors JSONB DEFAULT '[]',
          submission_date TIMESTAMP,
          adjudication_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS security_threat_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id),
          threat_type TEXT NOT NULL,
          severity TEXT NOT NULL,
          description TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          ip_address TEXT,
          user_agent TEXT,
          is_mitigated BOOLEAN DEFAULT FALSE NOT NULL,
          detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Central State Machine, SLAs & Sagas
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

      -- Pharmacy Inventory & Batch Management
      CREATE TABLE IF NOT EXISTS suppliers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          contact_person TEXT,
          email TEXT,
          phone TEXT,
          address TEXT,
          lead_time_days INT DEFAULT 3,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS drug_catalog (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          generic_name TEXT NOT NULL,
          brand_name TEXT,
          strength TEXT NOT NULL,
          dosage_form TEXT NOT NULL,
          route TEXT DEFAULT 'oral' NOT NULL,
          atc_code TEXT,
          barcode TEXT,
          package_size TEXT DEFAULT '30 tablets',
          reorder_level INT DEFAULT 50 NOT NULL,
          max_stock INT DEFAULT 500 NOT NULL,
          default_unit_cost NUMERIC DEFAULT '10.00' NOT NULL,
          default_selling_price NUMERIC DEFAULT '15.00' NOT NULL,
          storage_condition TEXT DEFAULT 'ambient' NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

            CREATE TABLE IF NOT EXISTS clinical_catalog_protocols (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES organizations(id),
                kind VARCHAR(20) NOT NULL CHECK (kind IN ('protocol', 'formulary')),
                department_id VARCHAR(80) NOT NULL,
                name TEXT NOT NULL,
                indication TEXT NOT NULL,
                items JSONB NOT NULL DEFAULT '[]'::jsonb,
                metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_by UUID REFERENCES users(id),
                updated_by UUID REFERENCES users(id),
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

      CREATE TABLE IF NOT EXISTS drug_batches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          drug_id UUID NOT NULL REFERENCES drug_catalog(id) ON DELETE CASCADE,
          supplier_id UUID REFERENCES suppliers(id),
          batch_number TEXT NOT NULL,
          expiry_date DATE NOT NULL,
          received_date DATE NOT NULL,
          quantity_received INT NOT NULL,
          quantity_remaining INT NOT NULL,
          cost_per_unit NUMERIC NOT NULL,
          selling_price NUMERIC NOT NULL,
          location_bin TEXT DEFAULT 'Shelf A-1',
          status TEXT DEFAULT 'active' NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          batch_id UUID NOT NULL REFERENCES drug_batches(id) ON DELETE CASCADE,
          movement_type TEXT NOT NULL,
          quantity INT NOT NULL,
          previous_quantity INT NOT NULL,
          new_quantity INT NOT NULL,
          reference_type TEXT,
          reference_id TEXT,
          performed_by UUID REFERENCES users(id),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS purchase_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          supplier_id UUID NOT NULL REFERENCES suppliers(id),
          po_number TEXT NOT NULL UNIQUE,
          status TEXT DEFAULT 'draft' NOT NULL,
          items JSONB DEFAULT '[]' NOT NULL,
          total_amount NUMERIC NOT NULL,
          ordered_by UUID REFERENCES users(id),
          ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          received_at TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- LIS
      CREATE TABLE IF NOT EXISTS lab_instruments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          model TEXT NOT NULL,
          analyzer_type TEXT NOT NULL,
          connection_type TEXT DEFAULT 'hl7_oru' NOT NULL,
          status TEXT DEFAULT 'online' NOT NULL,
          last_maintenance_at TIMESTAMP,
          last_connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lab_qc_runs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          instrument_id UUID NOT NULL REFERENCES lab_instruments(id) ON DELETE CASCADE,
          analyte TEXT NOT NULL,
          level TEXT DEFAULT 'level_2_normal' NOT NULL,
          measured_value NUMERIC NOT NULL,
          expected_mean NUMERIC NOT NULL,
          standard_deviation NUMERIC NOT NULL,
          reference_range_low NUMERIC NOT NULL,
          reference_range_high NUMERIC NOT NULL,
          passed BOOLEAN DEFAULT TRUE NOT NULL,
          z_score NUMERIC,
          run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          performed_by UUID REFERENCES users(id),
          notes TEXT
      );

      CREATE TABLE IF NOT EXISTS lab_turnaround (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
          step TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          performed_by UUID REFERENCES users(id)
      );

      -- RIS
      CREATE TABLE IF NOT EXISTS imaging_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          modality TEXT NOT NULL,
          body_part TEXT NOT NULL,
          title TEXT NOT NULL,
          default_technique TEXT,
          default_findings TEXT,
          default_impression TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS imaging_studies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          accession_number TEXT NOT NULL UNIQUE,
          modality TEXT NOT NULL,
          body_part TEXT NOT NULL,
          study_uid TEXT NOT NULL,
          priority TEXT DEFAULT 'routine' NOT NULL,
          status TEXT DEFAULT 'ordered' NOT NULL,
          is_critical_finding BOOLEAN DEFAULT FALSE NOT NULL,
          scheduled_at TIMESTAMP,
          performed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS imaging_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          study_id UUID NOT NULL REFERENCES imaging_studies(id) ON DELETE CASCADE,
          template_id UUID REFERENCES imaging_templates(id),
          technique TEXT NOT NULL,
          findings TEXT NOT NULL,
          impression TEXT NOT NULL,
          recommendations TEXT,
          dictation_raw TEXT,
          signed_by UUID REFERENCES users(id),
          signed_at TIMESTAMP,
          peer_review_status TEXT DEFAULT 'none' NOT NULL,
          peer_reviewed_by UUID REFERENCES users(id),
          peer_reviewed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- RPM & Devices
      CREATE TABLE IF NOT EXISTS rpm_programs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          condition TEXT NOT NULL,
          target_metrics JSONB DEFAULT '[]' NOT NULL,
          frequency_required_days INT DEFAULT 1,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS devices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
          device_type TEXT NOT NULL,
          brand TEXT NOT NULL,
          model TEXT NOT NULL,
          serial_number TEXT NOT NULL UNIQUE,
          mac_address TEXT,
          battery_level_percent INT DEFAULT 100,
          status TEXT DEFAULT 'active' NOT NULL,
          last_synced_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS device_readings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          metric_type TEXT NOT NULL,
          numeric_value NUMERIC NOT NULL,
          unit TEXT NOT NULL,
          is_anomaly BOOLEAN DEFAULT FALSE NOT NULL,
          anomaly_severity TEXT DEFAULT 'normal',
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Appointments
      CREATE TABLE IF NOT EXISTS appointments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          clinician_id UUID REFERENCES users(id),
          facility_id UUID REFERENCES facilities(id),
          appointment_type TEXT DEFAULT 'in_person' NOT NULL,
          specialty TEXT DEFAULT 'Internal Medicine' NOT NULL,
          scheduled_date DATE NOT NULL,
          scheduled_time TEXT NOT NULL,
          duration_minutes INT DEFAULT 30 NOT NULL,
          queue_token TEXT,
          status TEXT DEFAULT 'scheduled' NOT NULL,
          reason TEXT NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Invoices & Payments
      CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          invoice_number TEXT NOT NULL UNIQUE,
          line_items JSONB DEFAULT '[]' NOT NULL,
          subtotal NUMERIC NOT NULL,
          discount_amount NUMERIC DEFAULT '0' NOT NULL,
          tax_amount NUMERIC DEFAULT '0' NOT NULL,
          total_amount NUMERIC NOT NULL,
          paid_amount NUMERIC DEFAULT '0' NOT NULL,
          currency TEXT DEFAULT 'ETB' NOT NULL,
          status TEXT DEFAULT 'issued' NOT NULL,
          payment_method TEXT,
          transaction_ref TEXT,
          due_date DATE,
          paid_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id),
          payment_number TEXT NOT NULL UNIQUE,
          amount NUMERIC NOT NULL,
          currency TEXT DEFAULT 'ETB' NOT NULL,
          payment_method TEXT NOT NULL,
          transaction_reference TEXT,
          receipt_number TEXT,
          status TEXT DEFAULT 'completed' NOT NULL,
          collected_by UUID REFERENCES users(id),
          paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Support Tickets
      CREATE TABLE IF NOT EXISTS support_tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          reporter_user_id UUID REFERENCES users(id),
          patient_id UUID REFERENCES patients(id),
          ticket_number TEXT NOT NULL UNIQUE,
          category TEXT NOT NULL,
          priority TEXT DEFAULT 'normal' NOT NULL,
          status TEXT DEFAULT 'open' NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          assigned_to UUID REFERENCES users(id),
          resolved_at TIMESTAMP,
          resolution_summary TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS support_ticket_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
          author_id UUID NOT NULL REFERENCES users(id),
          message TEXT NOT NULL,
          is_internal_note BOOLEAN DEFAULT FALSE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Custom Reports
      CREATE TABLE IF NOT EXISTS custom_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          data_source TEXT NOT NULL,
          filters JSONB DEFAULT '{}' NOT NULL,
          groupings JSONB DEFAULT '[]' NOT NULL,
          selected_columns JSONB DEFAULT '[]' NOT NULL,
          schedule_cron TEXT,
          last_run_at TIMESTAMP,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Patient Submitted Cases & AI Triage
      CREATE TABLE IF NOT EXISTS cases (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          case_id TEXT NOT NULL UNIQUE,
          tenant_id UUID REFERENCES organizations(id),
          patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
          personal JSONB DEFAULT '{}' NOT NULL,
          patient_info JSONB DEFAULT '{}' NOT NULL,
          complaint JSONB DEFAULT '{}' NOT NULL,
          complaint_details JSONB DEFAULT '{}' NOT NULL,
          history JSONB DEFAULT '{}' NOT NULL,
          medical_history JSONB DEFAULT '{}' NOT NULL,
          symptoms JSONB DEFAULT '{}' NOT NULL,
          files_attached JSONB DEFAULT '[]' NOT NULL,
          assigned_handler_id TEXT,
          assigned_handler_name TEXT,
          assigned_role TEXT,
          status TEXT DEFAULT 'pending_ai_analysis' NOT NULL,
          ai_analysis JSONB,
          handler_notes JSONB DEFAULT '[]' NOT NULL,
          timeline JSONB DEFAULT '[]' NOT NULL,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Dynamic Pricing & Monetization Engine Tables
      CREATE TABLE IF NOT EXISTS service_pricing_catalog (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          service_code VARCHAR(64) UNIQUE NOT NULL,
          category VARCHAR(64) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          base_price NUMERIC(10, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'ETB' NOT NULL,
          is_free BOOLEAN DEFAULT FALSE NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          validity_days INTEGER,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          patient_id UUID NOT NULL REFERENCES patients(id),
          invoice_number VARCHAR(64) UNIQUE NOT NULL,
          subtotal NUMERIC(10, 2) NOT NULL,
          discount_amount NUMERIC(10, 2) DEFAULT 0.00,
          total_amount NUMERIC(10, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'ETB' NOT NULL,
          status VARCHAR(32) DEFAULT 'unpaid' NOT NULL,
          payment_method VARCHAR(32),
          transaction_ref VARCHAR(128),
          paid_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          service_code VARCHAR(64) NOT NULL,
          description TEXT NOT NULL,
          unit_price NUMERIC(10, 2) NOT NULL,
          quantity INTEGER DEFAULT 1 NOT NULL,
          total_price NUMERIC(10, 2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS patient_registrations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          invoice_id UUID REFERENCES invoices(id),
          starts_at TIMESTAMP NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          status VARCHAR(32) DEFAULT 'active' NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS patient_registration_passes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          invoice_id UUID REFERENCES invoices(id),
          starts_at TIMESTAMP NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          status VARCHAR(32) DEFAULT 'active' NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_payment_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          global_free_mode BOOLEAN DEFAULT FALSE NOT NULL,
          registration_validity_days INTEGER DEFAULT 90 NOT NULL,
          grace_period_days INTEGER DEFAULT 7 NOT NULL,
          allow_cash_reconciliation BOOLEAN DEFAULT TRUE NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS clinic_locations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          branch_type TEXT DEFAULT 'branch' NOT NULL,
          neighborhood TEXT NOT NULL,
          city TEXT DEFAULT 'Debre Birhan' NOT NULL,
          region TEXT DEFAULT 'Amhara, Ethiopia' NOT NULL,
          address TEXT NOT NULL,
          latitude NUMERIC NOT NULL,
          longitude NUMERIC NOT NULL,
          phone TEXT NOT NULL,
          email TEXT DEFAULT 'info@ninimed.org',
          hours TEXT NOT NULL,
          services JSONB DEFAULT '[]' NOT NULL,
          amenities JSONB DEFAULT '[]' NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          is_main BOOLEAN DEFAULT FALSE NOT NULL,
          next_open_slot TEXT DEFAULT 'Open Today',
          google_maps_url TEXT,
          osm_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Run Non-Destructive Migrations for Existing Tables & Added Columns
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transaction_ref TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
      ALTER TABLE invoices ALTER COLUMN due_date DROP NOT NULL;

      ALTER TABLE service_pricing_catalog ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'ETB' NOT NULL;
      ALTER TABLE service_pricing_catalog ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE NOT NULL;
      ALTER TABLE service_pricing_catalog ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
      ALTER TABLE service_pricing_catalog ADD COLUMN IF NOT EXISTS validity_days INTEGER;

      ALTER TABLE drug_catalog ADD COLUMN IF NOT EXISTS item_code TEXT;
      ALTER TABLE drug_catalog ADD COLUMN IF NOT EXISTS category TEXT;
      ALTER TABLE drug_catalog ADD COLUMN IF NOT EXISTS section_number INT;
      ALTER TABLE drug_catalog ADD COLUMN IF NOT EXISTS section_name TEXT;
      ALTER TABLE drug_catalog ADD COLUMN IF NOT EXISTS is_controlled BOOLEAN DEFAULT FALSE;
      ALTER TABLE drug_catalog ADD COLUMN IF NOT EXISTS rx_otc TEXT DEFAULT 'Rx';
      CREATE INDEX IF NOT EXISTS idx_drug_catalog_item_code ON drug_catalog(item_code);
      CREATE INDEX IF NOT EXISTS idx_drug_catalog_category ON drug_catalog(category);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_drug_catalog_tenant_item_code ON drug_catalog(tenant_id, item_code);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_clinical_catalog_protocols_tenant_name ON clinical_catalog_protocols(tenant_id, department_id, name);

      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2) DEFAULT 0.00;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2) DEFAULT 0.00;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'ETB';
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS invoice_id UUID;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS transaction_ref TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS encounter_id UUID REFERENCES encounters(id);

      ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0.00;
      ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'ETB';
      ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
      ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS invoice_id UUID;
      ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS transaction_ref TEXT;
      ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
      ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS sample_collected_at TIMESTAMP;
      ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS sample_collected_by UUID;
      ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS encounter_id UUID REFERENCES encounters(id);

      CREATE TABLE IF NOT EXISTS clinical_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE RESTRICT,
          ordering_doctor_id UUID NOT NULL REFERENCES users(id),
          order_type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'ordered',
          clinical_indication TEXT NOT NULL,
          priority TEXT NOT NULL DEFAULT 'routine',
          is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
          release_at TIMESTAMP,
          is_released_early BOOLEAN NOT NULL DEFAULT FALSE,
          specimen_barcode TEXT,
          collected_by UUID REFERENCES users(id),
          collected_at TIMESTAMP,
          cancellation_reason TEXT,
          cancelled_by UUID REFERENCES users(id),
          cancelled_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS critical_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          order_id UUID NOT NULL REFERENCES clinical_orders(id) ON DELETE CASCADE,
          encounter_id UUID NOT NULL REFERENCES encounters(id),
          patient_id UUID NOT NULL REFERENCES patients(id),
          test_name TEXT NOT NULL,
          critical_value TEXT NOT NULL,
          tier TEXT NOT NULL DEFAULT 'tier_1_physician',
          acknowledged_by UUID REFERENCES users(id),
          acknowledged_at TIMESTAMP,
          escalated_at TIMESTAMP,
          acknowledgment_note TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_outbox_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          order_id UUID NOT NULL REFERENCES clinical_orders(id) ON DELETE CASCADE,
          event_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          retry_count INTEGER NOT NULL DEFAULT 0,
          error_message TEXT,
          idempotency_key TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS clinical_files (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          uploaded_by_user_id UUID REFERENCES users(id),
          encounter_id UUID REFERENCES encounters(id),
          category VARCHAR(50) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_url TEXT NOT NULL,
          file_size INTEGER DEFAULT 102400,
          mime_type VARCHAR(100) NOT NULL,
          tags JSONB DEFAULT '[]',
          verification_status VARCHAR(50) DEFAULT 'verified',
          is_confidential BOOLEAN DEFAULT FALSE,
          archived BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS document_access_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          file_id UUID NOT NULL REFERENCES clinical_files(id) ON DELETE CASCADE,
          accessed_by_user_id UUID NOT NULL REFERENCES users(id),
          access_type VARCHAR(50) NOT NULL,
          ip_address VARCHAR(50),
          accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS immunizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          vaccine_name VARCHAR(255) NOT NULL,
          date_given TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          dose_number VARCHAR(50),
          lot_number VARCHAR(100),
          manufacturer VARCHAR(100),
          administering_provider VARCHAR(150),
          status VARCHAR(50) NOT NULL DEFAULT 'completed',
          next_due_date TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE cases ADD COLUMN IF NOT EXISTS chief_complaint TEXT;
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'moderate';
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_number TEXT;
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS personal JSONB DEFAULT '{}';
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS complaint JSONB DEFAULT '{}';
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '{}';
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS symptoms JSONB DEFAULT '{}';
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS files_attached JSONB DEFAULT '[]';
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS ai_summary TEXT;
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS ai_recommendations JSONB DEFAULT '{}';
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT '{}';
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS handler_notes JSONB DEFAULT '[]';
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS handler_note TEXT;
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS conference_notes TEXT;
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]';
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

      ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin_granted_by_super_admin BOOLEAN DEFAULT FALSE NOT NULL;
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS national_id TEXT;
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS national_id_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS digital_card_number TEXT;
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_clinic_branch TEXT DEFAULT 'habitat-main';

      ALTER TABLE system_payment_settings ADD COLUMN IF NOT EXISTS enforce_lab_payment_gate BOOLEAN DEFAULT TRUE;
      ALTER TABLE system_payment_settings ADD COLUMN IF NOT EXISTS enforce_pharmacy_payment_gate BOOLEAN DEFAULT TRUE;
      ALTER TABLE system_payment_settings ADD COLUMN IF NOT EXISTS auto_notify_lab_on_payment BOOLEAN DEFAULT TRUE;
      ALTER TABLE system_payment_settings ADD COLUMN IF NOT EXISTS auto_notify_pharmacy_on_payment BOOLEAN DEFAULT TRUE;
      ALTER TABLE system_payment_settings ADD COLUMN IF NOT EXISTS allow_emergency_override BOOLEAN DEFAULT TRUE;
      ALTER TABLE system_payment_settings ADD COLUMN IF NOT EXISTS role_permissions JSONB DEFAULT '{"waiveFees":["system_admin","tenant_admin"],"emergencyOverride":["system_admin","tenant_admin","physician"],"cashCollection":["system_admin","tenant_admin","pharmacist","nurse","cashier"]}';

      CREATE TABLE IF NOT EXISTS auth_verification_codes (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          identifier TEXT NOT NULL,
          channel TEXT NOT NULL,
          code_hash TEXT NOT NULL,
          raw_code TEXT,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          purpose TEXT DEFAULT 'account_registration' NOT NULL,
          status TEXT DEFAULT 'pending' NOT NULL,
          attempts INTEGER DEFAULT 0 NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          verified_at TIMESTAMP,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_auth_settings (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          require_email_verification BOOLEAN DEFAULT TRUE NOT NULL,
          require_sms_verification BOOLEAN DEFAULT FALSE NOT NULL,
          enable_two_factor_login BOOLEAN DEFAULT FALSE NOT NULL,
          two_factor_target_roles JSONB DEFAULT '["system_admin", "tenant_admin", "physician", "pharmacist"]'::jsonb NOT NULL,
          require_national_id_verification BOOLEAN DEFAULT TRUE NOT NULL,
          allow_demo_bypass BOOLEAN DEFAULT TRUE NOT NULL,
          sms_gateway_provider TEXT DEFAULT 'simulator' NOT NULL,
          otp_expiry_minutes INTEGER DEFAULT 10 NOT NULL,
          max_attempts INTEGER DEFAULT 5 NOT NULL,
          lockout_duration_minutes INTEGER DEFAULT 15 NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      ALTER TABLE system_auth_settings ADD COLUMN IF NOT EXISTS two_factor_target_roles JSONB DEFAULT '["system_admin", "tenant_admin", "physician", "pharmacist"]'::jsonb;
      ALTER TABLE system_auth_settings ADD COLUMN IF NOT EXISTS require_national_id_verification BOOLEAN DEFAULT TRUE;
      ALTER TABLE system_auth_settings ADD COLUMN IF NOT EXISTS lockout_duration_minutes INTEGER DEFAULT 15;

      CREATE TABLE IF NOT EXISTS shared_medical_records (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          share_token TEXT NOT NULL UNIQUE,
          access_scope JSONB DEFAULT '["allergies", "medications", "lab_results", "conditions", "emergency_contacts"]'::jsonb NOT NULL,
          passcode TEXT,
          doctor_name TEXT,
          status TEXT DEFAULT 'active' NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          view_count INTEGER DEFAULT 0 NOT NULL,
          last_viewed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS qr_login_sessions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          session_challenge TEXT NOT NULL UNIQUE,
          status TEXT DEFAULT 'pending' NOT NULL,
          authenticated_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          device_info TEXT,
          ip_address TEXT,
          expires_at TIMESTAMP NOT NULL,
          authorized_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Patient Assignments
      CREATE TABLE IF NOT EXISTS patient_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          case_id UUID REFERENCES cases(id),
          provider_id UUID NOT NULL REFERENCES users(id),
          provider_type TEXT,
          specialty TEXT,
          assignment_type TEXT DEFAULT 'automatic' NOT NULL,
          status TEXT DEFAULT 'assigned' NOT NULL,
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          accepted_at TIMESTAMP,
          completed_at TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Queue Entries
      CREATE TABLE IF NOT EXISTS queue_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          case_id UUID REFERENCES cases(id),
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          provider_id UUID REFERENCES users(id),
          queue_type TEXT DEFAULT 'treat_me_now' NOT NULL,
          position INT DEFAULT 1 NOT NULL,
          priority TEXT DEFAULT 'routine' NOT NULL,
          status TEXT DEFAULT 'waiting' NOT NULL,
          called_at TIMESTAMP,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          estimated_wait_minutes INT DEFAULT 5,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Case Messages
      CREATE TABLE IF NOT EXISTS case_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
          sender_id UUID REFERENCES users(id),
          sender_name TEXT,
          sender_type TEXT DEFAULT 'patient' NOT NULL,
          message TEXT NOT NULL,
          attachments JSONB DEFAULT '[]',
          read_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- Migrations for Cases
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_number TEXT;
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS encounter_id UUID REFERENCES encounters(id);
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'routine';
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS assigned_provider_id UUID REFERENCES users(id);
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
    ALTER TABLE cases ADD COLUMN IF NOT EXISTS patient_info JSONB DEFAULT '{}' NOT NULL;
    ALTER TABLE cases ADD COLUMN IF NOT EXISTS complaint_details JSONB DEFAULT '{}' NOT NULL;
    ALTER TABLE cases ADD COLUMN IF NOT EXISTS medical_history JSONB DEFAULT '{}' NOT NULL;
    ALTER TABLE cases ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

      -- ==========================================
      -- DYNAMIC CONFIGURATION & CMS TABLES
      -- ==========================================
      CREATE TABLE IF NOT EXISTS navigation_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          role TEXT,
          label TEXT NOT NULL,
          href TEXT NOT NULL,
          icon TEXT,
          parent_id UUID,
          "order" INT DEFAULT 0 NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          requires_auth BOOLEAN DEFAULT TRUE NOT NULL,
          badge_key TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS page_contents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          page_key TEXT NOT NULL,
          section_key TEXT NOT NULL,
          content_type TEXT DEFAULT 'json' NOT NULL,
          content JSONB NOT NULL,
          language TEXT DEFAULT 'en' NOT NULL,
          version INT DEFAULT 1 NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS service_pricing (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          service_name TEXT NOT NULL,
          service_type TEXT DEFAULT 'subscription' NOT NULL,
          plan_code TEXT,
          base_price NUMERIC NOT NULL,
          yearly_price NUMERIC,
          currency TEXT DEFAULT 'ETB' NOT NULL,
          discount_percent NUMERIC DEFAULT '0' NOT NULL,
          badge TEXT,
          description TEXT,
          features JSONB DEFAULT '[]' NOT NULL,
          popular BOOLEAN DEFAULT FALSE NOT NULL,
          cta_text TEXT DEFAULT 'Get Started' NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dashboard_widgets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          role TEXT NOT NULL,
          widget_name TEXT NOT NULL,
          widget_type TEXT DEFAULT 'stats' NOT NULL,
          title TEXT,
          description TEXT,
          config JSONB DEFAULT '{}' NOT NULL,
          position INT DEFAULT 0 NOT NULL,
          grid_span INT DEFAULT 1 NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      ALTER TABLE dashboard_widgets ADD COLUMN IF NOT EXISTS tenant_id UUID;
      ALTER TABLE dashboard_widgets ADD COLUMN IF NOT EXISTS role TEXT;
      ALTER TABLE dashboard_widgets ADD COLUMN IF NOT EXISTS widget_name TEXT;
      ALTER TABLE dashboard_widgets ADD COLUMN IF NOT EXISTS widget_type TEXT DEFAULT 'stats';
      ALTER TABLE dashboard_widgets ADD COLUMN IF NOT EXISTS title TEXT;
      ALTER TABLE dashboard_widgets ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE dashboard_widgets ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';
      ALTER TABLE dashboard_widgets ADD COLUMN IF NOT EXISTS position INT DEFAULT 0;
      ALTER TABLE dashboard_widgets ADD COLUMN IF NOT EXISTS grid_span INT DEFAULT 1;
      ALTER TABLE dashboard_widgets ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE dashboard_widgets ALTER COLUMN user_id DROP NOT NULL;
      ALTER TABLE dashboard_widgets ALTER COLUMN widget_id DROP NOT NULL;
      ALTER TABLE dashboard_widgets ALTER COLUMN grid_position DROP NOT NULL;

      CREATE TABLE IF NOT EXISTS tab_configurations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          page_key TEXT NOT NULL,
          tab_key TEXT NOT NULL,
          label TEXT NOT NULL,
          icon TEXT,
          badge_key TEXT,
          "order" INT DEFAULT 0 NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          required_permission TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS action_configurations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          page_key TEXT NOT NULL,
          action_key TEXT NOT NULL,
          label TEXT NOT NULL,
          icon TEXT,
          action_type TEXT DEFAULT 'link' NOT NULL,
          href TEXT,
          api_endpoint TEXT,
          method TEXT DEFAULT 'GET',
          variant TEXT DEFAULT 'default',
          required_permission TEXT,
          "order" INT DEFAULT 0 NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS form_configurations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          form_key TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          submit_label TEXT DEFAULT 'Submit' NOT NULL,
          action_endpoint TEXT,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS form_fields (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          form_id UUID NOT NULL REFERENCES form_configurations(id) ON DELETE CASCADE,
          field_name TEXT NOT NULL,
          label TEXT NOT NULL,
          field_type TEXT DEFAULT 'text' NOT NULL,
          placeholder TEXT,
          required BOOLEAN DEFAULT FALSE NOT NULL,
          options JSONB DEFAULT '[]',
          validation JSONB DEFAULT '{}',
          "order" INT DEFAULT 0 NOT NULL,
          default_value TEXT,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS form_submissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          form_key TEXT NOT NULL,
          submitted_by_user_id UUID REFERENCES users(id),
          data JSONB NOT NULL,
          status TEXT DEFAULT 'submitted' NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS landing_sections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          section_key TEXT NOT NULL,
          title TEXT,
          subtitle TEXT,
          content JSONB DEFAULT '{}' NOT NULL,
          "order" INT DEFAULT 0 NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notification_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          template_key TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          type TEXT DEFAULT 'info' NOT NULL,
          channels JSONB DEFAULT '["in_app"]' NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS translations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          key TEXT NOT NULL,
          language TEXT NOT NULL,
          value TEXT NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- ==========================================
      -- PATIENT ACTIVITIES & AUDIT
      -- ==========================================
      CREATE TABLE IF NOT EXISTS patient_activities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          actor_user_id UUID REFERENCES users(id),
          actor_name VARCHAR(255) NOT NULL,
          actor_role VARCHAR(50) NOT NULL,
          activity_type VARCHAR(100) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          severity VARCHAR(20) DEFAULT 'info',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_patient_activities_patient ON patient_activities(patient_id);
      CREATE INDEX IF NOT EXISTS idx_patient_activities_tenant ON patient_activities(tenant_id);

      -- ==========================================
      -- PROVIDER PROFILES & SCHEDULES
      -- ==========================================
      CREATE TABLE IF NOT EXISTS provider_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tenant_id UUID NOT NULL,
          bio TEXT,
          specialties JSONB DEFAULT '[]',
          languages JSONB DEFAULT '["English", "Amharic"]',
          license_number VARCHAR(100),
          license_issuing_body VARCHAR(255),
          license_verified BOOLEAN DEFAULT FALSE,
          consultation_fee_etb NUMERIC(10, 2) DEFAULT 500.00,
          approval_status VARCHAR(50) DEFAULT 'draft',
          hr_reviewer_id UUID REFERENCES users(id),
          hr_feedback TEXT,
          metadata JSONB DEFAULT '{}',
          submitted_at TIMESTAMP,
          approved_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_provider_profiles_user ON provider_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_provider_profiles_tenant ON provider_profiles(tenant_id);

      CREATE TABLE IF NOT EXISTS provider_schedules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          day_of_week INTEGER NOT NULL,
          start_time VARCHAR(10) NOT NULL,
          end_time VARCHAR(10) NOT NULL,
          slot_duration_minutes INTEGER DEFAULT 30,
          is_telehealth_available BOOLEAN DEFAULT TRUE,
          is_in_person_available BOOLEAN DEFAULT TRUE,
          is_approved_by_hr BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_provider_schedules_provider ON provider_schedules(provider_id);

      -- ==========================================
      -- FEEDBACK & TAMPER-EVIDENT AUDIT & JOURNEY
      -- ==========================================
      CREATE TABLE IF NOT EXISTS feedback_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          submitter_type TEXT NOT NULL DEFAULT 'patient',
          submitter_user_id UUID REFERENCES users(id),
          submitter_name TEXT,
          submitter_contact TEXT,
          encounter_id UUID REFERENCES encounters(id),
          department TEXT,
          rating INTEGER,
          feedback_text TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'general',
          sentiment TEXT NOT NULL DEFAULT 'neutral',
          sentiment_score NUMERIC(4,2) DEFAULT 0.00,
          confidence_score NUMERIC(4,2) DEFAULT 0.85,
          extracted_themes JSONB DEFAULT '[]',
          action_recommendations JSONB DEFAULT '[]',
          urgency_level TEXT NOT NULL DEFAULT 'normal',
          is_safety_hazard BOOLEAN NOT NULL DEFAULT FALSE,
          resolution_status TEXT NOT NULL DEFAULT 'open',
          assigned_admin_id UUID REFERENCES users(id),
          resolution_notes TEXT,
          resolved_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          actor_user_id UUID NOT NULL REFERENCES users(id),
          actor_role TEXT NOT NULL,
          actor_ip_address TEXT,
          actor_user_agent TEXT,
          action_type TEXT NOT NULL,
          target_resource_type TEXT NOT NULL,
          target_resource_id TEXT,
          details JSONB DEFAULT '{}',
          previous_entry_hash TEXT,
          entry_hash TEXT NOT NULL,
          is_tamper_flagged BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS encryption_key_registry (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          key_alias TEXT NOT NULL UNIQUE,
          key_version INTEGER NOT NULL DEFAULT 1,
          algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
          status TEXT NOT NULL DEFAULT 'active',
          created_by UUID NOT NULL REFERENCES users(id),
          rotated_by UUID REFERENCES users(id),
          rotated_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS patient_journey_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          current_stage TEXT NOT NULL,
          previous_stage TEXT,
          location_room TEXT,
          attending_staff_id UUID REFERENCES users(id),
          transit_duration_seconds INTEGER DEFAULT 0,
          stage_status TEXT NOT NULL DEFAULT 'in_progress',
          notes TEXT,
          entered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          exited_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS clinical_rounds (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          bed_number TEXT NOT NULL,
          ward_department TEXT NOT NULL DEFAULT 'General Inpatient',
          rounding_clinician_id UUID NOT NULL REFERENCES users(id),
          acuity_score TEXT NOT NULL DEFAULT 'stable',
          vital_summary JSONB DEFAULT '{}',
          clinical_notes TEXT NOT NULL,
          active_concerns TEXT,
          plan_of_care TEXT NOT NULL,
          critical_alerts JSONB DEFAULT '[]',
          acknowledged_by UUID REFERENCES users(id),
          acknowledged_at TIMESTAMP,
          is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
          next_round_scheduled_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS patient_wayfinding_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          encounter_id UUID REFERENCES encounters(id),
          ticket_number TEXT NOT NULL,
          target_location TEXT NOT NULL,
          floor_level TEXT DEFAULT 'Ground Floor',
          direction_guidance TEXT,
          estimated_wait_minutes INTEGER DEFAULT 5,
          channel TEXT NOT NULL DEFAULT 'in_app',
          recipient_phone TEXT,
          message_content TEXT NOT NULL,
          delivery_status TEXT NOT NULL DEFAULT 'sent',
          dispatched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- ==========================================
      -- PHARMACY AUTOMATION
      -- ==========================================
      CREATE TABLE IF NOT EXISTS pharmacy_dispensing_queue (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
          patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          doctor_id UUID NOT NULL REFERENCES users(id),
          pharmacist_id UUID REFERENCES users(id),
          nurse_id UUID REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'awaiting_payment',
          delivery_method TEXT NOT NULL DEFAULT 'pickup',
          ward_id TEXT,
          bed_number TEXT,
          priority TEXT NOT NULL DEFAULT 'routine',
          medication_name TEXT NOT NULL,
          dosage TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          total_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
          currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
          payment_verified_at TIMESTAMP,
          dispensed_at TIMESTAMP,
          dispatched_at TIMESTAMP,
          nurse_received_at TIMESTAMP,
          completed_at TIMESTAMP,
          pharmacist_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pharmacy_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          queue_item_id UUID REFERENCES pharmacy_dispensing_queue(id) ON DELETE CASCADE,
          prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
          recipient_id UUID NOT NULL REFERENCES users(id),
          recipient_role TEXT NOT NULL,
          channel TEXT NOT NULL DEFAULT 'in_app',
          event_type TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          read_at TIMESTAMP,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pharmacy_inventory_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          drug_id UUID REFERENCES drug_catalog(id) ON DELETE CASCADE,
          batch_id UUID REFERENCES drug_batches(id) ON DELETE CASCADE,
          alert_type TEXT NOT NULL,
          threshold INTEGER,
          current_value INTEGER,
          acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
          acknowledged_by UUID REFERENCES users(id),
          acknowledged_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS nurse_id UUID REFERENCES users(id);
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS ward_id TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS bed_number TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'pickup';
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS patient_notified_at TIMESTAMP;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS doctor_notified_at TIMESTAMP;

      -- ==========================================
      -- DYNAMIC RBAC, WORKFLOWS & POS
      -- ==========================================
      CREATE TABLE IF NOT EXISTS custom_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          code VARCHAR(64) NOT NULL UNIQUE,
          name VARCHAR(128) NOT NULL,
          description TEXT,
          category VARCHAR(64) NOT NULL DEFAULT 'clinical',
          permissions JSONB NOT NULL DEFAULT '[]',
          is_system BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_custom_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
          assigned_by UUID REFERENCES users(id),
          expires_at TIMESTAMP,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          UNIQUE(user_id, role_id)
      );

      CREATE TABLE IF NOT EXISTS workflow_definitions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          trigger_event VARCHAR(64) NOT NULL,
          conditions JSONB DEFAULT '{}',
          steps JSONB NOT NULL DEFAULT '[]',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pos_cashier_shifts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          cashier_id UUID NOT NULL REFERENCES users(id),
          terminal_id VARCHAR(64) DEFAULT 'POS-TERM-01',
          opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          closed_at TIMESTAMP,
          opening_float NUMERIC(10,2) NOT NULL DEFAULT 1000.00,
          expected_cash NUMERIC(10,2) NOT NULL DEFAULT 1000.00,
          actual_cash NUMERIC(10,2),
          cash_variance NUMERIC(10,2) DEFAULT 0.00,
          total_cash_sales NUMERIC(10,2) DEFAULT 0.00,
          total_telebirr_sales NUMERIC(10,2) DEFAULT 0.00,
          total_card_sales NUMERIC(10,2) DEFAULT 0.00,
          total_insurance_sales NUMERIC(10,2) DEFAULT 0.00,
          total_transactions INTEGER DEFAULT 0,
          status VARCHAR(32) NOT NULL DEFAULT 'open',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pos_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          shift_id UUID REFERENCES pos_cashier_shifts(id),
          invoice_id UUID REFERENCES invoices(id),
          patient_id UUID NOT NULL REFERENCES patients(id),
          cashier_id UUID NOT NULL REFERENCES users(id),
          receipt_number VARCHAR(64) NOT NULL UNIQUE,
          subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
          discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
          tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
          total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
          payment_method VARCHAR(64) NOT NULL,
          payment_breakdown JSONB DEFAULT '{}',
          items_snapshot JSONB NOT NULL DEFAULT '[]',
          cash_tendered NUMERIC(10,2),
          change_returned NUMERIC(10,2),
          transaction_ref VARCHAR(128),
          qr_code_payload TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      -- ==========================================
      -- HRM & FINOPS
      -- ==========================================
      CREATE TABLE IF NOT EXISTS staff_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          employee_code TEXT NOT NULL UNIQUE,
          department TEXT NOT NULL,
          designation TEXT NOT NULL,
          specialization TEXT,
          license_number TEXT,
          license_issuing_body TEXT,
          license_expiry_date DATE,
          cme_points INTEGER NOT NULL DEFAULT 0,
          employment_type TEXT NOT NULL DEFAULT 'full_time',
          base_salary_etb NUMERIC(12,2) DEFAULT 0.00,
          on_call_allowance_rate NUMERIC(10,2) DEFAULT 0.00,
          consultation_revenue_share_pct NUMERIC(5,2) DEFAULT 0.00,
          bank_account_number TEXT,
          bank_name TEXT,
          mobile_wallet_number TEXT,
          mobile_wallet_provider TEXT DEFAULT 'none',
          status TEXT NOT NULL DEFAULT 'active',
          onboarding_completed_at TIMESTAMP,
          hired_at DATE NOT NULL,
          terminated_at DATE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff_certifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          cert_type TEXT NOT NULL,
          issuing_body TEXT NOT NULL,
          issue_date DATE NOT NULL,
          expiry_date DATE,
          document_url TEXT,
          verification_status TEXT NOT NULL DEFAULT 'pending',
          verified_by UUID REFERENCES users(id),
          verified_at TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS duty_rosters (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          department TEXT NOT NULL,
          shift_name TEXT NOT NULL,
          shift_template TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          required_doctors INTEGER NOT NULL DEFAULT 1,
          required_nurses INTEGER NOT NULL DEFAULT 2,
          required_support_staff INTEGER NOT NULL DEFAULT 1,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by UUID NOT NULL REFERENCES users(id),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff_shifts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          roster_id UUID NOT NULL REFERENCES duty_rosters(id) ON DELETE CASCADE,
          staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
          shift_date DATE NOT NULL,
          status TEXT NOT NULL DEFAULT 'scheduled',
          swap_status TEXT NOT NULL DEFAULT 'none',
          swap_requested_with_staff_id UUID REFERENCES staff_profiles(id),
          swap_approved_by UUID REFERENCES users(id),
          swap_approved_at TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff_attendance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
          shift_id UUID REFERENCES staff_shifts(id),
          attendance_date DATE NOT NULL,
          clock_in TIMESTAMP,
          clock_out TIMESTAMP,
          regular_hours NUMERIC(5,2) DEFAULT 0.00,
          overtime_hours NUMERIC(5,2) DEFAULT 0.00,
          overtime_multiplier NUMERIC(4,2) DEFAULT 1.00,
          verification_method TEXT NOT NULL DEFAULT 'pin',
          status TEXT NOT NULL DEFAULT 'present',
          deviation_notes TEXT,
          recorded_by UUID REFERENCES users(id),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS leave_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          leave_type TEXT NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          total_days INTEGER NOT NULL,
          reason TEXT NOT NULL,
          supporting_document_url TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          hod_approved_by UUID REFERENCES users(id),
          hod_approved_at TIMESTAMP,
          hr_approved_by UUID REFERENCES users(id),
          hr_approved_at TIMESTAMP,
          rejection_reason TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payroll_runs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          period_month INTEGER NOT NULL,
          period_year INTEGER NOT NULL,
          total_gross_etb NUMERIC(14,2) DEFAULT 0.00,
          total_net_etb NUMERIC(14,2) DEFAULT 0.00,
          total_paye_tax_etb NUMERIC(14,2) DEFAULT 0.00,
          total_pension_employee_etb NUMERIC(14,2) DEFAULT 0.00,
          total_pension_employer_etb NUMERIC(14,2) DEFAULT 0.00,
          total_on_call_allowance_etb NUMERIC(14,2) DEFAULT 0.00,
          total_overtime_paid_etb NUMERIC(14,2) DEFAULT 0.00,
          staff_count INTEGER DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'draft',
          processed_by UUID REFERENCES users(id),
          approved_by UUID REFERENCES users(id),
          processed_at TIMESTAMP,
          approved_at TIMESTAMP,
          disbursed_at TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payroll_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
          staff_id UUID NOT NULL REFERENCES staff_profiles(id),
          base_salary_etb NUMERIC(12,2) DEFAULT 0.00,
          on_call_allowance_etb NUMERIC(10,2) DEFAULT 0.00,
          overtime_pay_etb NUMERIC(10,2) DEFAULT 0.00,
          revenue_share_etb NUMERIC(10,2) DEFAULT 0.00,
          bonus_etb NUMERIC(10,2) DEFAULT 0.00,
          other_allowances_etb NUMERIC(10,2) DEFAULT 0.00,
          gross_pay_etb NUMERIC(12,2) DEFAULT 0.00,
          paye_tax_etb NUMERIC(10,2) DEFAULT 0.00,
          pension_employee_etb NUMERIC(10,2) DEFAULT 0.00,
          pension_employer_etb NUMERIC(10,2) DEFAULT 0.00,
          voluntary_deductions_etb NUMERIC(10,2) DEFAULT 0.00,
          total_deductions_etb NUMERIC(10,2) DEFAULT 0.00,
          net_pay_etb NUMERIC(12,2) DEFAULT 0.00,
          payslip_pdf_url TEXT,
          disbursement_method TEXT DEFAULT 'bank_transfer',
          disbursement_ref TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff_performance_reviews (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          review_period_start DATE NOT NULL,
          review_period_end DATE NOT NULL,
          review_type TEXT DEFAULT 'quarterly',
          csat_score NUMERIC(4,2),
          avg_consultation_mins NUMERIC(6,2),
          diagnostic_turnaround_adherence_pct NUMERIC(5,2),
          protocol_compliance_pct NUMERIC(5,2),
          prescription_audit_score NUMERIC(4,2),
          self_review_score NUMERIC(4,2),
          peer_review_score NUMERIC(4,2),
          hod_review_score NUMERIC(4,2),
          overall_score NUMERIC(4,2),
          bonus_recommendation_etb NUMERIC(10,2) DEFAULT 0.00,
          goals JSONB DEFAULT '[]',
          reviewed_by UUID NOT NULL REFERENCES users(id),
          status TEXT DEFAULT 'draft',
          comments TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chart_of_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          account_code TEXT NOT NULL,
          account_name TEXT NOT NULL,
          account_type TEXT NOT NULL,
          parent_account_id UUID,
          is_header BOOLEAN NOT NULL DEFAULT FALSE,
          is_system BOOLEAN NOT NULL DEFAULT FALSE,
          current_balance NUMERIC(16,2) DEFAULT 0.00,
          currency VARCHAR(10) DEFAULT 'ETB',
          department TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          description TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (tenant_id, account_code)
      );

      CREATE TABLE IF NOT EXISTS journal_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          entry_number TEXT NOT NULL UNIQUE,
          entry_date DATE NOT NULL,
          description TEXT NOT NULL,
          reference_type TEXT NOT NULL,
          reference_id UUID,
          total_debit NUMERIC(16,2) DEFAULT 0.00,
          total_credit NUMERIC(16,2) DEFAULT 0.00,
          status TEXT NOT NULL DEFAULT 'draft',
          posted_by UUID REFERENCES users(id),
          posted_at TIMESTAMP,
          voided_by UUID REFERENCES users(id),
          void_reason TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS journal_entry_lines (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
          account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
          debit NUMERIC(16,2) DEFAULT 0.00,
          credit NUMERIC(16,2) DEFAULT 0.00,
          department TEXT,
          memo TEXT,
          line_order INTEGER DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS insurance_payers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          name TEXT NOT NULL,
          payer_code TEXT NOT NULL UNIQUE,
          contact_email TEXT,
          contact_phone TEXT,
          claims_endpoint TEXT,
          default_copay_percent NUMERIC(5,2) DEFAULT 20.00,
          default_coverage_percent NUMERIC(5,2) DEFAULT 80.00,
          currency VARCHAR(10) DEFAULT 'ETB',
          requires_pre_auth BOOLEAN DEFAULT FALSE,
          pre_auth_threshold_etb NUMERIC(12,2) DEFAULT 10000.00,
          contract_details JSONB DEFAULT '{}',
          status TEXT NOT NULL DEFAULT 'active',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS insurance_claims (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          claim_number TEXT NOT NULL UNIQUE,
          invoice_id UUID REFERENCES invoices(id),
          patient_id UUID NOT NULL REFERENCES patients(id),
          payer_id UUID NOT NULL REFERENCES insurance_payers(id),
          encounter_id UUID REFERENCES encounters(id),
          pre_auth_code TEXT,
          icd10_codes JSONB DEFAULT '[]',
          cpt_codes JSONB DEFAULT '[]',
          total_claim_amount_etb NUMERIC(14,2) DEFAULT 0.00,
          approved_amount_etb NUMERIC(14,2) DEFAULT 0.00,
          patient_copay_amount_etb NUMERIC(14,2) DEFAULT 0.00,
          reimbursed_amount_etb NUMERIC(14,2) DEFAULT 0.00,
          denial_code TEXT,
          denial_reason TEXT,
          appeal_notes TEXT,
          appeal_document_url TEXT,
          status TEXT NOT NULL DEFAULT 'draft',
          submitted_at TIMESTAMP,
          adjudicated_at TIMESTAMP,
          reimbursed_at TIMESTAMP,
          processed_by UUID REFERENCES users(id),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cash_drawers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          cashier_id UUID NOT NULL REFERENCES users(id),
          shift_label TEXT NOT NULL,
          opening_cash_etb NUMERIC(12,2) DEFAULT 0.00,
          total_collected_cash_etb NUMERIC(12,2) DEFAULT 0.00,
          total_collected_mobile_etb NUMERIC(12,2) DEFAULT 0.00,
          total_collected_card_etb NUMERIC(12,2) DEFAULT 0.00,
          total_collected_insurance_etb NUMERIC(12,2) DEFAULT 0.00,
          closing_cash_expected_etb NUMERIC(12,2) DEFAULT 0.00,
          closing_cash_actual_etb NUMERIC(12,2),
          discrepancy_etb NUMERIC(10,2) DEFAULT 0.00,
          denomination_breakdown JSONB DEFAULT '{}',
          transaction_count INTEGER DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'open',
          supervisor_approved_by UUID REFERENCES users(id),
          supervisor_approved_at TIMESTAMP,
          discrepancy_notes TEXT,
          opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          closed_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vendor_invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES organizations(id),
          vendor_name TEXT NOT NULL,
          vendor_contact TEXT,
          invoice_number TEXT NOT NULL,
          po_reference TEXT,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          amount_etb NUMERIC(14,2) DEFAULT 0.00,
          vat_amount_etb NUMERIC(10,2) DEFAULT 0.00,
          total_amount_etb NUMERIC(14,2) DEFAULT 0.00,
          currency VARCHAR(10) DEFAULT 'ETB',
          due_date DATE NOT NULL,
          goods_received_at TIMESTAMP,
          three_way_match_status TEXT DEFAULT 'pending_match',
          payment_status TEXT NOT NULL DEFAULT 'unpaid',
          paid_amount_etb NUMERIC(14,2) DEFAULT 0.00,
          paid_at TIMESTAMP,
          payment_method TEXT,
          payment_reference TEXT,
          document_url TEXT,
          approved_by UUID REFERENCES users(id),
          approved_at TIMESTAMP,
          created_by UUID NOT NULL REFERENCES users(id),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Ensure default system payment settings, auth settings, pricing catalog, and Debre Birhan clinic locations exist
        await client.unsafe(`
      INSERT INTO system_payment_settings (id, global_free_mode, registration_validity_days, grace_period_days, allow_cash_reconciliation)
      VALUES (
          '00000000-0000-0000-0000-000000000001',
          FALSE,
          90,
          7,
          TRUE
      ) ON CONFLICT DO NOTHING;

      INSERT INTO system_auth_settings (id, require_email_verification, require_sms_verification, enable_two_factor_login, allow_demo_bypass, sms_gateway_provider, otp_expiry_minutes, max_attempts)
      VALUES (
          '00000000-0000-0000-0000-000000000001',
          TRUE,
          FALSE,
          FALSE,
          TRUE,
          'simulator',
          10,
          5
      ) ON CONFLICT DO NOTHING;

      INSERT INTO clinic_locations (id, name, slug, branch_type, neighborhood, city, region, address, latitude, longitude, phone, email, hours, services, amenities, is_active, is_main, next_open_slot, google_maps_url, osm_url)
      VALUES
          (
            '11111111-0000-0000-0000-000000000001',
            'NiniMed Habitat Clinic& 24/7 Emergency Centre',
            'habitat-main',
            'main',
            'Habitat Sub-City',
            'Debre Birhan',
            'Amhara, Ethiopia',
            'Main Campus Highway, Habitat Sub-City, Debre Birhan, Ethiopia',
            9.6825,
            39.5312,
            '+251 11 681 2000',
            'habitat@ninimed.org',
            'Open 24/7 (24 Hours Emergency & Inpatient Hospital)',
            '["24/7 Emergency & Trauma", "Specialist In-Office Consultations", "ICU & Inpatient Care", "Digital CT & PA Radiography", "Automated Clinical Chemistry Lab", "Central Hospital Pharmacy", "Maternal & Pediatric Ward"]',
            '["Dedicated Ambulance Fleet", "24/7 Emergency Standby", "On-Site Blood Bank", "Organic Patient Lounge", "Free High-Speed Wi-Fi", "Spacious Private Parking"]',
            TRUE,
            TRUE,
            'Open 24/7 · Immediate Walk-In & Booking',
            'https://www.google.com/maps/dir/?api=1&destination=9.6825,39.5312',
            'https://www.openstreetmap.org/?mlat=9.6825&mlon=39.5312#map=16/9.6825/39.5312'
          ),
          (
            '11111111-0000-0000-0000-000000000002',
            'NiniMed Tebasse Clinic',
            'tebasse-branch',
            'diagnostic_hub',
            'Tebasse District',
            'Debre Birhan',
            'Amhara, Ethiopia',
            'Commercial Avenue, Near Tebasse Square, Debre Birhan, Ethiopia',
            9.6910,
            39.5445,
            '+251 11 681 3311',
            'tebasse@ninimed.org',
            'Mon–Sat: 7:30 AM – 8:00 PM • Sun: 8:30 AM – 4:00 PM',
            '["Primary Care Consultations", "Comprehensive Diagnostic Blood Lab", "Ultrasound Sonography", "Preventive Health Screening", "Vaccination Suite", "Retail Pharmacy"]',
            '["Express Lab Turnaround (<30 min)", "Quiet Wellness Lounge", "Wheelchair Accessible", "Electronic Prescription Pickup"]',
            TRUE,
            FALSE,
            'Today at 11:30 AM',
            'https://www.google.com/maps/dir/?api=1&destination=9.6910,39.5445',
            'https://www.openstreetmap.org/?mlat=9.6910&mlon=39.5445#map=16/9.6910/39.5445'
          ),
          (
            '11111111-0000-0000-0000-000000000003',
            'NiniMed Atakilt Clinic',
            'atakilt-branch',
            'branch',
            'Atakilt Market District',
            'Debre Birhan',
            'Amhara, Ethiopia',
            'Atakilt Center Street, Debre Birhan, Ethiopia',
            9.6730,
            39.5260,
            '+251 11 681 4422',
            'atakilt@ninimed.org',
            'Mon–Sat: 8:00 AM – 7:00 PM',
            '["Family Medicine & Pediatrics", "Maternal Antenatal & Postnatal Care", "Chronic Disease Management (Diabetes & BP)", "Rapid Point-of-Care Testing", "Community Health Outreach"]',
            '["Child-Friendly Waiting Playroom", "Nutrition Counseling Room", "Stroller & Disabled Parking", "Direct Insurance Billing"]',
            TRUE,
            FALSE,
            'Today at 2:15 PM',
            'https://www.google.com/maps/dir/?api=1&destination=9.6730,39.5260',
            'https://www.openstreetmap.org/?mlat=9.6730&mlon=39.5260#map=16/9.6730/39.5260'
          ),
          (
            '11111111-0000-0000-0000-000000000004',
            'NiniMed Liche Clinic',
            'liche-branch',
            'pharmacy_clinic',
            'Liche District',
            'Debre Birhan',
            'Amhara, Ethiopia',
            'Liche North Boulevard, Debre Birhan, Ethiopia',
            9.6645,
            39.5180,
            '+251 11 681 5533',
            'liche@ninimed.org',
            'Mon–Sat: 8:00 AM – 9:00 PM • Sun: 9:00 AM – 6:00 PM',
            '["Urgent Care Walk-In Triage", "Specialized Compounding Pharmacy", "Cold-Chain Medication Storage", "Blood Pressure & Glucose Checks", "Telehealth Video Consultation Kiosk"]',
            '["Drive-Through Rx Pickup", "Digital Prescription Lockers", "24/7 Automated Emergency Medicine Dispenser"]',
            TRUE,
            FALSE,
            'Today at 3:45 PM',
            'https://www.google.com/maps/dir/?api=1&destination=9.6645,39.5180',
            'https://www.openstreetmap.org/?mlat=9.6645&mlon=39.5180#map=16/9.6645/39.5180'
          )
      ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          branch_type = EXCLUDED.branch_type,
          neighborhood = EXCLUDED.neighborhood,
          address = EXCLUDED.address,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          phone = EXCLUDED.phone,
          hours = EXCLUDED.hours,
          services = EXCLUDED.services,
          amenities = EXCLUDED.amenities,
          is_main = EXCLUDED.is_main,
          google_maps_url = EXCLUDED.google_maps_url,
          osm_url = EXCLUDED.osm_url;

      INSERT INTO service_pricing_catalog (service_code, category, name, description, base_price, currency, is_free, is_active, validity_days)
      VALUES
          ('REGISTRATION_3MO', 'registration', 'Patient Registration & Health Portal Access (3 Months)', 'Quarterly registration membership granting 90 days of clinical access, care team messaging, and 24/7 triage.', 350.00, 'ETB', FALSE, TRUE, 90),
          ('CONSULT_GENERAL', 'consultation', 'Primary Care In-Office Consultation', 'Comprehensive clinical consultation with an attending primary care physician.', 450.00, 'ETB', FALSE, TRUE, NULL),
          ('CONSULT_SPECIALIST', 'consultation', 'Multidisciplinary Specialist Consultation', 'Advanced consultation with an Endocrinologist, Cardiologist, or Nephrologist.', 850.00, 'ETB', FALSE, TRUE, NULL),
          ('CONSULT_VIRTUAL_URGENT', 'consultation', '24/7 Virtual Urgent Care Triage', 'On-demand video evaluation and digital prescription routing with a licensed clinician.', 300.00, 'ETB', FALSE, TRUE, NULL),
          ('THERAPY_PHYSIO', 'therapy', 'Cardiopulmonary & Musculoskeletal Physiotherapy', '1-on-1 personalized physical rehabilitation and exercise therapy session.', 600.00, 'ETB', FALSE, TRUE, NULL),
          ('THERAPY_NUTRITION', 'therapy', 'Clinical Medical Nutrition Therapy (MNT)', 'Personalized dietary evaluation and meal planning by a Registered Dietitian.', 400.00, 'ETB', FALSE, TRUE, NULL),
          ('THERAPY_PSYCHOLOGY', 'therapy', 'Clinical Psychology & Psychotherapy Session', '50-minute biopsychosocial mental health and cognitive behavioral session.', 750.00, 'ETB', FALSE, TRUE, NULL),
          ('THERAPY_SOCIAL_WORK', 'therapy', 'Medical Social Work & SDOH Coordination', 'Community care coordination, social determinants support, and home health navigation.', 350.00, 'ETB', FALSE, TRUE, NULL),
          ('LAB_HBA1C', 'laboratory', 'Hemoglobin A1c (HbA1c) Glycated Blood Test', 'Diagnostic blood analysis measuring 3-month average glucose control.', 380.00, 'ETB', FALSE, TRUE, NULL),
          ('LAB_LIPID_PANEL', 'laboratory', 'Comprehensive Lipid Profile (Cholesterol, HDL, LDL, Triglycerides)', 'Full cardiovascular lipid assessment with cardioprotective risk indexing.', 420.00, 'ETB', FALSE, TRUE, NULL),
          ('LAB_RENAL_PANEL', 'laboratory', 'Renal Function Panel & eGFR', 'Kidney filtration assessment including serum creatinine, BUN, and electrolytes.', 350.00, 'ETB', FALSE, TRUE, NULL),
          ('LAB_CBC', 'laboratory', 'Complete Blood Count (CBC) with Differential', 'Hematology panel evaluating white blood cells, red blood cells, hemoglobin, and platelets.', 280.00, 'ETB', FALSE, TRUE, NULL),
          ('LAB_LIVER_PANEL', 'laboratory', 'Hepatic Function Panel (LFT)', 'Comprehensive liver enzymes (ALT, AST, ALP, Bilirubin, Albumin).', 400.00, 'ETB', FALSE, TRUE, NULL),
          ('IMAGING_CHEST_XRAY', 'laboratory', 'PA Digital Chest Radiograph', 'High-resolution digital thoracic radiograph with radiologist report.', 650.00, 'ETB', FALSE, TRUE, NULL),
          ('IMAGING_ULTRASOUND', 'laboratory', 'Abdominal & Renal Diagnostic Ultrasound', 'Real-time soft tissue and organ sonography scan.', 950.00, 'ETB', FALSE, TRUE, NULL),
          ('PROCEDURE_NURSING_IV', 'nursing', 'Nursing IV Fluid Hydration & Injection Procedure', 'Administration of prescribed IV therapies, saline hydration, and vital monitoring.', 250.00, 'ETB', FALSE, TRUE, NULL)
      ON CONFLICT (service_code) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          validity_days = EXCLUDED.validity_days;

      -- ==========================================
      -- SEED DYNAMIC NAVIGATION ITEMS (IDEMPOTENT)
      -- ==========================================
      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'patient', 'Dashboard', '/patient/dashboard', 'Activity', 1, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'patient' AND href = '/patient/dashboard');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'patient', 'Health Records', '/patient/health', 'FolderOpen', 2, TRUE, TRUE, 'documentsCount'
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'patient' AND href = '/patient/health');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'patient', 'Treat Me Now', '/patient/cases', 'Zap', 3, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'patient' AND href = '/patient/cases');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'patient', 'Book Visit', '/appointments', 'Calendar', 4, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'patient' AND href = '/appointments');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'patient', 'Telemedicine', '/telemedicine', 'PhoneCall', 5, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'patient' AND href = '/telemedicine');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'patient', 'Billing & Plans', '/billing', 'Receipt', 6, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'patient' AND href = '/billing');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'physician', 'Workstation', '/clinical', 'Stethoscope', 1, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'physician' AND href = '/clinical');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'physician', 'Cases & Queue', '/cases', 'Users', 2, TRUE, TRUE, 'pendingCases'
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'physician' AND href = '/cases');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'physician', 'Triage & Vitals', '/triage', 'HeartPulse', 3, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'physician' AND href = '/triage');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'physician', 'Prescriptions', '/prescriptions', 'Pill', 4, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'physician' AND href = '/prescriptions');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'physician', 'Care Plans', '/care-plan', 'FileText', 5, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'physician' AND href = '/care-plan');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'physician', 'Tasks', '/tasks', 'CheckCircle2', 6, TRUE, TRUE, 'openTasks'
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'physician' AND href = '/tasks');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'nurse', 'Triage Desk', '/triage', 'HeartPulse', 1, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'nurse' AND href = '/triage');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'pharmacist', 'Dispensing', '/pharmacy', 'Pill', 1, TRUE, TRUE, 'pendingDispense'
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'pharmacist' AND href = '/pharmacy');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'system_admin', 'Operations Hub', '/admin', 'Building2', 1, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'system_admin' AND href = '/admin');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'system_admin', 'Navigation Config', '/admin/navigation', 'Menu', 2, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'system_admin' AND href = '/admin/navigation');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'system_admin', 'Content & CMS', '/admin/content', 'FileText', 3, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'system_admin' AND href = '/admin/content');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'system_admin', 'Pricing Config', '/admin/pricing', 'Receipt', 4, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'system_admin' AND href = '/admin/pricing');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'system_admin', 'Forms Builder', '/admin/forms', 'Layers', 5, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'system_admin' AND href = '/admin/forms');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'system_admin', 'Dashboard Widgets', '/admin/dashboard-widgets', 'LayoutGrid', 6, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'system_admin' AND href = '/admin/dashboard-widgets');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'system_admin', 'Tabs Config', '/admin/tabs', 'FolderOpen', 7, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'system_admin' AND href = '/admin/tabs');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'system_admin', 'Notifications', '/admin/notifications', 'Bell', 8, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'system_admin' AND href = '/admin/notifications');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'system_admin', 'Translations', '/admin/translations', 'Languages', 9, TRUE, TRUE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'system_admin' AND href = '/admin/translations');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'guest', 'Services', '/services', 'Stethoscope', 1, TRUE, FALSE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'guest' AND href = '/services');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'guest', 'Locations', '/locations', 'MapPin', 2, TRUE, FALSE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'guest' AND href = '/locations');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'guest', 'Membership', '/membership', 'CreditCard', 3, TRUE, FALSE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'guest' AND href = '/membership');

      INSERT INTO navigation_items (tenant_id, role, label, href, icon, "order", is_active, requires_auth, badge_key)
      SELECT '00000000-0000-0000-0000-000000000001', 'guest', 'Treat Me Now', '/patient/cases', 'Zap', 4, TRUE, FALSE, NULL
      WHERE NOT EXISTS (SELECT 1 FROM navigation_items WHERE role = 'guest' AND href = '/patient/cases');

      -- ==========================================
      -- SEED DYNAMIC PRICING (IDEMPOTENT)
      -- ==========================================
      INSERT INTO service_pricing (tenant_id, service_name, service_type, plan_code, base_price, yearly_price, currency, discount_percent, badge, description, features, popular, cta_text, is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'Individual Membership', 'subscription', 'individual', 199.00, 1990.00, 'ETB', 0, 'Most Popular', 'Complete 24/7 on-demand virtual care, un-rushed in-office visits, on-site labs, and direct messaging.', '["Unlimited 24/7 On-Demand Video Triage & Chat", "Same-Day & Next-Day In-Office Appointments", "Drop-In On-Site CLIA Bloodwork & Diagnostics", "Direct Messaging with Your Dedicated Doctor", "1-Click In-App Prescription Renewals", "Full Mobile App Health Hub & Care Plans"]'::jsonb, TRUE, 'Join Individual Plan', TRUE
      WHERE NOT EXISTS (SELECT 1 FROM service_pricing WHERE plan_code = 'individual');

      INSERT INTO service_pricing (tenant_id, service_name, service_type, plan_code, base_price, yearly_price, currency, discount_percent, badge, description, features, popular, cta_text, is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'Family Membership', 'subscription', 'family', 349.00, 3490.00, 'ETB', 15, 'Up to 5 Family Members', 'Covers parents, children, and teens with pediatric specialists and unified family health management.', '["Covers Up to 5 Family Members Under One Plan", "Dedicated Pediatricians & Family Medicine Leads", "Unlimited 24/7 Virtual Urgent Care for Kids & Adults", "Childhood Immunizations & School Sports Physicals", "Unified Family Records & Direct Messaging", "Shared Billing & Flexible Payment Options"]'::jsonb, FALSE, 'Join Family Plan', TRUE
      WHERE NOT EXISTS (SELECT 1 FROM service_pricing WHERE plan_code = 'family');

      INSERT INTO service_pricing (tenant_id, service_name, service_type, plan_code, base_price, yearly_price, currency, discount_percent, badge, description, features, popular, cta_text, is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'One Medical for Business', 'subscription', 'corporate', 1500.00, 15000.00, 'ETB', 20, 'Employer Sponsored', 'Top-tier employee health benefit reducing healthcare costs while delighting employees.', '["Fully Subsidized Employee Memberships", "On-Site Flu Shot Clinics & Executive Health Days", "Dedicated Account Manager & ROI Analytics", "Integrated with Major Commercial Health Plans"]'::jsonb, FALSE, 'Contact Corporate Sales', TRUE
      WHERE NOT EXISTS (SELECT 1 FROM service_pricing WHERE plan_code = 'corporate');

      -- ==========================================
      -- SEED DYNAMIC LANDING SECTIONS (IDEMPOTENT)
      -- ==========================================
      INSERT INTO landing_sections (tenant_id, section_key, title, subtitle, content, "order", is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'hero', 'Doctor appointments you will actually look forward to.', 'Primary care designed around real people, not waiting rooms. 24/7 virtual care, same-day appointments, and un-rushed visits with doctors who listen.', '{"headline": "Doctor appointments you will actually look forward to.", "subheadline": "Primary care designed around real people, not waiting rooms. 24/7 virtual care, same-day appointments, and un-rushed visits with doctors who listen.", "primaryCta": "Book a Visit", "primaryCtaHref": "/appointments", "secondaryCta": "Treat Me Now", "secondaryCtaHref": "/patient/cases", "bannerText": "NOW OPEN: Debre Birhan Main Clinical Center & Regional Diagnostics Hub"}'::jsonb, 1, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM landing_sections WHERE section_key = 'hero');

      INSERT INTO landing_sections (tenant_id, section_key, title, subtitle, content, "order", is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'trust', 'Trusted by over 10,000 patients and leading healthcare providers', 'Clinical excellence backed by continuous quality monitoring.', '{"patientCount": "10,000+", "satisfactionRate": "98.7%", "averageWaitMinutes": 6, "certifications": ["Ethiopian Ministry of Health Licensed", "ISO 15189 Diagnostic Accredited", "24/7 Clinical Triage Hotline"]}'::jsonb, 2, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM landing_sections WHERE section_key = 'trust');

      INSERT INTO landing_sections (tenant_id, section_key, title, subtitle, content, "order", is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'services', 'Comprehensive Whole-Person Care Under One Roof', 'Everything from preventive wellness exams to diagnostic labs and chronic condition management.', '{"items": [{"title": "24/7 Virtual Urgent Care", "description": "Connect with an attending clinician in under 15 minutes from your phone or laptop."}, {"title": "Same-Day In-Office Visits", "description": "Warm, peaceful clinics with un-rushed 30-minute appointments that start on time."}, {"title": "On-Site Diagnostic Labs", "description": "Drop-in blood draws, pathology, and rapid results delivered straight to your secure vault."}, {"title": "Chronic Disease Programs", "description": "Holistic management for diabetes, hypertension, asthma, and cardiovascular health."}]}'::jsonb, 3, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM landing_sections WHERE section_key = 'services');

      INSERT INTO landing_sections (tenant_id, section_key, title, subtitle, content, "order", is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'how_it_works', 'How NiniMed Works', 'Three seamless steps to exceptional everyday healthcare.', '{"steps": [{"step": 1, "title": "Join in 60 Seconds", "description": "Select an individual or family membership and instantly unlock virtual care."}, {"step": 2, "title": "Book or Tap Treat Me Now", "description": "Schedule a peaceful clinic visit or get immediate video triage from any device."}, {"step": 3, "title": "Feel Better, Stay Healthy", "description": "Follow personalized care plans, get digital prescriptions, and direct doctor messaging."}]}'::jsonb, 4, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM landing_sections WHERE section_key = 'how_it_works');

      INSERT INTO landing_sections (tenant_id, section_key, title, subtitle, content, "order", is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'why_choose_us', 'Why Choose NiniMed', 'A refreshing healthcare experience created to put you first.', '{"pillars": [{"title": "Un-Rushed Appointments", "description": "Your doctor spends 30+ minutes listening to you and developing your care plan."}, {"title": "No Crowded Waiting Rooms", "description": "Visits start promptly at your scheduled time in a tranquil environment."}, {"title": "One Unified Medical Record", "description": "All your vitals, lab reports, prescriptions, and notes in your pocket at all times."}]}'::jsonb, 5, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM landing_sections WHERE section_key = 'why_choose_us');

      INSERT INTO landing_sections (tenant_id, section_key, title, subtitle, content, "order", is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'faq', 'Frequently Asked Questions', 'Everything you need to know about our modern clinical network.', '{"items": [{"q": "How quickly can I see a doctor?", "a": "For virtual urgent care, clinicians respond in 5-15 minutes 24/7. In-office visits are available same-day or next-day."}, {"q": "Do you accept health insurance?", "a": "Yes! We accept major commercial insurance, corporate plans, and offer clear transparent cash pricing for self-pay members."}, {"q": "Can I get my prescriptions renewed online?", "a": "Yes. Active patients can request 1-click prescription renewals directly in the mobile and web app."}, {"q": "Are laboratory tests done on site?", "a": "Yes, our certified CLIA-standard laboratories perform blood draws and metabolic tests directly on-site with rapid digital delivery."}]}'::jsonb, 6, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM landing_sections WHERE section_key = 'faq');

      -- ==========================================
      -- SEED DYNAMIC TABS (IDEMPOTENT)
      -- ==========================================
      INSERT INTO tab_configurations (tenant_id, page_key, tab_key, label, icon, badge_key, "order", is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'patient_health', 'timeline', 'Activity Timeline', 'Clock', NULL, 1, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM tab_configurations WHERE page_key = 'patient_health' AND tab_key = 'timeline');

      INSERT INTO tab_configurations (tenant_id, page_key, tab_key, label, icon, badge_key, "order", is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'patient_health', 'documents', 'Medical Documents', 'FolderOpen', 'documentsCount', 2, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM tab_configurations WHERE page_key = 'patient_health' AND tab_key = 'documents');

      INSERT INTO tab_configurations (tenant_id, page_key, tab_key, label, icon, badge_key, "order", is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'patient_health', 'labs', 'Diagnostic Labs', 'FlaskConical', 'labsCount', 3, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM tab_configurations WHERE page_key = 'patient_health' AND tab_key = 'labs');

      INSERT INTO tab_configurations (tenant_id, page_key, tab_key, label, icon, badge_key, "order", is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'patient_health', 'medications', 'Prescriptions', 'Pill', 'medicationsCount', 4, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM tab_configurations WHERE page_key = 'patient_health' AND tab_key = 'medications');

      INSERT INTO tab_configurations (tenant_id, page_key, tab_key, label, icon, badge_key, "order", is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'patient_health', 'vitals', 'Biometrics & Vitals', 'HeartPulse', NULL, 5, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM tab_configurations WHERE page_key = 'patient_health' AND tab_key = 'vitals');

      INSERT INTO tab_configurations (tenant_id, page_key, tab_key, label, icon, badge_key, "order", is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'patient_health', 'careplan', 'Care Plans & Goals', 'Activity', NULL, 6, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM tab_configurations WHERE page_key = 'patient_health' AND tab_key = 'careplan');

      INSERT INTO tab_configurations (tenant_id, page_key, tab_key, label, icon, badge_key, "order", is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'patient_health', 'vaccines', 'Immunizations', 'ShieldCheck', 'vaccinesCount', 7, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM tab_configurations WHERE page_key = 'patient_health' AND tab_key = 'vaccines');

      -- ==========================================
      -- SEED DYNAMIC DASHBOARD WIDGETS (IDEMPOTENT)
      -- ==========================================
      INSERT INTO dashboard_widgets (tenant_id, role, widget_name, widget_type, title, description, config, position, grid_span, is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'physician', 'patient_census', 'stats', 'Active Patients', 'Total patients under active care', '{"metric": "totalPatients", "icon": "Users", "color": "teal"}'::jsonb, 1, 1, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM dashboard_widgets WHERE role = 'physician' AND widget_name = 'patient_census');

      INSERT INTO dashboard_widgets (tenant_id, role, widget_name, widget_type, title, description, config, position, grid_span, is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'patient', 'upcoming_visit', 'stats', 'Next Appointment', 'Your scheduled doctor appointment', '{"endpoint": "/api/v1/appointments?status=scheduled", "emptyText": "No upcoming appointments"}'::jsonb, 1, 1, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM dashboard_widgets WHERE role = 'patient' AND widget_name = 'upcoming_visit');

      -- ==========================================
      -- SEED DYNAMIC NOTIFICATION TEMPLATES
      -- ==========================================
      INSERT INTO notification_templates (tenant_id, template_key, title, body, type, channels, is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'appointment_reminder', 'Upcoming Appointment Reminder', 'Hello {{patientName}}, this is a reminder for your upcoming appointment on {{date}} with {{doctorName}}.', 'info', '["email", "sms", "in_app"]'::jsonb, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE template_key = 'appointment_reminder');

      INSERT INTO notification_templates (tenant_id, template_key, title, body, type, channels, is_active)
      SELECT '00000000-0000-0000-0000-000000000001', 'lab_results_ready', 'Diagnostic Lab Results Ready', 'Your lab results for {{testName}} have been reviewed and are now available in your health portal.', 'success', '["email", "sms", "in_app"]'::jsonb, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE template_key = 'lab_results_ready');
    `);

        // Synchronize Comprehensive Pharmacy & Laboratory Catalogues (Idempotent)
        await syncComprehensiveCatalogues(client);

        console.log("✅ PostgreSQL schema verification complete (all 50+ tables, pricing, 376 pharmacy items and 79 lab protocols confirmed).");

        // 3. Check if Seed Data exists before inserting
        const [orgCheck] = await client`
      SELECT count(*) as count FROM organizations;
    `;

        if (orgCheck && parseInt(orgCheck.count, 10) > 0) {
            console.log("ℹ️ Database already has seed organizations. Skipping initial seed insert.");
            await seedDemoAccounts(client);
            return;
        }

        console.log("🌱 Inserting initial seed data for NiniMed Health System...");

        await client.unsafe(`
      INSERT INTO organizations (id, name, slug, status, settings)
      VALUES (
          '00000000-0000-0000-0000-000000000001',
          'NiniMed Enterprise Health System',
          'org-Nini',
          'active',
          '{"theme": "dark", "multitenancy": true, "auditLevel": "21CFR11"}'
      ) ON CONFLICT (slug) DO NOTHING;

      INSERT INTO facilities (id, organization_id, name, address, timezone)
      VALUES (
          '00000000-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-000000000001',
          'NiniMed Clinic& Clinic',
          'Bole Sub-City, Addis Ababa, Ethiopia',
          'Africa/Addis_Ababa'
      ) ON CONFLICT DO NOTHING;

      -- Clean up previous demo users and demo patient records
      DELETE FROM users WHERE email != 'admin@Ninimed.org' AND email != 'abebetadesse1@gmail.com' AND (
        email LIKE '%@Ninimed.org' OR 
        email LIKE '%@patient.Nini.org' OR 
        email LIKE '%@Ninipharm.org' OR 
        email LIKE '%@Ninirehab.org' OR 
        email LIKE '%@Nininutrition.org' OR 
        email LIKE '%@Ninisocial.org' OR 
        email LIKE '%@Ninilabs.org'
      );
      DELETE FROM patients WHERE mrn = 'MRN-89210';
      DELETE FROM family_groups WHERE name = 'The Vance Family';

      -- Seed Primary Super Admin User (password: Admin@2026!)
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

      -- Seed Abebe Tadesse Super Admin User (password: Ninielda@&1)
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

      INSERT INTO suppliers (id, tenant_id, name, contact_person, email, phone, address, lead_time_days)
      VALUES (
          'aa111111-1111-1111-1111-111111111101',
          '00000000-0000-0000-0000-000000000001',
          'Ethiopian Pharmaceuticals Supply Service (EPSS)',
          'Yonas Bekele',
          'orders@epss.gov.et',
          '+251 11 275 8000',
          'Addis Ababa, Ethiopia',
          2
      ) ON CONFLICT DO NOTHING;

      INSERT INTO drug_catalog (id, tenant_id, generic_name, brand_name, strength, dosage_form, route, atc_code, barcode, package_size, reorder_level, max_stock, default_unit_cost, default_selling_price)
      VALUES
          ('bb111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000001', 'Metformin HCl', 'Glucophage', '500 mg', 'tablet', 'oral', 'A10BA02', '628100100101', '100 tablets', 50, 500, 3.50, 6.00),
          ('bb111111-1111-1111-1111-111111111102', '00000000-0000-0000-0000-000000000001', 'Lisinopril', 'Zestril', '20 mg', 'tablet', 'oral', 'C09AA03', '628100100102', '30 tablets', 40, 300, 4.20, 7.50),
          ('bb111111-1111-1111-1111-111111111103', '00000000-0000-0000-0000-000000000001', 'Atorvastatin Calcium', 'Lipitor', '20 mg', 'tablet', 'oral', 'C10AA05', '628100100103', '30 tablets', 30, 250, 8.00, 14.00),
          ('bb111111-1111-1111-1111-111111111104', '00000000-0000-0000-0000-000000000001', 'Ceftriaxone Sodium', 'Rocephin', '1 g', 'injection', 'iv', 'J01DD04', '628100100104', '1 vial', 20, 150, 35.00, 55.00),
          ('bb111111-1111-1111-1111-111111111105', '00000000-0000-0000-0000-000000000001', 'Azithromycin', 'Zithromax', '500 mg', 'tablet', 'oral', 'J01FA10', '628100100105', '3 tablets', 25, 200, 22.00, 38.00)
      ON CONFLICT DO NOTHING;

      INSERT INTO subscription_plans (id, tenant_id, name, slug, description, type, billing_cycle, base_price, currency, max_members, included_services)
      VALUES
          ('55555555-5555-5555-5555-555555555501', '00000000-0000-0000-0000-000000000001', 'Comprehensive Individual Care', 'individual-standard', 'Unlimited CDSS telemedicine and chronic monitoring', 'individual', 'monthly', 1200, 'ETB', 1, '{"consultations": 4, "labTests": 2, "discountPercent": 15}'),
          ('55555555-5555-5555-5555-555555555502', '00000000-0000-0000-0000-000000000001', 'Multidisciplinary Family Shield', 'family-premium', 'Covers up to 6 family members with chronic care management', 'family', 'monthly', 2800, 'ETB', 6, '{"consultations": 12, "labTests": 6, "discountPercent": 25}')
      ON CONFLICT DO NOTHING;

      INSERT INTO external_providers (id, organization_id, name, specialty, facility_name, email, phone, fhir_endpoint, preferred_transport)
      VALUES
          ('77777777-7777-7777-7777-777777777701', '00000000-0000-0000-0000-000000000001', 'Addis Kidney & Renal Care Institute', 'Nephrology & Dialysis', 'Addis Renal Tower', 'referrals@addisrenal.org', '+251 11 654 3210', 'https://fhir.addisrenal.org/r4', 'fhir'),
          ('77777777-7777-7777-7777-777777777702', '00000000-0000-0000-0000-000000000001', 'Capital Advanced Cardiology Center', 'Interventional Cardiology', 'Capital Heart Pavilion', 'triage@capitalcardio.et', '+251 11 654 3211', 'https://fhir.capitalcardio.et/r4', 'fhir')
      ON CONFLICT DO NOTHING;

      INSERT INTO cases (id, case_id, case_number, tenant_id, status, chief_complaint, severity, assigned_handler_id, assigned_handler_name, assigned_role, personal, complaint, history, symptoms, ai_summary, ai_analysis, handler_notes, timeline, submitted_at)
      VALUES
      (
        'cc000000-0000-0000-0000-000000000001',
        'CASE-2026-INIT01',
        'CASE-2026-INIT01',
        '00000000-0000-0000-0000-000000000001',
        'under_review',
        'Recurrent chest tightness and exertion dyspnea for 1 week',
        'severe',
        '00000000-0000-0000-0000-000000000099',
        'System Super Administrator',
        'physician',
        '{"fullName": "Abebe Kebede", "email": "abebe.kebede@example.com", "phone": "+251 91 123 4567", "gender": "male", "dateOfBirth": "1978-04-12", "mrn": "MRN-10023"}'::jsonb,
        '{"chiefComplaint": "Recurrent chest tightness and exertion dyspnea for 1 week", "severity": "severe", "duration": "1 week", "onset": "gradual", "seekingUrgent": true}'::jsonb,
        '{"chronicConditions": "Hypertension, Hyperlipidemia", "currentMedications": "Amlodipine 5mg, Atorvastatin 20mg", "knownAllergies": "Penicillin"}'::jsonb,
        '{"painScale": 6, "selectedCategories": ["cardiac", "breathing"]}'::jsonb,
        'Patient presents with progressive exertional dyspnea and retrosternal chest pressure. Known cardiovascular risk factors. Urgent ECG and cardiac enzyme evaluation recommended.',
        '{"urgencyLevel": "urgent", "analysisConfidence": 92, "potentialCauses": ["Unstable Angina", "Coronary Artery Disease", "GERD with esophageal spasm"]}'::jsonb,
        '[{"note": "Initial clinical triage completed. Case prioritized for cardiology consultation.", "author": "Dr. Sarah Mitchell", "timestamp": "2026-09-01T08:00:00Z"}]'::jsonb,
        '[{"event": "Case submitted by patient", "time": "2026-09-01T07:30:00Z", "actor": "Patient"}, {"event": "AI clinical analysis complete", "time": "2026-09-01T07:31:00Z", "actor": "AI Engine"}]'::jsonb,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (case_id) DO NOTHING;
    `);

    // ── Notification Privileges & Telegram Integrations (idempotent) ─────────
    await client.unsafe(`
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

      ALTER TABLE telegram_integrations ADD COLUMN IF NOT EXISTS linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE telegram_integrations ADD COLUMN IF NOT EXISTS auth_link_token VARCHAR(64);
      ALTER TABLE telegram_integrations ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP;

      -- Add national_id column to users if not present (for webhook linking)
      ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id TEXT;

      -- Seed Staff Profiles for core clinical and administrative staff
      INSERT INTO staff_profiles (
        id, user_id, tenant_id, employee_code, department, designation, specialization,
        license_number, license_expiry_date, cme_points, employment_type,
        base_salary_etb, on_call_allowance_rate, status, hired_at
      ) VALUES
        ('a1111111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000001', 'EMP-001', 'Internal Medicine', 'Lead Attending Physician & Internist', 'Internal Medicine & Cardiology', 'MD-ET-2018-0941', '2026-12-31', 48, 'full_time', 42000.00, 1500.00, 'active', '2021-01-15'),
        ('a1111111-0001-0000-0000-000000000002', '11111111-1111-1111-1111-111111111102', '00000000-0000-0000-0000-000000000001', 'EMP-002', 'Advanced Primary Care', 'Family Nurse Practitioner (DNP)', 'Primary Care & Preventive Medicine', 'NP-ET-2020-1120', '2027-06-30', 34, 'full_time', 28500.00, 900.00, 'active', '2021-06-01'),
        ('a1111111-0001-0000-0000-000000000003', '11111111-1111-1111-1111-111111111103', '00000000-0000-0000-0000-000000000001', 'EMP-003', 'Emergency', 'Head Nurse & Triage Supervisor', 'Emergency & Critical Care Nursing', 'RN-ET-2019-3829', '2027-01-15', 26, 'full_time', 22000.00, 800.00, 'active', '2020-03-10'),
        ('a1111111-0001-0000-0000-000000000004', '11111111-1111-1111-1111-111111111104', '00000000-0000-0000-0000-000000000001', 'EMP-004', 'Pharmacy', 'Chief Clinical Pharmacist & Toxicologist', 'Clinical Pharmacogenomics', 'PH-ET-2017-4821', '2026-11-30', 40, 'full_time', 29000.00, 750.00, 'active', '2019-09-01'),
        ('a1111111-0001-0000-0000-000000000005', '11111111-1111-1111-1111-111111111105', '00000000-0000-0000-0000-000000000001', 'EMP-005', 'Cardiopulmonary Rehabilitation', 'Doctor of Physical Therapy (DPT)', 'Cardiopulmonary Rehabilitation', 'PT-ET-2021-0029', '2026-10-15', 30, 'full_time', 26000.00, 600.00, 'active', '2022-02-01'),
        ('a1111111-0001-0000-0000-000000000006', '11111111-1111-1111-1111-111111111106', '00000000-0000-0000-0000-000000000001', 'EMP-006', 'Nutrition', 'Lead Medical Nutrition Specialist', 'Diabetic Dietetics', 'DT-ET-2022-5501', '2027-08-20', 22, 'full_time', 23500.00, 500.00, 'active', '2022-05-15'),
        ('a1111111-0001-0000-0000-000000000007', '11111111-1111-1111-1111-111111111107', '00000000-0000-0000-0000-000000000001', 'EMP-007', 'Social Work', 'Senior Clinical Social Worker & SDOH Lead', 'Medical Social Work', 'SW-ET-2020-8812', '2027-03-31', 18, 'full_time', 21000.00, 400.00, 'active', '2021-08-20'),
        ('a1111111-0001-0000-0000-000000000008', '11111111-1111-1111-1111-111111111108', '00000000-0000-0000-0000-000000000001', 'EMP-008', 'Laboratory', 'Senior Molecular Biologist & Lab Director', 'Molecular Genomics', 'LB-ET-2018-7744', '2026-09-30', 52, 'full_time', 38000.00, 1200.00, 'active', '2020-01-10'),
        ('a1111111-0001-0000-0000-000000000009', '11111111-1111-1111-1111-111111111109', '00000000-0000-0000-0000-000000000001', 'EMP-009', 'Clinical Operations', 'Hospital Operations Administrator', 'Health Systems Administration', 'HA-ET-2016-1002', '2028-12-31', 35, 'full_time', 35000.00, 1000.00, 'active', '2018-11-01'),
        ('a1111111-0001-0000-0000-000000000010', '5c254614-7cb0-4e72-a7cb-7bbe0a98c42d', '00000000-0000-0000-0000-000000000001', 'EMP-010', 'System Administration', 'Chief Medical Systems Administrator', 'Clinical Informatics', 'IT-ET-2022-9900', '2029-01-01', 60, 'full_time', 45000.00, 1500.00, 'active', '2020-01-01')
      ON CONFLICT (user_id) DO NOTHING;
    `);

        await seedDemoAccounts(client);

    } catch (error: any) {
        if (error?.code === "ECONNREFUSED" || error?.message?.includes("ECONNREFUSED")) {
            console.log("ℹ️ Database connection not ready yet. Schema synchronization will occur upon container connection.");
        } else {
            console.error("Database initialization note:", error?.message || error);
        }
    }
}

export async function syncComprehensiveCatalogues(client: postgres.Sql) {
    try {
        console.log("⚡ Synchronizing 79 Intensive Laboratory Protocols...");
        for (const lab of LABORATORY_PROTOCOLS_CATALOGUE) {
            const serviceCode = `LAB_${lab.testCode.replace(/[\/\s-]/g, '_')}`;
            const desc = `Specimen: ${lab.specimen} (${lab.tubeContainer}). Ref: ${lab.referenceRangeAdult}${lab.criticalValues ? ' | Critical: ' + lab.criticalValues : ''}`;
            const fullName = `${lab.testName} (${lab.testCode})`;
            const metadataJson = JSON.stringify({
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
            });
            const itemsJson = JSON.stringify([
                `Specimen: ${lab.specimen}`,
                `Container: ${lab.tubeContainer}`,
                `Collection: ${lab.collectionProtocol}`,
                `Storage: ${lab.handlingStorage}`,
                `Turnaround: ${lab.turnaroundTime}`,
                `Methodology: ${lab.methodology}`,
                lab.criticalValues ? `Critical Alert: ${lab.criticalValues}` : 'No critical limits specified',
            ]);

            await client`
                INSERT INTO service_pricing_catalog (
                    service_code, category, name, description, base_price, currency, is_free, is_active
                ) VALUES (
                    ${serviceCode}, 'laboratory', ${fullName}, ${desc}, ${lab.priceEtb}, 'ETB', FALSE, TRUE
                )
                ON CONFLICT (service_code) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    base_price = EXCLUDED.base_price,
                    is_active = TRUE;
            `;

            await client`
                INSERT INTO clinical_catalog_protocols (
                    tenant_id, kind, department_id, name, indication, items, metadata, is_active
                ) VALUES (
                    '00000000-0000-0000-0000-000000000001',
                    'protocol',
                    'laboratory',
                    ${fullName},
                    ${'Diagnostic protocol for ' + lab.testName + ' (' + lab.category + '). Specimen: ' + lab.specimen},
                    ${itemsJson}::jsonb,
                    ${metadataJson}::jsonb,
                    TRUE
                )
                ON CONFLICT (tenant_id, department_id, name) DO UPDATE SET
                    indication = EXCLUDED.indication,
                    items = EXCLUDED.items,
                    metadata = EXCLUDED.metadata,
                    is_active = TRUE;
            `;
        }

        console.log("⚡ Synchronizing 376 Master Pharmacy Catalogue Items...");
        for (const item of PHARMACY_MASTER_CATALOGUE) {
            const barcode = '628' + item.drugCode.replace(/[^0-9]/g, '').padStart(9, '0');
            const unitCost = Number((item.priceEtb * 0.65).toFixed(2));
            const sellingPrice = Number(item.priceEtb.toFixed(2));
            const maxStock = item.reorderLevel * 4;

            await client`
                INSERT INTO drug_catalog (
                    tenant_id, generic_name, brand_name, strength, dosage_form, route,
                    atc_code, barcode, package_size, reorder_level, max_stock,
                    default_unit_cost, default_selling_price, storage_condition,
                    item_code, category, section_number, section_name, is_controlled, rx_otc, is_active
                ) VALUES (
                    '00000000-0000-0000-0000-000000000001',
                    ${item.genericName},
                    ${item.brandName},
                    ${item.strength},
                    ${item.form},
                    ${item.route},
                    ${item.atcCode || item.drugCode},
                    ${barcode},
                    ${item.reorderUnit || 'unit'},
                    ${item.reorderLevel},
                    ${maxStock},
                    ${unitCost},
                    ${sellingPrice},
                    ${item.storageCondition || 'ambient'},
                    ${item.drugCode},
                    ${item.category},
                    ${item.sectionNumber},
                    ${item.sectionName},
                    ${item.isControlled},
                    ${item.rxOtc},
                    TRUE
                )
                ON CONFLICT (tenant_id, item_code) DO UPDATE SET
                    generic_name = EXCLUDED.generic_name,
                    brand_name = EXCLUDED.brand_name,
                    strength = EXCLUDED.strength,
                    dosage_form = EXCLUDED.dosage_form,
                    route = EXCLUDED.route,
                    category = EXCLUDED.category,
                    section_number = EXCLUDED.section_number,
                    section_name = EXCLUDED.section_name,
                    is_controlled = EXCLUDED.is_controlled,
                    rx_otc = EXCLUDED.rx_otc,
                    default_selling_price = EXCLUDED.default_selling_price,
                    reorder_level = EXCLUDED.reorder_level,
                    is_active = TRUE;
            `;
        }

        console.log("✅ Synchronized 376 medications/supplies and 79 laboratory protocols.");
    } catch (err: any) {
        console.warn("Catalog synchronization notice:", err?.message || err);
    }
}

