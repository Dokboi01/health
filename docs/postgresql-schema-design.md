# CareAxis PostgreSQL Schema Design

This document defines a production-ready PostgreSQL schema for the health app with the following primary tables:

- `users`
- `doctors`
- `patients`
- `appointments`
- `prescriptions`
- `medications`
- `medication_schedules`
- `reminders`
- `medical_records`
- `vital_signs`
- `notifications`
- `admin_logs`
- `uploaded_files`

The full SQL implementation is provided in [production_schema.sql](/C:/Users/adedo/.gemini/health/backend/db/production_schema.sql).

## Design principles

- UUID primary keys for scalability across distributed systems
- UTC-aware timestamps using `TIMESTAMPTZ`
- role isolation through dedicated `doctors` and `patients` tables
- explicit foreign keys for clinical relationships
- strong `CHECK`, `UNIQUE`, and enum constraints
- indexed access paths for dashboards, reminders, and patient timelines
- soft-relationship support where records may remain after user/profile changes
- generic uploaded file model with medical record linkage and auditability

## Shared conventions

- Primary keys use `UUID DEFAULT gen_random_uuid()`
- Every mutable business table includes `created_at` and `updated_at`
- `updated_at` is maintained by a shared trigger
- Email is globally unique in `users`
- Sensitive audit and admin actions are never deleted by cascade from logs

## Table catalog

### 1. `users`

Purpose: central identity table for all app users.

Primary key:
- `id UUID`

Columns:
- `id UUID`
- `email CITEXT`
- `password_hash TEXT`
- `role app_role`
- `status user_status`
- `first_name VARCHAR(100)`
- `last_name VARCHAR(100)`
- `phone VARCHAR(20)`
- `avatar_url TEXT`
- `last_login_at TIMESTAMPTZ`
- `email_verified_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Foreign keys:
- None

Constraints:
- `email` unique and required
- `first_name`, `last_name`, `password_hash`, `role`, `status` required

Indexes:
- unique index on `email`
- index on `(role, status)`

### 2. `doctors`

Purpose: doctor-specific professional profile and licensing data.

Primary key:
- `id UUID`

Columns:
- `id UUID`
- `user_id UUID`
- `license_number VARCHAR(120)`
- `specialty VARCHAR(150)`
- `clinic_name VARCHAR(180)`
- `consultation_fee NUMERIC(12,2)`
- `years_experience INTEGER`
- `gender gender_type`
- `date_of_birth DATE`
- `bio TEXT`
- `verified_by_user_id UUID`
- `verified_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Foreign keys:
- `user_id -> users(id)`
- `verified_by_user_id -> users(id)`

Constraints:
- unique `user_id`
- unique `license_number`
- `years_experience >= 0`
- role-enforcement trigger ensures referenced user has role `DOCTOR`

Indexes:
- unique index on `user_id`
- unique index on `license_number`
- index on `specialty`
- index on `clinic_name`

### 3. `patients`

Purpose: patient-specific demographic and emergency profile data.

Primary key:
- `id UUID`

Columns:
- `id UUID`
- `user_id UUID`
- `primary_doctor_id UUID`
- `gender gender_type`
- `date_of_birth DATE`
- `blood_group VARCHAR(5)`
- `genotype VARCHAR(10)`
- `emergency_contact_name VARCHAR(160)`
- `emergency_contact_phone VARCHAR(20)`
- `address_line_1 VARCHAR(255)`
- `address_line_2 VARCHAR(255)`
- `city VARCHAR(120)`
- `state VARCHAR(120)`
- `country VARCHAR(120)`
- `height_cm NUMERIC(5,2)`
- `weight_kg NUMERIC(5,2)`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Foreign keys:
- `user_id -> users(id)`
- `primary_doctor_id -> doctors(id)`

Constraints:
- unique `user_id`
- role-enforcement trigger ensures referenced user has role `PATIENT`
- height and weight must be non-negative when provided

Indexes:
- unique index on `user_id`
- index on `primary_doctor_id`
- index on `(city, state, country)`

### 4. `appointments`

Purpose: appointment lifecycle and scheduling.

Primary key:
- `id UUID`

Columns:
- `id UUID`
- `doctor_id UUID`
- `patient_id UUID`
- `booked_by_user_id UUID`
- `appointment_type appointment_type`
- `status appointment_status`
- `scheduled_start TIMESTAMPTZ`
- `scheduled_end TIMESTAMPTZ`
- `reason TEXT`
- `symptoms TEXT`
- `notes TEXT`
- `location TEXT`
- `meeting_url TEXT`
- `canceled_by_user_id UUID`
- `canceled_at TIMESTAMPTZ`
- `cancellation_reason TEXT`
- `checked_in_at TIMESTAMPTZ`
- `completed_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Foreign keys:
- `doctor_id -> doctors(id)`
- `patient_id -> patients(id)`
- `booked_by_user_id -> users(id)`
- `canceled_by_user_id -> users(id)`

Constraints:
- `scheduled_end > scheduled_start`
- doctor and patient are required

Indexes:
- index on `(doctor_id, scheduled_start)`
- index on `(patient_id, scheduled_start)`
- index on `status`
- index on `(scheduled_start, status)`

### 5. `prescriptions`

Purpose: doctor-issued prescription headers.

Primary key:
- `id UUID`

Columns:
- `id UUID`
- `doctor_id UUID`
- `patient_id UUID`
- `appointment_id UUID`
- `status prescription_status`
- `diagnosis TEXT`
- `instructions TEXT`
- `issued_at TIMESTAMPTZ`
- `start_date DATE`
- `end_date DATE`
- `approved_by_user_id UUID`
- `approved_at TIMESTAMPTZ`
- `discontinued_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Foreign keys:
- `doctor_id -> doctors(id)`
- `patient_id -> patients(id)`
- `appointment_id -> appointments(id)`
- `approved_by_user_id -> users(id)`

