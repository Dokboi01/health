import type { PoolClient } from "pg";
import { StatusCodes } from "http-status-codes";

import { AppRole } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { withTransaction } from "../../config/database";
import { logger } from "../../config/logger";
import { medicationsRepository } from "./medications.repository";
import type {
  CreateMedicationInput,
  CreateMedicationLogInput,
  ExpandedMedicationScheduleInput,
  MarkMedicationTakenInput,
  MedicationActorContext,
  MedicationAdherenceFilters,
  MedicationListFilters,
  MedicationLogListFilters,
  MedicationRecord,
  MedicationScheduleInput,
  MedicationScheduleRecord,
  ReplaceMedicationSchedulesInput,
  ScheduledMedicationLogSeed,
  UpdateMedicationInput,
} from "./medications.types";

const reminderEligibleStatuses = new Set(["ACTIVE"]);
const scheduleLogLookaheadDays = 14;
const maxReminderOccurrences = 12;

const requireDoctorIdForUser = async (userId: string): Promise<string> => {
  const doctorId = await medicationsRepository.getDoctorIdByUserId(userId);

  if (!doctorId) {
    throw new AppError(StatusCodes.NOT_FOUND, "Doctor profile was not found.", "DOCTOR_PROFILE_NOT_FOUND");
  }

  return doctorId;
};

const requirePatientIdForUser = async (userId: string): Promise<string> => {
  const patientId = await medicationsRepository.getPatientIdByUserId(userId);

  if (!patientId) {
    throw new AppError(StatusCodes.NOT_FOUND, "Patient profile was not found.", "PATIENT_PROFILE_NOT_FOUND");
  }

  return patientId;
};

const assertDoctorCanAccessPatient = async (doctorUserId: string, patientId: string): Promise<void> => {
  const hasAccess = await medicationsRepository.doctorHasAccessToPatient(doctorUserId, patientId);

  if (!hasAccess) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You can only manage medications for patients in your care team.",
      "FORBIDDEN",
    );
  }
};

const assertActorCanAccessMedication = async (
  actor: MedicationActorContext,
  medication: MedicationRecord,
): Promise<void> => {
  if (actor.role === AppRole.ADMIN) {
    return;
  }

  if (actor.role === AppRole.DOCTOR) {
    await requireDoctorIdForUser(actor.userId);
    await assertDoctorCanAccessPatient(actor.userId, medication.patientId);
    return;
  }

  const patientId = await requirePatientIdForUser(actor.userId);

  if (patientId !== medication.patientId) {
    throw new AppError(StatusCodes.FORBIDDEN, "You cannot access this medication.", "FORBIDDEN");
  }
};

const toUtcStartOfDay = (dateValue: string): Date => new Date(`${dateValue}T00:00:00.000Z`);

const toUtcEndOfDay = (dateValue: string): Date => new Date(`${dateValue}T23:59:59.999Z`);

const addUtcDays = (value: Date, days: number): Date => {
  const copy = new Date(value);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};

const combineDateWithTime = (date: Date, time: string): Date => {
  const [hours, minutes] = time.split(":").map(Number);

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours,
      minutes,
      0,
      0,
    ),
  );
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const deriveFallbackReminderTimes = (frequency: string): string[] => {
  const normalized = frequency.trim().toLowerCase();

  if (
    normalized.includes("four") ||
    normalized.includes("4x") ||
    normalized.includes("qid") ||
    normalized.includes("every 6")
  ) {
    return ["06:00", "12:00", "18:00", "22:00"];
  }

  if (
    normalized.includes("three") ||
    normalized.includes("3x") ||
    normalized.includes("tid") ||
    normalized.includes("every 8")
  ) {
    return ["08:00", "14:00", "20:00"];
  }

  if (
    normalized.includes("twice") ||
    normalized.includes("two times") ||
    normalized.includes("2x") ||
    normalized.includes("bid") ||
    normalized.includes("every 12")
  ) {
    return ["08:00", "20:00"];
  }

  if (normalized.includes("evening") || normalized.includes("night") || normalized.includes("bedtime")) {
    return ["20:00"];
  }

  if (normalized.includes("morning")) {
    return ["08:00"];
  }

  return ["09:00"];
};

