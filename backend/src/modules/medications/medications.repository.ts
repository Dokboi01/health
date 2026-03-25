import type { PoolClient, QueryResultRow } from "pg";

import type { PaginatedResult } from "../../common/types/pagination";
import { createPaginationMeta } from "../../common/utils/pagination";
import { runQuery } from "../../config/database";
import type {
  CreateMedicationInput,
  CreateMedicationLogInput,
  ExpandedMedicationScheduleInput,
  MedicationAdherenceFilters,
  MedicationAdherenceSummary,
  MedicationListFilters,
  MedicationListScope,
  MedicationLogListFilters,
  MedicationLogRecord,
  MedicationRecord,
  MedicationReminderRecipient,
  MedicationScheduleRecord,
  MedicationsRepository,
  ScheduledMedicationLogSeed,
  UpdateMedicationInput,
  UpdateMedicationLogInput,
} from "./medications.types";

type IdRow = {
  id: string;
};

type MedicationRow = {
  total_count?: string;
  medication_id: string;
  patient_id: string;
  prescription_id: string | null;
  created_by_user_id: string | null;
  name: string;
  strength: string | null;
  dosage_form: string | null;
  dosage_instructions: string;
  frequency: string;
  route: string | null;
  start_date: string;
  end_date: string | null;
  reminder_enabled: boolean;
  status: MedicationRecord["status"];
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient_user_id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
};

type MedicationScheduleRow = {
  id: string;
  medication_id: string;
  patient_id: string;
  day_of_week: number | null;
  scheduled_time: string;
  reminder_time: string | null;
  timezone: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type MedicationLogRow = {
  total_count?: string;
  id: string;
  medication_id: string;
  medication_schedule_id: string | null;
  patient_id: string;
  scheduled_for: string;
  taken_at: string | null;
  status: MedicationLogRecord["status"];
  note: string | null;
  created_at: string;
};

type ReminderRecipientRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  medication_reminders_enabled: boolean;
};

type AdherenceSummaryRow = {
  total_doses: string;
  taken_doses: string;
  skipped_doses: string;
  missed_doses: string;
  pending_doses: string;
};

const executeQuery = <T extends QueryResultRow>(
  text: string,
  values: unknown[],
  client?: PoolClient,
) => {
  if (client) {
    return client.query<T>(text, values);
  }

  return runQuery<T>(text, values);
};

const medicationSelect = `
  SELECT
    m.id AS medication_id,
    m.patient_id,
    m.prescription_id,
    m.created_by_user_id,
    m.name,
    m.strength,
    m.dosage_form,
    m.dosage_instructions,
    m.frequency,
    m.route,
    m.start_date::text AS start_date,
    m.end_date::text AS end_date,
    m.reminder_enabled,
    m.status,
    m.notes,
    m.created_at::text AS created_at,
    m.updated_at::text AS updated_at,
    pu.id AS patient_user_id,
    pu.first_name AS patient_first_name,
    pu.last_name AS patient_last_name,
    pu.email AS patient_email
  FROM medications m
  JOIN patient_profiles pp ON pp.id = m.patient_id
  JOIN users pu ON pu.id = pp.user_id
`;

