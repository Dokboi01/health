import type { PaginatedResult } from "../../common/types/pagination";
import { createPaginationMeta } from "../../common/utils/pagination";
import { runQuery } from "../../config/database";
import type {
  AppointmentListFilters,
  AppointmentListScope,
  AppointmentRecord,
  AppointmentReminderRecipient,
  AppointmentsRepository,
  CreateAppointmentInput,
  DoctorAvailabilitySlot,
  DoctorAvailabilitySlotInput,
  UpdateAppointmentInput,
  UpdateAppointmentStatusInput,
} from "./appointments.types";

type AppointmentRecordRow = {
  total_count?: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  booked_by_user_id: string | null;
  appointment_type: AppointmentRecord["appointmentType"];
  status: AppointmentRecord["status"];
  scheduled_start: string;
  scheduled_end: string;
  reason: string | null;
  notes: string | null;
  location: string | null;
  meeting_link: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  doctor_user_id: string;
  doctor_first_name: string;
  doctor_last_name: string;
  doctor_email: string;
  doctor_specialty: string;
  doctor_clinic_name: string | null;
  patient_user_id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_blood_group: string | null;
  patient_primary_doctor_id: string | null;
};

type IdRow = {
  id: string;
};

type DoctorAvailabilityRow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
};

type ReminderRecipientRow = {
  user_id: string;
  role: AppointmentReminderRecipient["role"];
  first_name: string;
  last_name: string;
  appointment_reminders_enabled: boolean;
};

const mapAppointmentRecord = (row: AppointmentRecordRow): AppointmentRecord => ({
  id: row.appointment_id,
  doctorId: row.doctor_id,
  patientId: row.patient_id,
  bookedByUserId: row.booked_by_user_id,
  appointmentType: row.appointment_type,
  status: row.status,
  scheduledStart: row.scheduled_start,
  scheduledEnd: row.scheduled_end,
  reason: row.reason,
  notes: row.notes,
  location: row.location,
  meetingLink: row.meeting_link,
  cancellationReason: row.cancellation_reason,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  doctor: {
    userId: row.doctor_user_id,
    firstName: row.doctor_first_name,
    lastName: row.doctor_last_name,
    email: row.doctor_email,
    specialty: row.doctor_specialty,
    clinicName: row.doctor_clinic_name,
  },
  patient: {
    userId: row.patient_user_id,
    firstName: row.patient_first_name,
    lastName: row.patient_last_name,
    email: row.patient_email,
    bloodGroup: row.patient_blood_group,
    primaryDoctorId: row.patient_primary_doctor_id,
  },
});

const mapAvailabilitySlot = (row: DoctorAvailabilityRow): DoctorAvailabilitySlot => ({
  id: row.id,
  dayOfWeek: row.day_of_week,
  startTime: row.start_time.slice(0, 5),
  endTime: row.end_time.slice(0, 5),
  slotDurationMinutes: Number(row.slot_duration_minutes),
  isActive: row.is_active,
});

const mapReminderRecipient = (row: ReminderRecipientRow): AppointmentReminderRecipient => ({
  userId: row.user_id,
  role: row.role,
  firstName: row.first_name,
  lastName: row.last_name,
  appointmentRemindersEnabled: row.appointment_reminders_enabled,
});