Constraints:
- end date must not be before start date

Indexes:
- index on `(patient_id, issued_at DESC)`
- index on `(doctor_id, issued_at DESC)`
- index on `status`
- index on `appointment_id`

### 6. `medications`

Purpose: medication plans generated from prescriptions or self-managed tracking.

Primary key:
- `id UUID`

Columns:
- `id UUID`
- `patient_id UUID`
- `prescription_id UUID`
- `prescribed_by_doctor_id UUID`
- `name VARCHAR(180)`
- `generic_name VARCHAR(180)`
- `strength VARCHAR(80)`
- `dosage_form VARCHAR(120)`
- `route VARCHAR(120)`
- `indication TEXT`
- `instructions TEXT`
- `quantity VARCHAR(80)`
- `refill_count INTEGER`
- `start_date DATE`
- `end_date DATE`
- `reminder_enabled BOOLEAN`
- `status medication_status`
- `notes TEXT`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Foreign keys:
- `patient_id -> patients(id)`
- `prescription_id -> prescriptions(id)`
- `prescribed_by_doctor_id -> doctors(id)`

Constraints:
- `name`, `patient_id`, `start_date`, `status` required
- `refill_count >= 0`
- end date must not be before start date

Indexes:
- index on `(patient_id, status)`
- index on `prescription_id`
- index on `prescribed_by_doctor_id`

### 7. `medication_schedules`

Purpose: recurring or one-time medication reminder scheduling.

Primary key:
- `id UUID`

Columns:
- `id UUID`
- `medication_id UUID`
- `patient_id UUID`
- `schedule_type medication_schedule_type`
- `days_of_week SMALLINT[]`
- `specific_date DATE`
- `scheduled_time TIME`
- `timezone VARCHAR(64)`
- `interval_hours SMALLINT`
- `dosage_amount NUMERIC(10,2)`
- `dosage_unit VARCHAR(30)`
- `start_date DATE`
- `end_date DATE`
- `is_active BOOLEAN`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Foreign keys:
- `medication_id -> medications(id)`
- `patient_id -> patients(id)`

Constraints:
- `scheduled_time` required
- `start_date` required
- `interval_hours > 0` when provided
- `days_of_week` values must be between 0 and 6 when provided
- `specific_date` must be provided for one-time schedules
- end date must not be before start date

Indexes:
- index on `(medication_id, is_active)`
- index on `(patient_id, is_active)`
- index on `(schedule_type, scheduled_time)`

### 8. `reminders`

Purpose: scheduled reminder jobs for appointments, medications, and generic care prompts.

Primary key:
- `id UUID`

Columns:
- `id UUID`
- `user_id UUID`
- `patient_id UUID`
- `doctor_id UUID`
- `appointment_id UUID`
- `medication_id UUID`
- `medication_schedule_id UUID`
- `reminder_type reminder_type`
- `channel notification_channel`
- `title VARCHAR(180)`
- `message TEXT`
- `scheduled_for TIMESTAMPTZ`
- `sent_at TIMESTAMPTZ`
- `status reminder_status`
- `retry_count INTEGER`
- `error_message TEXT`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Foreign keys:
- `user_id -> users(id)`
- `patient_id -> patients(id)`
- `doctor_id -> doctors(id)`
- `appointment_id -> appointments(id)`
- `medication_id -> medications(id)`
- `medication_schedule_id -> medication_schedules(id)`

Constraints:
- `title`, `message`, `scheduled_for`, `status`, and `channel` required
- `retry_count >= 0`

Indexes:
- index on `(user_id, scheduled_for)`
- index on `(status, scheduled_for)`
- index on `appointment_id`
- index on `medication_schedule_id`

### 9. `medical_records`

Purpose: structured clinical notes, lab results, and consultation records.

Primary key:
- `id UUID`

