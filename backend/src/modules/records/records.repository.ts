import type { PoolClient } from "pg";

import type { PaginatedResult } from "../../common/types/pagination";
import { createPaginationMeta } from "../../common/utils/pagination";
import { runQuery } from "../../config/database";
import type {
  AppointmentSnapshot,
  CreateMedicalRecordFileInput,
  CreatePatientAllergyInput,
  CreateRecordVitalInput,
  MedicalRecordDetail,
  MedicalRecordDoctorSummary,
  MedicalRecordFileRecord,
  MedicalRecordListFilters,
  MedicalRecordPatientSummary,
  MedicalRecordSummary,
  MedicalRecordTestResult,
  PatientAllergyRecord,
  PatientVitalRecord,
  RecordListScope,
  RecordsRepository,
  ResolvedCreateMedicalRecordInput,
  ResolvedUpdateMedicalRecordInput,
  UpdatePatientAllergyInput,
} from "./records.types";

type IdRow = {
  id: string;
};

type MedicalRecordRow = {
  total_count?: string;
  file_count?: string;
  vital_count?: string;
  record_id: string;
  patient_id: string;
  doctor_id: string | null;
  appointment_id: string | null;
  record_type: MedicalRecordSummary["recordType"];
  title: string;
  summary: string | null;
  clinical_notes: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
  source: string | null;
  follow_up_date: string | null;
  test_results: unknown;
  is_visible_to_patient: boolean;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  last_updated_by_user_id: string | null;
  patient_user_id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_blood_group: string | null;
  doctor_user_id: string | null;
  doctor_first_name: string | null;
  doctor_last_name: string | null;
  doctor_email: string | null;
  doctor_specialty: string | null;
  doctor_clinic_name: string | null;
};

type PatientVitalRow = {
  id: string;
  patient_id: string;
  medical_record_id: string | null;
  recorded_by_user_id: string | null;
  systolic: string | null;
  diastolic: string | null;
  heart_rate: string | null;
  temperature_c: string | null;
  oxygen_saturation: string | null;
  glucose_level: string | null;
  weight_kg: string | null;
  height_cm: string | null;
  bmi: string | null;
  notes: string | null;
  recorded_at: string;
  created_at: string;
};

type MedicalRecordFileRow = {
  id: string;
  medical_record_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size_bytes: string | null;
  storage_provider: MedicalRecordFileRecord["storageProvider"];
  provider_asset_id: string | null;
  checksum_sha256: string | null;
  is_patient_visible: boolean;
  uploaded_by_user_id: string | null;
  created_at: string;
};

type PatientAllergyRow = {
  id: string;
  patient_id: string;
  allergen: string;
  reaction: string | null;
  severity: string | null;
  noted_at: string | null;
  created_at: string;
  updated_at: string;
};

type AppointmentSnapshotRow = {
  id: string;
  doctor_id: string;
  patient_id: string;
};

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);

const parseNumber = (value: string | null): number | null => (value === null ? null : Number(value));

const mapTestResults = (value: unknown): MedicalRecordTestResult[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const item = entry as Record<string, unknown>;

      if (typeof item.testName !== "string") {
        return null;
      }

      return {
        testName: item.testName,
        resultValue: typeof item.resultValue === "string" ? item.resultValue : null,
        unit: typeof item.unit === "string" ? item.unit : null,
        referenceRange: typeof item.referenceRange === "string" ? item.referenceRange : null,
        status: typeof item.status === "string" ? (item.status as MedicalRecordTestResult["status"]) : null,
        notes: typeof item.notes === "string" ? item.notes : null,
        recordedAt: typeof item.recordedAt === "string" ? item.recordedAt : null,
      } satisfies MedicalRecordTestResult;
    })
    .filter((entry): entry is MedicalRecordTestResult => entry !== null);
};

