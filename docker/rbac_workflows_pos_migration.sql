-- ============================================================
-- DYNAMIC RBAC, CUSTOM WORKFLOWS & AUTOMATED POS MIGRATION
-- ============================================================

-- 1. Custom Roles Registry
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  code            VARCHAR(64) NOT NULL UNIQUE,
  name            VARCHAR(128) NOT NULL,
  description     TEXT,
  category        VARCHAR(64) NOT NULL DEFAULT 'clinical', -- 'hr' | 'finance' | 'clinical' | 'pharmacy' | 'admin' | 'billing'
  permissions     JSONB NOT NULL DEFAULT '[]',
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_roles_code ON custom_roles(code);
CREATE INDEX IF NOT EXISTS idx_custom_roles_tenant ON custom_roles(tenant_id);

-- Seed Essential Predefined Specialized Roles if not exist
INSERT INTO custom_roles (tenant_id, code, name, description, category, permissions, is_system)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'hr_manager', 'HR Manager & Credentialing Officer', 'Manages staff lifecycle, medical licensure, shift rosters, and payroll', 'hr', '["manage_staff_profiles","approve_leave","process_payroll","verify_medical_licenses","manage_shifts","view_audit_logs"]'::jsonb, TRUE),
  ('00000000-0000-0000-0000-000000000001', 'finance_director', 'Finance & Accounting Director', 'Oversees general ledgers, accounts payable, P&L statements, and revenue cycle', 'finance', '["manage_general_ledger","manage_accounts_payable","approve_refunds","export_financial_ledgers","view_financial_reports","manage_budgets"]'::jsonb, TRUE),
  ('00000000-0000-0000-0000-000000000001', 'financial_auditor', 'Financial & Compliance Auditor', 'Conducts blockchain audit reviews, transaction verification, and fraud detection', 'finance', '["view_audit_logs","verify_blockchain_audit","audit_invoices","view_financial_reports","audit_prescriptions"]'::jsonb, TRUE),
  ('00000000-0000-0000-0000-000000000001', 'cashier', 'Billing Specialist & POS Cashier', 'Executes point-of-sale checkout, collects multi-channel payments, and manages shifts', 'billing', '["process_pos_payments","view_patient_billing","open_cashier_shift","close_cashier_shift","print_receipts","apply_discounts"]'::jsonb, TRUE),
  ('00000000-0000-0000-0000-000000000001', 'inventory_officer', 'Pharmacy & Warehouse Inventory Officer', 'Manages drug catalog, batch receiving, purchase orders, and stock movements', 'pharmacy', '["manage_drug_catalog","receive_batches","create_purchase_orders","quarantine_stock","view_inventory_alerts"]'::jsonb, TRUE),
  ('00000000-0000-0000-0000-000000000001', 'insurance_claims_officer', 'Insurance Claims & Adjudication Officer', 'Submits payer claims, manages pre-authorizations, and processes denials', 'billing', '["adjudicate_claims","view_insurance_policies","verify_preauth","manage_claim_disputes","export_claim_reports"]'::jsonb, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 2. User Custom Role Assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS user_custom_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id         UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  assigned_by     UUID REFERENCES users(id),
  expires_at      TIMESTAMP WITH TIME ZONE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_custom_roles_user ON user_custom_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_roles_role ON user_custom_roles(role_id);

-- 3. Custom Workflow Definitions
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  trigger_event   VARCHAR(64) NOT NULL, -- 'PRESCRIPTION_SIGNED' | 'PAYMENT_COMPLETED' | 'INPATIENT_ADMISSION' | 'LAB_ORDER_SUBMITTED' | 'STAFF_LICENSE_EXPIRING'
  conditions      JSONB DEFAULT '{}',
  steps           JSONB NOT NULL DEFAULT '[]', -- Array of { id, order, action, roleTarget, config }
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workflow_trigger ON workflow_definitions(trigger_event);

-- Seed Default Workflows
INSERT INTO workflow_definitions (tenant_id, name, description, trigger_event, conditions, steps, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Standard Automated Prescription-to-Dispense Pipeline', 'Auto-calculates medication pricing, generates invoice, notifies patient with payment total, and queues in pharmacy', 'PRESCRIPTION_SIGNED', '{}'::jsonb, '[{"step":1,"action":"AUTO_CALCULATE_PRICE"},{"step":2,"action":"CREATE_INVOICE"},{"step":3,"action":"ENQUEUE_PHARMACY"},{"step":4,"action":"NOTIFY_PATIENT_PAYMENT_DUE"}]'::jsonb, TRUE),
  ('00000000-0000-0000-0000-000000000001', 'Automated POS Payment Settlement & Dispensing Trigger', 'Clears prescription payment status, beacons green alert on pharmacy queue, and prints receipt', 'PAYMENT_COMPLETED', '{}'::jsonb, '[{"step":1,"action":"MARK_PRESCRIPTION_CLEARED"},{"step":2,"action":"ALERT_PHARMACIST_DISPENSE"},{"step":3,"action":"GENERATE_FISCAL_RECEIPT"},{"step":4,"action":"POST_GENERAL_LEDGER"}]'::jsonb, TRUE),
  ('00000000-0000-0000-0000-000000000001', 'Inpatient Admission & Ward Handoff Pipeline', 'Assigns bed, attending nurse, generates registration pass, and pushes to clinical journey Kanban', 'INPATIENT_ADMISSION', '{}'::jsonb, '[{"step":1,"action":"ASSIGN_WARD_BED"},{"step":2,"action":"ALERT_ATTENDING_NURSE"},{"step":3,"action":"CREATE_REGISTRATION_PASS"},{"step":4,"action":"UPDATE_PATIENT_JOURNEY"}]'::jsonb, TRUE)
ON CONFLICT DO NOTHING;

-- 4. POS Cashier Shifts & Drawer Auditing
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_cashier_shifts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  cashier_id          UUID NOT NULL REFERENCES users(id),
  terminal_id         VARCHAR(64) DEFAULT 'POS-TERM-01',
  opened_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  closed_at           TIMESTAMP WITH TIME ZONE,
  opening_float       NUMERIC(10,2) NOT NULL DEFAULT 1000.00,
  expected_cash       NUMERIC(10,2) NOT NULL DEFAULT 1000.00,
  actual_cash         NUMERIC(10,2),
  cash_variance       NUMERIC(10,2) DEFAULT 0.00,
  total_cash_sales    NUMERIC(10,2) DEFAULT 0.00,
  total_telebirr_sales NUMERIC(10,2) DEFAULT 0.00,
  total_card_sales    NUMERIC(10,2) DEFAULT 0.00,
  total_insurance_sales NUMERIC(10,2) DEFAULT 0.00,
  total_transactions  INTEGER DEFAULT 0,
  status              VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'audited')),
  notes               TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pos_shifts_cashier ON pos_cashier_shifts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_status  ON pos_cashier_shifts(status);

-- 5. POS Transactions & Fiscal Audit
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  shift_id            UUID REFERENCES pos_cashier_shifts(id),
  invoice_id          UUID REFERENCES invoices(id),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  cashier_id          UUID NOT NULL REFERENCES users(id),
  receipt_number      VARCHAR(64) NOT NULL UNIQUE,
  subtotal            NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax_amount          NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_amount        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_method      VARCHAR(64) NOT NULL, -- 'cash' | 'telebirr' | 'chapa' | 'card' | 'cbe_birr' | 'insurance' | 'split'
  payment_breakdown   JSONB DEFAULT '{}',
  items_snapshot      JSONB NOT NULL DEFAULT '[]',
  cash_tendered       NUMERIC(10,2),
  change_returned     NUMERIC(10,2),
  transaction_ref     VARCHAR(128),
  qr_code_payload     TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pos_tx_patient   ON pos_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_pos_tx_receipt   ON pos_transactions(receipt_number);
CREATE INDEX IF NOT EXISTS idx_pos_tx_cashier   ON pos_transactions(cashier_id);