const mapMedicationScheduleRecord = (row: MedicationScheduleRow): MedicationScheduleRecord => ({
  id: row.id,
  medicationId: row.medication_id,
  patientId: row.patient_id,
  dayOfWeek: row.day_of_week,
  scheduledTime: row.scheduled_time.slice(0, 5),
  reminderTime: row.reminder_time ? row.reminder_time.slice(0, 5) : null,
  timezone: row.timezone,
  label: row.label,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapMedicationLogRecord = (row: MedicationLogRow): MedicationLogRecord => ({
  id: row.id,
  medicationId: row.medication_id,
  scheduleId: row.medication_schedule_id,
  patientId: row.patient_id,
  scheduledFor: row.scheduled_for,
  takenAt: row.taken_at,
  status: row.status,
  note: row.note,
  createdAt: row.created_at,
});

const mapMedicationReminderRecipient = (row: ReminderRecipientRow): MedicationReminderRecipient => ({
  userId: row.user_id,
  firstName: row.first_name,
  lastName: row.last_name,
  medicationRemindersEnabled: row.medication_reminders_enabled,
});

const listSchedulesByMedicationIds = async (
  medicationIds: string[],
  client?: PoolClient,
): Promise<MedicationScheduleRow[]> => {
  if (medicationIds.length === 0) {
    return [];
  }

  const result = await executeQuery<MedicationScheduleRow>(
    `
      SELECT
        id,
        medication_id,
        patient_id,
        day_of_week,
        scheduled_time::text AS scheduled_time,
        reminder_time::text AS reminder_time,
        timezone,
        label,
        is_active,
        created_at::text AS created_at,
        updated_at::text AS updated_at
      FROM medication_schedules
      WHERE medication_id = ANY($1::uuid[])
      ORDER BY medication_id ASC, day_of_week ASC NULLS FIRST, scheduled_time ASC
    `,
    [medicationIds],
    client,
  );

  return result.rows;
};

const attachSchedulesToMedications = (
  medications: Omit<MedicationRecord, "schedules">[],
  scheduleRows: MedicationScheduleRow[],
): MedicationRecord[] => {
  const schedulesByMedicationId = new Map<string, MedicationScheduleRecord[]>();

  for (const row of scheduleRows) {
    const current = schedulesByMedicationId.get(row.medication_id) ?? [];
    current.push(mapMedicationScheduleRecord(row));
    schedulesByMedicationId.set(row.medication_id, current);
  }

  return medications.map((medication) => ({
    ...medication,
    schedules: schedulesByMedicationId.get(medication.id) ?? [],
  }));
};

const mapMedicationRecordBase = (row: MedicationRow): Omit<MedicationRecord, "schedules"> => ({
  id: row.medication_id,
  patientId: row.patient_id,
  prescriptionId: row.prescription_id,
  createdByUserId: row.created_by_user_id,
  name: row.name,
  strength: row.strength,
  dosageForm: row.dosage_form,
  dosageInstructions: row.dosage_instructions,
  frequency: row.frequency,
  route: row.route,
  startDate: row.start_date,
  endDate: row.end_date,
  reminderEnabled: row.reminder_enabled,
  status: row.status,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  patient: {
    userId: row.patient_user_id,
    firstName: row.patient_first_name,
    lastName: row.patient_last_name,
    email: row.patient_email,
  },
});

const listMedicationSchedules = async (medicationId: string): Promise<MedicationScheduleRecord[]> => {
  const rows = await listSchedulesByMedicationIds([medicationId]);
  return rows.map(mapMedicationScheduleRecord);
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

const prescriptionBelongsToPatient = async (prescriptionId: string, patientId: string): Promise<boolean> => {
  const result = await runQuery<{ matches: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM prescriptions
        WHERE id = $1
          AND patient_id = $2
      ) AS matches
    `,
    [prescriptionId, patientId],
  );

  return Boolean(result.rows[0]?.matches);
};

const createMedication = async (
  client: PoolClient,
  input: CreateMedicationInput,
  createdByUserId: string,
): Promise<string> => {
  const result = await client.query<IdRow>(
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
        $6,
        $7,
        $8,
        $9,
        $10::date,
        $11::date,
        $12,
        'ACTIVE',
        $13
      )
      RETURNING id
    `,
    [
      input.patientId,
      input.prescriptionId ?? null,
      createdByUserId,
      input.name,
      input.strength ?? null,
      input.dosageForm ?? null,
      input.dosageInstructions,
      input.frequency,
      input.route ?? null,
      input.startDate,
      input.endDate ?? null,
      input.reminderEnabled ?? true,
      input.notes ?? null,
    ],
  );

  return result.rows[0].id;
};

const getMedicationById = async (medicationId: string): Promise<MedicationRecord | null> => {
  const result = await runQuery<MedicationRow>(
    `
      ${medicationSelect}
      WHERE m.id = $1
      LIMIT 1
    `,
    [medicationId],
  );

  if (!result.rowCount) {
    return null;
  }

  const schedules = await listSchedulesByMedicationIds([medicationId]);
  return attachSchedulesToMedications([mapMedicationRecordBase(result.rows[0])], schedules)[0] ?? null;
};

const listMedications = async (
  scope: MedicationListScope,
  filters: MedicationListFilters,
): Promise<PaginatedResult<MedicationRecord>> => {
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
          AND dpl.patient_id = m.patient_id
          AND dpl.relationship_status = 'ACTIVE'
      )
    `);
  } else if (scope.role === "PATIENT" && scope.patientId) {
    values.push(scope.patientId);
    whereClauses.push(`m.patient_id = $${values.length}`);
  }

  if (scope.role === "ADMIN" && filters.patientId) {
    values.push(filters.patientId);
    whereClauses.push(`m.patient_id = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    whereClauses.push(`m.status = $${values.length}::medication_status`);
  }

  if (filters.prescriptionId) {
    values.push(filters.prescriptionId);
    whereClauses.push(`m.prescription_id = $${values.length}`);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  values.push(filters.limit, offset);
  const limitParam = values.length - 1;
  const offsetParam = values.length;

  const result = await runQuery<MedicationRow>(
    `
      SELECT
        COUNT(*) OVER()::text AS total_count,
        medication_data.*
      FROM (
        ${medicationSelect}
        ${whereClause}
      ) AS medication_data
      ORDER BY medication_data.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `,
    values,
  );

  const total = result.rowCount ? Number(result.rows[0].total_count ?? 0) : 0;
  const medicationIds = result.rows.map((row) => row.medication_id);
  const schedules = await listSchedulesByMedicationIds(medicationIds);

  return {
    items: attachSchedulesToMedications(result.rows.map(mapMedicationRecordBase), schedules),
    meta: createPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      total,
    }),
  };
};