const appointmentSelect = `
  SELECT
    a.id AS appointment_id,
    a.doctor_id,
    a.patient_id,
    a.booked_by_user_id,
    a.appointment_type,
    a.status,
    a.scheduled_start::text AS scheduled_start,
    a.scheduled_end::text AS scheduled_end,
    a.reason,
    a.notes,
    a.location,
    a.meeting_link,
    a.cancellation_reason,
    a.created_at::text AS created_at,
    a.updated_at::text AS updated_at,
    du.id AS doctor_user_id,
    du.first_name AS doctor_first_name,
    du.last_name AS doctor_last_name,
    du.email AS doctor_email,
    dp.specialty AS doctor_specialty,
    dp.clinic_name AS doctor_clinic_name,
    pu.id AS patient_user_id,
    pu.first_name AS patient_first_name,
    pu.last_name AS patient_last_name,
    pu.email AS patient_email,
    pp.blood_group AS patient_blood_group,
    pp.primary_doctor_id
  FROM appointments a
  JOIN doctor_profiles dp ON dp.id = a.doctor_id
  JOIN users du ON du.id = dp.user_id
  JOIN patient_profiles pp ON pp.id = a.patient_id
  JOIN users pu ON pu.id = pp.user_id
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
  const result = await runQuery<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM doctor_patient_links
        WHERE doctor_id = $1
          AND patient_id = $2
          AND relationship_status = 'ACTIVE'
      ) AS exists
    `,
    [doctorId, patientId],
  );

  return Boolean(result.rows[0]?.exists);
};

const listDoctorAvailability = async (doctorId: string): Promise<DoctorAvailabilitySlot[]> => {
  const result = await runQuery<DoctorAvailabilityRow>(
    `
      SELECT
        id,
        day_of_week,
        start_time::text AS start_time,
        end_time::text AS end_time,
        slot_duration_minutes,
        is_active
      FROM doctor_availability
      WHERE doctor_id = $1
      ORDER BY day_of_week ASC, start_time ASC
    `,
    [doctorId],
  );

  return result.rows.map(mapAvailabilitySlot);
};

const replaceDoctorAvailability = async (
  doctorId: string,
  slots: DoctorAvailabilitySlotInput[],
): Promise<DoctorAvailabilitySlot[]> => {
  await runQuery("DELETE FROM doctor_availability WHERE doctor_id = $1", [doctorId]);

  if (slots.length === 0) {
    return [];
  }

  const values: Array<number | string | boolean> = [doctorId];
  const rows = slots.map((slot, index) => {
    const startIndex = index * 5 + 2;
    values.push(
      slot.dayOfWeek,
      slot.startTime,
      slot.endTime,
      slot.slotDurationMinutes,
      slot.isActive ?? true,
    );

    return `($1, $${startIndex}, $${startIndex + 1}::time, $${startIndex + 2}::time, $${startIndex + 3}, $${startIndex + 4})`;
  });

  await runQuery(
    `
      INSERT INTO doctor_availability (
        doctor_id,
        day_of_week,
        start_time,
        end_time,
        slot_duration_minutes,
        is_active
      )
      VALUES ${rows.join(", ")}
    `,
    values,
  );

  return listDoctorAvailability(doctorId);
};

