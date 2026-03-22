CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE app_role AS ENUM ('ADMIN', 'DOCTOR', 'PATIENT');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');
CREATE TYPE doctor_patient_status AS ENUM ('ACTIVE', 'PENDING', 'ARCHIVED');
CREATE TYPE appointment_type AS ENUM ('IN_PERSON', 'VIRTUAL', 'FOLLOW_UP');
CREATE TYPE appointment_status AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');
CREATE TYPE prescription_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');
CREATE TYPE medication_status AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED');
CREATE TYPE medication_log_status AS ENUM ('SCHEDULED', 'TAKEN', 'SKIPPED', 'MISSED');
CREATE TYPE medical_record_type AS ENUM ('CONSULTATION', 'LAB_RESULT', 'VITAL', 'IMMUNIZATION', 'ALLERGY', 'IMAGING', 'DISCHARGE', 'OTHER');
CREATE TYPE reminder_related_type AS ENUM ('APPOINTMENT', 'MEDICATION', 'GENERAL');
CREATE TYPE reminder_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');
CREATE TYPE notification_channel AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS');
CREATE TYPE device_platform AS ENUM ('ANDROID', 'IOS', 'WEB');
CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role app_role NOT NULL,
  status user_status NOT NULL DEFAULT 'ACTIVE',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  license_number VARCHAR(120) NOT NULL UNIQUE,
  specialty VARCHAR(150) NOT NULL,
  clinic_name VARCHAR(180),
  years_experience INT NOT NULL DEFAULT 0,
  gender gender_type DEFAULT 'PREFER_NOT_TO_SAY',
  date_of_birth DATE,
  bio TEXT,
  consultation_fee NUMERIC(12, 2),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  primary_doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL,
  gender gender_type DEFAULT 'PREFER_NOT_TO_SAY',
  date_of_birth DATE,
  blood_group VARCHAR(5),
  genotype VARCHAR(10),
  emergency_contact_name VARCHAR(160),
  emergency_contact_phone VARCHAR(20),
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(120),
  state VARCHAR(120),
  country VARCHAR(120),
  height_cm NUMERIC(5, 2),
  weight_kg NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL DEFAULT 'en',
  timezone VARCHAR(100) NOT NULL DEFAULT 'Africa/Lagos',
  date_format VARCHAR(20) NOT NULL DEFAULT 'dd/MM/yyyy',
  push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  appointment_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  medication_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device_name VARCHAR(120),
  device_ip VARCHAR(64),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform device_platform NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE doctor_patient_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  relationship_status doctor_patient_status NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (doctor_id, patient_id)
);

CREATE TABLE doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INT NOT NULL DEFAULT 30 CHECK (slot_duration_minutes > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE RESTRICT,
  booked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  appointment_type appointment_type NOT NULL DEFAULT 'IN_PERSON',
  status appointment_status NOT NULL DEFAULT 'SCHEDULED',
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  reason TEXT,
  notes TEXT,
  location TEXT,
  meeting_link TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (scheduled_end > scheduled_start)
);

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  status prescription_status NOT NULL DEFAULT 'ACTIVE',
  diagnosis TEXT,
  instructions TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medication_name VARCHAR(180) NOT NULL,
  strength VARCHAR(80),
  dosage VARCHAR(120) NOT NULL,
  frequency VARCHAR(120) NOT NULL,
  route VARCHAR(120),
  duration_days INT,
  refill_count INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(180) NOT NULL,
  strength VARCHAR(80),
  dosage_form VARCHAR(120),
  dosage_instructions TEXT NOT NULL,
  frequency VARCHAR(120) NOT NULL,
  route VARCHAR(120),
  start_date DATE NOT NULL,
  end_date DATE,
  reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  status medication_status NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  status medication_log_status NOT NULL DEFAULT 'SCHEDULED',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  condition_name VARCHAR(180) NOT NULL,
  status VARCHAR(80),
  diagnosed_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  allergen VARCHAR(180) NOT NULL,
  reaction TEXT,
  severity VARCHAR(80),
  noted_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  recorded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  systolic INT,
  diastolic INT,
  heart_rate INT,
  temperature_c NUMERIC(4, 1),
  oxygen_saturation NUMERIC(5, 2),
  glucose_level NUMERIC(7, 2),
  weight_kg NUMERIC(5, 2),
  height_cm NUMERIC(5, 2),
  bmi NUMERIC(5, 2),
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  record_type medical_record_type NOT NULL,
  title VARCHAR(180) NOT NULL,
  summary TEXT,
  source VARCHAR(160),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE medical_record_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(120),
  file_size_bytes BIGINT,
  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE file_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_asset_id VARCHAR(255),
  url TEXT NOT NULL,
  mime_type VARCHAR(120),
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  related_type reminder_related_type NOT NULL,
  related_id UUID,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status reminder_status NOT NULL DEFAULT 'PENDING',
  channel notification_channel NOT NULL DEFAULT 'IN_APP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(120) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(120) NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_doctor_patient_links_doctor_id ON doctor_patient_links(doctor_id);
CREATE INDEX idx_doctor_patient_links_patient_id ON doctor_patient_links(patient_id);
CREATE INDEX idx_appointments_doctor_time ON appointments(doctor_id, scheduled_start);
CREATE INDEX idx_appointments_patient_time ON appointments(patient_id, scheduled_start);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_medications_patient_id ON medications(patient_id);
CREATE INDEX idx_medication_logs_medication_id ON medication_logs(medication_id);
CREATE INDEX idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX idx_reminders_user_time ON reminders(user_id, scheduled_for);
CREATE INDEX idx_notifications_user_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER doctor_profiles_set_updated_at
BEFORE UPDATE ON doctor_profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER patient_profiles_set_updated_at
BEFORE UPDATE ON patient_profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_settings_set_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER device_tokens_set_updated_at
BEFORE UPDATE ON device_tokens
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER doctor_patient_links_set_updated_at
BEFORE UPDATE ON doctor_patient_links
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER doctor_availability_set_updated_at
BEFORE UPDATE ON doctor_availability
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER appointments_set_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER prescriptions_set_updated_at
BEFORE UPDATE ON prescriptions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER medications_set_updated_at
BEFORE UPDATE ON medications
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER patient_conditions_set_updated_at
BEFORE UPDATE ON patient_conditions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER patient_allergies_set_updated_at
BEFORE UPDATE ON patient_allergies
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER medical_records_set_updated_at
BEFORE UPDATE ON medical_records
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER reminders_set_updated_at
BEFORE UPDATE ON reminders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