const updateMedication = async (
  medicationId: string,
  input: UpdateMedicationInput,
): Promise<MedicationRecord | null> => {
  const shouldClearEndDate = input.endDate === null;

  const result = await runQuery<IdRow>(
    `
      UPDATE medications
      SET
        name = COALESCE($2, name),
        strength = COALESCE($3, strength),
        dosage_form = COALESCE($4, dosage_form),
        dosage_instructions = COALESCE($5, dosage_instructions),
        frequency = COALESCE($6, frequency),
        route = COALESCE($7, route),
        start_date = COALESCE($8::date, start_date),
        end_date = CASE
          WHEN $9 THEN NULL
          WHEN $10::text IS NOT NULL THEN $10::date
          ELSE end_date
        END,
        reminder_enabled = COALESCE($11, reminder_enabled),
        status = COALESCE($12::medication_status, status),
        notes = COALESCE($13, notes)
      WHERE id = $1
      RETURNING id
    `,
    [
      medicationId,
      input.name ?? null,
      input.strength ?? null,
      input.dosageForm ?? null,
      input.dosageInstructions ?? null,
      input.frequency ?? null,
      input.route ?? null,
      input.startDate ?? null,
      shouldClearEndDate,
      input.endDate === undefined || input.endDate === null ? null : input.endDate,
      input.reminderEnabled ?? null,
      input.status ?? null,
      input.notes ?? null,
    ],
  );

  return result.rowCount ? getMedicationById(result.rows[0].id) : null;
};

const replaceMedicationSchedules = async (
  client: PoolClient,
  medicationId: string,
  patientId: string,
  schedules: ExpandedMedicationScheduleInput[],
): Promise<MedicationScheduleRecord[]> => {
  await client.query("DELETE FROM medication_schedules WHERE medication_id = $1", [medicationId]);

  for (const schedule of schedules) {
    await client.query(
      `
        INSERT INTO medication_schedules (
          medication_id,
          patient_id,
          day_of_week,
          scheduled_time,
          reminder_time,
          timezone,
          label,
          is_active
        )
        VALUES ($1, $2, $3, $4::time, $5::time, $6, $7, $8)
      `,
      [
        medicationId,
        patientId,
        schedule.dayOfWeek,
        schedule.scheduledTime,
        schedule.reminderTime ?? null,
        schedule.timezone,
        schedule.label ?? null,
        schedule.isActive,
      ],
    );
  }

  const rows = await listSchedulesByMedicationIds([medicationId], client);
  return rows.map(mapMedicationScheduleRecord);
};

const deleteFutureScheduledMedicationLogs = async (
  client: PoolClient,
  medicationId: string,
  fromTimestamp: string,
): Promise<void> => {
  await client.query(
    `
      DELETE FROM medication_logs
      WHERE medication_id = $1
        AND status = 'SCHEDULED'
        AND scheduled_for >= $2::timestamptz
    `,
    [medicationId, fromTimestamp],
  );
};

