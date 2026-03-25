import type { PoolClient } from "pg";

import type { PaginatedResult } from "../../common/types/pagination";
import { createPaginationMeta } from "../../common/utils/pagination";
import { runQuery } from "../../config/database";
import type {
  GeneratedMedicationSeed,
  PrescriptionInsertData,
  PrescriptionItem,
  PrescriptionItemInput,
  PrescriptionListFilters,
  PrescriptionListScope,
  PrescriptionRecord,
  PrescriptionsRepository,
  UpdatePrescriptionInput,
  UpdatePrescriptionStatusInput,
} from "./prescriptions.types";

type IdRow = {
  id: string;
};

type PrescriptionHeaderRow = {
  total_count?: string;
  prescription_id: string;
  doctor_id: string;
  patient_id: string;
  appointment_id: string | null;
  status: PrescriptionRecord["status"];
  diagnosis: string | null;
  instructions: string | null;
  issued_at: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  doctor_user_id: string;
  doctor_first_name: string;
  doctor_last_name: string;
  doctor_email: string;
  doctor_specialty: string;
  patient_user_id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
};

type PrescriptionItemRow = {
  id: string;
  prescription_id: string;
  medication_name: string;
  strength: string | null;
  dosage: string;
  frequency: string;
  route: string | null;
  duration_days: number | null;
  refill_count: number;
  notes: string | null;
  created_at: string;
};

const prescriptionHeaderSelect = `
  SELECT
    p.id AS prescription_id,
    p.doctor_id,
    p.patient_id,
    p.appointment_id,
    p.status,
    p.diagnosis,
    p.instructions,
    p.issued_at::text AS issued_at,
    p.start_date::text AS start_date,
    p.end_date::text AS end_date,
    p.created_at::text AS created_at,
    p.updated_at::text AS updated_at,
    du.id AS doctor_user_id,
    du.first_name AS doctor_first_name,
    du.last_name AS doctor_last_name,
    du.email AS doctor_email,
    dp.specialty AS doctor_specialty,
    pu.id AS patient_user_id,
    pu.first_name AS patient_first_name,
    pu.last_name AS patient_last_name,
    pu.email AS patient_email
  FROM prescriptions p
  JOIN doctor_profiles dp ON dp.id = p.doctor_id
  JOIN users du ON du.id = dp.user_id
  JOIN patient_profiles pp ON pp.id = p.patient_id
  JOIN users pu ON pu.id = pp.user_id
`;

const mapPrescriptionItem = (row: PrescriptionItemRow): PrescriptionItem => ({
  id: row.id,
  medicationName: row.medication_name,
  strength: row.strength,
  dosage: row.dosage,
  frequency: row.frequency,
  route: row.route,
  durationDays: row.duration_days === null ? null : Number(row.duration_days),
  refillCount: Number(row.refill_count),
  notes: row.notes,
  createdAt: row.created_at,
});

const attachItemsToHeaders = (
  rows: PrescriptionHeaderRow[],
  items: PrescriptionItemRow[],
): PrescriptionRecord[] => {
  const itemsByPrescriptionId = new Map<string, PrescriptionItem[]>();

  for (const item of items) {
    const current = itemsByPrescriptionId.get(item.prescription_id) ?? [];
    current.push(mapPrescriptionItem(item));
    itemsByPrescriptionId.set(item.prescription_id, current);
  }

  return rows.map((row) => ({
    id: row.prescription_id,
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    appointmentId: row.appointment_id,
    status: row.status,
    diagnosis: row.diagnosis,
    instructions: row.instructions,
    issuedAt: row.issued_at,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    doctor: {
      userId: row.doctor_user_id,
      firstName: row.doctor_first_name,
      lastName: row.doctor_last_name,
      email: row.doctor_email,
      specialty: row.doctor_specialty,
    },
    patient: {
      userId: row.patient_user_id,
      firstName: row.patient_first_name,
      lastName: row.patient_last_name,
      email: row.patient_email,
    },
    items: itemsByPrescriptionId.get(row.prescription_id) ?? [],
  }));
};