const expandMedicationSchedules = (inputs: MedicationScheduleInput[]): ExpandedMedicationScheduleInput[] => {
  const expanded: ExpandedMedicationScheduleInput[] = [];
  const seen = new Set<string>();

  for (const input of inputs) {
    if (input.reminderTime && timeToMinutes(input.reminderTime) > timeToMinutes(input.scheduledTime)) {
      throw new AppError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        "reminderTime must be at or before scheduledTime.",
        "INVALID_REMINDER_TIME",
      );
    }

    const days = input.daysOfWeek && input.daysOfWeek.length > 0 ? input.daysOfWeek : [null];

    for (const dayOfWeek of days) {
      const key = `${dayOfWeek ?? "daily"}|${input.scheduledTime}|${input.reminderTime ?? ""}|${input.timezone ?? "Africa/Lagos"}|${input.label ?? ""}`;

      if (seen.has(key)) {
        continue;
      }

      expanded.push({
        dayOfWeek,
        scheduledTime: input.scheduledTime,
        reminderTime: input.reminderTime ?? null,
        timezone: input.timezone ?? "Africa/Lagos",
        label: input.label,
        isActive: input.isActive ?? true,
      });

      seen.add(key);
    }
  }

  return expanded.sort((left, right) => {
    const dayComparison = (left.dayOfWeek ?? -1) - (right.dayOfWeek ?? -1);

    if (dayComparison !== 0) {
      return dayComparison;
    }

    return timeToMinutes(left.scheduledTime) - timeToMinutes(right.scheduledTime);
  });
};

const buildScheduleOccurrences = (
  medication: Pick<MedicationRecord, "id" | "patientId" | "startDate" | "endDate" | "status">,
  schedules: MedicationScheduleRecord[],
  options?: {
    lookaheadDays?: number;
    maxResults?: number;
    includePast?: boolean;
  },
): Array<{
  scheduleId: string;
  scheduledFor: string;
  reminderFor: string;
}> => {
  const lookaheadDays = options?.lookaheadDays ?? scheduleLogLookaheadDays;
  const maxResults = options?.maxResults;
  const includePast = options?.includePast ?? false;
  const now = new Date();
  const startDay = toUtcStartOfDay(medication.startDate);
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const firstDay = new Date(Math.max(startDay.getTime(), todayStart.getTime()));
  const endDay = medication.endDate ? toUtcEndOfDay(medication.endDate) : null;
  const occurrences: Array<{
    scheduleId: string;
    scheduledFor: string;
    reminderFor: string;
  }> = [];

  for (let dayOffset = 0; dayOffset < lookaheadDays; dayOffset += 1) {
    const currentDay = addUtcDays(firstDay, dayOffset);

    if (endDay && currentDay.getTime() > endDay.getTime()) {
      break;
    }

    for (const schedule of schedules) {
      if (!schedule.isActive) {
        continue;
      }

      if (schedule.dayOfWeek !== null && schedule.dayOfWeek !== currentDay.getUTCDay()) {
        continue;
      }

      const scheduledAt = combineDateWithTime(currentDay, schedule.scheduledTime);
      const reminderAt = combineDateWithTime(currentDay, schedule.reminderTime ?? schedule.scheduledTime);

      if (!includePast && scheduledAt.getTime() <= now.getTime()) {
        continue;
      }

      if (scheduledAt.getTime() < startDay.getTime()) {
        continue;
      }

      if (endDay && scheduledAt.getTime() > endDay.getTime()) {
        continue;
      }

      occurrences.push({
        scheduleId: schedule.id,
        scheduledFor: scheduledAt.toISOString(),
        reminderFor: reminderAt.toISOString(),
      });

      if (maxResults && occurrences.length >= maxResults) {
        return occurrences.sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor));
      }
    }
  }

  return occurrences.sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor));
};

const rebuildScheduledMedicationLogs = async (
  client: PoolClient,
  medication: Pick<MedicationRecord, "id" | "patientId" | "startDate" | "endDate" | "status">,
  schedules: MedicationScheduleRecord[],
): Promise<void> => {
  const nowIso = new Date().toISOString();
  await medicationsRepository.deleteFutureScheduledMedicationLogs(client, medication.id, nowIso);

  if (!reminderEligibleStatuses.has(medication.status) || schedules.length === 0) {
    return;
  }

  const occurrences = buildScheduleOccurrences(medication, schedules);
  const logs: ScheduledMedicationLogSeed[] = occurrences.map((occurrence) => ({
    medicationId: medication.id,
    scheduleId: occurrence.scheduleId,
    patientId: medication.patientId,
    scheduledFor: occurrence.scheduledFor,
    status: "SCHEDULED",
  }));

  await medicationsRepository.createMedicationLogs(client, logs);
};

