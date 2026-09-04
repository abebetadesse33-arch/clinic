-- ============================================================
-- PHARMACY AUTOMATION MIGRATION
-- Adds dispensing queue, notification tables, and prescription
-- delivery/nurse assignment columns
-- ============================================================

-- 1. Pharmacy Dispensing Queue
-- ============================================================
CREATE TABLE IF NOT EXISTS pharmacy_dispensing_queue (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  prescription_id     UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id           UUID NOT NULL REFERENCES users(id),
  pharmacist_id       UUID REFERENCES users(id),
  nurse_id            UUID REFERENCES users(id),
  status              TEXT NOT NULL DEFAULT 'awaiting_payment'
                        CHECK (status IN (
                          'awaiting_payment',
                          'payment_verified',
                          'being_dispensed',
                          'ready_for_pickup',
                          'dispatched_to_nurse',
                          'nurse_received',
                          'administered',
                          'completed',
                          'cancelled'
                        )),
  delivery_method     TEXT NOT NULL DEFAULT 'pickup'
                        CHECK (delivery_method IN ('pickup', 'nurse_delivery', 'bedside')),
  ward_id             TEXT,
  bed_number          TEXT,
  priority            TEXT NOT NULL DEFAULT 'routine'
                        CHECK (priority IN ('routine', 'urgent', 'stat')),
  medication_name     TEXT NOT NULL,
  dosage              TEXT NOT NULL,
  quantity            INTEGER NOT NULL DEFAULT 1,
  total_price         NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  currency            VARCHAR(10) NOT NULL DEFAULT 'ETB',
  payment_verified_at TIMESTAMP WITH TIME ZONE,
  dispensed_at        TIMESTAMP WITH TIME ZONE,
  dispatched_at       TIMESTAMP WITH TIME ZONE,
  nurse_received_at   TIMESTAMP WITH TIME ZONE,
  completed_at        TIMESTAMP WITH TIME ZONE,
  pharmacist_notes    TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pharm_queue_status      ON pharmacy_dispensing_queue(status);
CREATE INDEX IF NOT EXISTS idx_pharm_queue_patient     ON pharmacy_dispensing_queue(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharm_queue_prescription ON pharmacy_dispensing_queue(prescription_id);
CREATE INDEX IF NOT EXISTS idx_pharm_queue_nurse       ON pharmacy_dispensing_queue(nurse_id);
CREATE INDEX IF NOT EXISTS idx_pharm_queue_tenant      ON pharmacy_dispensing_queue(tenant_id);


-- 2. Pharmacy Notifications (in-app + outbound)
-- ============================================================
CREATE TABLE IF NOT EXISTS pharmacy_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  queue_item_id   UUID REFERENCES pharmacy_dispensing_queue(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
  recipient_id    UUID NOT NULL REFERENCES users(id),
  recipient_role  TEXT NOT NULL CHECK (recipient_role IN ('patient', 'pharmacist', 'nurse', 'doctor', 'admin')),
  channel         TEXT NOT NULL DEFAULT 'in_app'
                    CHECK (channel IN ('in_app', 'sms', 'whatsapp', 'email')),
  event_type      TEXT NOT NULL CHECK (event_type IN (
                    'prescription_signed',
                    'payment_requested',
                    'payment_confirmed',
                    'dispense_started',
                    'ready_for_pickup',
                    'dispatched_to_nurse',
                    'nurse_received',
                    'medicine_administered',
                    'low_stock_alert',
                    'expiry_alert'
                  )),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  read_at         TIMESTAMP WITH TIME ZONE,
  sent_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pharm_notif_recipient  ON pharmacy_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_pharm_notif_read       ON pharmacy_notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_pharm_notif_event      ON pharmacy_notifications(event_type);


-- 3. Extend prescriptions table with delivery/nurse columns
-- ============================================================
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS nurse_id         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS ward_id          TEXT,
  ADD COLUMN IF NOT EXISTS bed_number       TEXT,
  ADD COLUMN IF NOT EXISTS delivery_method  TEXT DEFAULT 'pickup'
                                              CHECK (delivery_method IN ('pickup', 'nurse_delivery', 'bedside')),
  ADD COLUMN IF NOT EXISTS patient_notified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS doctor_notified_at  TIMESTAMP WITH TIME ZONE;


-- 4. Pharmacy Inventory Alerts table for proactive low-stock/expiry alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS pharmacy_inventory_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  drug_id       UUID REFERENCES drug_catalog(id) ON DELETE CASCADE,
  batch_id      UUID REFERENCES drug_batches(id) ON DELETE CASCADE,
  alert_type    TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'near_expiry', 'expired', 'out_of_stock')),
  threshold     INTEGER,
  current_value INTEGER,
  acknowledged  BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inv_alerts_type     ON pharmacy_inventory_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_inv_alerts_drug     ON pharmacy_inventory_alerts(drug_id);
CREATE INDEX IF NOT EXISTS idx_inv_alerts_ack      ON pharmacy_inventory_alerts(acknowledged);