const mapMedicalRecordPatient = (row: MedicalRecordRow): MedicalRecordPatientSummary => ({
  patientId: row.patient_id,
  userId: row.patient_user_id,
  firstName: row.patient_first_name,
  lastName: row.patient_last_name,
  email: row.patient_email,
  bloodGroup: row.patient_blood_group,
});

const mapMedicalRecordDoctor = (row: MedicalRecordRow): MedicalRecordDoctorSummary | null => {
  if (
    !row.doctor_id ||
    !row.doctor_user_id ||
    !row.doctor_first_name ||
    !row.doctor_last_name ||
    !row.doctor_email ||
    !row.doctor_specialty
  ) {
    return null;
  }

  return {
    doctorId: row.doctor_id,
    userId: row.doctor_user_id,
    firstName: row.doctor_first_name,
    lastName: row.doctor_last_name,
    email: row.doctor_email,
    specialty: row.doctor_specialty,
    clinicName: row.doctor_clinic_name,
  };
};

const mapMedicalRecordSummary = (row: MedicalRecordRow): MedicalRecordSummary => ({
  id: row.record_id,
  patientId: row.patient_id,
  doctorId: row.doctor_id,
  appointmentId: row.appointment_id,
  recordType: row.record_type,
  title: row.title,
  summary: row.summary,
  diagnosis: row.diagnosis,
  followUpDate: row.follow_up_date,
  isVisibleToPatient: row.is_visible_to_patient,
  recordedAt: row.recorded_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  patient: mapMedicalRecordPatient(row),
  doctor: mapMedicalRecordDoctor(row),
  fileCount: Number(row.file_count ?? 0),
  vitalCount: Number(row.vital_count ?? 0),
});

const mapMedicalRecordFile = (row: MedicalRecordFileRow): MedicalRecordFileRecord => ({
  id: row.id,
  medicalRecordId: row.medical_record_id,
  fileName: row.file_name,
  fileUrl: row.file_url,
  fileType: row.file_type,
  fileSizeBytes: parseNumber(row.file_size_bytes),
  storageProvider: row.storage_provider,
  providerAssetId: row.provider_asset_id,
  checksumSha256: row.checksum_sha256,
  isPatientVisible: row.is_patient_visible,
  uploadedByUserId: row.uploaded_by_user_id,
  createdAt: row.created_at,
});

const mapPatientVital = (row: PatientVitalRow): PatientVitalRecord => ({
  id: row.id,
  patientId: row.patient_id,
  medicalRecordId: row.medical_record_id,
  recordedByUserId: row.recorded_by_user_id,
  systolic: parseNumber(row.systolic),
  diastolic: parseNumber(row.diastolic),
  heartRate: parseNumber(row.heart_rate),
  temperatureC: parseNumber(row.temperature_c),
  oxygenSaturation: parseNumber(row.oxygen_saturation),
  glucoseLevel: parseNumber(row.glucose_level),
  weightKg: parseNumber(row.weight_kg),
  heightCm: parseNumber(row.height_cm),
  bmi: parseNumber(row.bmi),
  notes: row.notes,
  recordedAt: row.recorded_at,
  createdAt: row.created_at,
});

