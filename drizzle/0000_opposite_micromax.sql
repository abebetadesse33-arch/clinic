CREATE TABLE `action_configurations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`page_key` text NOT NULL,
	`action_key` text NOT NULL,
	`label` text NOT NULL,
	`icon` text,
	`action_type` text NOT NULL DEFAULT ('link'),
	`href` text,
	`api_endpoint` text,
	`method` text DEFAULT ('GET'),
	`variant` text DEFAULT ('default'),
	`required_permission` text,
	`order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	CONSTRAINT `action_configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_audit_logs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`actor_user_id` varchar(36) NOT NULL,
	`actor_role` text NOT NULL,
	`actor_ip_address` text,
	`actor_user_agent` text,
	`action_type` text NOT NULL,
	`target_resource_type` text NOT NULL,
	`target_resource_id` text,
	`details` json DEFAULT ('{}'),
	`previous_entry_hash` text,
	`entry_hash` text NOT NULL,
	`is_tamper_flagged` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	CONSTRAINT `admin_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_models` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`version` text NOT NULL,
	`type` text NOT NULL,
	`purpose` text NOT NULL,
	`performance` json DEFAULT ('{}'),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	CONSTRAINT `ai_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_suggestions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`session_id` varchar(36),
	`analysis_type` text NOT NULL DEFAULT ('comprehensive_multidisciplinary'),
	`model_name` text NOT NULL DEFAULT ('gemini-1.5-pro'),
	`model_version` text DEFAULT ('2026.2-multidisciplinary'),
	`input_summary` json NOT NULL,
	`raw_data_refs` json NOT NULL DEFAULT ('[]'),
	`ai_response` json NOT NULL,
	`status` text NOT NULL DEFAULT ('pending_review'),
	`review_notes` text,
	`reviewed_by` varchar(36),
	`reviewed_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `ai_suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`clinician_id` varchar(36),
	`facility_id` varchar(36),
	`appointment_type` text NOT NULL DEFAULT ('in_person'),
	`specialty` text NOT NULL DEFAULT ('Internal Medicine'),
	`scheduled_date` date NOT NULL,
	`scheduled_time` text NOT NULL,
	`duration_minutes` int NOT NULL DEFAULT 30,
	`queue_token` text,
	`status` text NOT NULL DEFAULT ('scheduled'),
	`reason` text NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tenant_id` varchar(36),
	`user_id` varchar(36),
	`user_role` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`summary` text,
	`diff` json,
	`ip_address` text DEFAULT ('127.0.0.1'),
	`user_agent` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	`last_seen_at` datetime NOT NULL,
	`ip_address` text,
	`user_agent` text,
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_sessions_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `auth_verification_codes` (
	`id` varchar(36) NOT NULL,
	`identifier` text NOT NULL,
	`channel` text NOT NULL,
	`code_hash` text NOT NULL,
	`raw_code` text,
	`user_id` varchar(36),
	`purpose` text NOT NULL DEFAULT ('account_registration'),
	`status` text NOT NULL DEFAULT ('pending'),
	`attempts` int NOT NULL DEFAULT 0,
	`expires_at` datetime NOT NULL,
	`verified_at` datetime,
	`metadata` json DEFAULT ('{}'),
	`created_at` datetime NOT NULL,
	CONSTRAINT `auth_verification_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_rules` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`trigger_type` text NOT NULL,
	`condition` json NOT NULL,
	`action` json NOT NULL,
	`priority` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`escalation_timeout_minutes` int DEFAULT 1440,
	`created_by` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `automation_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_claims` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36) NOT NULL,
	`claim_number` varchar(255) NOT NULL,
	`payer_name` text NOT NULL,
	`payer_type` text NOT NULL,
	`total_amount` decimal(12,4) NOT NULL,
	`status` text NOT NULL DEFAULT ('draft'),
	`diagnosis_codes` json NOT NULL DEFAULT ('[]'),
	`procedure_codes` json NOT NULL DEFAULT ('[]'),
	`ai_denial_risk_score` decimal(12,4) DEFAULT '0.0',
	`ai_denial_risk_factors` json DEFAULT ('[]'),
	`submission_date` datetime,
	`adjudication_date` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `billing_claims_id` PRIMARY KEY(`id`),
	CONSTRAINT `billing_claims_claim_number_unique` UNIQUE(`claim_number`)
);
--> statement-breakpoint
CREATE TABLE `biological_rules` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`curated_by` varchar(36) NOT NULL,
	`category` text NOT NULL,
	`rule_title` text NOT NULL,
	`description` text NOT NULL,
	`evidence_grade` text NOT NULL,
	`source_citation` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	CONSTRAINT `biological_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blockchain_anchors` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`batch_start_at` datetime NOT NULL,
	`batch_end_at` datetime NOT NULL,
	`log_count` int NOT NULL,
	`merkle_root_hash` text NOT NULL,
	`previous_block_hash` text NOT NULL,
	`block_hash` text NOT NULL,
	`transaction_hash` text NOT NULL,
	`network` text NOT NULL DEFAULT ('private_hyperledger_simulated'),
	`anchored_at` datetime NOT NULL,
	CONSTRAINT `blockchain_anchors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `care_plans` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`status` text NOT NULL DEFAULT ('active'),
	`primary_diagnosis` text NOT NULL,
	`goals` json DEFAULT ('[]'),
	`interventions` json DEFAULT ('[]'),
	`updated_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `care_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `care_team_members` (
	`care_team_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role` text NOT NULL,
	`assigned_at` datetime NOT NULL
);
--> statement-breakpoint
CREATE TABLE `care_teams` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `care_teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `case_messages` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`case_id` varchar(36) NOT NULL,
	`sender_id` varchar(36),
	`sender_name` text,
	`sender_type` text NOT NULL DEFAULT ('patient'),
	`message` text NOT NULL,
	`attachments` json DEFAULT ('[]'),
	`read_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `case_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` varchar(36) NOT NULL,
	`case_id` varchar(255) NOT NULL,
	`case_number` text,
	`tenant_id` varchar(36),
	`patient_id` varchar(36),
	`encounter_id` varchar(36),
	`status` text NOT NULL DEFAULT ('registered'),
	`priority` text NOT NULL DEFAULT ('routine'),
	`assigned_provider_id` varchar(36),
	`chief_complaint` text,
	`severity` text NOT NULL DEFAULT ('moderate'),
	`assigned_handler_id` text,
	`assigned_handler_name` text,
	`assigned_role` text,
	`personal` json DEFAULT ('{}'),
	`patient_info` json DEFAULT ('{}'),
	`complaint` json DEFAULT ('{}'),
	`complaint_details` json DEFAULT ('{}'),
	`history` json DEFAULT ('{}'),
	`medical_history` json DEFAULT ('{}'),
	`symptoms` json DEFAULT ('{}'),
	`files_attached` json DEFAULT ('[]'),
	`ai_summary` text,
	`ai_recommendations` json DEFAULT ('{}'),
	`ai_analysis` json DEFAULT ('{}'),
	`handler_notes` json DEFAULT ('[]'),
	`handler_note` text,
	`conference_notes` text,
	`timeline` json DEFAULT ('[]'),
	`submitted_at` datetime NOT NULL,
	`resolved_at` datetime,
	`completed_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `cases_case_id_unique` UNIQUE(`case_id`)
);
--> statement-breakpoint
CREATE TABLE `cash_drawers` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`cashier_id` varchar(36) NOT NULL,
	`shift_label` text NOT NULL,
	`opening_cash_etb` decimal(12,2) DEFAULT '0.00',
	`total_collected_cash_etb` decimal(12,2) DEFAULT '0.00',
	`total_collected_mobile_etb` decimal(12,2) DEFAULT '0.00',
	`total_collected_card_etb` decimal(12,2) DEFAULT '0.00',
	`total_collected_insurance_etb` decimal(12,2) DEFAULT '0.00',
	`closing_cash_expected_etb` decimal(12,2) DEFAULT '0.00',
	`closing_cash_actual_etb` decimal(12,2),
	`discrepancy_etb` decimal(10,2) DEFAULT '0.00',
	`denomination_breakdown` json DEFAULT ('{}'),
	`transaction_count` int DEFAULT 0,
	`status` text NOT NULL DEFAULT ('open'),
	`supervisor_approved_by` varchar(36),
	`supervisor_approved_at` datetime,
	`discrepancy_notes` text,
	`opened_at` datetime NOT NULL,
	`closed_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `cash_drawers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chart_of_accounts` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`account_code` varchar(100) NOT NULL,
	`account_name` text NOT NULL,
	`account_type` text NOT NULL,
	`parent_account_id` varchar(36),
	`is_header` boolean NOT NULL DEFAULT false,
	`is_system` boolean NOT NULL DEFAULT false,
	`current_balance` decimal(16,2) DEFAULT '0.00',
	`currency` varchar(10) DEFAULT 'ETB',
	`department` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`description` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `chart_of_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `chart_of_accounts_tenant_account_code_unique` UNIQUE(`tenant_id`,`account_code`)
);
--> statement-breakpoint
CREATE TABLE `clinic_locations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) DEFAULT '00000000-0000-0000-0000-000000000001',
	`name` text NOT NULL,
	`slug` varchar(255) NOT NULL,
	`branch_type` text NOT NULL DEFAULT ('branch'),
	`neighborhood` text NOT NULL,
	`city` text NOT NULL DEFAULT ('Debre Birhan'),
	`region` text NOT NULL DEFAULT ('Amhara, Ethiopia'),
	`address` text NOT NULL,
	`latitude` decimal(12,4) NOT NULL,
	`longitude` decimal(12,4) NOT NULL,
	`phone` text NOT NULL,
	`email` text DEFAULT ('info@ninimed.org'),
	`hours` text NOT NULL,
	`services` json NOT NULL DEFAULT ('[]'),
	`amenities` json NOT NULL DEFAULT ('[]'),
	`is_active` boolean NOT NULL DEFAULT true,
	`is_main` boolean NOT NULL DEFAULT false,
	`next_open_slot` text DEFAULT ('Open Today'),
	`google_maps_url` text,
	`osm_url` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `clinic_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `clinic_locations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `clinical_catalog_protocols` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`kind` text NOT NULL,
	`department_id` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`indication` text NOT NULL,
	`items` json NOT NULL DEFAULT ('[]'),
	`metadata` json NOT NULL DEFAULT ('{}'),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `clinical_catalog_protocols_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_clinical_catalog_protocols_tenant_name` UNIQUE(`tenant_id`,`department_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `clinical_files` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`uploaded_by_user_id` varchar(36),
	`encounter_id` varchar(36),
	`category` varchar(50) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_url` text NOT NULL,
	`file_size` int DEFAULT 102400,
	`mime_type` varchar(100) NOT NULL,
	`tags` json DEFAULT ('[]'),
	`verification_status` varchar(50) DEFAULT 'verified',
	`is_confidential` boolean DEFAULT false,
	`archived` boolean DEFAULT false,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `clinical_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clinical_orders` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36) NOT NULL,
	`ordering_doctor_id` varchar(36) NOT NULL,
	`order_type` text NOT NULL,
	`status` text NOT NULL DEFAULT ('ordered'),
	`clinical_indication` text NOT NULL,
	`priority` text NOT NULL DEFAULT ('routine'),
	`is_sensitive` boolean NOT NULL DEFAULT false,
	`release_at` datetime,
	`is_released_early` boolean NOT NULL DEFAULT false,
	`specimen_barcode` text,
	`collected_by` varchar(36),
	`collected_at` datetime,
	`cancellation_reason` text,
	`cancelled_by` varchar(36),
	`cancelled_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `clinical_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clinical_rounds` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`bed_number` text NOT NULL,
	`ward_department` text NOT NULL DEFAULT ('General Inpatient'),
	`rounding_clinician_id` varchar(36) NOT NULL,
	`acuity_score` text NOT NULL DEFAULT ('stable'),
	`vital_summary` json DEFAULT ('{}'),
	`clinical_notes` text NOT NULL,
	`active_concerns` text,
	`plan_of_care` text NOT NULL,
	`critical_alerts` json DEFAULT ('[]'),
	`acknowledged_by` varchar(36),
	`acknowledged_at` datetime,
	`is_escalated` boolean NOT NULL DEFAULT false,
	`next_round_scheduled_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `clinical_rounds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`tin_number` text,
	`industry` text,
	`contact_person` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`billing_address` text,
	`billing_email` text,
	`preferred_payment_method` text DEFAULT ('bank_transfer'),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_admins` (
	`id` varchar(36) NOT NULL,
	`company_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role` text NOT NULL DEFAULT ('hr_manager'),
	`created_at` datetime NOT NULL,
	CONSTRAINT `company_admins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_employee_invitations` (
	`id` varchar(36) NOT NULL,
	`company_id` varchar(36) NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`employee_id_number` text,
	`department` text,
	`status` text NOT NULL DEFAULT ('pending'),
	`token` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`claimed_patient_id` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `company_employee_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_employee_invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `config_audit_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`admin_id` varchar(36) NOT NULL,
	`admin_name` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`old_value` json,
	`new_value` json,
	`reason` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `config_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consents` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL DEFAULT ('active'),
	`scope` json DEFAULT ('{}'),
	`signed_at` datetime NOT NULL,
	`expires_at` datetime,
	CONSTRAINT `consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `critical_alerts` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`test_name` text NOT NULL,
	`critical_value` text NOT NULL,
	`tier` text NOT NULL DEFAULT ('tier_1_physician'),
	`acknowledged_by` varchar(36),
	`acknowledged_at` datetime,
	`escalated_at` datetime,
	`acknowledgment_note` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `critical_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_reports` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`data_source` text NOT NULL,
	`filters` json NOT NULL DEFAULT ('{}'),
	`groupings` json NOT NULL DEFAULT ('[]'),
	`selected_columns` json NOT NULL DEFAULT ('[]'),
	`schedule_cron` text,
	`last_run_at` datetime,
	`created_by` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `custom_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_roles` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL DEFAULT 'clinical',
	`permissions` json NOT NULL DEFAULT ('[]'),
	`is_system` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `custom_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `custom_roles_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `dashboard_layouts` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`role` text NOT NULL,
	`widget_id` text NOT NULL,
	`display_order` int NOT NULL,
	`col_span` int NOT NULL DEFAULT 1,
	`row_span` int NOT NULL DEFAULT 1,
	`is_enabled` boolean NOT NULL DEFAULT true,
	`refresh_interval_seconds` int DEFAULT 60,
	`custom_config` json DEFAULT ('{}'),
	`updated_by` varchar(36),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `dashboard_layouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dashboard_widgets` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`role` text NOT NULL,
	`widget_name` text NOT NULL,
	`widget_type` text NOT NULL DEFAULT ('stats'),
	`title` text,
	`description` text,
	`config` json NOT NULL DEFAULT ('{}'),
	`position` int NOT NULL DEFAULT 0,
	`grid_span` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `dashboard_widgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `device_readings` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`device_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`metric_type` text NOT NULL,
	`numeric_value` decimal(12,4) NOT NULL,
	`unit` text NOT NULL,
	`is_anomaly` boolean NOT NULL DEFAULT false,
	`anomaly_severity` text DEFAULT ('normal'),
	`recorded_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `device_readings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36),
	`device_type` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`serial_number` varchar(255) NOT NULL,
	`mac_address` text,
	`battery_level_percent` int DEFAULT 100,
	`status` text NOT NULL DEFAULT ('active'),
	`last_synced_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `devices_serial_number_unique` UNIQUE(`serial_number`)
);
--> statement-breakpoint
CREATE TABLE `display_announcements` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`display_id` varchar(36),
	`message` text NOT NULL,
	`type` text NOT NULL DEFAULT ('info'),
	`audience` text NOT NULL DEFAULT ('all'),
	`is_active` boolean NOT NULL DEFAULT true,
	`starts_at` datetime,
	`ends_at` datetime,
	`created_by` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `display_announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_access_logs` (
	`id` varchar(36) NOT NULL,
	`file_id` varchar(36) NOT NULL,
	`accessed_by_user_id` varchar(36) NOT NULL,
	`access_type` varchar(50) NOT NULL,
	`ip_address` varchar(50),
	`accessed_at` datetime NOT NULL,
	CONSTRAINT `document_access_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`type` text NOT NULL,
	`file_url` text NOT NULL,
	`mime_type` text,
	`uploaded_by` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drug_batches` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`drug_id` varchar(36) NOT NULL,
	`supplier_id` varchar(36),
	`batch_number` text NOT NULL,
	`expiry_date` date NOT NULL,
	`received_date` date NOT NULL,
	`quantity_received` int NOT NULL,
	`quantity_remaining` int NOT NULL,
	`cost_per_unit` decimal(12,4) NOT NULL,
	`selling_price` decimal(12,4) NOT NULL,
	`location_bin` text DEFAULT ('Shelf A-1'),
	`status` text NOT NULL DEFAULT ('active'),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `drug_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drug_catalog` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`generic_name` text NOT NULL,
	`brand_name` text,
	`strength` text NOT NULL,
	`dosage_form` text NOT NULL,
	`route` text NOT NULL DEFAULT ('oral'),
	`atc_code` text,
	`barcode` text,
	`package_size` text DEFAULT ('30 tablets'),
	`reorder_level` int NOT NULL DEFAULT 50,
	`max_stock` int NOT NULL DEFAULT 500,
	`default_unit_cost` decimal(12,4) NOT NULL DEFAULT '10.00',
	`default_selling_price` decimal(12,4) NOT NULL DEFAULT '15.00',
	`item_code` varchar(100),
	`category` text,
	`section_number` int,
	`section_name` text,
	`is_controlled` boolean NOT NULL DEFAULT false,
	`rx_otc` text NOT NULL DEFAULT ('Rx'),
	`storage_condition` text NOT NULL DEFAULT ('ambient'),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `drug_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_drug_catalog_tenant_item_code` UNIQUE(`tenant_id`,`item_code`)
);
--> statement-breakpoint
CREATE TABLE `duty_rosters` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`department` text NOT NULL,
	`shift_name` text NOT NULL,
	`shift_template` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`required_doctors` int NOT NULL DEFAULT 1,
	`required_nurses` int NOT NULL DEFAULT 2,
	`required_support_staff` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `duty_rosters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `encounter_events` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36) NOT NULL,
	`event_name` text NOT NULL,
	`payload` json NOT NULL DEFAULT ('{}'),
	`occurred_at` datetime NOT NULL,
	`actor_id` varchar(36),
	`actor_role` text,
	`correlation_id` text,
	CONSTRAINT `encounter_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `encounter_states` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36) NOT NULL,
	`workflow` text NOT NULL,
	`state` text NOT NULL,
	`entered_at` datetime NOT NULL,
	`exited_at` datetime,
	`is_active` boolean NOT NULL DEFAULT true,
	`metadata` json DEFAULT ('{}'),
	CONSTRAINT `encounter_states_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `encounter_tabs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
	`encounter_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`status` text NOT NULL DEFAULT ('active'),
	`deposit_amount_etb` decimal(12,2) NOT NULL DEFAULT '0.00',
	`deposit_method` text NOT NULL DEFAULT ('cash'),
	`deposit_tx_ref` text,
	`total_charges_etb` decimal(12,2) NOT NULL DEFAULT '0.00',
	`balance_due_etb` decimal(12,2) NOT NULL DEFAULT '0.00',
	`refund_due_etb` decimal(12,2) NOT NULL DEFAULT '0.00',
	`charges_list` json NOT NULL DEFAULT ('[]'),
	`settled_at` datetime,
	`settled_by` varchar(36),
	`settlement_notes` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `encounter_tabs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `encounters` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`clinician_id` varchar(36) NOT NULL,
	`encounter_type` text NOT NULL,
	`status` text NOT NULL DEFAULT ('planned'),
	`admission_status` text NOT NULL DEFAULT ('outpatient'),
	`current_step` text NOT NULL DEFAULT ('front_desk'),
	`assigned_nurse_id` varchar(36),
	`assigned_physician_id` varchar(36),
	`assigned_care_coordinator_id` varchar(36),
	`workflow_progress` json DEFAULT ('{"frontDesk":{"status":"pending"},"nurse":{"status":"pending"},"physician":{"status":"pending"},"pharmacist":{"status":"pending"},"dietitian":{"status":"pending"},"socialWork":{"status":"pending"},"therapy":{"status":"pending"},"careCoordinator":{"status":"pending"}}'),
	`chief_complaint` text,
	`clinical_notes` text,
	`start_time` datetime,
	`end_time` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `encounters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `encryption_key_registry` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`key_alias` varchar(255) NOT NULL,
	`key_version` int NOT NULL DEFAULT 1,
	`algorithm` text NOT NULL DEFAULT ('AES-256-GCM'),
	`status` text NOT NULL DEFAULT ('active'),
	`created_by` varchar(36) NOT NULL,
	`rotated_by` varchar(36),
	`rotated_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `encryption_key_registry_id` PRIMARY KEY(`id`),
	CONSTRAINT `encryption_key_registry_key_alias_unique` UNIQUE(`key_alias`)
);
--> statement-breakpoint
CREATE TABLE `external_providers` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`specialty` text NOT NULL,
	`facility_name` text,
	`address` text,
	`email` text,
	`phone` text,
	`fax` text,
	`npi` text,
	`fhir_endpoint` text,
	`preferred_transport` text NOT NULL DEFAULT ('email'),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	CONSTRAINT `external_providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `facilities` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`timezone` text DEFAULT ('UTC'),
	`created_at` datetime NOT NULL,
	CONSTRAINT `facilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `family_groups` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`primary_patient_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `family_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `family_members` (
	`id` varchar(36) NOT NULL,
	`family_group_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`relationship` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`can_view_shared_billing` boolean NOT NULL DEFAULT false,
	`added_at` datetime NOT NULL,
	CONSTRAINT `family_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback_records` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`submitter_type` text NOT NULL DEFAULT ('patient'),
	`submitter_user_id` varchar(36),
	`submitter_name` text,
	`submitter_contact` text,
	`encounter_id` varchar(36),
	`department` text,
	`rating` int,
	`feedback_text` text NOT NULL,
	`category` text NOT NULL DEFAULT ('general'),
	`sentiment` text NOT NULL DEFAULT ('neutral'),
	`sentiment_score` decimal(4,2) DEFAULT '0.00',
	`confidence_score` decimal(4,2) DEFAULT '0.85',
	`extracted_themes` json DEFAULT ('[]'),
	`action_recommendations` json DEFAULT ('[]'),
	`urgency_level` text NOT NULL DEFAULT ('normal'),
	`is_safety_hazard` boolean NOT NULL DEFAULT false,
	`resolution_status` text NOT NULL DEFAULT ('open'),
	`assigned_admin_id` varchar(36),
	`resolution_notes` text,
	`resolved_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `feedback_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `form_configurations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`form_key` varchar(255) NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`submit_label` text NOT NULL DEFAULT ('Submit'),
	`action_endpoint` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `form_configurations_id` PRIMARY KEY(`id`),
	CONSTRAINT `form_configurations_form_key_unique` UNIQUE(`form_key`)
);
--> statement-breakpoint
CREATE TABLE `form_fields` (
	`id` varchar(36) NOT NULL,
	`form_id` varchar(36) NOT NULL,
	`field_name` text NOT NULL,
	`label` text NOT NULL,
	`field_type` text NOT NULL DEFAULT ('text'),
	`placeholder` text,
	`required` boolean NOT NULL DEFAULT false,
	`options` json DEFAULT ('[]'),
	`validation` json DEFAULT ('{}'),
	`order` int NOT NULL DEFAULT 0,
	`default_value` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	CONSTRAINT `form_fields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `form_submissions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`form_key` text NOT NULL,
	`submitted_by_user_id` varchar(36),
	`data` json NOT NULL,
	`status` text NOT NULL DEFAULT ('submitted'),
	`created_at` datetime NOT NULL,
	CONSTRAINT `form_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `genetic_profiles` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`gene` text NOT NULL,
	`variant` text NOT NULL,
	`phenotype` text NOT NULL,
	`clinical_significance` text NOT NULL,
	`source_panel` text,
	`vcf_asset_id` varchar(36),
	`tested_at` datetime NOT NULL,
	CONSTRAINT `genetic_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `health_insights` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`type` text NOT NULL,
	`severity` text NOT NULL DEFAULT ('info'),
	`title` text NOT NULL,
	`message` text NOT NULL,
	`suggested_action` text,
	`action_type` text,
	`status` text NOT NULL DEFAULT ('new'),
	`metadata` json DEFAULT ('{}'),
	`created_at` datetime NOT NULL,
	`acted_at` datetime,
	CONSTRAINT `health_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `imaging_findings` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`media_asset_id` varchar(36),
	`modality` text NOT NULL,
	`body_site` text NOT NULL,
	`finding_summary` text NOT NULL,
	`impression` text NOT NULL,
	`image_url` text,
	`radiologist_name` text,
	`performed_at` datetime NOT NULL,
	CONSTRAINT `imaging_findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `imaging_reports` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`study_id` varchar(36) NOT NULL,
	`template_id` varchar(36),
	`technique` text NOT NULL,
	`findings` text NOT NULL,
	`impression` text NOT NULL,
	`recommendations` text,
	`dictation_raw` text,
	`signed_by` varchar(36),
	`signed_at` datetime,
	`peer_review_status` text NOT NULL DEFAULT ('none'),
	`peer_reviewed_by` varchar(36),
	`peer_reviewed_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `imaging_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `imaging_studies` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`accession_number` varchar(255) NOT NULL,
	`modality` text NOT NULL,
	`body_part` text NOT NULL,
	`study_uid` text NOT NULL,
	`priority` text NOT NULL DEFAULT ('routine'),
	`status` text NOT NULL DEFAULT ('ordered'),
	`is_critical_finding` boolean NOT NULL DEFAULT false,
	`scheduled_at` datetime,
	`performed_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `imaging_studies_id` PRIMARY KEY(`id`),
	CONSTRAINT `imaging_studies_accession_number_unique` UNIQUE(`accession_number`)
);
--> statement-breakpoint
CREATE TABLE `imaging_templates` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`modality` text NOT NULL,
	`body_part` text NOT NULL,
	`title` text NOT NULL,
	`default_technique` text,
	`default_findings` text,
	`default_impression` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `imaging_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `immunizations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`vaccine_name` varchar(255) NOT NULL,
	`date_given` datetime NOT NULL,
	`dose_number` varchar(50),
	`lot_number` varchar(100),
	`manufacturer` varchar(100),
	`administering_provider` varchar(150),
	`status` varchar(50) NOT NULL DEFAULT 'completed',
	`next_due_date` datetime,
	`notes` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `immunizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insurance_claims` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`claim_number` varchar(255) NOT NULL,
	`invoice_id` varchar(36),
	`patient_id` varchar(36) NOT NULL,
	`payer_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`pre_auth_code` text,
	`icd10_codes` json DEFAULT ('[]'),
	`cpt_codes` json DEFAULT ('[]'),
	`total_claim_amount_etb` decimal(14,2) DEFAULT '0.00',
	`approved_amount_etb` decimal(14,2) DEFAULT '0.00',
	`patient_copay_amount_etb` decimal(14,2) DEFAULT '0.00',
	`reimbursed_amount_etb` decimal(14,2) DEFAULT '0.00',
	`denial_code` text,
	`denial_reason` text,
	`appeal_notes` text,
	`appeal_document_url` text,
	`status` text NOT NULL DEFAULT ('draft'),
	`submitted_at` datetime,
	`adjudicated_at` datetime,
	`reimbursed_at` datetime,
	`processed_by` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `insurance_claims_id` PRIMARY KEY(`id`),
	CONSTRAINT `insurance_claims_claim_number_unique` UNIQUE(`claim_number`)
);
--> statement-breakpoint
CREATE TABLE `insurance_payers` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`payer_code` varchar(255) NOT NULL,
	`contact_email` text,
	`contact_phone` text,
	`claims_endpoint` text,
	`default_copay_percent` decimal(5,2) DEFAULT '20.00',
	`default_coverage_percent` decimal(5,2) DEFAULT '80.00',
	`currency` varchar(10) DEFAULT 'ETB',
	`requires_pre_auth` boolean DEFAULT false,
	`pre_auth_threshold_etb` decimal(12,2) DEFAULT '10000.00',
	`contract_details` json DEFAULT ('{}'),
	`status` text NOT NULL DEFAULT ('active'),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `insurance_payers_id` PRIMARY KEY(`id`),
	CONSTRAINT `insurance_payers_payer_code_unique` UNIQUE(`payer_code`)
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` varchar(36) NOT NULL,
	`invoice_id` varchar(36) NOT NULL,
	`service_code` varchar(64) NOT NULL,
	`description` text NOT NULL,
	`unit_price` decimal(10,2) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`total_price` decimal(10,2) NOT NULL,
	CONSTRAINT `invoice_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`invoice_number` varchar(255) NOT NULL,
	`line_items` json NOT NULL DEFAULT ('[]'),
	`subtotal` decimal(12,4) NOT NULL,
	`discount_amount` decimal(12,4) NOT NULL DEFAULT '0',
	`tax_amount` decimal(12,4) NOT NULL DEFAULT '0',
	`total_amount` decimal(12,4) NOT NULL,
	`paid_amount` decimal(12,4) NOT NULL DEFAULT '0',
	`currency` text NOT NULL DEFAULT ('ETB'),
	`status` text NOT NULL DEFAULT ('issued'),
	`payment_method` text,
	`transaction_ref` text,
	`due_date` date,
	`paid_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoice_number_unique` UNIQUE(`invoice_number`)
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`entry_number` varchar(255) NOT NULL,
	`entry_date` date NOT NULL,
	`description` text NOT NULL,
	`reference_type` text NOT NULL,
	`reference_id` varchar(36),
	`total_debit` decimal(16,2) DEFAULT '0.00',
	`total_credit` decimal(16,2) DEFAULT '0.00',
	`status` text NOT NULL DEFAULT ('draft'),
	`posted_by` varchar(36),
	`posted_at` datetime,
	`voided_by` varchar(36),
	`void_reason` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `journal_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `journal_entries_entry_number_unique` UNIQUE(`entry_number`)
);
--> statement-breakpoint
CREATE TABLE `journal_entry_lines` (
	`id` varchar(36) NOT NULL,
	`journal_entry_id` varchar(36) NOT NULL,
	`account_id` varchar(36) NOT NULL,
	`debit` decimal(16,2) DEFAULT '0.00',
	`credit` decimal(16,2) DEFAULT '0.00',
	`department` text,
	`memo` text,
	`line_order` int DEFAULT 0,
	`created_at` datetime NOT NULL,
	CONSTRAINT `journal_entry_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_documents` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`title` text NOT NULL,
	`content` text NOT NULL,
	`source` text NOT NULL,
	`category` text NOT NULL,
	`metadata` json DEFAULT ('{}'),
	`created_at` datetime NOT NULL,
	CONSTRAINT `knowledge_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lab_instruments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`model` text NOT NULL,
	`analyzer_type` text NOT NULL,
	`connection_type` text NOT NULL DEFAULT ('hl7_oru'),
	`status` text NOT NULL DEFAULT ('online'),
	`last_maintenance_at` datetime,
	`last_connected_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `lab_instruments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lab_orders` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`doctor_id` varchar(36) NOT NULL,
	`ai_suggestion_id` varchar(36),
	`test_name` text NOT NULL,
	`clinical_reason` text NOT NULL,
	`priority` text NOT NULL DEFAULT ('routine'),
	`status` text NOT NULL DEFAULT ('ordered'),
	`price` decimal(10,2) DEFAULT '0.00',
	`currency` varchar(10) NOT NULL DEFAULT 'ETB',
	`payment_status` text NOT NULL DEFAULT ('unpaid'),
	`invoice_id` varchar(36),
	`transaction_ref` text,
	`paid_at` datetime,
	`sample_collected_at` datetime,
	`sample_collected_by` varchar(36),
	`ordered_at` datetime NOT NULL,
	`completed_at` datetime,
	CONSTRAINT `lab_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lab_qc_runs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`instrument_id` varchar(36) NOT NULL,
	`analyte` text NOT NULL,
	`level` text NOT NULL DEFAULT ('level_2_normal'),
	`measured_value` decimal(12,4) NOT NULL,
	`expected_mean` decimal(12,4) NOT NULL,
	`standard_deviation` decimal(12,4) NOT NULL,
	`reference_range_low` decimal(12,4) NOT NULL,
	`reference_range_high` decimal(12,4) NOT NULL,
	`passed` boolean NOT NULL DEFAULT true,
	`z_score` decimal(12,4),
	`run_at` datetime NOT NULL,
	`performed_by` varchar(36),
	`notes` text,
	CONSTRAINT `lab_qc_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lab_results` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`test_name` text NOT NULL,
	`category` text NOT NULL,
	`value` text NOT NULL,
	`unit` text NOT NULL,
	`reference_range_low` decimal(12,4),
	`reference_range_high` decimal(12,4),
	`is_abnormal` boolean NOT NULL DEFAULT false,
	`interpretation` text,
	`performed_at` datetime NOT NULL,
	`source_lab` text,
	`report_url` text,
	CONSTRAINT `lab_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lab_turnaround` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`lab_order_id` varchar(36) NOT NULL,
	`step` text NOT NULL,
	`timestamp` datetime NOT NULL,
	`performed_by` varchar(36),
	CONSTRAINT `lab_turnaround_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `landing_sections` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`section_key` text NOT NULL,
	`title` text,
	`subtitle` text,
	`content` json NOT NULL DEFAULT ('{}'),
	`order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `landing_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` varchar(36) NOT NULL,
	`staff_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`leave_type` text NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`total_days` int NOT NULL,
	`reason` text NOT NULL,
	`supporting_document_url` text,
	`status` text NOT NULL DEFAULT ('pending'),
	`hod_approved_by` varchar(36),
	`hod_approved_at` datetime,
	`hr_approved_by` varchar(36),
	`hr_approved_at` datetime,
	`rejection_reason` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `leave_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legacy_dashboard_widgets` (
	`id` varchar(36) NOT NULL,
	`widget_id` varchar(255) NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`default_col_span` int NOT NULL DEFAULT 1,
	`default_row_span` int NOT NULL DEFAULT 1,
	`allowed_roles` json NOT NULL DEFAULT ('[]'),
	`refresh_interval_seconds` int DEFAULT 60,
	`is_system_widget` boolean NOT NULL DEFAULT false,
	`metadata` json DEFAULT ('{}'),
	`created_at` datetime NOT NULL,
	CONSTRAINT `legacy_dashboard_widgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `legacy_dashboard_widgets_widget_id_unique` UNIQUE(`widget_id`)
);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`type` text NOT NULL,
	`modality` text NOT NULL,
	`title` text NOT NULL,
	`file_url` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size_kb` int,
	`metadata` json DEFAULT ('{}'),
	`preprocessed_summary` text,
	`confidence_score` decimal(12,4),
	`uploaded_by` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medication_education` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`medication_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`plain_language_summary` text NOT NULL,
	`dosage_instructions` text NOT NULL,
	`side_effects` json NOT NULL DEFAULT ('{"common":[],"serious":[],"rare":[]}'),
	`interactions` json NOT NULL DEFAULT ('{"drugs":[],"foods":[],"conditions":[],"pharmacogenomics":[]}'),
	`lifestyle_advice` json DEFAULT ('[]'),
	`video_id` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `medication_education_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medications` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`dosage` text NOT NULL,
	`frequency` text NOT NULL,
	`route` text DEFAULT ('Oral'),
	`indication` text,
	`start_date` date,
	`end_date` date,
	`is_active` boolean NOT NULL DEFAULT true,
	`prescribed_by` varchar(36),
	`pharmacist_verified` boolean DEFAULT false,
	`notes` text,
	CONSTRAINT `medications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mobile_clinic_encounters` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`session_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`patient_id` varchar(36),
	`is_offline_created` boolean NOT NULL DEFAULT true,
	`offline_sync_id` varchar(255),
	`chief_complaint` text,
	`clinical_notes` text,
	`vitals` json DEFAULT ('{}'),
	`poc_lab_results` json DEFAULT ('[]'),
	`dispensed_medications` json DEFAULT ('[]'),
	`client_timestamp` datetime,
	`synced_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `mobile_clinic_encounters_id` PRIMARY KEY(`id`),
	CONSTRAINT `mobile_clinic_encounters_offline_sync_id_unique` UNIQUE(`offline_sync_id`)
);
--> statement-breakpoint
CREATE TABLE `mobile_clinic_sessions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`location_name` text NOT NULL,
	`gps_latitude` decimal(12,4),
	`gps_longitude` decimal(12,4),
	`scheduled_date` date NOT NULL,
	`start_time` datetime,
	`end_time` datetime,
	`services` json NOT NULL DEFAULT ('["consultation","point_of_care_lab","pharmacy_dispensation"]'),
	`assigned_staff` json DEFAULT ('[]'),
	`inventory_kit` json DEFAULT ('{}'),
	`status` text NOT NULL DEFAULT ('planned'),
	`patients_registered_count` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `mobile_clinic_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `model_feedback` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`model_id` varchar(36),
	`suggestion_id` varchar(36),
	`clinician_id` varchar(36) NOT NULL,
	`action` text NOT NULL,
	`agent_name` text,
	`original_output` json,
	`clinician_modification` json,
	`notes` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `model_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `navigation_items` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`role` text,
	`label` text NOT NULL,
	`href` text NOT NULL,
	`icon` text,
	`parent_id` varchar(36),
	`order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`requires_auth` boolean NOT NULL DEFAULT true,
	`badge_key` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `navigation_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_privileges` (
	`id` varchar(36) NOT NULL,
	`role` varchar(64) NOT NULL,
	`category` varchar(64) NOT NULL,
	`is_enabled` boolean NOT NULL DEFAULT true,
	`channels` json NOT NULL DEFAULT ('{"inApp":true,"telegram":true}'),
	`updated_by` varchar(36),
	`updated_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `notification_privileges_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_privileges_role_category_unique` UNIQUE(`role`,`category`)
);
--> statement-breakpoint
CREATE TABLE `notification_templates` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`template_key` varchar(255) NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`type` text NOT NULL DEFAULT ('info'),
	`channels` json NOT NULL DEFAULT ('["in_app"]'),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `notification_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_templates_template_key_unique` UNIQUE(`template_key`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`recipient_user_id` varchar(36),
	`sender_user_id` varchar(36),
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text,
	`body` text NOT NULL,
	`priority` text NOT NULL DEFAULT ('normal'),
	`is_read` boolean NOT NULL DEFAULT false,
	`action_url` text,
	`action_text` text,
	`target_role` text,
	`target_department` text,
	`related_entity_type` text,
	`related_entity_id` text,
	`metadata` json DEFAULT ('{}'),
	`read_at` datetime,
	`expires_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nursing_assessments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`morse_fall_score` int,
	`fall_risk_category` text,
	`braden_pressure_score` int,
	`pain_score` int,
	`intake_output_ml` json DEFAULT ('{"intake":0,"output":0}'),
	`nursing_care_notes` text,
	`assessed_by` varchar(36) NOT NULL,
	`assessed_at` datetime NOT NULL,
	CONSTRAINT `nursing_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nutrition_assessments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`nutritional_risk_score` text,
	`daily_calorie_target` int,
	`protein_target_grams` int,
	`sodium_limit_mg` int,
	`diet_type` text,
	`food_insecurity_accommodation` text,
	`meal_plan_details` json DEFAULT ('{}'),
	`assessed_by` varchar(36) NOT NULL,
	`assessed_at` datetime NOT NULL,
	CONSTRAINT `nutrition_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `occupational_therapy_assessments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`barthel_index_score` int,
	`home_safety_risk` text,
	`adaptive_equipment_needs` json DEFAULT ('[]'),
	`cognitive_support_notes` text,
	`assessed_by` varchar(36) NOT NULL,
	`assessed_at` datetime NOT NULL,
	CONSTRAINT `occupational_therapy_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_outbox_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL DEFAULT ('pending'),
	`retry_count` int NOT NULL DEFAULT 0,
	`error_message` text,
	`idempotency_key` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	`processed_at` datetime,
	CONSTRAINT `order_outbox_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_outbox_events_idempotency_key_unique` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`slug` varchar(255) NOT NULL,
	`status` text DEFAULT ('active'),
	`settings` json DEFAULT ('{}'),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `page_contents` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`page_key` text NOT NULL,
	`section_key` text NOT NULL,
	`content_type` text NOT NULL DEFAULT ('json'),
	`content` json NOT NULL,
	`language` text NOT NULL DEFAULT ('en'),
	`version` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `page_contents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_activities` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`actor_user_id` varchar(36),
	`actor_name` varchar(255) NOT NULL,
	`actor_role` varchar(50) NOT NULL,
	`activity_type` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`severity` varchar(20) DEFAULT 'info',
	`metadata` json DEFAULT ('{}'),
	`created_at` datetime NOT NULL,
	CONSTRAINT `patient_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_assignments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`case_id` varchar(36),
	`provider_id` varchar(36) NOT NULL,
	`provider_type` text,
	`specialty` text,
	`assignment_type` text NOT NULL DEFAULT ('automatic'),
	`status` text NOT NULL DEFAULT ('assigned'),
	`assigned_at` datetime NOT NULL,
	`accepted_at` datetime,
	`completed_at` datetime,
	`notes` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `patient_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_consents` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`consent_type` text NOT NULL,
	`is_granted` boolean NOT NULL DEFAULT true,
	`version` text NOT NULL DEFAULT ('1.0'),
	`ip_address` text,
	`user_agent` text,
	`signature_url` text,
	`granted_at` datetime NOT NULL,
	`revoked_at` datetime,
	CONSTRAINT `patient_consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_education_videos` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`title` text NOT NULL,
	`condition_name` text NOT NULL,
	`script` text NOT NULL,
	`language` text NOT NULL DEFAULT ('en'),
	`video_type` text NOT NULL DEFAULT ('condition_explainer'),
	`video_url` text,
	`thumbnail_url` text,
	`duration_seconds` int DEFAULT 60,
	`animation_config` json DEFAULT ('{}'),
	`status` text NOT NULL DEFAULT ('draft'),
	`generated_by` varchar(36),
	`reviewed_by` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `patient_education_videos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_journey_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`current_stage` text NOT NULL,
	`previous_stage` text,
	`location_room` text,
	`attending_staff_id` varchar(36),
	`transit_duration_seconds` int DEFAULT 0,
	`stage_status` text NOT NULL DEFAULT ('in_progress'),
	`notes` text,
	`entered_at` datetime NOT NULL,
	`exited_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `patient_journey_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_messages` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`sender_id` varchar(36) NOT NULL,
	`sender_type` text NOT NULL,
	`recipient_id` varchar(36) NOT NULL,
	`recipient_type` text NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`attachments` json DEFAULT ('[]'),
	`is_read` boolean NOT NULL DEFAULT false,
	`read_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `patient_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_questionnaires` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`questionnaire_type` text NOT NULL,
	`title` text NOT NULL,
	`responses` json NOT NULL DEFAULT ('{}'),
	`total_score` int,
	`risk_category` text,
	`completed_at` datetime NOT NULL,
	CONSTRAINT `patient_questionnaires_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_registration_passes` (
	`id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`invoice_id` varchar(36),
	`starts_at` datetime NOT NULL,
	`expires_at` datetime NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`created_at` datetime NOT NULL,
	CONSTRAINT `patient_registration_passes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_registrations` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`status` text NOT NULL DEFAULT ('started'),
	`verification_token` text,
	`verification_expires_at` datetime,
	`submitted_data` json NOT NULL DEFAULT ('{}'),
	`duplicate_patient_id` varchar(36),
	`invited_by_user_id` varchar(36),
	`activated_patient_id` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `patient_registrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_video_recommendations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`video_recommendation_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`recommended_by` varchar(36),
	`relevance_score` decimal(12,4) DEFAULT '1.0',
	`status` text NOT NULL DEFAULT ('recommended'),
	`patient_rating` int,
	`feedback_notes` text,
	`recommended_at` datetime NOT NULL,
	`viewed_at` datetime,
	CONSTRAINT `patient_video_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_wayfinding_notifications` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`ticket_number` text NOT NULL,
	`target_location` text NOT NULL,
	`floor_level` text DEFAULT ('Ground Floor'),
	`direction_guidance` text,
	`estimated_wait_minutes` int DEFAULT 5,
	`channel` text NOT NULL DEFAULT ('in_app'),
	`recipient_phone` text,
	`message_content` text NOT NULL,
	`delivery_status` text NOT NULL DEFAULT ('sent'),
	`dispatched_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `patient_wayfinding_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`mrn` varchar(255) NOT NULL,
	`national_id` text,
	`national_id_verified` boolean DEFAULT false,
	`digital_card_number` text,
	`preferred_clinic_branch` text DEFAULT ('habitat-main'),
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`date_of_birth` date NOT NULL,
	`gender` text NOT NULL,
	`blood_type` text,
	`phone` text,
	`email` text,
	`allergies` json DEFAULT ('[]'),
	`emergency_contact` text,
	`primary_doctor_id` varchar(36),
	`triage_priority` text DEFAULT ('routine'),
	`avatar` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_mrn_unique` UNIQUE(`mrn`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`invoice_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`payment_number` varchar(255) NOT NULL,
	`amount` decimal(12,4) NOT NULL,
	`currency` text NOT NULL DEFAULT ('ETB'),
	`payment_method` text NOT NULL,
	`transaction_reference` text,
	`receipt_number` text,
	`status` text NOT NULL DEFAULT ('completed'),
	`collected_by` varchar(36),
	`paid_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_payment_number_unique` UNIQUE(`payment_number`)
);
--> statement-breakpoint
CREATE TABLE `payroll_items` (
	`id` varchar(36) NOT NULL,
	`payroll_run_id` varchar(36) NOT NULL,
	`staff_id` varchar(36) NOT NULL,
	`base_salary_etb` decimal(12,2) DEFAULT '0.00',
	`on_call_allowance_etb` decimal(10,2) DEFAULT '0.00',
	`overtime_pay_etb` decimal(10,2) DEFAULT '0.00',
	`revenue_share_etb` decimal(10,2) DEFAULT '0.00',
	`bonus_etb` decimal(10,2) DEFAULT '0.00',
	`other_allowances_etb` decimal(10,2) DEFAULT '0.00',
	`gross_pay_etb` decimal(12,2) DEFAULT '0.00',
	`paye_tax_etb` decimal(10,2) DEFAULT '0.00',
	`pension_employee_etb` decimal(10,2) DEFAULT '0.00',
	`pension_employer_etb` decimal(10,2) DEFAULT '0.00',
	`voluntary_deductions_etb` decimal(10,2) DEFAULT '0.00',
	`total_deductions_etb` decimal(10,2) DEFAULT '0.00',
	`net_pay_etb` decimal(12,2) DEFAULT '0.00',
	`payslip_pdf_url` text,
	`disbursement_method` text DEFAULT ('bank_transfer'),
	`disbursement_ref` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `payroll_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payroll_runs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`period_month` int NOT NULL,
	`period_year` int NOT NULL,
	`total_gross_etb` decimal(14,2) DEFAULT '0.00',
	`total_net_etb` decimal(14,2) DEFAULT '0.00',
	`total_paye_tax_etb` decimal(14,2) DEFAULT '0.00',
	`total_pension_employee_etb` decimal(14,2) DEFAULT '0.00',
	`total_pension_employer_etb` decimal(14,2) DEFAULT '0.00',
	`total_on_call_allowance_etb` decimal(14,2) DEFAULT '0.00',
	`total_overtime_paid_etb` decimal(14,2) DEFAULT '0.00',
	`staff_count` int DEFAULT 0,
	`status` text NOT NULL DEFAULT ('draft'),
	`processed_by` varchar(36),
	`approved_by` varchar(36),
	`processed_at` datetime,
	`approved_at` datetime,
	`disbursed_at` datetime,
	`notes` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `payroll_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pharmacy_dispensing_queue` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`prescription_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`doctor_id` varchar(36) NOT NULL,
	`pharmacist_id` varchar(36),
	`nurse_id` varchar(36),
	`status` text NOT NULL DEFAULT ('awaiting_payment'),
	`delivery_method` text NOT NULL DEFAULT ('pickup'),
	`ward_id` text,
	`bed_number` text,
	`priority` text NOT NULL DEFAULT ('routine'),
	`medication_name` text NOT NULL,
	`dosage` text NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`total_price` decimal(10,2) NOT NULL DEFAULT '0.00',
	`currency` varchar(10) NOT NULL DEFAULT 'ETB',
	`payment_verified_at` datetime,
	`dispensed_at` datetime,
	`dispatched_at` datetime,
	`nurse_received_at` datetime,
	`completed_at` datetime,
	`pharmacist_notes` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `pharmacy_dispensing_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pharmacy_inventory_alerts` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`drug_id` varchar(36),
	`batch_id` varchar(36),
	`alert_type` text NOT NULL,
	`threshold` int,
	`current_value` int,
	`acknowledged` boolean NOT NULL DEFAULT false,
	`acknowledged_by` varchar(36),
	`acknowledged_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `pharmacy_inventory_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pharmacy_notifications` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`queue_item_id` varchar(36),
	`prescription_id` varchar(36),
	`recipient_id` varchar(36) NOT NULL,
	`recipient_role` text NOT NULL,
	`channel` text NOT NULL DEFAULT ('in_app'),
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`metadata` json DEFAULT ('{}'),
	`read_at` datetime,
	`sent_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `pharmacy_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `physiotherapy_assessments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`berg_balance_score` int,
	`gait_speed_meters_per_sec` decimal(12,4),
	`mobility_status` text,
	`strength_grading` json DEFAULT ('{}'),
	`rehab_goals` text,
	`exercise_plan` json DEFAULT ('{}'),
	`assessed_by` varchar(36) NOT NULL,
	`assessed_at` datetime NOT NULL,
	CONSTRAINT `physiotherapy_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_cashier_shifts` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`cashier_id` varchar(36) NOT NULL,
	`terminal_id` varchar(64) DEFAULT 'POS-TERM-01',
	`opened_at` datetime NOT NULL,
	`closed_at` datetime,
	`opening_float` decimal(10,2) NOT NULL DEFAULT '1000.00',
	`expected_cash` decimal(10,2) NOT NULL DEFAULT '1000.00',
	`actual_cash` decimal(10,2),
	`cash_variance` decimal(10,2) DEFAULT '0.00',
	`total_cash_sales` decimal(10,2) DEFAULT '0.00',
	`total_telebirr_sales` decimal(10,2) DEFAULT '0.00',
	`total_card_sales` decimal(10,2) DEFAULT '0.00',
	`total_insurance_sales` decimal(10,2) DEFAULT '0.00',
	`total_transactions` int DEFAULT 0,
	`status` text NOT NULL DEFAULT ('open'),
	`notes` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `pos_cashier_shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_transactions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`shift_id` varchar(36),
	`invoice_id` varchar(36),
	`patient_id` varchar(36) NOT NULL,
	`cashier_id` varchar(36) NOT NULL,
	`receipt_number` varchar(64) NOT NULL,
	`subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
	`discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`tax_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`payment_method` varchar(64) NOT NULL,
	`payment_breakdown` json DEFAULT ('{}'),
	`items_snapshot` json NOT NULL DEFAULT ('[]'),
	`cash_tendered` decimal(10,2),
	`change_returned` decimal(10,2),
	`transaction_ref` varchar(128),
	`qr_code_payload` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `pos_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_transactions_receipt_number_unique` UNIQUE(`receipt_number`)
);
--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`doctor_id` varchar(36) NOT NULL,
	`ai_suggestion_id` varchar(36),
	`status` text NOT NULL DEFAULT ('draft'),
	`medication_name` text NOT NULL,
	`dosage` text NOT NULL,
	`frequency` text NOT NULL,
	`route` text DEFAULT ('Oral'),
	`indication` text,
	`duration_days` int NOT NULL,
	`quantity` int NOT NULL,
	`dispense_quantity` int,
	`refills_allowed` int NOT NULL DEFAULT 0,
	`instructions` text NOT NULL,
	`unit_price` decimal(10,2) DEFAULT '0.00',
	`total_price` decimal(10,2) DEFAULT '0.00',
	`currency` varchar(10) NOT NULL DEFAULT 'ETB',
	`payment_status` text NOT NULL DEFAULT ('unpaid'),
	`invoice_id` varchar(36),
	`transaction_ref` text,
	`paid_at` datetime,
	`prescriber_signature` text,
	`signed_at` datetime,
	`pharmacist_id` varchar(36),
	`dispensed_at` datetime,
	`nurse_id` varchar(36),
	`ward_id` text,
	`bed_number` text,
	`delivery_method` text DEFAULT ('pickup'),
	`patient_notified_at` datetime,
	`doctor_notified_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `prescriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `professional_profiles` (
	`user_id` varchar(36) NOT NULL,
	`professional_type` text NOT NULL,
	`license_number` text,
	`specialty` text,
	`certifications` json DEFAULT ('[]'),
	`hospital_affiliation` text,
	`dea_number` text,
	`digital_signature_ref` text,
	`scope_of_practice` json DEFAULT ('{}'),
	`created_at` datetime NOT NULL,
	CONSTRAINT `professional_profiles_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `provider_profiles` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`bio` text,
	`specialties` json DEFAULT ('[]'),
	`languages` json DEFAULT ('["English","Amharic"]'),
	`license_number` varchar(100),
	`license_issuing_body` varchar(255),
	`license_verified` boolean DEFAULT false,
	`consultation_fee_etb` decimal(10,2) DEFAULT '500.00',
	`approval_status` varchar(50) DEFAULT 'draft',
	`hr_reviewer_id` varchar(36),
	`hr_feedback` text,
	`metadata` json DEFAULT ('{}'),
	`submitted_at` datetime,
	`approved_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `provider_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `provider_schedules` (
	`id` varchar(36) NOT NULL,
	`provider_id` varchar(36) NOT NULL,
	`day_of_week` int NOT NULL,
	`start_time` varchar(10) NOT NULL,
	`end_time` varchar(10) NOT NULL,
	`slot_duration_minutes` int DEFAULT 30,
	`is_telehealth_available` boolean DEFAULT true,
	`is_in_person_available` boolean DEFAULT true,
	`is_approved_by_hr` boolean DEFAULT false,
	`is_active` boolean DEFAULT true,
	`created_at` datetime NOT NULL,
	CONSTRAINT `provider_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `psychological_assessments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`test_name` text NOT NULL,
	`score` int NOT NULL,
	`severity` text NOT NULL,
	`breakdown` json,
	`clinical_notes` text,
	`adherence_risk` text DEFAULT ('low'),
	`assessed_by` varchar(36),
	`assessed_at` datetime NOT NULL,
	CONSTRAINT `psychological_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`supplier_id` varchar(36) NOT NULL,
	`po_number` varchar(255) NOT NULL,
	`status` text NOT NULL DEFAULT ('draft'),
	`items` json NOT NULL DEFAULT ('[]'),
	`total_amount` decimal(12,4) NOT NULL,
	`ordered_by` varchar(36),
	`ordered_at` datetime NOT NULL,
	`received_at` datetime,
	`notes` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_po_number_unique` UNIQUE(`po_number`)
);
--> statement-breakpoint
CREATE TABLE `qr_login_sessions` (
	`id` varchar(36) NOT NULL,
	`session_challenge` varchar(255) NOT NULL,
	`status` text NOT NULL DEFAULT ('pending'),
	`authenticated_user_id` varchar(36),
	`device_info` text,
	`ip_address` text,
	`expires_at` datetime NOT NULL,
	`authorized_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `qr_login_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `qr_login_sessions_session_challenge_unique` UNIQUE(`session_challenge`)
);
--> statement-breakpoint
CREATE TABLE `queue_entries` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`case_id` varchar(36),
	`patient_id` varchar(36) NOT NULL,
	`provider_id` varchar(36),
	`queue_type` text NOT NULL DEFAULT ('treat_me_now'),
	`position` int NOT NULL DEFAULT 1,
	`priority` text NOT NULL DEFAULT ('routine'),
	`status` text NOT NULL DEFAULT ('waiting'),
	`queue_number` text,
	`service_point` text,
	`department` text,
	`called_by_user_id` varchar(36),
	`called_at` datetime,
	`started_at` datetime,
	`completed_at` datetime,
	`estimated_wait_minutes` int DEFAULT 5,
	`metadata` json DEFAULT ('{}'),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `queue_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_logs` (
	`id` varchar(36) NOT NULL,
	`referral_id` varchar(36) NOT NULL,
	`action` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`performed_by` varchar(36) NOT NULL,
	`performer_role` text NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `referral_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`care_plan_id` varchar(36),
	`type` text NOT NULL DEFAULT ('internal'),
	`source` text NOT NULL DEFAULT ('manual'),
	`referring_user_id` varchar(36) NOT NULL,
	`referring_role` text NOT NULL,
	`receiving_role` text NOT NULL,
	`receiving_user_id` varchar(36),
	`target_type` text NOT NULL DEFAULT ('professional'),
	`target_id` text,
	`external_provider_id` varchar(36),
	`priority` text NOT NULL DEFAULT ('routine'),
	`status` text NOT NULL DEFAULT ('pending_review'),
	`clinical_reason` text NOT NULL,
	`clinical_summary` text,
	`notes` text,
	`insurance_auth_number` text,
	`scheduled_appointment_id` text,
	`attached_data_refs` json DEFAULT ('[]'),
	`due_by` datetime,
	`accepted_at` datetime,
	`completed_at` datetime,
	`response_notes` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `respiratory_assessments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`abg_ph` decimal(12,4),
	`abg_paco2` decimal,
	`abg_pao2` decimal,
	`abg_hco3` decimal,
	`abg_sao2` decimal,
	`ventilator_settings` json DEFAULT ('{}'),
	`airway_clearance_regimen` text,
	`assessed_by` varchar(36) NOT NULL,
	`assessed_at` datetime NOT NULL,
	CONSTRAINT `respiratory_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_scores` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`risk_type` text NOT NULL,
	`score` decimal(12,4) NOT NULL,
	`category` text NOT NULL,
	`factors` json NOT NULL DEFAULT ('{}'),
	`calculated_at` datetime NOT NULL,
	CONSTRAINT `risk_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rpm_programs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`condition` text NOT NULL,
	`target_metrics` json NOT NULL DEFAULT ('[]'),
	`frequency_required_days` int DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	CONSTRAINT `rpm_programs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saga_transactions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36) NOT NULL,
	`saga_type` text NOT NULL,
	`status` text NOT NULL DEFAULT ('in_progress'),
	`steps` json NOT NULL DEFAULT ('[]'),
	`error_details` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `saga_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_threat_logs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`threat_type` text NOT NULL,
	`severity` text NOT NULL,
	`description` text NOT NULL,
	`metadata` json DEFAULT ('{}'),
	`ip_address` text,
	`user_agent` text,
	`is_mitigated` boolean NOT NULL DEFAULT false,
	`detected_at` datetime NOT NULL,
	CONSTRAINT `security_threat_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_pricing` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`service_name` text NOT NULL,
	`service_type` text NOT NULL DEFAULT ('subscription'),
	`plan_code` text,
	`base_price` decimal(12,4) NOT NULL,
	`yearly_price` decimal(12,4),
	`currency` text NOT NULL DEFAULT ('ETB'),
	`discount_percent` decimal(12,4) NOT NULL DEFAULT '0',
	`badge` text,
	`description` text,
	`features` json NOT NULL DEFAULT ('[]'),
	`popular` boolean NOT NULL DEFAULT false,
	`cta_text` text NOT NULL DEFAULT ('Get Started'),
	`is_active` boolean NOT NULL DEFAULT true,
	`metadata` json DEFAULT ('{}'),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `service_pricing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_pricing_catalog` (
	`id` varchar(36) NOT NULL,
	`service_code` varchar(64) NOT NULL,
	`category` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`base_price` decimal(10,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'ETB',
	`is_free` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`validity_days` int,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `service_pricing_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_pricing_catalog_service_code_unique` UNIQUE(`service_code`)
);
--> statement-breakpoint
CREATE TABLE `shared_medical_records` (
	`id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`share_token` varchar(255) NOT NULL,
	`access_scope` json NOT NULL DEFAULT ('["allergies","medications","lab_results","conditions","emergency_contacts"]'),
	`passcode` text,
	`doctor_name` text,
	`status` text NOT NULL DEFAULT ('active'),
	`expires_at` datetime NOT NULL,
	`view_count` int NOT NULL DEFAULT 0,
	`last_viewed_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `shared_medical_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `shared_medical_records_share_token_unique` UNIQUE(`share_token`)
);
--> statement-breakpoint
CREATE TABLE `smart_consents` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`consent_type` text NOT NULL,
	`status` text NOT NULL DEFAULT ('granted'),
	`allowed_departments` json DEFAULT ('[]'),
	`permitted_data_types` json NOT NULL DEFAULT ('["vitals","labs","medications","imaging","notes"]'),
	`valid_until` datetime,
	`digital_signature` text NOT NULL,
	`revoked_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `smart_consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_history` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`category` text NOT NULL,
	`indicator` text NOT NULL,
	`severity_level` text NOT NULL,
	`description` text NOT NULL,
	`recommended_action` text,
	`community_resources_connected` json DEFAULT ('[]'),
	`recorded_at` datetime NOT NULL,
	CONSTRAINT `social_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_attendance` (
	`id` varchar(36) NOT NULL,
	`staff_id` varchar(36) NOT NULL,
	`shift_id` varchar(36),
	`attendance_date` date NOT NULL,
	`clock_in` datetime,
	`clock_out` datetime,
	`regular_hours` decimal(5,2) DEFAULT '0.00',
	`overtime_hours` decimal(5,2) DEFAULT '0.00',
	`overtime_multiplier` decimal(4,2) DEFAULT '1.00',
	`verification_method` text NOT NULL DEFAULT ('pin'),
	`status` text NOT NULL DEFAULT ('present'),
	`deviation_notes` text,
	`recorded_by` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `staff_attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_certifications` (
	`id` varchar(36) NOT NULL,
	`staff_id` varchar(36) NOT NULL,
	`title` text NOT NULL,
	`cert_type` text NOT NULL,
	`issuing_body` text NOT NULL,
	`issue_date` date NOT NULL,
	`expiry_date` date,
	`document_url` text,
	`verification_status` text NOT NULL DEFAULT ('pending'),
	`verified_by` varchar(36),
	`verified_at` datetime,
	`notes` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `staff_certifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_performance_reviews` (
	`id` varchar(36) NOT NULL,
	`staff_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`review_period_start` date NOT NULL,
	`review_period_end` date NOT NULL,
	`review_type` text DEFAULT ('quarterly'),
	`csat_score` decimal(4,2),
	`avg_consultation_mins` decimal(6,2),
	`diagnostic_turnaround_adherence_pct` decimal(5,2),
	`protocol_compliance_pct` decimal(5,2),
	`prescription_audit_score` decimal(4,2),
	`self_review_score` decimal(4,2),
	`peer_review_score` decimal(4,2),
	`hod_review_score` decimal(4,2),
	`overall_score` decimal(4,2),
	`bonus_recommendation_etb` decimal(10,2) DEFAULT '0.00',
	`goals` json DEFAULT ('[]'),
	`reviewed_by` varchar(36) NOT NULL,
	`status` text DEFAULT ('draft'),
	`comments` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `staff_performance_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_profiles` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`employee_code` varchar(255) NOT NULL,
	`department` text NOT NULL,
	`designation` text NOT NULL,
	`specialization` text,
	`license_number` text,
	`license_issuing_body` text,
	`license_expiry_date` date,
	`cme_points` int NOT NULL DEFAULT 0,
	`employment_type` text NOT NULL DEFAULT ('full_time'),
	`base_salary_etb` decimal(12,2) DEFAULT '0.00',
	`on_call_allowance_rate` decimal(10,2) DEFAULT '0.00',
	`consultation_revenue_share_pct` decimal(5,2) DEFAULT '0.00',
	`bank_account_number` text,
	`bank_name` text,
	`mobile_wallet_number` text,
	`mobile_wallet_provider` text DEFAULT ('none'),
	`status` text NOT NULL DEFAULT ('active'),
	`onboarding_completed_at` datetime,
	`hired_at` date NOT NULL,
	`terminated_at` date,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `staff_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_profiles_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `staff_profiles_employee_code_unique` UNIQUE(`employee_code`)
);
--> statement-breakpoint
CREATE TABLE `staff_shifts` (
	`id` varchar(36) NOT NULL,
	`roster_id` varchar(36) NOT NULL,
	`staff_id` varchar(36) NOT NULL,
	`shift_date` date NOT NULL,
	`status` text NOT NULL DEFAULT ('scheduled'),
	`swap_status` text NOT NULL DEFAULT ('none'),
	`swap_requested_with_staff_id` varchar(36),
	`swap_approved_by` varchar(36),
	`swap_approved_at` datetime,
	`notes` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `staff_shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `state_sla_violations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36) NOT NULL,
	`workflow` text NOT NULL,
	`state` text NOT NULL,
	`max_duration_seconds` int NOT NULL,
	`actual_duration_seconds` int NOT NULL,
	`escalated_to` varchar(36),
	`resolved_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `state_sla_violations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `state_slas` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`workflow` text NOT NULL,
	`state` text NOT NULL,
	`max_duration_seconds` int NOT NULL,
	`escalation_action` text NOT NULL DEFAULT ('notify_supervisor'),
	`escalation_target_role` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `state_slas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`batch_id` varchar(36) NOT NULL,
	`movement_type` text NOT NULL,
	`quantity` int NOT NULL,
	`previous_quantity` int NOT NULL,
	`new_quantity` int NOT NULL,
	`reference_type` text,
	`reference_id` text,
	`performed_by` varchar(36),
	`notes` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_invoices` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`subscription_id` varchar(36) NOT NULL,
	`invoice_number` varchar(255) NOT NULL,
	`period_start` datetime NOT NULL,
	`period_end` datetime NOT NULL,
	`base_amount` decimal(12,4) NOT NULL,
	`additional_seats_amount` decimal(12,4) NOT NULL DEFAULT '0',
	`discount_amount` decimal(12,4) NOT NULL DEFAULT '0',
	`tax_amount` decimal(12,4) NOT NULL DEFAULT '0',
	`total_amount` decimal(12,4) NOT NULL,
	`currency` text NOT NULL DEFAULT ('ETB'),
	`status` text NOT NULL DEFAULT ('open'),
	`payment_method` text,
	`payment_reference` text,
	`gateway_transaction_id` text,
	`due_date` datetime NOT NULL,
	`paid_at` datetime,
	`pdf_url` text,
	`dunning_attempts` int NOT NULL DEFAULT 0,
	`last_dunning_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `subscription_invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_invoices_invoice_number_unique` UNIQUE(`invoice_number`)
);
--> statement-breakpoint
CREATE TABLE `subscription_members` (
	`id` varchar(36) NOT NULL,
	`subscription_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`role` text NOT NULL DEFAULT ('employee'),
	`department` text,
	`employee_id_number` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`added_at` datetime NOT NULL,
	`removed_at` datetime,
	CONSTRAINT `subscription_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`billing_cycle` text NOT NULL,
	`base_price` decimal(12,4) NOT NULL,
	`currency` text NOT NULL DEFAULT ('ETB'),
	`max_members` int,
	`additional_member_price` decimal(12,4) DEFAULT '0',
	`included_services` json NOT NULL DEFAULT ('{"consultations":0,"labTests":0,"discountPercent":0,"coveredCategories":[]}'),
	`trial_period_days` int DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`version` int NOT NULL DEFAULT 1,
	`metadata` json DEFAULT ('{}'),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_usage` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`subscription_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`service_type` text NOT NULL,
	`service_id` varchar(36),
	`quantity` int NOT NULL DEFAULT 1,
	`nominal_price` decimal(12,4) NOT NULL,
	`covered_amount` decimal(12,4) NOT NULL,
	`patient_copay_amount` decimal(12,4) NOT NULL DEFAULT '0',
	`billing_period_start` datetime NOT NULL,
	`billing_period_end` datetime NOT NULL,
	`consumed_at` datetime NOT NULL,
	CONSTRAINT `subscription_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`plan_id` varchar(36) NOT NULL,
	`subscriber_type` text NOT NULL,
	`family_group_id` varchar(36),
	`company_id` varchar(36),
	`patient_id` varchar(36),
	`seat_count` int NOT NULL DEFAULT 1,
	`status` text NOT NULL DEFAULT ('active'),
	`current_period_start` datetime NOT NULL,
	`current_period_end` datetime NOT NULL,
	`cancel_at_period_end` boolean NOT NULL DEFAULT false,
	`cancelled_at` datetime,
	`trial_ends_at` datetime,
	`paused_at` datetime,
	`metadata` json DEFAULT ('{}'),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`contact_person` text,
	`email` text,
	`phone` text,
	`address` text,
	`lead_time_days` int DEFAULT 3,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_ticket_comments` (
	`id` varchar(36) NOT NULL,
	`ticket_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`message` text NOT NULL,
	`is_internal_note` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	CONSTRAINT `support_ticket_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`reporter_user_id` varchar(36),
	`patient_id` varchar(36),
	`ticket_number` varchar(255) NOT NULL,
	`category` text NOT NULL,
	`priority` text NOT NULL DEFAULT ('normal'),
	`status` text NOT NULL DEFAULT ('open'),
	`title` text NOT NULL,
	`description` text NOT NULL,
	`assigned_to` varchar(36),
	`resolved_at` datetime,
	`resolution_summary` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_tickets_ticket_number_unique` UNIQUE(`ticket_number`)
);
--> statement-breakpoint
CREATE TABLE `symptoms` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`severity` text NOT NULL,
	`onset_date` date,
	`duration` text,
	`body_location` text,
	`description` text,
	`is_primary` boolean DEFAULT false,
	`recorded_at` datetime NOT NULL,
	CONSTRAINT `symptoms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_auth_settings` (
	`id` varchar(36) NOT NULL,
	`require_email_verification` boolean NOT NULL DEFAULT false,
	`require_sms_verification` boolean NOT NULL DEFAULT false,
	`enable_two_factor_login` boolean NOT NULL DEFAULT false,
	`two_factor_target_roles` json NOT NULL DEFAULT ('["system_admin","tenant_admin","physician","pharmacist"]'),
	`require_national_id_verification` boolean NOT NULL DEFAULT true,
	`allow_demo_bypass` boolean NOT NULL DEFAULT true,
	`sms_gateway_provider` text NOT NULL DEFAULT ('simulator'),
	`otp_expiry_minutes` int NOT NULL DEFAULT 10,
	`max_attempts` int NOT NULL DEFAULT 5,
	`lockout_duration_minutes` int NOT NULL DEFAULT 15,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `system_auth_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_payment_settings` (
	`id` varchar(36) NOT NULL,
	`global_free_mode` boolean NOT NULL DEFAULT false,
	`billing_model` varchar(32) NOT NULL DEFAULT 'hybrid',
	`default_deposit_amount_etb` decimal(10,2) NOT NULL DEFAULT '2500.00',
	`enable_poc_qr_payments` boolean NOT NULL DEFAULT true,
	`allow_pharmacy_emergency_bypass` boolean NOT NULL DEFAULT true,
	`soft_gate_lab_collection` boolean NOT NULL DEFAULT true,
	`soft_gate_pharmacy_review` boolean NOT NULL DEFAULT true,
	`registration_validity_days` int NOT NULL DEFAULT 90,
	`grace_period_days` int NOT NULL DEFAULT 7,
	`allow_cash_reconciliation` boolean NOT NULL DEFAULT true,
	`enforce_lab_payment_gate` boolean NOT NULL DEFAULT true,
	`enforce_pharmacy_payment_gate` boolean NOT NULL DEFAULT true,
	`auto_notify_lab_on_payment` boolean NOT NULL DEFAULT true,
	`auto_notify_pharmacy_on_payment` boolean NOT NULL DEFAULT true,
	`allow_emergency_override` boolean NOT NULL DEFAULT true,
	`role_permissions` json NOT NULL DEFAULT ('{"waiveFees":["system_admin","tenant_admin"],"emergencyOverride":["system_admin","tenant_admin","physician"],"cashCollection":["system_admin","tenant_admin","pharmacist","nurse","cashier"]}'),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `system_payment_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tab_configurations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`page_key` text NOT NULL,
	`tab_key` text NOT NULL,
	`label` text NOT NULL,
	`icon` text,
	`badge_key` text,
	`order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`required_permission` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `tab_configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`task_type` text NOT NULL DEFAULT ('general'),
	`assigned_to_role` text NOT NULL,
	`assigned_to_user_id` varchar(36),
	`assigned_by_user_id` varchar(36) NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`priority` text NOT NULL DEFAULT ('routine'),
	`status` text NOT NULL DEFAULT ('pending'),
	`sla_minutes` int NOT NULL DEFAULT 60,
	`is_escalated` boolean NOT NULL DEFAULT false,
	`due_date` date,
	`completed_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_messages` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`sender_id` varchar(36) NOT NULL,
	`sender_role` text NOT NULL,
	`content` text NOT NULL,
	`is_urgent_consult` boolean DEFAULT false,
	`created_at` datetime NOT NULL,
	CONSTRAINT `team_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegram_integrations` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`telegram_chat_id` varchar(100) NOT NULL,
	`telegram_username` varchar(100),
	`is_notifications_enabled` boolean DEFAULT true,
	`auth_link_token` varchar(64),
	`token_expires_at` datetime,
	`linked_at` datetime NOT NULL,
	CONSTRAINT `telegram_integrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_integrations_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `telegram_integrations_telegram_chat_id_unique` UNIQUE(`telegram_chat_id`)
);
--> statement-breakpoint
CREATE TABLE `telemedicine_sessions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`doctor_id` varchar(36) NOT NULL,
	`platform` text NOT NULL DEFAULT ('livekit'),
	`room_id` varchar(255) NOT NULL,
	`status` text NOT NULL DEFAULT ('scheduled'),
	`recording_url` text,
	`transcript_text` text,
	`ai_live_suggestions` json DEFAULT ('[]'),
	`ai_consultation_summary` json DEFAULT ('{}'),
	`remote_device_readings` json DEFAULT ('[]'),
	`started_at` datetime,
	`ended_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `telemedicine_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `telemedicine_sessions_room_id_unique` UNIQUE(`room_id`)
);
--> statement-breakpoint
CREATE TABLE `translations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`key` text NOT NULL,
	`language` text NOT NULL,
	`value` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `translations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_custom_roles` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role_id` varchar(36) NOT NULL,
	`assigned_by` varchar(36),
	`expires_at` datetime,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	CONSTRAINT `user_custom_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`role` text NOT NULL,
	`is_primary` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`granted_by` varchar(36),
	`granted_at` datetime NOT NULL,
	`revoked_at` datetime,
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` text,
	`full_name` text NOT NULL,
	`role` text NOT NULL,
	`avatar_url` text,
	`phone` text,
	`national_id` text,
	`department` text,
	`license_number` text,
	`scope_of_practice` json DEFAULT ('{}'),
	`is_admin_granted_by_super_admin` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `vendor_invoices` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`vendor_name` text NOT NULL,
	`vendor_contact` text,
	`invoice_number` text NOT NULL,
	`po_reference` text,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`amount_etb` decimal(14,2) DEFAULT '0.00',
	`vat_amount_etb` decimal(10,2) DEFAULT '0.00',
	`total_amount_etb` decimal(14,2) DEFAULT '0.00',
	`currency` varchar(10) DEFAULT 'ETB',
	`due_date` date NOT NULL,
	`goods_received_at` datetime,
	`three_way_match_status` text DEFAULT ('pending_match'),
	`payment_status` text NOT NULL DEFAULT ('unpaid'),
	`paid_amount_etb` decimal(14,2) DEFAULT '0.00',
	`paid_at` datetime,
	`payment_method` text,
	`payment_reference` text,
	`document_url` text,
	`approved_by` varchar(36),
	`approved_at` datetime,
	`created_by` varchar(36) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `vendor_invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_recommendations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`platform` text NOT NULL,
	`video_url` text NOT NULL,
	`embed_id` text NOT NULL,
	`thumbnail_url` text,
	`duration_seconds` int,
	`category` text NOT NULL,
	`related_icd10` json DEFAULT ('[]'),
	`related_medications` json DEFAULT ('[]'),
	`language` text NOT NULL DEFAULT ('en'),
	`source_channel` text,
	`is_verified_medical_source` boolean NOT NULL DEFAULT true,
	`is_approved` boolean NOT NULL DEFAULT true,
	`approved_by` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `video_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vitals` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36),
	`recorded_at` datetime NOT NULL,
	`height_cm` decimal(12,4),
	`weight_kg` decimal(12,4),
	`bmi` decimal(12,4),
	`systolic_bp` int,
	`diastolic_bp` int,
	`heart_rate` int,
	`respiratory_rate` int,
	`temperature_c` decimal(12,4),
	`oxygen_saturation` decimal(12,4),
	`ecg_summary` text,
	`recorded_by` varchar(36),
	CONSTRAINT `vitals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `waiting_room_displays` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`location` text,
	`display_token` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`settings` json DEFAULT ('{"displayMode":"rotation","rotationIntervalSeconds":20,"enabledScreens":{"nowServing":true,"queueStatus":true,"availableStaff":true,"announcements":true},"departmentFilter":[],"audioEnabled":true,"audioVoice":"en","audioVolume":80,"theme":"dark"}'),
	`last_heartbeat_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `waiting_room_displays_id` PRIMARY KEY(`id`),
	CONSTRAINT `waiting_room_displays_display_token_unique` UNIQUE(`display_token`)
);
--> statement-breakpoint
CREATE TABLE `workflow_definitions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`trigger_event` varchar(64) NOT NULL,
	`conditions` json DEFAULT ('{}'),
	`steps` json NOT NULL DEFAULT ('[]'),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `workflow_definitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_state_history` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`encounter_id` varchar(36) NOT NULL,
	`workflow` text NOT NULL,
	`state` text NOT NULL,
	`entered_at` datetime NOT NULL,
	`exited_at` datetime,
	`duration_seconds` int,
	`entered_by` varchar(36),
	`exit_reason` text,
	`metadata` json DEFAULT ('{}'),
	CONSTRAINT `workflow_state_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_templates` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`process_type` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`steps` json NOT NULL DEFAULT ('[]'),
	`version` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `workflow_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `action_configurations` ADD CONSTRAINT `action_configurations_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_audit_logs` ADD CONSTRAINT `admin_audit_logs_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_audit_logs` ADD CONSTRAINT `admin_audit_logs_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_suggestions` ADD CONSTRAINT `ai_suggestions_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_suggestions` ADD CONSTRAINT `ai_suggestions_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_suggestions` ADD CONSTRAINT `ai_suggestions_session_id_encounters_id_fk` FOREIGN KEY (`session_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_suggestions` ADD CONSTRAINT `ai_suggestions_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_clinician_id_users_id_fk` FOREIGN KEY (`clinician_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_facility_id_facilities_id_fk` FOREIGN KEY (`facility_id`) REFERENCES `facilities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auth_verification_codes` ADD CONSTRAINT `auth_verification_codes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `automation_rules` ADD CONSTRAINT `automation_rules_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `automation_rules` ADD CONSTRAINT `automation_rules_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `billing_claims` ADD CONSTRAINT `billing_claims_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `billing_claims` ADD CONSTRAINT `billing_claims_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `billing_claims` ADD CONSTRAINT `billing_claims_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `biological_rules` ADD CONSTRAINT `biological_rules_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `biological_rules` ADD CONSTRAINT `biological_rules_curated_by_users_id_fk` FOREIGN KEY (`curated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blockchain_anchors` ADD CONSTRAINT `blockchain_anchors_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `care_plans` ADD CONSTRAINT `care_plans_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `care_plans` ADD CONSTRAINT `care_plans_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `care_plans` ADD CONSTRAINT `care_plans_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `care_team_members` ADD CONSTRAINT `care_team_members_care_team_id_care_teams_id_fk` FOREIGN KEY (`care_team_id`) REFERENCES `care_teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `care_team_members` ADD CONSTRAINT `care_team_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `care_teams` ADD CONSTRAINT `care_teams_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `care_teams` ADD CONSTRAINT `care_teams_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_messages` ADD CONSTRAINT `case_messages_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_messages` ADD CONSTRAINT `case_messages_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_messages` ADD CONSTRAINT `case_messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cases` ADD CONSTRAINT `cases_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cases` ADD CONSTRAINT `cases_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cases` ADD CONSTRAINT `cases_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cases` ADD CONSTRAINT `cases_assigned_provider_id_users_id_fk` FOREIGN KEY (`assigned_provider_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cash_drawers` ADD CONSTRAINT `cash_drawers_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cash_drawers` ADD CONSTRAINT `cash_drawers_cashier_id_users_id_fk` FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cash_drawers` ADD CONSTRAINT `cash_drawers_supervisor_approved_by_users_id_fk` FOREIGN KEY (`supervisor_approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chart_of_accounts` ADD CONSTRAINT `chart_of_accounts_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinic_locations` ADD CONSTRAINT `clinic_locations_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_catalog_protocols` ADD CONSTRAINT `clinical_catalog_protocols_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_catalog_protocols` ADD CONSTRAINT `clinical_catalog_protocols_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_catalog_protocols` ADD CONSTRAINT `clinical_catalog_protocols_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_files` ADD CONSTRAINT `clinical_files_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_files` ADD CONSTRAINT `clinical_files_uploaded_by_user_id_users_id_fk` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_files` ADD CONSTRAINT `clinical_files_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_orders` ADD CONSTRAINT `clinical_orders_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_orders` ADD CONSTRAINT `clinical_orders_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_orders` ADD CONSTRAINT `clinical_orders_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_orders` ADD CONSTRAINT `clinical_orders_ordering_doctor_id_users_id_fk` FOREIGN KEY (`ordering_doctor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_orders` ADD CONSTRAINT `clinical_orders_collected_by_users_id_fk` FOREIGN KEY (`collected_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_orders` ADD CONSTRAINT `clinical_orders_cancelled_by_users_id_fk` FOREIGN KEY (`cancelled_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_rounds` ADD CONSTRAINT `clinical_rounds_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_rounds` ADD CONSTRAINT `clinical_rounds_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_rounds` ADD CONSTRAINT `clinical_rounds_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_rounds` ADD CONSTRAINT `clinical_rounds_rounding_clinician_id_users_id_fk` FOREIGN KEY (`rounding_clinician_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_rounds` ADD CONSTRAINT `clinical_rounds_acknowledged_by_users_id_fk` FOREIGN KEY (`acknowledged_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `companies` ADD CONSTRAINT `companies_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_admins` ADD CONSTRAINT `company_admins_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_admins` ADD CONSTRAINT `company_admins_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_employee_invitations` ADD CONSTRAINT `company_employee_invitations_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_employee_invitations` ADD CONSTRAINT `company_employee_invitations_claimed_patient_id_patients_id_fk` FOREIGN KEY (`claimed_patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `config_audit_logs` ADD CONSTRAINT `config_audit_logs_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `config_audit_logs` ADD CONSTRAINT `config_audit_logs_admin_id_users_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consents` ADD CONSTRAINT `consents_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consents` ADD CONSTRAINT `consents_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `critical_alerts` ADD CONSTRAINT `critical_alerts_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `critical_alerts` ADD CONSTRAINT `critical_alerts_order_id_clinical_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `clinical_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `critical_alerts` ADD CONSTRAINT `critical_alerts_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `critical_alerts` ADD CONSTRAINT `critical_alerts_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `critical_alerts` ADD CONSTRAINT `critical_alerts_acknowledged_by_users_id_fk` FOREIGN KEY (`acknowledged_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_reports` ADD CONSTRAINT `custom_reports_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_reports` ADD CONSTRAINT `custom_reports_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dashboard_layouts` ADD CONSTRAINT `dashboard_layouts_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dashboard_layouts` ADD CONSTRAINT `dashboard_layouts_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dashboard_widgets` ADD CONSTRAINT `dashboard_widgets_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_readings` ADD CONSTRAINT `device_readings_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_readings` ADD CONSTRAINT `device_readings_device_id_devices_id_fk` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_readings` ADD CONSTRAINT `device_readings_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `devices` ADD CONSTRAINT `devices_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `devices` ADD CONSTRAINT `devices_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `display_announcements` ADD CONSTRAINT `display_announcements_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `display_announcements` ADD CONSTRAINT `display_announcements_display_id_waiting_room_displays_id_fk` FOREIGN KEY (`display_id`) REFERENCES `waiting_room_displays`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `display_announcements` ADD CONSTRAINT `display_announcements_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_access_logs` ADD CONSTRAINT `document_access_logs_file_id_clinical_files_id_fk` FOREIGN KEY (`file_id`) REFERENCES `clinical_files`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_access_logs` ADD CONSTRAINT `document_access_logs_accessed_by_user_id_users_id_fk` FOREIGN KEY (`accessed_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drug_batches` ADD CONSTRAINT `drug_batches_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drug_batches` ADD CONSTRAINT `drug_batches_drug_id_drug_catalog_id_fk` FOREIGN KEY (`drug_id`) REFERENCES `drug_catalog`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drug_batches` ADD CONSTRAINT `drug_batches_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drug_catalog` ADD CONSTRAINT `drug_catalog_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `duty_rosters` ADD CONSTRAINT `duty_rosters_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `duty_rosters` ADD CONSTRAINT `duty_rosters_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounter_events` ADD CONSTRAINT `encounter_events_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounter_events` ADD CONSTRAINT `encounter_events_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounter_events` ADD CONSTRAINT `encounter_events_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounter_states` ADD CONSTRAINT `encounter_states_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounter_states` ADD CONSTRAINT `encounter_states_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounter_tabs` ADD CONSTRAINT `encounter_tabs_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounter_tabs` ADD CONSTRAINT `encounter_tabs_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounter_tabs` ADD CONSTRAINT `encounter_tabs_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounter_tabs` ADD CONSTRAINT `encounter_tabs_settled_by_users_id_fk` FOREIGN KEY (`settled_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounters` ADD CONSTRAINT `encounters_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounters` ADD CONSTRAINT `encounters_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounters` ADD CONSTRAINT `encounters_clinician_id_users_id_fk` FOREIGN KEY (`clinician_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounters` ADD CONSTRAINT `encounters_assigned_nurse_id_users_id_fk` FOREIGN KEY (`assigned_nurse_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounters` ADD CONSTRAINT `encounters_assigned_physician_id_users_id_fk` FOREIGN KEY (`assigned_physician_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encounters` ADD CONSTRAINT `encounters_assigned_care_coordinator_id_users_id_fk` FOREIGN KEY (`assigned_care_coordinator_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encryption_key_registry` ADD CONSTRAINT `encryption_key_registry_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encryption_key_registry` ADD CONSTRAINT `encryption_key_registry_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `encryption_key_registry` ADD CONSTRAINT `encryption_key_registry_rotated_by_users_id_fk` FOREIGN KEY (`rotated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `external_providers` ADD CONSTRAINT `external_providers_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `facilities` ADD CONSTRAINT `facilities_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_groups` ADD CONSTRAINT `family_groups_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_groups` ADD CONSTRAINT `family_groups_primary_patient_id_patients_id_fk` FOREIGN KEY (`primary_patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_members` ADD CONSTRAINT `family_members_family_group_id_family_groups_id_fk` FOREIGN KEY (`family_group_id`) REFERENCES `family_groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_members` ADD CONSTRAINT `family_members_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback_records` ADD CONSTRAINT `feedback_records_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback_records` ADD CONSTRAINT `feedback_records_submitter_user_id_users_id_fk` FOREIGN KEY (`submitter_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback_records` ADD CONSTRAINT `feedback_records_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback_records` ADD CONSTRAINT `feedback_records_assigned_admin_id_users_id_fk` FOREIGN KEY (`assigned_admin_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `form_configurations` ADD CONSTRAINT `form_configurations_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `form_fields` ADD CONSTRAINT `form_fields_form_id_form_configurations_id_fk` FOREIGN KEY (`form_id`) REFERENCES `form_configurations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `form_submissions` ADD CONSTRAINT `form_submissions_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `form_submissions` ADD CONSTRAINT `form_submissions_submitted_by_user_id_users_id_fk` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `genetic_profiles` ADD CONSTRAINT `genetic_profiles_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `genetic_profiles` ADD CONSTRAINT `genetic_profiles_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `genetic_profiles` ADD CONSTRAINT `genetic_profiles_vcf_asset_id_media_assets_id_fk` FOREIGN KEY (`vcf_asset_id`) REFERENCES `media_assets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `health_insights` ADD CONSTRAINT `health_insights_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `health_insights` ADD CONSTRAINT `health_insights_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imaging_findings` ADD CONSTRAINT `imaging_findings_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imaging_findings` ADD CONSTRAINT `imaging_findings_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imaging_findings` ADD CONSTRAINT `imaging_findings_media_asset_id_media_assets_id_fk` FOREIGN KEY (`media_asset_id`) REFERENCES `media_assets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imaging_reports` ADD CONSTRAINT `imaging_reports_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imaging_reports` ADD CONSTRAINT `imaging_reports_study_id_imaging_studies_id_fk` FOREIGN KEY (`study_id`) REFERENCES `imaging_studies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imaging_reports` ADD CONSTRAINT `imaging_reports_template_id_imaging_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `imaging_templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imaging_reports` ADD CONSTRAINT `imaging_reports_signed_by_users_id_fk` FOREIGN KEY (`signed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imaging_reports` ADD CONSTRAINT `imaging_reports_peer_reviewed_by_users_id_fk` FOREIGN KEY (`peer_reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imaging_studies` ADD CONSTRAINT `imaging_studies_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imaging_studies` ADD CONSTRAINT `imaging_studies_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imaging_studies` ADD CONSTRAINT `imaging_studies_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imaging_templates` ADD CONSTRAINT `imaging_templates_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `immunizations` ADD CONSTRAINT `immunizations_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insurance_claims` ADD CONSTRAINT `insurance_claims_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insurance_claims` ADD CONSTRAINT `insurance_claims_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insurance_claims` ADD CONSTRAINT `insurance_claims_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insurance_claims` ADD CONSTRAINT `insurance_claims_payer_id_insurance_payers_id_fk` FOREIGN KEY (`payer_id`) REFERENCES `insurance_payers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insurance_claims` ADD CONSTRAINT `insurance_claims_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insurance_claims` ADD CONSTRAINT `insurance_claims_processed_by_users_id_fk` FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insurance_payers` ADD CONSTRAINT `insurance_payers_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_posted_by_users_id_fk` FOREIGN KEY (`posted_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_voided_by_users_id_fk` FOREIGN KEY (`voided_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_entry_lines` ADD CONSTRAINT `journal_entry_lines_journal_entry_id_journal_entries_id_fk` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_entry_lines` ADD CONSTRAINT `journal_entry_lines_account_id_chart_of_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_documents` ADD CONSTRAINT `knowledge_documents_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_instruments` ADD CONSTRAINT `lab_instruments_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_orders` ADD CONSTRAINT `lab_orders_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_orders` ADD CONSTRAINT `lab_orders_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_orders` ADD CONSTRAINT `lab_orders_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_orders` ADD CONSTRAINT `lab_orders_doctor_id_users_id_fk` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_orders` ADD CONSTRAINT `lab_orders_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_orders` ADD CONSTRAINT `lab_orders_sample_collected_by_users_id_fk` FOREIGN KEY (`sample_collected_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_qc_runs` ADD CONSTRAINT `lab_qc_runs_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_qc_runs` ADD CONSTRAINT `lab_qc_runs_instrument_id_lab_instruments_id_fk` FOREIGN KEY (`instrument_id`) REFERENCES `lab_instruments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_qc_runs` ADD CONSTRAINT `lab_qc_runs_performed_by_users_id_fk` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_results` ADD CONSTRAINT `lab_results_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_results` ADD CONSTRAINT `lab_results_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_turnaround` ADD CONSTRAINT `lab_turnaround_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_turnaround` ADD CONSTRAINT `lab_turnaround_lab_order_id_lab_orders_id_fk` FOREIGN KEY (`lab_order_id`) REFERENCES `lab_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_turnaround` ADD CONSTRAINT `lab_turnaround_performed_by_users_id_fk` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `landing_sections` ADD CONSTRAINT `landing_sections_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_staff_id_staff_profiles_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_hod_approved_by_users_id_fk` FOREIGN KEY (`hod_approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_hr_approved_by_users_id_fk` FOREIGN KEY (`hr_approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_assets` ADD CONSTRAINT `media_assets_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_assets` ADD CONSTRAINT `media_assets_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_assets` ADD CONSTRAINT `media_assets_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_assets` ADD CONSTRAINT `media_assets_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medication_education` ADD CONSTRAINT `medication_education_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medication_education` ADD CONSTRAINT `medication_education_medication_id_medications_id_fk` FOREIGN KEY (`medication_id`) REFERENCES `medications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medication_education` ADD CONSTRAINT `medication_education_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medication_education` ADD CONSTRAINT `medication_education_video_id_patient_education_videos_id_fk` FOREIGN KEY (`video_id`) REFERENCES `patient_education_videos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medications` ADD CONSTRAINT `medications_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medications` ADD CONSTRAINT `medications_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medications` ADD CONSTRAINT `medications_prescribed_by_users_id_fk` FOREIGN KEY (`prescribed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mobile_clinic_encounters` ADD CONSTRAINT `mobile_clinic_encounters_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mobile_clinic_encounters` ADD CONSTRAINT `mobile_clinic_encounters_session_id_mobile_clinic_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `mobile_clinic_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mobile_clinic_encounters` ADD CONSTRAINT `mobile_clinic_encounters_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mobile_clinic_encounters` ADD CONSTRAINT `mobile_clinic_encounters_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mobile_clinic_sessions` ADD CONSTRAINT `mobile_clinic_sessions_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `model_feedback` ADD CONSTRAINT `model_feedback_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `model_feedback` ADD CONSTRAINT `model_feedback_model_id_ai_models_id_fk` FOREIGN KEY (`model_id`) REFERENCES `ai_models`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `model_feedback` ADD CONSTRAINT `model_feedback_clinician_id_users_id_fk` FOREIGN KEY (`clinician_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `navigation_items` ADD CONSTRAINT `navigation_items_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_privileges` ADD CONSTRAINT `notification_privileges_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_templates` ADD CONSTRAINT `notification_templates_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipient_user_id_users_id_fk` FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_sender_user_id_users_id_fk` FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nursing_assessments` ADD CONSTRAINT `nursing_assessments_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nursing_assessments` ADD CONSTRAINT `nursing_assessments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nursing_assessments` ADD CONSTRAINT `nursing_assessments_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nursing_assessments` ADD CONSTRAINT `nursing_assessments_assessed_by_users_id_fk` FOREIGN KEY (`assessed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nutrition_assessments` ADD CONSTRAINT `nutrition_assessments_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nutrition_assessments` ADD CONSTRAINT `nutrition_assessments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nutrition_assessments` ADD CONSTRAINT `nutrition_assessments_assessed_by_users_id_fk` FOREIGN KEY (`assessed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `occupational_therapy_assessments` ADD CONSTRAINT `occupational_therapy_assessments_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `occupational_therapy_assessments` ADD CONSTRAINT `occupational_therapy_assessments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `occupational_therapy_assessments` ADD CONSTRAINT `occupational_therapy_assessments_assessed_by_users_id_fk` FOREIGN KEY (`assessed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_outbox_events` ADD CONSTRAINT `order_outbox_events_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_outbox_events` ADD CONSTRAINT `order_outbox_events_order_id_clinical_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `clinical_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_contents` ADD CONSTRAINT `page_contents_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_activities` ADD CONSTRAINT `patient_activities_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_activities` ADD CONSTRAINT `patient_activities_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_assignments` ADD CONSTRAINT `patient_assignments_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_assignments` ADD CONSTRAINT `patient_assignments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_assignments` ADD CONSTRAINT `patient_assignments_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_assignments` ADD CONSTRAINT `patient_assignments_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_assignments` ADD CONSTRAINT `patient_assignments_provider_id_users_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_consents` ADD CONSTRAINT `patient_consents_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_consents` ADD CONSTRAINT `patient_consents_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_education_videos` ADD CONSTRAINT `patient_education_videos_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_education_videos` ADD CONSTRAINT `patient_education_videos_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_education_videos` ADD CONSTRAINT `patient_education_videos_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_education_videos` ADD CONSTRAINT `patient_education_videos_generated_by_users_id_fk` FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_education_videos` ADD CONSTRAINT `patient_education_videos_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_journey_events` ADD CONSTRAINT `patient_journey_events_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_journey_events` ADD CONSTRAINT `patient_journey_events_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_journey_events` ADD CONSTRAINT `patient_journey_events_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_journey_events` ADD CONSTRAINT `patient_journey_events_attending_staff_id_users_id_fk` FOREIGN KEY (`attending_staff_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_messages` ADD CONSTRAINT `patient_messages_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_messages` ADD CONSTRAINT `patient_messages_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_questionnaires` ADD CONSTRAINT `patient_questionnaires_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_questionnaires` ADD CONSTRAINT `patient_questionnaires_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_registration_passes` ADD CONSTRAINT `patient_registration_passes_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_registration_passes` ADD CONSTRAINT `patient_registration_passes_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_registrations` ADD CONSTRAINT `patient_registrations_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_registrations` ADD CONSTRAINT `patient_registrations_duplicate_patient_id_patients_id_fk` FOREIGN KEY (`duplicate_patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_registrations` ADD CONSTRAINT `patient_registrations_invited_by_user_id_users_id_fk` FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_registrations` ADD CONSTRAINT `patient_registrations_activated_patient_id_patients_id_fk` FOREIGN KEY (`activated_patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_video_recommendations` ADD CONSTRAINT `patient_video_recommendations_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_video_recommendations` ADD CONSTRAINT `patient_video_recommendations_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_video_recommendations` ADD CONSTRAINT `patient_video_recs_video_rec_id_fk` FOREIGN KEY (`video_recommendation_id`) REFERENCES `video_recommendations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_video_recommendations` ADD CONSTRAINT `patient_video_recommendations_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_video_recommendations` ADD CONSTRAINT `patient_video_recommendations_recommended_by_users_id_fk` FOREIGN KEY (`recommended_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_wayfinding_notifications` ADD CONSTRAINT `patient_wayfinding_notifications_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_wayfinding_notifications` ADD CONSTRAINT `patient_wayfinding_notifications_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_wayfinding_notifications` ADD CONSTRAINT `patient_wayfinding_notifications_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patients` ADD CONSTRAINT `patients_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patients` ADD CONSTRAINT `patients_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patients` ADD CONSTRAINT `patients_primary_doctor_id_users_id_fk` FOREIGN KEY (`primary_doctor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_collected_by_users_id_fk` FOREIGN KEY (`collected_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_items` ADD CONSTRAINT `payroll_items_payroll_run_id_payroll_runs_id_fk` FOREIGN KEY (`payroll_run_id`) REFERENCES `payroll_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_items` ADD CONSTRAINT `payroll_items_staff_id_staff_profiles_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff_profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_runs` ADD CONSTRAINT `payroll_runs_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_runs` ADD CONSTRAINT `payroll_runs_processed_by_users_id_fk` FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_runs` ADD CONSTRAINT `payroll_runs_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_dispensing_queue` ADD CONSTRAINT `pharmacy_dispensing_queue_prescription_id_prescriptions_id_fk` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_dispensing_queue` ADD CONSTRAINT `pharmacy_dispensing_queue_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_dispensing_queue` ADD CONSTRAINT `pharmacy_dispensing_queue_doctor_id_users_id_fk` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_dispensing_queue` ADD CONSTRAINT `pharmacy_dispensing_queue_pharmacist_id_users_id_fk` FOREIGN KEY (`pharmacist_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_dispensing_queue` ADD CONSTRAINT `pharmacy_dispensing_queue_nurse_id_users_id_fk` FOREIGN KEY (`nurse_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_inventory_alerts` ADD CONSTRAINT `pharmacy_inventory_alerts_drug_id_drug_catalog_id_fk` FOREIGN KEY (`drug_id`) REFERENCES `drug_catalog`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_inventory_alerts` ADD CONSTRAINT `pharmacy_inventory_alerts_batch_id_drug_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `drug_batches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_inventory_alerts` ADD CONSTRAINT `pharmacy_inventory_alerts_acknowledged_by_users_id_fk` FOREIGN KEY (`acknowledged_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_notifications` ADD CONSTRAINT `pharmacy_notif_queue_item_id_fk` FOREIGN KEY (`queue_item_id`) REFERENCES `pharmacy_dispensing_queue`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_notifications` ADD CONSTRAINT `pharmacy_notifications_prescription_id_prescriptions_id_fk` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_notifications` ADD CONSTRAINT `pharmacy_notifications_recipient_id_users_id_fk` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `physiotherapy_assessments` ADD CONSTRAINT `physiotherapy_assessments_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `physiotherapy_assessments` ADD CONSTRAINT `physiotherapy_assessments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `physiotherapy_assessments` ADD CONSTRAINT `physiotherapy_assessments_assessed_by_users_id_fk` FOREIGN KEY (`assessed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_cashier_shifts` ADD CONSTRAINT `pos_cashier_shifts_cashier_id_users_id_fk` FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_transactions` ADD CONSTRAINT `pos_transactions_shift_id_pos_cashier_shifts_id_fk` FOREIGN KEY (`shift_id`) REFERENCES `pos_cashier_shifts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_transactions` ADD CONSTRAINT `pos_transactions_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_transactions` ADD CONSTRAINT `pos_transactions_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_transactions` ADD CONSTRAINT `pos_transactions_cashier_id_users_id_fk` FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_doctor_id_users_id_fk` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_pharmacist_id_users_id_fk` FOREIGN KEY (`pharmacist_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_nurse_id_users_id_fk` FOREIGN KEY (`nurse_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `professional_profiles` ADD CONSTRAINT `professional_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_profiles` ADD CONSTRAINT `provider_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_profiles` ADD CONSTRAINT `provider_profiles_hr_reviewer_id_users_id_fk` FOREIGN KEY (`hr_reviewer_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_schedules` ADD CONSTRAINT `provider_schedules_provider_id_users_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `psychological_assessments` ADD CONSTRAINT `psychological_assessments_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `psychological_assessments` ADD CONSTRAINT `psychological_assessments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `psychological_assessments` ADD CONSTRAINT `psychological_assessments_assessed_by_users_id_fk` FOREIGN KEY (`assessed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_ordered_by_users_id_fk` FOREIGN KEY (`ordered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `qr_login_sessions` ADD CONSTRAINT `qr_login_sessions_authenticated_user_id_users_id_fk` FOREIGN KEY (`authenticated_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queue_entries` ADD CONSTRAINT `queue_entries_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queue_entries` ADD CONSTRAINT `queue_entries_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queue_entries` ADD CONSTRAINT `queue_entries_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queue_entries` ADD CONSTRAINT `queue_entries_provider_id_users_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queue_entries` ADD CONSTRAINT `queue_entries_called_by_user_id_users_id_fk` FOREIGN KEY (`called_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_logs` ADD CONSTRAINT `referral_logs_referral_id_referrals_id_fk` FOREIGN KEY (`referral_id`) REFERENCES `referrals`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_logs` ADD CONSTRAINT `referral_logs_performed_by_users_id_fk` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referring_user_id_users_id_fk` FOREIGN KEY (`referring_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_receiving_user_id_users_id_fk` FOREIGN KEY (`receiving_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `respiratory_assessments` ADD CONSTRAINT `respiratory_assessments_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `respiratory_assessments` ADD CONSTRAINT `respiratory_assessments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `respiratory_assessments` ADD CONSTRAINT `respiratory_assessments_assessed_by_users_id_fk` FOREIGN KEY (`assessed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `risk_scores` ADD CONSTRAINT `risk_scores_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `risk_scores` ADD CONSTRAINT `risk_scores_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rpm_programs` ADD CONSTRAINT `rpm_programs_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saga_transactions` ADD CONSTRAINT `saga_transactions_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saga_transactions` ADD CONSTRAINT `saga_transactions_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `security_threat_logs` ADD CONSTRAINT `security_threat_logs_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `security_threat_logs` ADD CONSTRAINT `security_threat_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_pricing` ADD CONSTRAINT `service_pricing_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shared_medical_records` ADD CONSTRAINT `shared_medical_records_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `smart_consents` ADD CONSTRAINT `smart_consents_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `smart_consents` ADD CONSTRAINT `smart_consents_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `social_history` ADD CONSTRAINT `social_history_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `social_history` ADD CONSTRAINT `social_history_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_attendance` ADD CONSTRAINT `staff_attendance_staff_id_staff_profiles_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_attendance` ADD CONSTRAINT `staff_attendance_shift_id_staff_shifts_id_fk` FOREIGN KEY (`shift_id`) REFERENCES `staff_shifts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_attendance` ADD CONSTRAINT `staff_attendance_recorded_by_users_id_fk` FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_certifications` ADD CONSTRAINT `staff_certifications_staff_id_staff_profiles_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_certifications` ADD CONSTRAINT `staff_certifications_verified_by_users_id_fk` FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_performance_reviews` ADD CONSTRAINT `staff_performance_reviews_staff_id_staff_profiles_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_performance_reviews` ADD CONSTRAINT `staff_performance_reviews_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_performance_reviews` ADD CONSTRAINT `staff_performance_reviews_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_profiles` ADD CONSTRAINT `staff_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_profiles` ADD CONSTRAINT `staff_profiles_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_shifts` ADD CONSTRAINT `staff_shifts_roster_id_duty_rosters_id_fk` FOREIGN KEY (`roster_id`) REFERENCES `duty_rosters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_shifts` ADD CONSTRAINT `staff_shifts_staff_id_staff_profiles_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_shifts` ADD CONSTRAINT `staff_shifts_swap_requested_with_staff_id_staff_profiles_id_fk` FOREIGN KEY (`swap_requested_with_staff_id`) REFERENCES `staff_profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_shifts` ADD CONSTRAINT `staff_shifts_swap_approved_by_users_id_fk` FOREIGN KEY (`swap_approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `state_sla_violations` ADD CONSTRAINT `state_sla_violations_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `state_sla_violations` ADD CONSTRAINT `state_sla_violations_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `state_sla_violations` ADD CONSTRAINT `state_sla_violations_escalated_to_users_id_fk` FOREIGN KEY (`escalated_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `state_slas` ADD CONSTRAINT `state_slas_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_batch_id_drug_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `drug_batches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_performed_by_users_id_fk` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_invoices` ADD CONSTRAINT `subscription_invoices_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_invoices` ADD CONSTRAINT `subscription_invoices_subscription_id_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_members` ADD CONSTRAINT `subscription_members_subscription_id_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_members` ADD CONSTRAINT `subscription_members_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_plans` ADD CONSTRAINT `subscription_plans_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_usage` ADD CONSTRAINT `subscription_usage_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_usage` ADD CONSTRAINT `subscription_usage_subscription_id_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_usage` ADD CONSTRAINT `subscription_usage_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_plan_id_subscription_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_family_group_id_family_groups_id_fk` FOREIGN KEY (`family_group_id`) REFERENCES `family_groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_ticket_comments` ADD CONSTRAINT `support_ticket_comments_ticket_id_support_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_ticket_comments` ADD CONSTRAINT `support_ticket_comments_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_reporter_user_id_users_id_fk` FOREIGN KEY (`reporter_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `symptoms` ADD CONSTRAINT `symptoms_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `symptoms` ADD CONSTRAINT `symptoms_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tab_configurations` ADD CONSTRAINT `tab_configurations_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assigned_to_user_id_users_id_fk` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assigned_by_user_id_users_id_fk` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_messages` ADD CONSTRAINT `team_messages_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_messages` ADD CONSTRAINT `team_messages_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_messages` ADD CONSTRAINT `team_messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegram_integrations` ADD CONSTRAINT `telegram_integrations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telemedicine_sessions` ADD CONSTRAINT `telemedicine_sessions_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telemedicine_sessions` ADD CONSTRAINT `telemedicine_sessions_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telemedicine_sessions` ADD CONSTRAINT `telemedicine_sessions_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telemedicine_sessions` ADD CONSTRAINT `telemedicine_sessions_doctor_id_users_id_fk` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `translations` ADD CONSTRAINT `translations_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_custom_roles` ADD CONSTRAINT `user_custom_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_custom_roles` ADD CONSTRAINT `user_custom_roles_role_id_custom_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `custom_roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_custom_roles` ADD CONSTRAINT `user_custom_roles_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_granted_by_users_id_fk` FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_invoices` ADD CONSTRAINT `vendor_invoices_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_invoices` ADD CONSTRAINT `vendor_invoices_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_invoices` ADD CONSTRAINT `vendor_invoices_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `video_recommendations` ADD CONSTRAINT `video_recommendations_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `video_recommendations` ADD CONSTRAINT `video_recommendations_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vitals` ADD CONSTRAINT `vitals_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vitals` ADD CONSTRAINT `vitals_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vitals` ADD CONSTRAINT `vitals_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vitals` ADD CONSTRAINT `vitals_recorded_by_users_id_fk` FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `waiting_room_displays` ADD CONSTRAINT `waiting_room_displays_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_definitions` ADD CONSTRAINT `workflow_definitions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_state_history` ADD CONSTRAINT `workflow_state_history_tenant_id_organizations_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_state_history` ADD CONSTRAINT `workflow_state_history_encounter_id_encounters_id_fk` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_state_history` ADD CONSTRAINT `workflow_state_history_entered_by_users_id_fk` FOREIGN KEY (`entered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_templates` ADD CONSTRAINT `workflow_templates_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_templates` ADD CONSTRAINT `workflow_templates_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;