const listAppointments = async (
  scope: AppointmentListScope,
  filters: AppointmentListFilters,
): Promise<PaginatedResult<AppointmentRecord>> => {
  const offset = (filters.page - 1) * filters.limit;
  const values: unknown[] = [];
  const whereClauses: string[] = [];

  if (scope.role === "DOCTOR" && scope.doctorId) {
    values.push(scope.doctorId);
    whereClauses.push(`a.doctor_id = $${values.length}`);
  } else if (scope.role === "PATIENT" && scope.patientId) {
    values.push(scope.patientId);
    whereClauses.push(`a.patient_id = $${values.length}`);
  } else {
    if (filters.doctorId) {
      values.push(filters.doctorId);
      whereClauses.push(`a.doctor_id = $${values.length}`);
    }

    if (filters.patientId) {
      values.push(filters.patientId);
      whereClauses.push(`a.patient_id = $${values.length}`);
    }
  }

  if (filters.status) {
    values.push(filters.status);
    whereClauses.push(`a.status = $${values.length}::appointment_status`);
  }

  if (filters.appointmentType) {
    values.push(filters.appointmentType);
    whereClauses.push(`a.appointment_type = $${values.length}::appointment_type`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    whereClauses.push(`a.scheduled_start >= $${values.length}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    whereClauses.push(`a.scheduled_start < ($${values.length}::date + INTERVAL '1 day')`);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  values.push(filters.limit, offset);
  const limitParam = values.length - 1;
  const offsetParam = values.length;

  const result = await runQuery<AppointmentRecordRow>(
    `
      SELECT
        COUNT(*) OVER()::text AS total_count,
        appointment_data.*
      FROM (
        ${appointmentSelect}
        ${whereClause}
      ) AS appointment_data
      ORDER BY appointment_data.scheduled_start ASC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `,
    values,
  );

  const total = result.rowCount ? Number(result.rows[0].total_count ?? 0) : 0;

  return {
    items: result.rows.map(mapAppointmentRecord),
    meta: createPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      total,
    }),
  };
};

const getAppointmentById = async (appointmentId: string): Promise<AppointmentRecord | null> => {
  const result = await runQuery<AppointmentRecordRow>(
    `
      ${appointmentSelect}
      WHERE a.id = $1
      LIMIT 1
    `,
    [appointmentId],
  );

  return result.rowCount ? mapAppointmentRecord(result.rows[0]) : null;
};

const listBusyAppointmentsForDoctorOnDate = async (doctorId: string, date: string): Promise<AppointmentRecord[]> => {
  const result = await runQuery<AppointmentRecordRow>(
    `
      ${appointmentSelect}
      WHERE a.doctor_id = $1
        AND a.status IN ('SCHEDULED', 'CONFIRMED', 'RESCHEDULED')
        AND a.scheduled_start >= $2::date
        AND a.scheduled_start < ($2::date + INTERVAL '1 day')
      ORDER BY a.scheduled_start ASC
    `,
    [doctorId, date],
  );

  return result.rows.map(mapAppointmentRecord);
};

const createAppointment = async (
  input: CreateAppointmentInput,
  bookedByUserId: string,
): Promise<AppointmentRecord | null> => {
  const result = await runQuery<{ id: string }>(
    `
      INSERT INTO appointments (
        doctor_id,
        patient_id,
        booked_by_user_id,
        appointment_type,
        status,
        scheduled_start,
        scheduled_end,
        reason,
        notes,
        location,
        meeting_link
      )
      VALUES (
        $1,
        $2,
        $3,
        $4::appointment_type,
        'SCHEDULED',
        $5::timestamptz,
        $6::timestamptz,
        $7,
        $8,
        $9,
        $10
      )
      RETURNING id
    `,
    [
      input.doctorId,
      input.patientId,
      bookedByUserId,
      input.appointmentType ?? "IN_PERSON",
      input.scheduledStart,
      input.scheduledEnd,
      input.reason ?? null,
      input.notes ?? null,
      input.location ?? null,
      input.meetingLink ?? null,
    ],
  );

  return result.rowCount ? getAppointmentById(result.rows[0].id) : null;
};

const updateAppointment = async (
  appointmentId: string,
  input: UpdateAppointmentInput,
): Promise<AppointmentRecord | null> => {
  const result = await runQuery<{ id: string }>(
    `
      UPDATE appointments
      SET
        appointment_type = COALESCE($2::appointment_type, appointment_type),
        scheduled_start = COALESCE($3::timestamptz, scheduled_start),
        scheduled_end = COALESCE($4::timestamptz, scheduled_end),
        reason = COALESCE($5, reason),
        notes = COALESCE($6, notes),
        location = COALESCE($7, location),
        meeting_link = COALESCE($8, meeting_link)
      WHERE id = $1
      RETURNING id
    `,
    [
      appointmentId,
      input.appointmentType ?? null,
      input.scheduledStart ?? null,
      input.scheduledEnd ?? null,
      input.reason ?? null,
      input.notes ?? null,
      input.location ?? null,
      input.meetingLink ?? null,
    ],
  );

  return result.rowCount ? getAppointmentById(result.rows[0].id) : null;
};

const updateAppointmentStatus = async (
  appointmentId: string,
  input: UpdateAppointmentStatusInput,
): Promise<AppointmentRecord | null> => {
  const result = await runQuery<{ id: string }>(
    `
      UPDATE appointments
      SET
        status = $2::appointment_status,
        cancellation_reason = CASE
          WHEN $2::appointment_status = 'CANCELLED' THEN COALESCE($3, cancellation_reason)
          ELSE cancellation_reason
        END
      WHERE id = $1
      RETURNING id
    `,
    [appointmentId, input.status, input.cancellationReason ?? null],
  );

  return result.rowCount ? getAppointmentById(result.rows[0].id) : null;
};

const findConflictingAppointment = async (
  doctorId: string,
  patientId: string,
  scheduledStart: string,
  scheduledEnd: string,
  excludeAppointmentId?: string,
): Promise<AppointmentRecord | null> => {
  const result = await runQuery<AppointmentRecordRow>(
    `
      ${appointmentSelect}
      WHERE (a.doctor_id = $1 OR a.patient_id = $2)
        AND a.status IN ('SCHEDULED', 'CONFIRMED', 'RESCHEDULED')
        AND a.scheduled_start < $4::timestamptz
        AND a.scheduled_end > $3::timestamptz
        AND ($5::uuid IS NULL OR a.id <> $5::uuid)
      ORDER BY a.scheduled_start ASC
      LIMIT 1
    `,
    [doctorId, patientId, scheduledStart, scheduledEnd, excludeAppointmentId ?? null],
  );

  return result.rowCount ? mapAppointmentRecord(result.rows[0]) : null;
};

const getAppointmentReminderRecipients = async (appointmentId: string): Promise<AppointmentReminderRecipient[]> => {
  const result = await runQuery<ReminderRecipientRow>(
    `
      WITH appointment_context AS (
        SELECT doctor_id, patient_id
        FROM appointments
        WHERE id = $1
      )
      SELECT
        du.id AS user_id,
        du.role::text AS role,
        du.first_name,
        du.last_name,
        COALESCE(dus.appointment_reminders_enabled, TRUE) AS appointment_reminders_enabled
      FROM appointment_context ac
      JOIN doctor_profiles dp ON dp.id = ac.doctor_id
      JOIN users du ON du.id = dp.user_id
      LEFT JOIN user_settings dus ON dus.user_id = du.id
      UNION ALL
      SELECT
        pu.id AS user_id,
        pu.role::text AS role,
        pu.first_name,
        pu.last_name,
        COALESCE(pus.appointment_reminders_enabled, TRUE) AS appointment_reminders_enabled
      FROM appointment_context ac
      JOIN patient_profiles pp ON pp.id = ac.patient_id
      JOIN users pu ON pu.id = pp.user_id
      LEFT JOIN user_settings pus ON pus.user_id = pu.id
    `,
    [appointmentId],
  );

  return result.rows.map(mapReminderRecipient);
};

const cancelPendingAppointmentReminders = async (appointmentId: string): Promise<void> => {
  await runQuery(
    `
      UPDATE reminders
      SET
        status = 'CANCELLED',
        updated_at = NOW()
      WHERE related_type = 'APPOINTMENT'
        AND related_id = $1
        AND status = 'PENDING'
    `,
    [appointmentId],
  );
};

const createAppointmentReminder = async (
  userId: string,
  appointmentId: string,
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
      VALUES (
        $1,
        'APPOINTMENT',
        $2,
        $3,
        $4,
        $5::timestamptz,
        'IN_APP'
      )
    `,
    [userId, appointmentId, title, message, scheduledFor],
  );
};

export const appointmentsRepository: AppointmentsRepository = {
  getDoctorIdByUserId,
  getPatientIdByUserId,
  doctorHasActivePatientLink,
  listDoctorAvailability,
  replaceDoctorAvailability,
  listAppointments,
  getAppointmentById,
  listBusyAppointmentsForDoctorOnDate,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  findConflictingAppointment,
  getAppointmentReminderRecipients,
  cancelPendingAppointmentReminders,
  createAppointmentReminder,
};