const listItemsByPrescriptionIds = async (prescriptionIds: string[]): Promise<PrescriptionItemRow[]> => {
  if (prescriptionIds.length === 0) {
    return [];
  }

  const result = await runQuery<PrescriptionItemRow>(
    `
      SELECT
        id,
        prescription_id,
        medication_name,
        strength,
        dosage,
        frequency,
        route,
        duration_days,
        refill_count,
        notes,
        created_at::text AS created_at
      FROM prescription_items
      WHERE prescription_id = ANY($1::uuid[])
      ORDER BY created_at ASC
    `,
    [prescriptionIds],
  );

  return result.rows;
};

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

const doctorHasAccessToPatient = async (doctorUserId: string, patientId: string): Promise<boolean> => {
  const result = await runQuery<{ has_access: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM doctor_patient_links dpl
        JOIN doctor_profiles dp ON dp.id = dpl.doctor_id
        WHERE dp.user_id = $1
          AND dpl.patient_id = $2
          AND dpl.relationship_status = 'ACTIVE'
      ) AS has_access
    `,
    [doctorUserId, patientId],
  );

  return Boolean(result.rows[0]?.has_access);
};

const doctorProfileHasAccessToPatient = async (doctorId: string, patientId: string): Promise<boolean> => {
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

const appointmentMatchesDoctorPatient = async (
  appointmentId: string,
  doctorId: string,
  patientId: string,
): Promise<boolean> => {
  const result = await runQuery<{ matches: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM appointments
        WHERE id = $1
          AND doctor_id = $2
          AND patient_id = $3
      ) AS matches
    `,
    [appointmentId, doctorId, patientId],
  );

  return Boolean(result.rows[0]?.matches);
};

const createPrescription = async (client: PoolClient, input: PrescriptionInsertData): Promise<string> => {
  const result = await client.query<IdRow>(
    `
      INSERT INTO prescriptions (
        doctor_id,
        patient_id,
        appointment_id,
        status,
        diagnosis,
        instructions,
        start_date,
        end_date
      )
      VALUES (
        $1,
        $2,
        $3,
        'ACTIVE',
        $4,
        $5,
        $6::date,
        $7::date
      )
      RETURNING id
    `,
    [
      input.doctorId,
      input.patientId,
      input.appointmentId ?? null,
      input.diagnosis ?? null,
      input.instructions ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
    ],
  );

  return result.rows[0].id;
};

const replacePrescriptionItems = async (
  client: PoolClient,
  prescriptionId: string,
  items: PrescriptionItemInput[],
): Promise<void> => {
  await client.query("DELETE FROM prescription_items WHERE prescription_id = $1", [prescriptionId]);

  for (const item of items) {
    await client.query(
      `
        INSERT INTO prescription_items (
          prescription_id,
          medication_name,
          strength,
          dosage,
          frequency,
          route,
          duration_days,
          refill_count,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        prescriptionId,
        item.medicationName,
        item.strength ?? null,
        item.dosage,
        item.frequency,
        item.route ?? null,
        item.durationDays ?? null,
        item.refillCount ?? 0,
        item.notes ?? null,
      ],
    );
  }
};

const createMedicationTrackers = async (client: PoolClient, medications: GeneratedMedicationSeed[]): Promise<void> => {
  for (const medication of medications) {
    await client.query(
      `
        INSERT INTO medications (
          patient_id,
          prescription_id,
          created_by_user_id,
          name,
          strength,
          dosage_form,
          dosage_instructions,
          frequency,
          route,
          start_date,
          end_date,
          reminder_enabled,
          status,
          notes
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NULL,
          $6,
          $7,
          $8,
          $9::date,
          $10::date,
          TRUE,
          'ACTIVE',
          $11
        )
      `,
      [
        medication.patientId,
        medication.prescriptionId,
        medication.createdByUserId,
        medication.name,
        medication.strength ?? null,
        medication.dosageInstructions,
        medication.frequency,
        medication.route ?? null,
        medication.startDate,
        medication.endDate ?? null,
        medication.notes ?? null,
      ],
    );
  }
};

const listPrescriptions = async (
  scope: PrescriptionListScope,
  filters: PrescriptionListFilters,
): Promise<PaginatedResult<PrescriptionRecord>> => {
  const offset = (filters.page - 1) * filters.limit;
  const values: unknown[] = [];
  const whereClauses: string[] = [];

  if (scope.role === "DOCTOR" && scope.doctorUserId) {
    values.push(scope.doctorUserId);
    whereClauses.push(`
      EXISTS (
        SELECT 1
        FROM doctor_patient_links dpl
        JOIN doctor_profiles actor_dp ON actor_dp.id = dpl.doctor_id
        WHERE actor_dp.user_id = $${values.length}
          AND dpl.patient_id = p.patient_id
          AND dpl.relationship_status = 'ACTIVE'
      )
    `);
  } else if (scope.role === "PATIENT" && scope.patientId) {
    values.push(scope.patientId);
    whereClauses.push(`p.patient_id = $${values.length}`);
  }

  if (scope.role === "ADMIN" && filters.patientId) {
    values.push(filters.patientId);
    whereClauses.push(`p.patient_id = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    whereClauses.push(`p.status = $${values.length}::prescription_status`);
  }

  if (filters.appointmentId) {
    values.push(filters.appointmentId);
    whereClauses.push(`p.appointment_id = $${values.length}`);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  values.push(filters.limit, offset);
  const limitParam = values.length - 1;
  const offsetParam = values.length;

  const result = await runQuery<PrescriptionHeaderRow>(
    `
      SELECT
        COUNT(*) OVER()::text AS total_count,
        prescription_data.*
      FROM (
        ${prescriptionHeaderSelect}
        ${whereClause}
      ) AS prescription_data
      ORDER BY prescription_data.issued_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `,
    values,
  );

  const total = result.rowCount ? Number(result.rows[0].total_count ?? 0) : 0;
  const prescriptionIds = result.rows.map((row) => row.prescription_id);
  const items = await listItemsByPrescriptionIds(prescriptionIds);

  return {
    items: attachItemsToHeaders(result.rows, items),
    meta: createPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      total,
    }),
  };
};