const buildFallbackReminderTimestamps = (medication: MedicationRecord): string[] => {
  const now = new Date();
  const times = deriveFallbackReminderTimes(medication.frequency);
  const startDay = toUtcStartOfDay(medication.startDate);
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const firstDay = new Date(Math.max(startDay.getTime(), todayStart.getTime()));
  const endDay = medication.endDate ? toUtcEndOfDay(medication.endDate) : null;
  const scheduledTimes: string[] = [];

  for (let dayOffset = 0; dayOffset < scheduleLogLookaheadDays && scheduledTimes.length < maxReminderOccurrences; dayOffset += 1) {
    const currentDay = addUtcDays(firstDay, dayOffset);

    if (endDay && currentDay.getTime() > endDay.getTime()) {
      break;
    }

    for (const time of times) {
      const scheduledAt = combineDateWithTime(currentDay, time);

      if (scheduledAt.getTime() <= now.getTime()) {
        continue;
      }

      if (scheduledAt.getTime() < startDay.getTime()) {
        continue;
      }

      if (endDay && scheduledAt.getTime() > endDay.getTime()) {
        continue;
      }

      scheduledTimes.push(scheduledAt.toISOString());

      if (scheduledTimes.length >= maxReminderOccurrences) {
        break;
      }
    }
  }

  return scheduledTimes;
};

const syncMedicationReminders = async (medication: MedicationRecord): Promise<void> => {
  try {
    await medicationsRepository.cancelPendingMedicationReminders(medication.id);

    if (!reminderEligibleStatuses.has(medication.status) || !medication.reminderEnabled) {
      return;
    }

    const recipient = await medicationsRepository.getMedicationReminderRecipient(medication.id);

    if (!recipient || !recipient.medicationRemindersEnabled) {
      return;
    }

    const scheduledTimes =
      medication.schedules.length > 0
        ? buildScheduleOccurrences(medication, medication.schedules, {
            maxResults: maxReminderOccurrences,
          })
            .map((occurrence) => occurrence.reminderFor)
            .filter((scheduledFor) => new Date(scheduledFor).getTime() > Date.now())
        : buildFallbackReminderTimestamps(medication);

    for (const scheduledFor of scheduledTimes) {
      await medicationsRepository.createMedicationReminder(
        recipient.userId,
        medication.id,
        "Medication reminder",
        `Time to take ${medication.name}. ${medication.dosageInstructions}`,
        scheduledFor,
      );
    }
  } catch (error) {
    logger.warn("Medication reminder sync failed.", error);
  }
};

const createMedication = async (actor: MedicationActorContext, input: CreateMedicationInput) => {
  if (actor.role !== AppRole.ADMIN && actor.role !== AppRole.DOCTOR) {
    throw new AppError(StatusCodes.FORBIDDEN, "Only admins and doctors can create medications.", "FORBIDDEN");
  }

  if (actor.role === AppRole.DOCTOR) {
    await requireDoctorIdForUser(actor.userId);
    await assertDoctorCanAccessPatient(actor.userId, input.patientId);
  }

  if (input.prescriptionId) {
    const belongsToPatient = await medicationsRepository.prescriptionBelongsToPatient(
      input.prescriptionId,
      input.patientId,
    );

    if (!belongsToPatient) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "The selected prescription does not belong to the patient.",
        "PRESCRIPTION_PATIENT_MISMATCH",
      );
    }
  }

  const expandedSchedules = expandMedicationSchedules(input.schedules ?? []);

  const medicationId = await withTransaction(async (client) => {
    const createdMedicationId = await medicationsRepository.createMedication(client, input, actor.userId);

    if (expandedSchedules.length > 0) {
      const schedules = await medicationsRepository.replaceMedicationSchedules(
        client,
        createdMedicationId,
        input.patientId,
        expandedSchedules,
      );

      await rebuildScheduledMedicationLogs(
        client,
        {
          id: createdMedicationId,
          patientId: input.patientId,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          status: "ACTIVE",
        },
        schedules,
      );
    }

    return createdMedicationId;
  });

  const medication = await medicationsRepository.getMedicationById(medicationId);

  if (!medication) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Medication was created but could not be reloaded.",
      "MEDICATION_RELOAD_FAILED",
    );
  }

  await syncMedicationReminders(medication);
  return medication;
};