const createMedicationLogs = async (client: PoolClient, logs: ScheduledMedicationLogSeed[]): Promise<void> => {
  for (const log of logs) {
    await client.query(
      `
        INSERT INTO medication_logs (
          medication_id,
          medication_schedule_id,
          patient_id,
          scheduled_for,
          taken_at,
          status,
          note
        )
        VALUES ($1, $2, $3, $4::timestamptz, NULL, $5::medication_log_status, $6)
      `,
      [
        log.medicationId,
        log.scheduleId ?? null,
        log.patientId,
        log.scheduledFor,
        log.status ?? "SCHEDULED",
        log.note ?? null,
      ],
    );
  }
};

const mapSingleMedicationLog = async (logId: string): Promise<MedicationLogRecord | null> => {
  const logResult = await runQuery<MedicationLogRow>(
    `
      SELECT
        id,
        medication_id,
        medication_schedule_id,
        patient_id,
        scheduled_for::text AS scheduled_for,
        taken_at::text AS taken_at,
        status,
        note,
        created_at::text AS created_at
      FROM medication_logs
      WHERE id = $1
      LIMIT 1
    `,
    [logId],
  );

  return logResult.rowCount ? mapMedicationLogRecord(logResult.rows[0]) : null;
};

const findMedicationLogByOccurrence = async (
  medicationId: string,
  scheduledFor: string,
  scheduleId?: string,
): Promise<MedicationLogRecord | null> => {
  const result = await runQuery<MedicationLogRow>(
    `
      SELECT
        id,
        medication_id,
        medication_schedule_id,
        patient_id,
        scheduled_for::text AS scheduled_for,
        taken_at::text AS taken_at,
        status,
        note,
        created_at::text AS created_at
      FROM medication_logs
      WHERE medication_id = $1
        AND scheduled_for = $2::timestamptz
        AND ($3::uuid IS NULL OR medication_schedule_id = $3::uuid)
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [medicationId, scheduledFor, scheduleId ?? null],
  );

  return result.rowCount ? mapMedicationLogRecord(result.rows[0]) : null;
};

const updateMedicationLog = async (logId: string, input: UpdateMedicationLogInput): Promise<MedicationLogRecord | null> => {
  const result = await runQuery<IdRow>(
    `
      UPDATE medication_logs
      SET
        taken_at = COALESCE($2::timestamptz, taken_at),
        status = $3::medication_log_status,
        note = COALESCE($4, note)
      WHERE id = $1
      RETURNING id
    `,
    [logId, input.takenAt ?? null, input.status, input.note ?? null],
  );

  return result.rowCount ? mapSingleMedicationLog(result.rows[0].id) : null;
};

const createMedicationLog = async (
  medicationId: string,
  patientId: string,
  input: CreateMedicationLogInput,
): Promise<MedicationLogRecord | null> => {
  const result = await runQuery<IdRow>(
    `
      INSERT INTO medication_logs (
        medication_id,
        medication_schedule_id,
        patient_id,
        scheduled_for,
        taken_at,
        status,
        note
      )
      VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6::medication_log_status, $7)
      RETURNING id
    `,
    [
      medicationId,
      input.scheduleId ?? null,
      patientId,
      input.scheduledFor,
      input.takenAt ?? null,
      input.status,
      input.note ?? null,
    ],
  );

  return result.rowCount ? mapSingleMedicationLog(result.rows[0].id) : null;
};

const listMedicationLogs = async (
  medicationId: string,
  filters: MedicationLogListFilters,
): Promise<PaginatedResult<MedicationLogRecord>> => {
  const offset = (filters.page - 1) * filters.limit;
  const values: unknown[] = [medicationId];
  const whereClauses: string[] = ["medication_id = $1"];

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    whereClauses.push(`scheduled_for >= $${values.length}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    whereClauses.push(`scheduled_for < ($${values.length}::date + INTERVAL '1 day')`);
  }

  values.push(filters.limit, offset);
  const limitParam = values.length - 1;
  const offsetParam = values.length;

  const result = await runQuery<MedicationLogRow>(
    `
      SELECT
        COUNT(*) OVER()::text AS total_count,
        id,
        medication_id,
        medication_schedule_id,
        patient_id,
        scheduled_for::text AS scheduled_for,
        taken_at::text AS taken_at,
        status,
        note,
        created_at::text AS created_at
      FROM medication_logs
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY scheduled_for DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `,
    values,
  );

  const total = result.rowCount ? Number(result.rows[0].total_count ?? 0) : 0;

  return {
    items: result.rows.map(mapMedicationLogRecord),
    meta: createPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      total,
    }),
  };
};

