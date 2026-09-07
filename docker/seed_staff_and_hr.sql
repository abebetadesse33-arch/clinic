-- Seed Staff Profiles for Core Clinical and Operations Staff
INSERT INTO staff_profiles (
  id, user_id, tenant_id, employee_code, department, designation, specialization,
  license_number, license_issuing_body, license_expiry_date, cme_points, employment_type,
  base_salary_etb, on_call_allowance_rate, consultation_revenue_share_pct,
  status, hired_at
) VALUES
  (
    'a1111111-0001-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111101',
    '00000000-0000-0000-0000-000000000001',
    'EMP-001',
    'Internal Medicine',
    'Lead Attending Physician & Internist',
    'Internal Medicine & Cardiology',
    'MD-ET-2018-0941',
    'Ethiopian Health Professionals Regulatory Authority',
    '2026-12-31',
    48,
    'full_time',
    42000.00,
    1500.00,
    15.00,
    'active',
    '2021-01-15'
  ),
  (
    'a1111111-0001-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111102',
    '00000000-0000-0000-0000-000000000001',
    'EMP-002',
    'Advanced Primary Care',
    'Family Nurse Practitioner (DNP)',
    'Primary Care & Preventive Medicine',
    'NP-ET-2020-1120',
    'Ethiopian Nursing Council',
    '2027-06-30',
    34,
    'full_time',
    28500.00,
    900.00,
    10.00,
    'active',
    '2021-06-01'
  ),
  (
    'a1111111-0001-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111103',
    '00000000-0000-0000-0000-000000000001',
    'EMP-003',
    'Emergency',
    'Head Nurse & Triage Supervisor',
    'Emergency & Critical Care Nursing',
    'RN-ET-2019-3829',
    'Ethiopian Nursing Council',
    '2027-01-15',
    26,
    'full_time',
    22000.00,
    800.00,
    0.00,
    'active',
    '2020-03-10'
  ),
  (
    'a1111111-0001-0000-0000-000000000004',
    '11111111-1111-1111-1111-111111111104',
    '00000000-0000-0000-0000-000000000001',
    'EMP-004',
    'Pharmacy',
    'Chief Clinical Pharmacist & Toxicologist',
    'Clinical Pharmacogenomics',
    'PH-ET-2017-4821',
    'Ethiopian Food & Drug Authority (EFDA)',
    '2026-11-30',
    40,
    'full_time',
    29000.00,
    750.00,
    5.00,
    'active',
    '2019-09-01'
  ),
  (
    'a1111111-0001-0000-0000-000000000005',
    '11111111-1111-1111-1111-111111111105',
    '00000000-0000-0000-0000-000000000001',
    'EMP-005',
    'Cardiopulmonary Rehabilitation',
    'Doctor of Physical Therapy (DPT)',
    'Cardiopulmonary & Neuro-Rehabilitation',
    'PT-ET-2021-0029',
    'Ministry of Health Ethiopia',
    '2026-10-15',
    30,
    'full_time',
    26000.00,
    600.00,
    8.00,
    'active',
    '2022-02-01'
  ),
  (
    'a1111111-0001-0000-0000-000000000006',
    '11111111-1111-1111-1111-111111111106',
    '00000000-0000-0000-0000-000000000001',
    'EMP-006',
    'Nutrition',
    'Lead Medical Nutrition Specialist',
    'Diabetic Dietetics & Metabolic Support',
    'DT-ET-2022-5501',
    'Ministry of Health Ethiopia',
    '2027-08-20',
    22,
    'full_time',
    23500.00,
    500.00,
    5.00,
    'active',
    '2022-05-15'
  ),
  (
    'a1111111-0001-0000-0000-000000000007',
    '11111111-1111-1111-1111-111111111107',
    '00000000-0000-0000-0000-000000000001',
    'EMP-007',
    'Social Work',
    'Senior Clinical Social Worker & SDOH Lead',
    'Medical Social Work & Patient Advocacy',
    'SW-ET-2020-8812',
    'Ministry of Women and Social Affairs',
    '2027-03-31',
    18,
    'full_time',
    21000.00,
    400.00,
    0.00,
    'active',
    '2021-08-20'
  ),
  (
    'a1111111-0001-0000-0000-000000000008',
    '11111111-1111-1111-1111-111111111108',
    '00000000-0000-0000-0000-000000000001',
    'EMP-008',
    'Laboratory',
    'Senior Molecular Biologist & Lab Director',
    'Molecular Genomics & Pathology',
    'LB-ET-2018-7744',
    'Ethiopian Public Health Institute',
    '2026-09-30',
    52,
    'full_time',
    38000.00,
    1200.00,
    10.00,
    'active',
    '2020-01-10'
  ),
  (
    'a1111111-0001-0000-0000-000000000009',
    '11111111-1111-1111-1111-111111111109',
    '00000000-0000-0000-0000-000000000001',
    'EMP-009',
    'Clinical Operations',
    'Hospital Operations Administrator',
    'Health Systems Administration',
    'HA-ET-2016-1002',
    'Ethiopian Management Institute',
    '2028-12-31',
    35,
    'full_time',
    35000.00,
    1000.00,
    0.00,
    'active',
    '2018-11-01'
  ),
  (
    'a1111111-0001-0000-0000-000000000010',
    '5c254614-7cb0-4e72-a7cb-7bbe0a98c42d',
    '00000000-0000-0000-0000-000000000001',
    'EMP-010',
    'System Administration',
    'Chief Medical Systems Administrator',
    'Clinical Informatics & Enterprise IT',
    'IT-ET-2022-9900',
    'Ethiopian Communications Authority',
    '2029-01-01',
    60,
    'full_time',
    45000.00,
    1500.00,
    0.00,
    'active',
    '2020-01-01'
  )