const listMedications = async (actor: MedicationActorContext, filters: MedicationListFilters) => {
  if (actor.role === AppRole.DOCTOR) {
    await requireDoctorIdForUser(actor.userId);
  }

  const patientId = actor.role === AppRole.PATIENT ? await requirePatientIdForUser(actor.userId) : undefined;

  return medicationsRepository.listMedications(
    {
      role: actor.role,
      doctorUserId: actor.role === AppRole.DOCTOR ? actor.userId : undefined,
      patientId,
    },
    filters,
  );
};

const getMedicationById = async (actor: MedicationActorContext, medicationId: string) => {
  const medication = await medicationsRepository.getMedicationById(medicationId);

  if (!medication) {
    throw new AppError(StatusCodes.NOT_FOUND, "Medication was not found.", "MEDICATION_NOT_FOUND");
  }

  await assertActorCanAccessMedication(actor, medication);
  return medication;
};

const validateMedicationDateWindow = (
  startDate: string,
  endDate: string | null,
  errorCode: string,
): void => {
  if (endDate && endDate < startDate) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "Medication end date must be on or after the start date.",
      errorCode,
    );
  }
};

const updateMedication = async (
  actor: MedicationActorContext,
  medicationId: string,
  input: UpdateMedicationInput,
) => {
  if (actor.role !== AppRole.ADMIN && actor.role !== AppRole.DOCTOR) {
    throw new AppError(StatusCodes.FORBIDDEN, "Only admins and doctors can update medications.", "FORBIDDEN");
  }

  const currentMedication = await getMedicationById(actor, medicationId);
  const nextStartDate = input.startDate ?? currentMedication.startDate;
  const nextEndDate = input.endDate === undefined ? currentMedication.endDate : input.endDate;

  validateMedicationDateWindow(nextStartDate, nextEndDate, "INVALID_MEDICATION_DATE_RANGE");

  const medication = await medicationsRepository.updateMedication(medicationId, input);

  if (!medication) {
    throw new AppError(StatusCodes.NOT_FOUND, "Medication was not found.", "MEDICATION_NOT_FOUND");
  }

  if (medication.schedules.length > 0) {
    await withTransaction((client) => rebuildScheduledMedicationLogs(client, medication, medication.schedules));
  }

  await syncMedicationReminders(medication);
  return medication;
};

const listMedicationSchedules = async (actor: MedicationActorContext, medicationId: string) => {
  const medication = await getMedicationById(actor, medicationId);
  return medication.schedules;
};

const replaceMedicationSchedules = async (
  actor: MedicationActorContext,
  medicationId: string,
  input: ReplaceMedicationSchedulesInput,
) => {
  if (actor.role !== AppRole.ADMIN && actor.role !== AppRole.DOCTOR) {
    throw new AppError(StatusCodes.FORBIDDEN, "Only admins and doctors can update medication schedules.", "FORBIDDEN");
  }

  const medication = await getMedicationById(actor, medicationId);
  const expandedSchedules = expandMedicationSchedules(input.schedules);

  const schedules = await withTransaction(async (client) => {
    const replacedSchedules = await medicationsRepository.replaceMedicationSchedules(
      client,
      medication.id,
      medication.patientId,
      expandedSchedules,
    );

    await rebuildScheduledMedicationLogs(client, medication, replacedSchedules);

    return replacedSchedules;
  });

  const refreshedMedication = await medicationsRepository.getMedicationById(medicationId);

  if (refreshedMedication) {
    await syncMedicationReminders(refreshedMedication);
  }

  return schedules;
};

