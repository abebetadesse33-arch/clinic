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
