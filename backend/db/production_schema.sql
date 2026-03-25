CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE app_role AS ENUM ('ADMIN', 'DOCTOR', 'PATIENT');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');
CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
CREATE TYPE appointment_type AS ENUM ('IN_PERSON', 'VIRTUAL', 'FOLLOW_UP', 'EMERGENCY');
CREATE TYPE appointment_status AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');
CREATE TYPE prescription_status AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');
CREATE TYPE medication_status AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED');
CREATE TYPE medication_schedule_type AS ENUM ('DAILY', 'WEEKLY', 'INTERVAL', 'ONE_TIME', 'AS_NEEDED');
CREATE TYPE reminder_type AS ENUM ('APPOINTMENT', 'MEDICATION', 'PRESCRIPTION', 'GENERAL');
CREATE TYPE reminder_status AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');
CREATE TYPE notification_channel AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS');
CREATE TYPE notification_status AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ');
CREATE TYPE medical_record_type AS ENUM ('CONSULTATION', 'LAB_RESULT', 'VITAL', 'IMMUNIZATION', 'ALLERGY', 'IMAGING', 'DISCHARGE', 'OTHER');
CREATE TYPE storage_provider AS ENUM ('S3', 'CLOUDINARY', 'LOCAL', 'OTHER');
CREATE TYPE file_category AS ENUM ('AVATAR', 'PRESCRIPTION_ATTACHMENT', 'MEDICAL_RECORD_ATTACHMENT', 'LAB_RESULT', 'ID_DOCUMENT', 'OTHER');

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_doctor_user_role()
RETURNS TRIGGER AS $$
DECLARE
  referenced_role app_role;
BEGIN
  SELECT role INTO referenced_role
  FROM users
  WHERE id = NEW.user_id;

  IF referenced_role IS NULL THEN
    RAISE EXCEPTION 'Doctor user_id % does not exist.', NEW.user_id;
  END IF;

  IF referenced_role <> 'DOCTOR' THEN
    RAISE EXCEPTION 'User % must have role DOCTOR to exist in doctors.', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_patient_user_role()
RETURNS TRIGGER AS $$
DECLARE
  referenced_role app_role;
BEGIN
  SELECT role INTO referenced_role
  FROM users
  WHERE id = NEW.user_id;

  IF referenced_role IS NULL THEN
    RAISE EXCEPTION 'Patient user_id % does not exist.', NEW.user_id;
  END IF;

  IF referenced_role <> 'PATIENT' THEN
    RAISE EXCEPTION 'User % must have role PATIENT to exist in patients.', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_admin_log_user_role()
RETURNS TRIGGER AS $$
DECLARE
  referenced_role app_role;
BEGIN
  IF NEW.admin_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO referenced_role
  FROM users
  WHERE id = NEW.admin_user_id;

  IF referenced_role IS NULL THEN
    RAISE EXCEPTION 'Admin log user % does not exist.', NEW.admin_user_id;
  END IF;

  IF referenced_role <> 'ADMIN' THEN
    RAISE EXCEPTION 'User % must have role ADMIN to exist in admin_logs.', NEW.admin_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role app_role NOT NULL,
  status user_status NOT NULL DEFAULT 'ACTIVE',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  last_login_at TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  license_number VARCHAR(120) NOT NULL UNIQUE,
  specialty VARCHAR(150) NOT NULL,
  clinic_name VARCHAR(180),
  consultation_fee NUMERIC(12, 2) CHECK (consultation_fee IS NULL OR consultation_fee >= 0),
  years_experience INTEGER NOT NULL DEFAULT 0 CHECK (years_experience >= 0),
  gender gender_type DEFAULT 'PREFER_NOT_TO_SAY',
  date_of_birth DATE,
  bio TEXT,
  verified_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  primary_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
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
  height_cm NUMERIC(5, 2) CHECK (height_cm IS NULL OR height_cm >= 0),
  weight_kg NUMERIC(5, 2) CHECK (weight_kg IS NULL OR weight_kg >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  booked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  appointment_type appointment_type NOT NULL DEFAULT 'IN_PERSON',
  status appointment_status NOT NULL DEFAULT 'SCHEDULED',
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  reason TEXT,
  symptoms TEXT,
  notes TEXT,
  location TEXT,
  meeting_url TEXT,
  canceled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  checked_in_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (scheduled_end > scheduled_start)
);

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  status prescription_status NOT NULL DEFAULT 'ACTIVE',
  diagnosis TEXT,
  instructions TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  start_date DATE,
  end_date DATE,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  discontinued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  prescribed_by_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  name VARCHAR(180) NOT NULL,
  generic_name VARCHAR(180),
  strength VARCHAR(80),
  dosage_form VARCHAR(120),
  route VARCHAR(120),
  indication TEXT,
  instructions TEXT NOT NULL,
  quantity VARCHAR(80),
  refill_count INTEGER NOT NULL DEFAULT 0 CHECK (refill_count >= 0),
  start_date DATE NOT NULL,
  end_date DATE,
  reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  status medication_status NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE medication_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  schedule_type medication_schedule_type NOT NULL,
  days_of_week SMALLINT[] CHECK (days_of_week IS NULL OR days_of_week <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]),
  specific_date DATE,
  scheduled_time TIME NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  interval_hours SMALLINT CHECK (interval_hours IS NULL OR interval_hours > 0),
  dosage_amount NUMERIC(10, 2) CHECK (dosage_amount IS NULL OR dosage_amount >= 0),
  dosage_unit VARCHAR(30),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date),
  CHECK (schedule_type <> 'ONE_TIME' OR specific_date IS NOT NULL),
  CHECK (schedule_type <> 'INTERVAL' OR interval_hours IS NOT NULL),
  CHECK (schedule_type <> 'WEEKLY' OR days_of_week IS NOT NULL)
);

CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  medication_schedule_id UUID REFERENCES medication_schedules(id) ON DELETE CASCADE,
  reminder_type reminder_type NOT NULL,
  channel notification_channel NOT NULL DEFAULT 'IN_APP',
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status reminder_status NOT NULL DEFAULT 'PENDING',
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  record_type medical_record_type NOT NULL,
  title VARCHAR(180) NOT NULL,
  summary TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  notes TEXT,
  source_system VARCHAR(160),
  external_reference VARCHAR(160),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recorded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  systolic_bp SMALLINT CHECK (systolic_bp IS NULL OR systolic_bp > 0),
  diastolic_bp SMALLINT CHECK (diastolic_bp IS NULL OR diastolic_bp > 0),
  heart_rate SMALLINT CHECK (heart_rate IS NULL OR heart_rate > 0),
  respiratory_rate SMALLINT CHECK (respiratory_rate IS NULL OR respiratory_rate > 0),
  temperature_c NUMERIC(4, 1) CHECK (temperature_c IS NULL OR temperature_c >= 0),
  oxygen_saturation NUMERIC(5, 2) CHECK (oxygen_saturation IS NULL OR oxygen_saturation >= 0),
  blood_glucose_mg_dl NUMERIC(7, 2) CHECK (blood_glucose_mg_dl IS NULL OR blood_glucose_mg_dl >= 0),
  weight_kg NUMERIC(5, 2) CHECK (weight_kg IS NULL OR weight_kg >= 0),
  height_cm NUMERIC(5, 2) CHECK (height_cm IS NULL OR height_cm >= 0),
  bmi NUMERIC(5, 2) CHECK (bmi IS NULL OR bmi >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL,
  notification_type VARCHAR(120) NOT NULL,
  channel notification_channel NOT NULL,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::JSONB,
  delivery_status notification_status NOT NULL DEFAULT 'QUEUED',
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(120) NOT NULL,
  target_table VARCHAR(120) NOT NULL,
  target_id UUID,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  storage_provider storage_provider NOT NULL,
  file_category file_category NOT NULL,
  bucket_name VARCHAR(120),
  object_key VARCHAR(255) NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  stored_file_name VARCHAR(255),
  mime_type VARCHAR(120) NOT NULL,
  file_extension VARCHAR(20),
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes >= 0),
  checksum_sha256 CHAR(64),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role_status ON users(role, status);

CREATE INDEX idx_doctors_specialty ON doctors(specialty);
CREATE INDEX idx_doctors_clinic_name ON doctors(clinic_name);
CREATE INDEX idx_doctors_verified_by_user_id ON doctors(verified_by_user_id);

CREATE INDEX idx_patients_primary_doctor_id ON patients(primary_doctor_id);
CREATE INDEX idx_patients_location ON patients(city, state, country);

