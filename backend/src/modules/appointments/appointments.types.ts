import type { AppRole } from "../../common/constants/roles";
import type { PaginatedResult } from "../../common/types/pagination";

export type AppointmentType = "IN_PERSON" | "VIRTUAL" | "FOLLOW_UP";
export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "RESCHEDULED";

export interface AppointmentActorContext {
  userId: string;
  role: AppRole;
}

export interface AppointmentListScope {
  role: AppRole;
  doctorId?: string;
  patientId?: string;
}

export interface AppointmentListFilters {
  page: number;
  limit: number;
  status?: AppointmentStatus;
  appointmentType?: AppointmentType;
  dateFrom?: string;
  dateTo?: string;
  doctorId?: string;
  patientId?: string;
}

export interface DoctorAvailabilitySlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive?: boolean;
}

export interface ReplaceDoctorAvailabilityInput {
  slots: DoctorAvailabilitySlotInput[];
}

export interface DoctorAvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
}

export interface CreateAppointmentInput {
  doctorId: string;
  patientId: string;
  appointmentType?: AppointmentType;
  scheduledStart: string;
  scheduledEnd: string;
  reason?: string;
  notes?: string;
  location?: string;
  meetingLink?: string;
}

export interface UpdateAppointmentInput {
  appointmentType?: AppointmentType;
  scheduledStart?: string;
  scheduledEnd?: string;
  reason?: string;
  notes?: string;
  location?: string;
  meetingLink?: string;
}

export interface UpdateAppointmentStatusInput {
  status: AppointmentStatus;
  cancellationReason?: string;
}

export interface RejectAppointmentInput {
  cancellationReason: string;
}

export interface RescheduleAppointmentInput {
  appointmentType?: AppointmentType;
  scheduledStart: string;
  scheduledEnd: string;
  reason?: string;
  notes?: string;
  location?: string;
  meetingLink?: string;
}

export interface AvailabilitySlotsQuery {
  doctorId: string;
  date: string;
}

export interface AvailableAppointmentSlot {
  start: string;
  end: string;
}

export interface AppointmentRecord {
  id: string;
  doctorId: string;
  patientId: string;
  bookedByUserId: string | null;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  scheduledStart: string;
  scheduledEnd: string;
  reason: string | null;
  notes: string | null;
  location: string | null;
  meetingLink: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  doctor: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    specialty: string;
    clinicName: string | null;
  };
  patient: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    bloodGroup: string | null;
    primaryDoctorId: string | null;
  };
}

export interface AppointmentReminderRecipient {
  userId: string;
  role: AppRole;
  firstName: string;
  lastName: string;
  appointmentRemindersEnabled: boolean;
}

export interface AppointmentsRepository {
  getDoctorIdByUserId(userId: string): Promise<string | null>;
  getPatientIdByUserId(userId: string): Promise<string | null>;
  doctorHasActivePatientLink(doctorId: string, patientId: string): Promise<boolean>;
  listDoctorAvailability(doctorId: string): Promise<DoctorAvailabilitySlot[]>;
  replaceDoctorAvailability(doctorId: string, slots: DoctorAvailabilitySlotInput[]): Promise<DoctorAvailabilitySlot[]>;
  listAppointments(
    scope: AppointmentListScope,
    filters: AppointmentListFilters,
  ): Promise<PaginatedResult<AppointmentRecord>>;
  getAppointmentById(appointmentId: string): Promise<AppointmentRecord | null>;
  listBusyAppointmentsForDoctorOnDate(doctorId: string, date: string): Promise<AppointmentRecord[]>;
  createAppointment(input: CreateAppointmentInput, bookedByUserId: string): Promise<AppointmentRecord | null>;
  updateAppointment(appointmentId: string, input: UpdateAppointmentInput): Promise<AppointmentRecord | null>;
  updateAppointmentStatus(
    appointmentId: string,
    input: UpdateAppointmentStatusInput,
  ): Promise<AppointmentRecord | null>;
  findConflictingAppointment(
    doctorId: string,
    patientId: string,
    scheduledStart: string,
    scheduledEnd: string,
    excludeAppointmentId?: string,
  ): Promise<AppointmentRecord | null>;
  getAppointmentReminderRecipients(appointmentId: string): Promise<AppointmentReminderRecipient[]>;
  cancelPendingAppointmentReminders(appointmentId: string): Promise<void>;
  createAppointmentReminder(
    userId: string,
    appointmentId: string,
    title: string,
    message: string,
    scheduledFor: string,
  ): Promise<void>;
}