const mapPatientAllergy = (row: PatientAllergyRow): PatientAllergyRecord => ({
  id: row.id,
  patientId: row.patient_id,
  allergen: row.allergen,
  reaction: row.reaction,
  severity: row.severity,
  notedAt: row.noted_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const createEmptyResult = <T>(page: number, limit: number): PaginatedResult<T> => ({
  items: [],
  meta: createPaginationMeta({
    page,
    limit,
    total: 0,
  }),
});

const medicalRecordBaseSelect = `
  SELECT
    mr.id AS record_id,
    mr.patient_id,
    mr.doctor_id,
    mr.appointment_id,
    mr.record_type,
    mr.title,
    mr.summary,
    mr.clinical_notes,
    mr.diagnosis,
    mr.treatment_plan,
    mr.source,
    mr.follow_up_date::text AS follow_up_date,
    mr.test_results,
    mr.is_visible_to_patient,
    mr.recorded_at::text AS recorded_at,
    mr.created_at::text AS created_at,
    mr.updated_at::text AS updated_at,
    mr.last_updated_by_user_id,
    pu.id AS patient_user_id,
    pu.first_name AS patient_first_name,
    pu.last_name AS patient_last_name,
    pu.email AS patient_email,
    pp.blood_group AS patient_blood_group,
    du.id AS doctor_user_id,
    du.first_name AS doctor_first_name,
    du.last_name AS doctor_last_name,
    du.email AS doctor_email,
    dp.specialty AS doctor_specialty,
    dp.clinic_name AS doctor_clinic_name
  FROM medical_records mr
  JOIN patient_profiles pp ON pp.id = mr.patient_id
  JOIN users pu ON pu.id = pp.user_id
  LEFT JOIN doctor_profiles dp ON dp.id = mr.doctor_id
  LEFT JOIN users du ON du.id = dp.user_id
`;

const getDoctorIdByUserId = async (userId: string): Promise<string | null> => {
  const result = await runQuery<IdRow>(
    `
      SELECT id
      FROM doctor_profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rowCount ? result.rows[0].id : null;
};

const getPatientIdByUserId = async (userId: string): Promise<string | null> => {
  const result = await runQuery<IdRow>(
    `
      SELECT id
      FROM patient_profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rowCount ? result.rows[0].id : null;
};

const doctorHasActivePatientLink = async (doctorId: string, patientId: string): Promise<boolean> => {
  const result = await runQuery<{ has_access: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM doctor_patient_links
        WHERE doctor_id = $1
          AND patient_id = $2
          AND relationship_status = 'ACTIVE'
      ) AS has_access
    `,
    [doctorId, patientId],
  );

  return Boolean(result.rows[0]?.has_access);
};

const getAppointmentSnapshot = async (appointmentId: string): Promise<AppointmentSnapshot | null> => {
  const result = await runQuery<AppointmentSnapshotRow>(
    `
      SELECT
        id,
        doctor_id,
        patient_id
      FROM appointments
      WHERE id = $1
      LIMIT 1
    `,
    [appointmentId],
  );

  return result.rowCount
    ? {
        id: result.rows[0].id,
        doctorId: result.rows[0].doctor_id,
        patientId: result.rows[0].patient_id,
      }
    : null;
};

const listMedicalRecords = async (
  scope: RecordListScope,
  filters: MedicalRecordListFilters,
): Promise<PaginatedResult<MedicalRecordSummary>> => {
  const values: unknown[] = [];
  const whereClauses: string[] = [];
  const offset = (filters.page - 1) * filters.limit;
  const patientFileFilter = scope.role === "PATIENT" ? "AND mrf.is_patient_visible = TRUE" : "";

  if (scope.role === "DOCTOR" && scope.doctorId) {
    values.push(scope.doctorId);
    whereClauses.push(`
      EXISTS (
        SELECT 1
        FROM doctor_patient_links dpl
        WHERE dpl.patient_id = mr.patient_id
          AND dpl.doctor_id = $${values.length}
          AND dpl.relationship_status = 'ACTIVE'
      )
    `);
  }

  if (scope.role === "PATIENT" && scope.patientId) {
    values.push(scope.patientId);
    whereClauses.push(`mr.patient_id = $${values.length}`);
    whereClauses.push(`mr.is_visible_to_patient = TRUE`);
  }

  if (filters.patientId) {
    values.push(filters.patientId);
    whereClauses.push(`mr.patient_id = $${values.length}`);
  }

  if (filters.doctorId) {
    values.push(filters.doctorId);
    whereClauses.push(`mr.doctor_id = $${values.length}`);
  }

  if (filters.recordType) {
    values.push(filters.recordType);
    whereClauses.push(`mr.record_type = $${values.length}::medical_record_type`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    whereClauses.push(`mr.recorded_at::date >= $${values.length}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    whereClauses.push(`mr.recorded_at::date <= $${values.length}::date`);
  }

  if (typeof filters.isVisibleToPatient === "boolean" && scope.role !== "PATIENT") {
    values.push(filters.isVisibleToPatient);
    whereClauses.push(`mr.is_visible_to_patient = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search.toLowerCase()}%`);
    whereClauses.push(`
      (
        LOWER(mr.title) LIKE $${values.length}
        OR LOWER(COALESCE(mr.summary, '')) LIKE $${values.length}
        OR LOWER(COALESCE(mr.diagnosis, '')) LIKE $${values.length}
        OR LOWER(COALESCE(mr.treatment_plan, '')) LIKE $${values.length}
      )
    `);
  }

  values.push(filters.limit, offset);

  const result = await runQuery<MedicalRecordRow>(
    `
      SELECT
        filtered_records.*,
        COUNT(*) OVER()::text AS total_count,
        (
          SELECT COUNT(*)
          FROM medical_record_files mrf
          WHERE mrf.medical_record_id = filtered_records.record_id
          ${patientFileFilter}
        )::text AS file_count,
        (
          SELECT COUNT(*)
          FROM patient_vitals pv
          WHERE pv.medical_record_id = filtered_records.record_id
        )::text AS vital_count
      FROM (
        ${medicalRecordBaseSelect}
        ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""}
      ) AS filtered_records
      ORDER BY filtered_records.recorded_at DESC, filtered_records.created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values,
  );

  if (result.rowCount === 0) {
    return createEmptyResult(filters.page, filters.limit);
  }

  return {
    items: result.rows.map(mapMedicalRecordSummary),
    meta: createPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      total: Number(result.rows[0].total_count ?? 0),
    }),
  };
};

const listMedicalRecordFiles = async (recordId: string): Promise<MedicalRecordFileRecord[]> => {
  const result = await runQuery<MedicalRecordFileRow>(
    `
      SELECT
        id,
        medical_record_id,
        file_name,
        file_url,
        file_type,
        file_size_bytes::text AS file_size_bytes,
        storage_provider,
        provider_asset_id,
        checksum_sha256,
        is_patient_visible,
        uploaded_by_user_id,
        created_at::text AS created_at
      FROM medical_record_files
      WHERE medical_record_id = $1
      ORDER BY created_at DESC
    `,
    [recordId],
  );

  return result.rows.map(mapMedicalRecordFile);
};

const listPatientVitalsForRecord = async (recordId: string): Promise<PatientVitalRecord[]> => {
  const result = await runQuery<PatientVitalRow>(
    `
      SELECT
        id,
        patient_id,
        medical_record_id,
        recorded_by_user_id,
        systolic::text AS systolic,
        diastolic::text AS diastolic,
        heart_rate::text AS heart_rate,
        temperature_c::text AS temperature_c,
        oxygen_saturation::text AS oxygen_saturation,
        glucose_level::text AS glucose_level,
        weight_kg::text AS weight_kg,
        height_cm::text AS height_cm,
        bmi::text AS bmi,
        notes,
        recorded_at::text AS recorded_at,
        created_at::text AS created_at
      FROM patient_vitals
      WHERE medical_record_id = $1
      ORDER BY recorded_at DESC, created_at DESC
    `,
    [recordId],
  );

  return result.rows.map(mapPatientVital);
};

const listPatientAllergies = async (patientId: string): Promise<PatientAllergyRecord[]> => {
  const result = await runQuery<PatientAllergyRow>(
    `
      SELECT
        id,
        patient_id,
        allergen,
        reaction,
        severity,
        noted_at::text AS noted_at,
        created_at::text AS created_at,
        updated_at::text AS updated_at
      FROM patient_allergies
      WHERE patient_id = $1
      ORDER BY allergen ASC, created_at DESC
    `,
    [patientId],
  );

  return result.rows.map(mapPatientAllergy);
};

const getMedicalRecordById = async (recordId: string): Promise<MedicalRecordDetail | null> => {
  const result = await runQuery<MedicalRecordRow>(
    `
      SELECT
        record_row.*,
        (
          SELECT COUNT(*)
          FROM medical_record_files mrf
          WHERE mrf.medical_record_id = record_row.record_id
        )::text AS file_count,
        (
          SELECT COUNT(*)
          FROM patient_vitals pv
          WHERE pv.medical_record_id = record_row.record_id
        )::text AS vital_count
      FROM (
        ${medicalRecordBaseSelect}
        WHERE mr.id = $1
      ) AS record_row
      LIMIT 1
    `,
    [recordId],
  );

  if (!result.rowCount) {
    return null;
  }

  const row = result.rows[0];
  const [files, vitals, allergies] = await Promise.all([
    listMedicalRecordFiles(recordId),
    listPatientVitalsForRecord(recordId),
    listPatientAllergies(row.patient_id),
  ]);

  return {
    ...mapMedicalRecordSummary(row),
    clinicalNotes: row.clinical_notes,
    treatmentPlan: row.treatment_plan,
    source: row.source,
    testResults: mapTestResults(row.test_results),
    files,
    vitals,
    allergies,
    lastUpdatedByUserId: row.last_updated_by_user_id,
  };
};

const createMedicalRecord = async (client: PoolClient, input: ResolvedCreateMedicalRecordInput): Promise<string> => {
  const result = await client.query<IdRow>(
    `
      INSERT INTO medical_records (
        patient_id,
        doctor_id,
        appointment_id,
        record_type,
        title,
        summary,
        clinical_notes,
        diagnosis,
        treatment_plan,
        source,
        follow_up_date,
        test_results,
        is_visible_to_patient,
        recorded_at,
        last_updated_by_user_id
      )
      VALUES (
        $1,
        $2,
        $3,
        $4::medical_record_type,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11::date,
        $12::jsonb,
        $13,
        COALESCE($14::timestamptz, NOW()),
        $15
      )
      RETURNING id
    `,
    [
      input.patientId,
      input.doctorId,
      input.appointmentId ?? null,
      input.recordType,
      input.title,
      input.summary ?? null,
      input.clinicalNotes ?? null,
      input.diagnosis ?? null,
      input.treatmentPlan ?? null,
      input.source ?? null,
      input.followUpDate ?? null,
      JSON.stringify(input.testResults ?? []),
      input.isVisibleToPatient ?? false,
      input.recordedAt ?? null,
      input.lastUpdatedByUserId,
    ],
  );

  return result.rows[0].id;
};

const updateMedicalRecord = async (
  client: PoolClient,
  recordId: string,
  input: ResolvedUpdateMedicalRecordInput,
): Promise<boolean> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const pushAssignment = (assignment: string, value: unknown): void => {
    values.push(value);
    assignments.push(assignment.replace("?", `$${values.length}`));
  };

  if (hasOwn(input, "recordType")) {
    pushAssignment("record_type = ?::medical_record_type", input.recordType ?? null);
  }

  if (hasOwn(input, "title")) {
    pushAssignment("title = ?", input.title ?? null);
  }

  if (hasOwn(input, "summary")) {
    pushAssignment("summary = ?", input.summary ?? null);
  }

  if (hasOwn(input, "clinicalNotes")) {
    pushAssignment("clinical_notes = ?", input.clinicalNotes ?? null);
  }

  if (hasOwn(input, "diagnosis")) {
    pushAssignment("diagnosis = ?", input.diagnosis ?? null);
  }

  if (hasOwn(input, "treatmentPlan")) {
    pushAssignment("treatment_plan = ?", input.treatmentPlan ?? null);
  }

  if (hasOwn(input, "source")) {
    pushAssignment("source = ?", input.source ?? null);
  }

  if (hasOwn(input, "followUpDate")) {
    pushAssignment("follow_up_date = ?::date", input.followUpDate ?? null);
  }

  if (hasOwn(input, "recordedAt")) {
    pushAssignment("recorded_at = ?::timestamptz", input.recordedAt ?? null);
  }

  if (hasOwn(input, "isVisibleToPatient")) {
    pushAssignment("is_visible_to_patient = ?", input.isVisibleToPatient ?? false);
  }

  if (hasOwn(input, "testResults")) {
    pushAssignment("test_results = ?::jsonb", JSON.stringify(input.testResults ?? []));
  }

  pushAssignment("last_updated_by_user_id = ?", input.lastUpdatedByUserId);
  values.push(recordId);

  const result = await client.query<IdRow>(
    `
      UPDATE medical_records
      SET ${assignments.join(", ")}
      WHERE id = $${values.length}
      RETURNING id
    `,
    values,
  );

  return Boolean(result.rowCount);
};

const createPatientVital = async (
  client: PoolClient,
  recordId: string,
  patientId: string,
  recordedByUserId: string,
  input: CreateRecordVitalInput,
): Promise<string> => {
  const result = await client.query<IdRow>(
    `
      INSERT INTO patient_vitals (
        patient_id,
        recorded_by_user_id,
        medical_record_id,
        systolic,
        diastolic,
        heart_rate,
        temperature_c,
        oxygen_saturation,
        glucose_level,
        weight_kg,
        height_cm,
        bmi,
        notes,
        recorded_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        COALESCE($14::timestamptz, NOW())
      )
      RETURNING id
    `,
    [
      patientId,
      recordedByUserId,
      recordId,
      input.systolic ?? null,
      input.diastolic ?? null,
      input.heartRate ?? null,
      input.temperatureC ?? null,
      input.oxygenSaturation ?? null,
      input.glucoseLevel ?? null,
      input.weightKg ?? null,
      input.heightCm ?? null,
      input.bmi ?? null,
      input.notes ?? null,
      input.recordedAt ?? null,
    ],
  );

  return result.rows[0].id;
};

const getPatientVitalById = async (vitalId: string): Promise<PatientVitalRecord | null> => {
  const result = await runQuery<PatientVitalRow>(
    `
      SELECT
        id,
        patient_id,
        medical_record_id,
        recorded_by_user_id,
        systolic::text AS systolic,
        diastolic::text AS diastolic,
        heart_rate::text AS heart_rate,
        temperature_c::text AS temperature_c,
        oxygen_saturation::text AS oxygen_saturation,
        glucose_level::text AS glucose_level,
        weight_kg::text AS weight_kg,
        height_cm::text AS height_cm,
        bmi::text AS bmi,
        notes,
        recorded_at::text AS recorded_at,
        created_at::text AS created_at
      FROM patient_vitals
      WHERE id = $1
      LIMIT 1
    `,
    [vitalId],
  );

  return result.rowCount ? mapPatientVital(result.rows[0]) : null;
};

const createMedicalRecordFile = async (
  client: PoolClient,
  recordId: string,
  uploadedByUserId: string,
  input: CreateMedicalRecordFileInput,
): Promise<string> => {
  const result = await client.query<IdRow>(
    `
      INSERT INTO medical_record_files (
        medical_record_id,
        file_name,
        file_url,
        file_type,
        file_size_bytes,
        storage_provider,
        provider_asset_id,
        checksum_sha256,
        is_patient_visible,
        uploaded_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `,
    [
      recordId,
      input.fileName,
      input.fileUrl,
      input.fileType ?? null,
      input.fileSizeBytes ?? null,
      input.storageProvider,
      input.providerAssetId ?? null,
      input.checksumSha256 ?? null,
      input.isPatientVisible ?? false,
      uploadedByUserId,
    ],
  );

  return result.rows[0].id;
};

const createFileAsset = async (
  client: PoolClient,
  recordId: string,
  _patientId: string,
  _doctorId: string | null,
  uploadedByUserId: string,
  input: CreateMedicalRecordFileInput,
): Promise<void> => {
  await client.query(
    `
      INSERT INTO file_assets (
        owner_user_id,
        entity_type,
        entity_id,
        provider,
        provider_asset_id,
        url,
        mime_type,
        size_bytes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      uploadedByUserId,
      "MEDICAL_RECORD",
      recordId,
      input.storageProvider,
      input.providerAssetId ?? null,
      input.fileUrl,
      input.fileType ?? null,
      input.fileSizeBytes ?? null,
    ],
  );
};

const getMedicalRecordFileById = async (fileId: string): Promise<MedicalRecordFileRecord | null> => {
  const result = await runQuery<MedicalRecordFileRow>(
    `
      SELECT
        id,
        medical_record_id,
        file_name,
        file_url,
        file_type,
        file_size_bytes::text AS file_size_bytes,
        storage_provider,
        provider_asset_id,
        checksum_sha256,
        is_patient_visible,
        uploaded_by_user_id,
        created_at::text AS created_at
      FROM medical_record_files
      WHERE id = $1
      LIMIT 1
    `,
    [fileId],
  );

  return result.rowCount ? mapMedicalRecordFile(result.rows[0]) : null;
};

const createPatientAllergy = async (
  client: PoolClient,
  patientId: string,
  input: CreatePatientAllergyInput,
): Promise<string> => {
  const result = await client.query<IdRow>(
    `
      INSERT INTO patient_allergies (
        patient_id,
        allergen,
        reaction,
        severity,
        noted_at
      )
      VALUES ($1, $2, $3, $4, $5::date)
      RETURNING id
    `,
    [
      patientId,
      input.allergen,
      input.reaction ?? null,
      input.severity ?? null,
      input.notedAt ?? null,
    ],
  );

  return result.rows[0].id;
};

const updatePatientAllergy = async (
  client: PoolClient,
  allergyId: string,
  input: UpdatePatientAllergyInput,
): Promise<boolean> => {
  const assignments: string[] = [];
  const values: unknown[] = [];

  const pushAssignment = (assignment: string, value: unknown): void => {
    values.push(value);
    assignments.push(assignment.replace("?", `$${values.length}`));
  };

  if (hasOwn(input, "allergen")) {
    pushAssignment("allergen = ?", input.allergen ?? null);
  }

  if (hasOwn(input, "reaction")) {
    pushAssignment("reaction = ?", input.reaction ?? null);
  }

  if (hasOwn(input, "severity")) {
    pushAssignment("severity = ?", input.severity ?? null);
  }

  if (hasOwn(input, "notedAt")) {
    pushAssignment("noted_at = ?::date", input.notedAt ?? null);
  }

  values.push(allergyId);

  const result = await client.query<IdRow>(
    `
      UPDATE patient_allergies
      SET ${assignments.join(", ")}
      WHERE id = $${values.length}
      RETURNING id
    `,
    values,
  );

  return Boolean(result.rowCount);
};

const getPatientAllergyById = async (allergyId: string): Promise<PatientAllergyRecord | null> => {
  const result = await runQuery<PatientAllergyRow>(
    `
      SELECT
        id,
        patient_id,
        allergen,
        reaction,
        severity,
        noted_at::text AS noted_at,
        created_at::text AS created_at,
        updated_at::text AS updated_at
      FROM patient_allergies
      WHERE id = $1
      LIMIT 1
    `,
    [allergyId],
  );

  return result.rowCount ? mapPatientAllergy(result.rows[0]) : null;
};

export const recordsRepository: RecordsRepository = {
  getDoctorIdByUserId,
  getPatientIdByUserId,
  doctorHasActivePatientLink,
  getAppointmentSnapshot,
  listMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  createPatientVital,
  getPatientVitalById,
  createMedicalRecordFile,
  createFileAsset,
  getMedicalRecordFileById,
  listPatientAllergies,
  createPatientAllergy,
  updatePatientAllergy,
  getPatientAllergyById,
};
