-- ============================================================
-- HRM & FinOps Migration: New Tables for NiniMed Clinical
-- Run inside the postgres container:
--   docker exec -i clinic-postgres-1 psql -U postgres -d clinic < docker/hrm_finance_migration.sql
-- Or paste directly into the DB via a migration tool.
-- ============================================================

-- ─── HRM: STAFF PROFILES ──────────────────────────────────────────────────────
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
  employment_type TEXT NOT NULL DEFAULT 'full_time'
    CHECK (employment_type IN ('full_time','part_time','contract','locum','intern')),
  base_salary_etb NUMERIC(12,2) DEFAULT 0.00,
  on_call_allowance_rate NUMERIC(10,2) DEFAULT 0.00,
  consultation_revenue_share_pct NUMERIC(5,2) DEFAULT 0.00,
  bank_account_number TEXT,
  bank_name TEXT,
  mobile_wallet_number TEXT,
  mobile_wallet_provider TEXT DEFAULT 'none'
    CHECK (mobile_wallet_provider IN ('telebirr','cbe_birr','m_pesa','none')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','on_leave','probation','suspended','terminated')),
  onboarding_completed_at TIMESTAMPTZ,
  hired_at DATE NOT NULL,
  terminated_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── HRM: STAFF CERTIFICATIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cert_type TEXT NOT NULL
    CHECK (cert_type IN ('bls','acls','atls','pals','board_cert','subspecialty','cme','malpractice_insurance','other')),
  issuing_body TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  document_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('verified','pending','expiring_soon','expired','suspended')),
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── HRM: DUTY ROSTERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS duty_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  department TEXT NOT NULL,
  shift_name TEXT NOT NULL,
  shift_template TEXT NOT NULL
    CHECK (shift_template IN ('morning','evening','night','on_call_24h','ward_rounds','custom')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  required_doctors INTEGER NOT NULL DEFAULT 1,
  required_nurses INTEGER NOT NULL DEFAULT 2,
  required_support_staff INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── HRM: STAFF SHIFTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id UUID NOT NULL REFERENCES duty_rosters(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','confirmed','completed','absent','cancelled')),
  swap_status TEXT NOT NULL DEFAULT 'none'
    CHECK (swap_status IN ('none','requested','approved','rejected')),
  swap_requested_with_staff_id UUID REFERENCES staff_profiles(id),
  swap_approved_by UUID REFERENCES users(id),
  swap_approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── HRM: STAFF ATTENDANCE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES staff_shifts(id),
  attendance_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  regular_hours NUMERIC(5,2) DEFAULT 0.00,
  overtime_hours NUMERIC(5,2) DEFAULT 0.00,
  overtime_multiplier NUMERIC(4,2) DEFAULT 1.00,
  verification_method TEXT NOT NULL DEFAULT 'pin'
    CHECK (verification_method IN ('pin','biometric','geolocation','manual','kiosk')),
  status TEXT NOT NULL DEFAULT 'present'
    CHECK (status IN ('present','absent','late','half_day','excused')),
  deviation_notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── HRM: LEAVE REQUESTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  leave_type TEXT NOT NULL
    CHECK (leave_type IN ('annual','clinical_cme','sick','maternity_paternity','emergency_bereavement','unpaid','compensatory')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  reason TEXT NOT NULL,
  supporting_document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved_by_hod','approved_by_hr','rejected','cancelled')),
  hod_approved_by UUID REFERENCES users(id),
  hod_approved_at TIMESTAMPTZ,
  hr_approved_by UUID REFERENCES users(id),
  hr_approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── HRM: PAYROLL RUNS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL,
  total_gross_etb NUMERIC(14,2) DEFAULT 0.00,
  total_net_etb NUMERIC(14,2) DEFAULT 0.00,
  total_paye_tax_etb NUMERIC(14,2) DEFAULT 0.00,
  total_pension_employee_etb NUMERIC(14,2) DEFAULT 0.00,
  total_pension_employer_etb NUMERIC(14,2) DEFAULT 0.00,
  total_on_call_allowance_etb NUMERIC(14,2) DEFAULT 0.00,
  total_overtime_paid_etb NUMERIC(14,2) DEFAULT 0.00,
  staff_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','calculated','approved','disbursed','void')),
  processed_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  processed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── HRM: PAYROLL ITEMS ───────────────────────────────────────────────────────
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
  disbursement_method TEXT DEFAULT 'bank_transfer'
    CHECK (disbursement_method IN ('bank_transfer','mobile_wallet','cash')),
  disbursement_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── HRM: PERFORMANCE REVIEWS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  review_type TEXT DEFAULT 'quarterly'
    CHECK (review_type IN ('quarterly','annual','probation','pip')),
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
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','acknowledged')),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FINANCE: CHART OF ACCOUNTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL
    CHECK (account_type IN ('asset','liability','equity','revenue','cogs','expense')),
  parent_account_id UUID,
  is_header BOOLEAN NOT NULL DEFAULT FALSE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  current_balance NUMERIC(16,2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'ETB',
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, account_code)
);

-- ─── FINANCE: JOURNAL ENTRIES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  entry_number TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT NOT NULL
    CHECK (reference_type IN ('pos_billing','insurance_claim','pharmacy_cogs','payroll_disbursement','vendor_ap','manual_adjustment','subscription','refund')),
  reference_id UUID,
  total_debit NUMERIC(16,2) DEFAULT 0.00,
  total_credit NUMERIC(16,2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','posted','voided')),
  posted_by UUID REFERENCES users(id),
  posted_at TIMESTAMPTZ,
  voided_by UUID REFERENCES users(id),
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FINANCE: JOURNAL ENTRY LINES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit NUMERIC(16,2) DEFAULT 0.00,
  credit NUMERIC(16,2) DEFAULT 0.00,
  department TEXT,
  memo TEXT,
  line_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FINANCE: INSURANCE PAYERS ────────────────────────────────────────────────
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
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FINANCE: INSURANCE CLAIMS ────────────────────────────────────────────────
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
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','under_review','approved','partially_approved','rejected','reimbursed','appealed','written_off')),
  submitted_at TIMESTAMPTZ,
  adjudicated_at TIMESTAMPTZ,
  reimbursed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FINANCE: CASH DRAWERS ────────────────────────────────────────────────────
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
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','closed','audited')),
  supervisor_approved_by UUID REFERENCES users(id),
  supervisor_approved_at TIMESTAMPTZ,
  discrepancy_notes TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FINANCE: VENDOR INVOICES (AP) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  vendor_name TEXT NOT NULL,
  vendor_contact TEXT,
  invoice_number TEXT NOT NULL,
  po_reference TEXT,
  description TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('pharmaceuticals','medical_equipment','lab_supplies','ict','maintenance','utilities','other')),
  amount_etb NUMERIC(14,2) DEFAULT 0.00,
  vat_amount_etb NUMERIC(10,2) DEFAULT 0.00,
  total_amount_etb NUMERIC(14,2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'ETB',
  due_date DATE NOT NULL,
  goods_received_at TIMESTAMPTZ,
  three_way_match_status TEXT DEFAULT 'pending_match'
    CHECK (three_way_match_status IN ('pending_match','matched','discrepancy')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','partial','paid','overdue','disputed')),
  paid_amount_etb NUMERIC(14,2) DEFAULT 0.00,
  paid_at TIMESTAMPTZ,
  payment_method TEXT CHECK (payment_method IN ('bank_transfer','cheque','mobile_wallet','cash')),
  payment_reference TEXT,
  document_url TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SEED: Default Chart of Accounts ──────────────────────────────────────────
-- Seed these after creating the first organization and getting its ID.
-- Replace 'YOUR_TENANT_UUID' with the actual org id.
-- Example seed (run manually):
-- INSERT INTO chart_of_accounts (tenant_id, account_code, account_name, account_type, is_system, currency) VALUES
--   ('YOUR_TENANT_UUID', '1100', 'Cash on Hand', 'asset', true, 'ETB'),
--   ('YOUR_TENANT_UUID', '1110', 'CBE Bank Account', 'asset', true, 'ETB'),
--   ('YOUR_TENANT_UUID', '1200', 'Insurance Receivable (AR)', 'asset', true, 'ETB'),
--   ('YOUR_TENANT_UUID', '1300', 'Pharmacy Inventory', 'asset', true, 'ETB'),
--   ('YOUR_TENANT_UUID', '2100', 'Accounts Payable', 'liability', true, 'ETB'),
--   ('YOUR_TENANT_UUID', '2200', 'Accrued Payroll Liability', 'liability', true, 'ETB'),
--   ('YOUR_TENANT_UUID', '3100', 'Retained Earnings', 'equity', true, 'ETB'),
--   ('YOUR_TENANT_UUID', '4100', 'Consultation Revenue', 'revenue', true, 'ETB'),
--   ('YOUR_TENANT_UUID', '4200', 'Laboratory Revenue', 'revenue', true, 'ETB'),
--   ('YOUR_TENANT_UUID', '4300', 'Pharmacy Revenue', 'revenue', true, 'ETB'),
--   ('YOUR_TENANT_UUID', '4400', 'Radiology Revenue', 'revenue', true, 'ETB'),
--   ('YOUR_TENANT_UUID', '5100', 'Pharmacy COGS', 'cogs', true, 'ETB'),
--   ('YOUR_TENANT_UUID', '6100', 'Staff Salaries', 'expense', true, 'ETB'),
--   ('YOUR_TENANT_UUID', '6200', 'Medical Equipment Maintenance', 'expense', true, 'ETB'),
--   ('YOUR_TENANT_UUID', '6300', 'Utilities', 'expense', true, 'ETB');

-- ─── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_staff_profiles_tenant ON staff_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_user ON staff_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date ON staff_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date ON staff_attendance(staff_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_staff ON leave_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(tenant_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant ON journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_patient ON insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_cash_drawers_cashier ON cash_drawers(cashier_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_status ON vendor_invoices(payment_status);

SELECT 'HRM & Finance migration completed successfully.' AS result;