const validateLogWithinMedicationWindow = (
  medication: MedicationRecord,
  input: Pick<CreateMedicationLogInput, "scheduledFor" | "takenAt">,
): void => {
  const scheduledDate = input.scheduledFor.slice(0, 10);

  if (scheduledDate < medication.startDate) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "Medication logs cannot be created before the medication start date.",
      "LOG_BEFORE_MEDICATION_START",
    );
  }

  if (medication.endDate && scheduledDate > medication.endDate) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "Medication logs cannot be created after the medication end date.",
      "LOG_AFTER_MEDICATION_END",
    );
  }

  if (input.takenAt) {
    const takenDate = input.takenAt.slice(0, 10);

    if (takenDate < medication.startDate) {
      throw new AppError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        "takenAt cannot be before the medication start date.",
        "TAKEN_AT_BEFORE_MEDICATION_START",
      );
    }

    if (medication.endDate && takenDate > medication.endDate) {
      throw new AppError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        "takenAt cannot be after the medication end date.",
        "TAKEN_AT_AFTER_MEDICATION_END",
      );
    }
  }
};

const assertScheduleBelongsToMedication = (
  medication: MedicationRecord,
  scheduleId?: string,
): MedicationScheduleRecord | null => {
  if (!scheduleId) {
    return null;
  }

  const schedule = medication.schedules.find((entry) => entry.id === scheduleId);

  if (!schedule) {
    throw new AppError(StatusCodes.BAD_REQUEST, "The selected schedule does not belong to this medication.", "INVALID_SCHEDULE");
  }

  return schedule;
};

const createMedicationLog = async (
  actor: MedicationActorContext,
  medicationId: string,
  input: CreateMedicationLogInput,
) => {
  const medication = await getMedicationById(actor, medicationId);
  assertScheduleBelongsToMedication(medication, input.scheduleId);

  if (medication.status === "COMPLETED" || medication.status === "EXPIRED") {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Completed or expired medications cannot accept new logs.",
      "MEDICATION_LOGGING_LOCKED",
    );
  }

  validateLogWithinMedicationWindow(medication, input);

  const medicationLog = await medicationsRepository.createMedicationLog(medication.id, medication.patientId, input);

  if (!medicationLog) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Medication log was created but could not be reloaded.",
      "MEDICATION_LOG_RELOAD_FAILED",
    );
  }

  return medicationLog;
};

const markMedicationTaken = async (
  actor: MedicationActorContext,
  medicationId: string,
  input: MarkMedicationTakenInput,
) => {
  const medication = await getMedicationById(actor, medicationId);
  assertScheduleBelongsToMedication(medication, input.scheduleId);

  if (medication.status === "COMPLETED" || medication.status === "EXPIRED") {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Completed or expired medications cannot accept new logs.",
      "MEDICATION_LOGGING_LOCKED",
    );
  }

  const takenAt = input.takenAt ?? new Date().toISOString();
  const scheduledFor = input.scheduledFor ?? takenAt;
  validateLogWithinMedicationWindow(medication, { scheduledFor, takenAt });

  const existingLog = await medicationsRepository.findMedicationLogByOccurrence(
    medication.id,
    scheduledFor,
    input.scheduleId,
  );

  if (existingLog) {
    const updatedLog = await medicationsRepository.updateMedicationLog(existingLog.id, {
      status: "TAKEN",
      takenAt,
      note: input.note,
    });

    if (!updatedLog) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Medication log was updated but could not be reloaded.",
        "MEDICATION_LOG_RELOAD_FAILED",
      );
    }

    return updatedLog;
  }

  const createdLog = await medicationsRepository.createMedicationLog(medication.id, medication.patientId, {
    scheduleId: input.scheduleId,
    scheduledFor,
    takenAt,
    status: "TAKEN",
    note: input.note,
  });

  if (!createdLog) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Medication log was created but could not be reloaded.",
      "MEDICATION_LOG_RELOAD_FAILED",
    );
  }

  return createdLog;
};

const listMedicationLogs = async (
  actor: MedicationActorContext,
  medicationId: string,
  filters: MedicationLogListFilters,
) => {
  await getMedicationById(actor, medicationId);
  return medicationsRepository.listMedicationLogs(medicationId, filters);
};

const getMedicationAdherence = async (
  actor: MedicationActorContext,
  medicationId: string,
  filters: MedicationAdherenceFilters,
) => {
  await getMedicationById(actor, medicationId);
  return medicationsRepository.getMedicationAdherenceSummary(medicationId, filters);
};

export const medicationsService = {
  createMedication,
  listMedications,
  getMedicationById,
  updateMedication,
  listMedicationSchedules,
  replaceMedicationSchedules,
  createMedicationLog,
  markMedicationTaken,
  listMedicationLogs,
  getMedicationAdherence,
};