ON CONFLICT (user_id) DO UPDATE SET
  department = EXCLUDED.department,
  designation = EXCLUDED.designation,
  specialization = EXCLUDED.specialization,
  license_number = EXCLUDED.license_number,
  license_expiry_date = EXCLUDED.license_expiry_date,
  base_salary_etb = EXCLUDED.base_salary_etb,
  status = EXCLUDED.status;

-- Sync users.department with staff_profiles.department
UPDATE users u
SET department = sp.department
FROM staff_profiles sp
WHERE u.id = sp.user_id;

-- Seed Standard Duty Rosters for Primary Departments
INSERT INTO duty_rosters (id, tenant_id, department, shift_name, shift_template, start_time, end_time, required_doctors, required_nurses, required_support_staff, created_by)
VALUES
  ('b1111111-0001-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Emergency', 'Emergency Morning Triage', 'morning', '07:00', '15:00', 2, 4, 2, '11111111-1111-1111-1111-111111111101'),
  ('b1111111-0001-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Emergency', 'Emergency Evening Resuscitation', 'evening', '15:00', '23:00', 2, 3, 2, '11111111-1111-1111-1111-111111111101'),
  ('b1111111-0001-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Emergency', 'Emergency Night Coverage', 'night', '23:00', '07:00', 1, 2, 1, '11111111-1111-1111-1111-111111111101'),
  ('b1111111-0001-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Internal Medicine', 'Inpatient Ward Rounds', 'ward_rounds', '08:00', '14:00', 2, 2, 1, '11111111-1111-1111-1111-111111111101'),
  ('b1111111-0001-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Advanced Primary Care', 'Outpatient Clinic Morning', 'morning', '08:00', '16:00', 1, 2, 1, '11111111-1111-1111-1111-111111111101'),
  ('b1111111-0001-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Laboratory', 'Diagnostic Lab Testing Morning', 'morning', '07:30', '15:30', 0, 1, 3, '11111111-1111-1111-1111-111111111101'),
  ('b1111111-0001-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Pharmacy', 'Dispensary Shift Morning', 'morning', '08:00', '16:00', 0, 0, 2, '11111111-1111-1111-1111-111111111101')
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Staff Shifts for the current week
INSERT INTO staff_shifts (roster_id, staff_id, shift_date, status)
VALUES
  ('b1111111-0001-0000-0000-000000000004', 'a1111111-0001-0000-0000-000000000001', CURRENT_DATE, 'scheduled'),
  ('b1111111-0001-0000-0000-000000000005', 'a1111111-0001-0000-0000-000000000002', CURRENT_DATE, 'scheduled'),
  ('b1111111-0001-0000-0000-000000000001', 'a1111111-0001-0000-0000-000000000003', CURRENT_DATE, 'scheduled'),
  ('b1111111-0001-0000-0000-000000000007', 'a1111111-0001-0000-0000-000000000004', CURRENT_DATE, 'scheduled'),
  ('b1111111-0001-0000-0000-000000000006', 'a1111111-0001-0000-0000-000000000008', CURRENT_DATE, 'scheduled')
ON CONFLICT DO NOTHING;

-- Seed Sample Attendance for Today
INSERT INTO staff_attendance (staff_id, attendance_date, clock_in, regular_hours, overtime_hours, verification_method, status)
VALUES
  ('a1111111-0001-0000-0000-000000000001', CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '4 hours', 4.00, 0.00, 'biometric', 'present'),
  ('a1111111-0001-0000-0000-000000000002', CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '3 hours 50 minutes', 3.80, 0.00, 'pin', 'present'),
  ('a1111111-0001-0000-0000-000000000003', CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '3 hours', 3.00, 0.00, 'biometric', 'present'),
  ('a1111111-0001-0000-0000-000000000004', CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '2 hours 45 minutes', 2.75, 0.00, 'pin', 'late')
ON CONFLICT DO NOTHING;

-- Seed Sample Leave Requests
INSERT INTO leave_requests (id, staff_id, tenant_id, leave_type, start_date, end_date, total_days, reason, status)
VALUES
  ('c1111111-0001-0000-0000-000000000001', 'a1111111-0001-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'clinical_cme', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '10 days', 4, 'Annual Clinical Genetics & Molecular Pathology Symposium', 'pending'),
  ('c1111111-0001-0000-0000-000000000002', 'a1111111-0001-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'annual', CURRENT_DATE + INTERVAL '14 days', CURRENT_DATE + INTERVAL '21 days', 7, 'Scheduled Annual Leave for Family Travel', 'approved_by_hod')
ON CONFLICT (id) DO NOTHING;