CREATE INDEX idx_appointments_doctor_start ON appointments(doctor_id, scheduled_start);
CREATE INDEX idx_appointments_patient_start ON appointments(patient_id, scheduled_start);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_start_status ON appointments(scheduled_start, status);

CREATE INDEX idx_prescriptions_patient_issued_at ON prescriptions(patient_id, issued_at DESC);
CREATE INDEX idx_prescriptions_doctor_issued_at ON prescriptions(doctor_id, issued_at DESC);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_appointment_id ON prescriptions(appointment_id);

CREATE INDEX idx_medications_patient_status ON medications(patient_id, status);
CREATE INDEX idx_medications_prescription_id ON medications(prescription_id);
CREATE INDEX idx_medications_doctor_id ON medications(prescribed_by_doctor_id);

CREATE INDEX idx_medication_schedules_medication_active ON medication_schedules(medication_id, is_active);
CREATE INDEX idx_medication_schedules_patient_active ON medication_schedules(patient_id, is_active);
CREATE INDEX idx_medication_schedules_type_time ON medication_schedules(schedule_type, scheduled_time);

CREATE INDEX idx_reminders_user_scheduled_for ON reminders(user_id, scheduled_for);
CREATE INDEX idx_reminders_status_scheduled_for ON reminders(status, scheduled_for);
CREATE INDEX idx_reminders_appointment_id ON reminders(appointment_id);
CREATE INDEX idx_reminders_medication_schedule_id ON reminders(medication_schedule_id);

CREATE INDEX idx_medical_records_patient_recorded_at ON medical_records(patient_id, recorded_at DESC);
CREATE INDEX idx_medical_records_doctor_recorded_at ON medical_records(doctor_id, recorded_at DESC);
CREATE INDEX idx_medical_records_appointment_id ON medical_records(appointment_id);
CREATE INDEX idx_medical_records_record_type ON medical_records(record_type);

CREATE INDEX idx_vital_signs_patient_recorded_at ON vital_signs(patient_id, recorded_at DESC);
CREATE INDEX idx_vital_signs_appointment_id ON vital_signs(appointment_id);
CREATE INDEX idx_vital_signs_medical_record_id ON vital_signs(medical_record_id);

CREATE INDEX idx_notifications_user_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_read_at ON notifications(user_id, read_at);
CREATE INDEX idx_notifications_delivery_status_created_at ON notifications(delivery_status, created_at DESC);

CREATE INDEX idx_admin_logs_admin_created_at ON admin_logs(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_logs_target ON admin_logs(target_table, target_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);

CREATE INDEX idx_uploaded_files_medical_record_id ON uploaded_files(medical_record_id);
CREATE INDEX idx_uploaded_files_patient_id ON uploaded_files(patient_id);
CREATE INDEX idx_uploaded_files_doctor_id ON uploaded_files(doctor_id);
CREATE INDEX idx_uploaded_files_uploader_created_at ON uploaded_files(uploaded_by_user_id, created_at DESC);
CREATE UNIQUE INDEX uq_uploaded_files_checksum_sha256
  ON uploaded_files(checksum_sha256)
  WHERE checksum_sha256 IS NOT NULL;

CREATE TRIGGER doctors_enforce_user_role
BEFORE INSERT OR UPDATE ON doctors
FOR EACH ROW
EXECUTE FUNCTION enforce_doctor_user_role();

CREATE TRIGGER patients_enforce_user_role
BEFORE INSERT OR UPDATE ON patients
FOR EACH ROW
EXECUTE FUNCTION enforce_patient_user_role();

CREATE TRIGGER admin_logs_enforce_user_role
BEFORE INSERT OR UPDATE ON admin_logs
FOR EACH ROW
EXECUTE FUNCTION enforce_admin_log_user_role();

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER doctors_set_updated_at
BEFORE UPDATE ON doctors
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER patients_set_updated_at
BEFORE UPDATE ON patients
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

CREATE TRIGGER medication_schedules_set_updated_at
BEFORE UPDATE ON medication_schedules
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER reminders_set_updated_at
BEFORE UPDATE ON reminders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER medical_records_set_updated_at
BEFORE UPDATE ON medical_records
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER uploaded_files_set_updated_at
BEFORE UPDATE ON uploaded_files
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