Columns:
- `id UUID`
- `patient_id UUID`
- `doctor_id UUID`
- `appointment_id UUID`
- `record_type medical_record_type`
- `title VARCHAR(180)`
- `summary TEXT`
- `diagnosis TEXT`
- `treatment_plan TEXT`
- `notes TEXT`
- `source_system VARCHAR(160)`
- `external_reference VARCHAR(160)`
- `recorded_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Foreign keys:
- `patient_id -> patients(id)`
- `doctor_id -> doctors(id)`
- `appointment_id -> appointments(id)`

Constraints:
- `patient_id`, `record_type`, and `title` required

Indexes:
- index on `(patient_id, recorded_at DESC)`
- index on `(doctor_id, recorded_at DESC)`
- index on `appointment_id`
- index on `record_type`

### 10. `vital_signs`

Purpose: time-series vital measurement history.

Primary key:
- `id UUID`

Columns:
- `id UUID`
- `patient_id UUID`
- `recorded_by_user_id UUID`
- `appointment_id UUID`
- `medical_record_id UUID`
- `recorded_at TIMESTAMPTZ`
- `systolic_bp SMALLINT`
- `diastolic_bp SMALLINT`
- `heart_rate SMALLINT`
- `respiratory_rate SMALLINT`
- `temperature_c NUMERIC(4,1)`
- `oxygen_saturation NUMERIC(5,2)`
- `blood_glucose_mg_dl NUMERIC(7,2)`
- `weight_kg NUMERIC(5,2)`
- `height_cm NUMERIC(5,2)`
- `bmi NUMERIC(5,2)`
- `notes TEXT`
- `created_at TIMESTAMPTZ`

Foreign keys:
- `patient_id -> patients(id)`
- `recorded_by_user_id -> users(id)`
- `appointment_id -> appointments(id)`
- `medical_record_id -> medical_records(id)`

Constraints:
- `patient_id` and `recorded_at` required
- numeric measurements must be non-negative when provided

Indexes:
- index on `(patient_id, recorded_at DESC)`
- index on `appointment_id`
- index on `medical_record_id`

### 11. `notifications`

Purpose: in-app and multi-channel user notifications.

Primary key:
- `id UUID`

Columns:
- `id UUID`
- `user_id UUID`
- `reminder_id UUID`
- `notification_type VARCHAR(120)`
- `channel notification_channel`
- `title VARCHAR(180)`
- `body TEXT`
- `data JSONB`
- `delivery_status notification_status`
- `sent_at TIMESTAMPTZ`
- `read_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ`

Foreign keys:
- `user_id -> users(id)`
- `reminder_id -> reminders(id)`

Constraints:
- `notification_type`, `channel`, `title`, `body`, and `delivery_status` required
- `data` defaults to empty JSON

Indexes:
- index on `(user_id, created_at DESC)`
- index on `(user_id, read_at)`
- index on `(delivery_status, created_at DESC)`

### 12. `admin_logs`

Purpose: privileged operational audit trail.

Primary key:
- `id UUID`

Columns:
- `id UUID`
- `admin_user_id UUID`
- `action_type VARCHAR(120)`
- `target_table VARCHAR(120)`
- `target_id UUID`
- `description TEXT`
- `metadata JSONB`
- `ip_address INET`
- `user_agent TEXT`
- `created_at TIMESTAMPTZ`

Foreign keys:
- `admin_user_id -> users(id)`

Constraints:
- `action_type` and `target_table` required
- role-enforcement trigger ensures `admin_user_id` belongs to role `ADMIN`

Indexes:
- index on `(admin_user_id, created_at DESC)`
- index on `(target_table, target_id)`
- index on `created_at DESC`

### 13. `uploaded_files`

Purpose: file metadata for medical documents, attachments, and generated assets.

Primary key:
- `id UUID`

Columns:
- `id UUID`
- `uploaded_by_user_id UUID`
- `patient_id UUID`
- `doctor_id UUID`
- `medical_record_id UUID`
- `storage_provider storage_provider`
- `file_category file_category`
- `bucket_name VARCHAR(120)`
- `object_key VARCHAR(255)`
- `original_file_name VARCHAR(255)`
- `stored_file_name VARCHAR(255)`
- `mime_type VARCHAR(120)`
- `file_extension VARCHAR(20)`
- `file_size_bytes BIGINT`
- `checksum_sha256 CHAR(64)`
- `is_public BOOLEAN`
- `file_url TEXT`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Foreign keys:
- `uploaded_by_user_id -> users(id)`
- `patient_id -> patients(id)`
- `doctor_id -> doctors(id)`
- `medical_record_id -> medical_records(id)`

Constraints:
- `storage_provider`, `file_category`, `object_key`, `original_file_name`, `mime_type`, `file_size_bytes`, and `file_url` required
- `file_size_bytes >= 0`
- `checksum_sha256` unique when provided

Indexes:
- index on `medical_record_id`
- index on `patient_id`
- index on `doctor_id`
- index on `(uploaded_by_user_id, created_at DESC)`
- unique index on `checksum_sha256` where not null

## Recommended scalability notes

- Partition `notifications`, `admin_logs`, and optionally `vital_signs` by time as data volume grows
- Add row-level security later if database-enforced tenant-like isolation becomes necessary
- Keep uploaded file binaries out of PostgreSQL and store only metadata in `uploaded_files`
- Use background jobs to materialize reminder execution and notification delivery
- Introduce read models or reporting tables later instead of overloading transactional tables