const getPrescriptionById = async (prescriptionId: string): Promise<PrescriptionRecord | null> => {
  const result = await runQuery<PrescriptionHeaderRow>(
    `
      ${prescriptionHeaderSelect}
      WHERE p.id = $1
      LIMIT 1
    `,
    [prescriptionId],
  );

  if (!result.rowCount) {
    return null;
  }

  const items = await listItemsByPrescriptionIds([prescriptionId]);
  return attachItemsToHeaders(result.rows, items)[0] ?? null;
};

const updatePrescriptionHeader = async (
  client: PoolClient,
  prescriptionId: string,
  input: UpdatePrescriptionInput,
): Promise<boolean> => {
  const shouldClearAppointment = input.appointmentId === null;

  const result = await client.query<IdRow>(
    `
      UPDATE prescriptions
      SET
        appointment_id = CASE
          WHEN $2 THEN NULL
          WHEN $3::uuid IS NOT NULL THEN $3::uuid
          ELSE appointment_id
        END,
        diagnosis = COALESCE($4, diagnosis),
        instructions = COALESCE($5, instructions),
        start_date = COALESCE($6::date, start_date),
        end_date = COALESCE($7::date, end_date)
      WHERE id = $1
      RETURNING id
    `,
    [
      prescriptionId,
      shouldClearAppointment,
      input.appointmentId === undefined || input.appointmentId === null ? null : input.appointmentId,
      input.diagnosis ?? null,
      input.instructions ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
    ],
  );

  return Boolean(result.rowCount);
};

const updatePrescriptionStatus = async (
  prescriptionId: string,
  input: UpdatePrescriptionStatusInput,
): Promise<PrescriptionRecord | null> => {
  const result = await runQuery<IdRow>(
    `
      UPDATE prescriptions
      SET status = $2::prescription_status
      WHERE id = $1
      RETURNING id
    `,
    [prescriptionId, input.status],
  );

  return result.rowCount ? getPrescriptionById(result.rows[0].id) : null;
};

export const prescriptionsRepository: PrescriptionsRepository = {
  getDoctorIdByUserId,
  getPatientIdByUserId,
  doctorHasAccessToPatient,
  doctorProfileHasAccessToPatient,
  appointmentMatchesDoctorPatient,
  createPrescription,
  updatePrescriptionHeader,
  replacePrescriptionItems,
  createMedicationTrackers,
  listPrescriptions,
  getPrescriptionById,
  updatePrescriptionStatus,
};