const getMedicationAdherenceSummary = async (
  medicationId: string,
  filters: MedicationAdherenceFilters,
): Promise<MedicationAdherenceSummary> => {
  const values: unknown[] = [medicationId];
  const whereClauses = ["medication_id = $1"];

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    whereClauses.push(`scheduled_for >= $${values.length}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    whereClauses.push(`scheduled_for < ($${values.length}::date + INTERVAL '1 day')`);
  }

  const result = await runQuery<AdherenceSummaryRow>(
    `
      SELECT
        COUNT(*)::text AS total_doses,
        COUNT(*) FILTER (WHERE status = 'TAKEN')::text AS taken_doses,
        COUNT(*) FILTER (WHERE status = 'SKIPPED')::text AS skipped_doses,
        COUNT(*) FILTER (WHERE status = 'MISSED')::text AS missed_doses,
        COUNT(*) FILTER (WHERE status = 'SCHEDULED')::text AS pending_doses
      FROM medication_logs
      WHERE ${whereClauses.join(" AND ")}
    `,
    values,
  );

  const row = result.rows[0] ?? {
    total_doses: "0",
    taken_doses: "0",
    skipped_doses: "0",
    missed_doses: "0",
    pending_doses: "0",
  };

  const takenDoses = Number(row.taken_doses);
  const skippedDoses = Number(row.skipped_doses);
  const missedDoses = Number(row.missed_doses);
  const pendingDoses = Number(row.pending_doses);
  const completedDoseCount = takenDoses + skippedDoses + missedDoses;

  return {
    medicationId,
    dateFrom: filters.dateFrom ?? null,
    dateTo: filters.dateTo ?? null,
    totalDoses: Number(row.total_doses),
    takenDoses,
    skippedDoses,
    missedDoses,
    pendingDoses,
    adherenceRate: completedDoseCount > 0 ? Number((takenDoses / completedDoseCount).toFixed(4)) : 0,
  };
};

const getMedicationReminderRecipient = async (medicationId: string): Promise<MedicationReminderRecipient | null> => {
  const result = await runQuery<ReminderRecipientRow>(
    `
      SELECT
        pu.id AS user_id,
        pu.first_name,
        pu.last_name,
        COALESCE(us.medication_reminders_enabled, TRUE) AS medication_reminders_enabled
      FROM medications m
      JOIN patient_profiles pp ON pp.id = m.patient_id
      JOIN users pu ON pu.id = pp.user_id
      LEFT JOIN user_settings us ON us.user_id = pu.id
      WHERE m.id = $1
      LIMIT 1
    `,
    [medicationId],
  );

  return result.rowCount ? mapMedicationReminderRecipient(result.rows[0]) : null;
};

const cancelPendingMedicationReminders = async (medicationId: string): Promise<void> => {
  await runQuery(
    `
      UPDATE reminders
      SET
        status = 'CANCELLED',
        updated_at = NOW()
      WHERE related_type = 'MEDICATION'
        AND related_id = $1
        AND status = 'PENDING'
    `,
    [medicationId],
  );
};

const createMedicationReminder = async (
  userId: string,
  medicationId: string,
  title: string,
  message: string,
  scheduledFor: string,
): Promise<void> => {
  await runQuery(
    `
      INSERT INTO reminders (
        user_id,
        related_type,
        related_id,
        title,
        message,
        scheduled_for,
        channel
      )
      VALUES ($1, 'MEDICATION', $2, $3, $4, $5::timestamptz, 'IN_APP')
    `,
    [userId, medicationId, title, message, scheduledFor],
  );
};

export const medicationsRepository: MedicationsRepository = {
  getDoctorIdByUserId,
  getPatientIdByUserId,
  doctorHasAccessToPatient,
  prescriptionBelongsToPatient,
  createMedication,
  getMedicationById,
  listMedications,
  updateMedication,
  listMedicationSchedules,
  replaceMedicationSchedules,
  deleteFutureScheduledMedicationLogs,
  createMedicationLogs,
  findMedicationLogByOccurrence,
  updateMedicationLog,
  createMedicationLog,
  listMedicationLogs,
  getMedicationAdherenceSummary,
  getMedicationReminderRecipient,
  cancelPendingMedicationReminders,
  createMedicationReminder,
};
