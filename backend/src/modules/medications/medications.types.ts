import type { PoolClient } from "pg";

import type { AppRole } from "../../common/constants/roles";
import type { PaginatedResult } from "../../common/types/pagination";

export type MedicationStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "EXPIRED";
export type MedicationLogStatus = "SCHEDULED" | "TAKEN" | "SKIPPED" | "MISSED";

export interface MedicationActorContext {
  userId: string;
  role: AppRole;
}

export interface MedicationListScope {
  role: AppRole;
  doctorUserId?: string;
  patientId?: string;
}

export interface MedicationListFilters {
  page: number;
  limit: number;
  status?: MedicationStatus;
  patientId?: string;
  prescriptionId?: string;
}

export interface MedicationLogListFilters {
  page: number;
  limit: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface MedicationAdherenceFilters {
  dateFrom?: string;
  dateTo?: string;
}

export interface MedicationScheduleInput {
  scheduledTime: string;
  reminderTime?: string;
  timezone?: string;
  label?: string;
  daysOfWeek?: number[];
  isActive?: boolean;
}

export interface ExpandedMedicationScheduleInput {
  dayOfWeek: number | null;
  scheduledTime: string;
  reminderTime?: string | null;
  timezone: string;
  label?: string;
  isActive: boolean;
}

export interface ReplaceMedicationSchedulesInput {
  schedules: MedicationScheduleInput[];
}

export interface CreateMedicationInput {
  patientId: string;
  prescriptionId?: string;
  name: string;
  strength?: string;
  dosageForm?: string;
  dosageInstructions: string;
  frequency: string;
  route?: string;
  startDate: string;
  endDate?: string;
  reminderEnabled?: boolean;
  notes?: string;
  schedules?: MedicationScheduleInput[];
}

export interface UpdateMedicationInput {
  name?: string;
  strength?: string;
  dosageForm?: string;
  dosageInstructions?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
  endDate?: string | null;
  reminderEnabled?: boolean;
  status?: MedicationStatus;
  notes?: string;
}

export interface CreateMedicationLogInput {
  scheduleId?: string;
  scheduledFor: string;
  takenAt?: string;
  status: MedicationLogStatus;
  note?: string;
}

export interface UpdateMedicationLogInput {
  status: MedicationLogStatus;
  takenAt?: string;
  note?: string;
}

export interface MarkMedicationTakenInput {
  scheduleId?: string;
  scheduledFor?: string;
  takenAt?: string;
  note?: string;
}

export interface MedicationScheduleRecord {
  id: string;
  medicationId: string;
  patientId: string;
  dayOfWeek: number | null;
  scheduledTime: string;
  reminderTime: string | null;
  timezone: string;
  label: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationRecord {
  id: string;
  patientId: string;
  prescriptionId: string | null;
  createdByUserId: string | null;
  name: string;
  strength: string | null;
  dosageForm: string | null;
  dosageInstructions: string;
  frequency: string;
  route: string | null;
  startDate: string;
  endDate: string | null;
  reminderEnabled: boolean;
  status: MedicationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  schedules: MedicationScheduleRecord[];
}

export interface MedicationLogRecord {
  id: string;
  medicationId: string;
  scheduleId: string | null;
  patientId: string;
  scheduledFor: string;
  takenAt: string | null;
  status: MedicationLogStatus;
  note: string | null;
  createdAt: string;
}

export interface ScheduledMedicationLogSeed {
  medicationId: string;
  scheduleId: string | null;
  patientId: string;
  scheduledFor: string;
  status?: MedicationLogStatus;
  note?: string;
}

export interface MedicationAdherenceSummary {
  medicationId: string;
  dateFrom: string | null;
  dateTo: string | null;
  totalDoses: number;
  takenDoses: number;
  skippedDoses: number;
  missedDoses: number;
  pendingDoses: number;
  adherenceRate: number;
}

export interface MedicationReminderRecipient {
  userId: string;
  firstName: string;
  lastName: string;
  medicationRemindersEnabled: boolean;
}

export interface MedicationsRepository {
  getDoctorIdByUserId(userId: string): Promise<string | null>;
  getPatientIdByUserId(userId: string): Promise<string | null>;
  doctorHasAccessToPatient(doctorUserId: string, patientId: string): Promise<boolean>;
  prescriptionBelongsToPatient(prescriptionId: string, patientId: string): Promise<boolean>;
  createMedication(client: PoolClient, input: CreateMedicationInput, createdByUserId: string): Promise<string>;
  getMedicationById(medicationId: string): Promise<MedicationRecord | null>;
  listMedications(
    scope: MedicationListScope,
    filters: MedicationListFilters,
  ): Promise<PaginatedResult<MedicationRecord>>;
  updateMedication(
    medicationId: string,
    input: UpdateMedicationInput,
  ): Promise<MedicationRecord | null>;
  listMedicationSchedules(medicationId: string): Promise<MedicationScheduleRecord[]>;
  replaceMedicationSchedules(
    client: PoolClient,
    medicationId: string,
    patientId: string,
    schedules: ExpandedMedicationScheduleInput[],
  ): Promise<MedicationScheduleRecord[]>;
  deleteFutureScheduledMedicationLogs(client: PoolClient, medicationId: string, fromTimestamp: string): Promise<void>;
  createMedicationLogs(client: PoolClient, logs: ScheduledMedicationLogSeed[]): Promise<void>;
  findMedicationLogByOccurrence(
    medicationId: string,
    scheduledFor: string,
    scheduleId?: string,
  ): Promise<MedicationLogRecord | null>;
  updateMedicationLog(logId: string, input: UpdateMedicationLogInput): Promise<MedicationLogRecord | null>;
  createMedicationLog(
    medicationId: string,
    patientId: string,
    input: CreateMedicationLogInput,
  ): Promise<MedicationLogRecord | null>;
  listMedicationLogs(
    medicationId: string,
    filters: MedicationLogListFilters,
  ): Promise<PaginatedResult<MedicationLogRecord>>;
  getMedicationAdherenceSummary(
    medicationId: string,
    filters: MedicationAdherenceFilters,
  ): Promise<MedicationAdherenceSummary>;
  getMedicationReminderRecipient(medicationId: string): Promise<MedicationReminderRecipient | null>;
  cancelPendingMedicationReminders(medicationId: string): Promise<void>;
  createMedicationReminder(
    userId: string,
    medicationId: string,
    title: string,
    message: string,
    scheduledFor: string,
  ): Promise<void>;
}
