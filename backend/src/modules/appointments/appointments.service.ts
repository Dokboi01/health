import { StatusCodes } from "http-status-codes";

import { AppRole } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { logger } from "../../config/logger";
import { notificationsService } from "../notifications/notifications.service";
import { appointmentsRepository } from "./appointments.repository";
import type {
  AppointmentActorContext,
  AppointmentListFilters,
  AppointmentRecord,
  AvailabilitySlotsQuery,
  AvailableAppointmentSlot,
  CreateAppointmentInput,
  DoctorAvailabilitySlotInput,
  RejectAppointmentInput,
  ReplaceDoctorAvailabilityInput,
  RescheduleAppointmentInput,
  UpdateAppointmentInput,
  UpdateAppointmentStatusInput,
} from "./appointments.types";

const terminalStatuses = new Set(["CANCELLED", "COMPLETED", "NO_SHOW"]);

const timeToMinutes = (value: string): number => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const ensureFutureWindow = (scheduledStart: string, scheduledEnd: string): void => {
  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "Appointment date values are invalid.", "INVALID_DATE");
  }

  if (end <= start) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "Appointment end time must be after the start time.",
      "INVALID_APPOINTMENT_WINDOW",
    );
  }

  if (start <= new Date()) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "Appointments must be scheduled in the future.",
      "APPOINTMENT_MUST_BE_FUTURE",
    );
  }

  if (start.toISOString().slice(0, 10) !== end.toISOString().slice(0, 10)) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "Appointments must start and end on the same day.",
      "APPOINTMENT_SINGLE_DAY_ONLY",
    );
  }
};

const assertActorCanAccessAppointment = async (
  actor: AppointmentActorContext,
  appointment: AppointmentRecord,
): Promise<void> => {
  if (actor.role === AppRole.ADMIN) {
    return;
  }

  if (actor.role === AppRole.DOCTOR) {
    const doctorId = await requireDoctorIdForUser(actor.userId);

    if (doctorId !== appointment.doctorId) {
      throw new AppError(StatusCodes.FORBIDDEN, "You cannot access this appointment.", "FORBIDDEN");
    }

    return;
  }

  const patientId = await requirePatientIdForUser(actor.userId);

  if (patientId !== appointment.patientId) {
    throw new AppError(StatusCodes.FORBIDDEN, "You cannot access this appointment.", "FORBIDDEN");
  }
};

const assertActorCanUpdateAppointment = async (
  actor: AppointmentActorContext,
  appointment: AppointmentRecord,
): Promise<void> => {
  await assertActorCanAccessAppointment(actor, appointment);

  if (actor.role === AppRole.PATIENT) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Patients can only cancel their own appointments.",
      "FORBIDDEN",
    );
  }

  if (terminalStatuses.has(appointment.status)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Completed, cancelled, or no-show appointments cannot be updated.",
      "APPOINTMENT_LOCKED",
    );
  }
};

const assertActorCanManageAppointment = async (
  actor: AppointmentActorContext,
  appointment: AppointmentRecord,
): Promise<void> => {
  if (actor.role !== AppRole.ADMIN && actor.role !== AppRole.DOCTOR) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Only doctors and admins can manage appointment decisions.",
      "FORBIDDEN",
    );
  }

  await assertActorCanAccessAppointment(actor, appointment);

  if (terminalStatuses.has(appointment.status)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Completed, cancelled, or no-show appointments cannot be changed.",
      "APPOINTMENT_LOCKED",
    );
  }
};

const requireDoctorIdForUser = async (userId: string): Promise<string> => {
  const doctorId = await appointmentsRepository.getDoctorIdByUserId(userId);

  if (!doctorId) {
    throw new AppError(StatusCodes.NOT_FOUND, "Doctor profile was not found.", "DOCTOR_PROFILE_NOT_FOUND");
  }

  return doctorId;
};

const requirePatientIdForUser = async (userId: string): Promise<string> => {
  const patientId = await appointmentsRepository.getPatientIdByUserId(userId);

  if (!patientId) {
    throw new AppError(StatusCodes.NOT_FOUND, "Patient profile was not found.", "PATIENT_PROFILE_NOT_FOUND");
  }

  return patientId;
};

const resolveScopedDoctorAndPatientIds = async (
  actor: AppointmentActorContext,
  input: CreateAppointmentInput,
): Promise<{ doctorId: string; patientId: string }> => {
  if (actor.role === AppRole.DOCTOR) {
    const doctorId = await requireDoctorIdForUser(actor.userId);

    if (input.doctorId !== doctorId) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Doctors can only create appointments for their own schedule.",
        "FORBIDDEN",
      );
    }

    return { doctorId, patientId: input.patientId };
  }

  if (actor.role === AppRole.PATIENT) {
    const patientId = await requirePatientIdForUser(actor.userId);

    if (input.patientId !== patientId) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Patients can only create appointments for themselves.",
        "FORBIDDEN",
      );
    }

    return { doctorId: input.doctorId, patientId };
  }

  return {
    doctorId: input.doctorId,
    patientId: input.patientId,
  };
};

const validateAvailabilitySlots = (slots: DoctorAvailabilitySlotInput[]): void => {
  const grouped = new Map<number, DoctorAvailabilitySlotInput[]>();

  for (const slot of slots) {
    if (timeToMinutes(slot.endTime) <= timeToMinutes(slot.startTime)) {
      throw new AppError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        "Availability end time must be after start time.",
        "INVALID_AVAILABILITY_WINDOW",
      );
    }

    const current = grouped.get(slot.dayOfWeek) ?? [];
    current.push(slot);
    grouped.set(slot.dayOfWeek, current);
  }

  for (const daySlots of grouped.values()) {
    const sorted = [...daySlots].sort((left, right) => timeToMinutes(left.startTime) - timeToMinutes(right.startTime));

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];

      if (timeToMinutes(current.startTime) < timeToMinutes(previous.endTime)) {
        throw new AppError(
          StatusCodes.UNPROCESSABLE_ENTITY,
          "Availability windows cannot overlap on the same day.",
          "OVERLAPPING_AVAILABILITY",
        );
      }
    }
  }
};

const ensureAppointmentFitsAvailability = async (
  doctorId: string,
  scheduledStart: string,
  scheduledEnd: string,
): Promise<void> => {
  const availability = await appointmentsRepository.listDoctorAvailability(doctorId);
  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);
  const dayOfWeek = start.getUTCDay();
  const daySlots = availability.filter((slot) => slot.dayOfWeek === dayOfWeek && slot.isActive);

  const startTime = start.toISOString().slice(11, 16);
  const endTime = end.toISOString().slice(11, 16);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  const fitsAvailability = daySlots.some((slot) => {
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);
    return startMinutes >= slotStart && endMinutes <= slotEnd;
  });

  if (!fitsAvailability) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "The requested appointment time is outside the doctor's active availability.",
      "OUTSIDE_DOCTOR_AVAILABILITY",
    );
  }
};

const ensureNoAppointmentConflicts = async (
  doctorId: string,
  patientId: string,
  scheduledStart: string,
  scheduledEnd: string,
  excludeAppointmentId?: string,
): Promise<void> => {
  const conflict = await appointmentsRepository.findConflictingAppointment(
    doctorId,
    patientId,
    scheduledStart,
    scheduledEnd,
    excludeAppointmentId,
  );

  if (conflict) {
    throw new AppError(
      StatusCodes.CONFLICT,
      "The selected appointment time conflicts with an existing doctor or patient booking.",
      "APPOINTMENT_CONFLICT",
      {
        conflictingAppointmentId: conflict.id,
      },
    );
  }
};

const calculateReminderTimestamp = (scheduledStart: string): string | null => {
  const start = new Date(scheduledStart);
  const now = Date.now();
  const twentyFourHoursBefore = start.getTime() - 24 * 60 * 60 * 1000;
  const twoHoursBefore = start.getTime() - 2 * 60 * 60 * 1000;
  const thirtyMinutesBefore = start.getTime() - 30 * 60 * 1000;

  if (twentyFourHoursBefore > now) {
    return new Date(twentyFourHoursBefore).toISOString();
  }

  if (twoHoursBefore > now) {
    return new Date(twoHoursBefore).toISOString();
  }

  if (thirtyMinutesBefore > now) {
    return new Date(thirtyMinutesBefore).toISOString();
  }

  return null;
};

const syncAppointmentReminders = async (appointment: AppointmentRecord): Promise<void> => {
  try {
    await appointmentsRepository.cancelPendingAppointmentReminders(appointment.id);

    if (terminalStatuses.has(appointment.status)) {
      return;
    }

    const scheduledFor = calculateReminderTimestamp(appointment.scheduledStart);

    if (!scheduledFor) {
      return;
    }

    const recipients = await appointmentsRepository.getAppointmentReminderRecipients(appointment.id);

    for (const recipient of recipients) {
      if (!recipient.appointmentRemindersEnabled) {
        continue;
      }

      await appointmentsRepository.createAppointmentReminder(
        recipient.userId,
        appointment.id,
        "Upcoming appointment",
        `You have an appointment scheduled at ${appointment.scheduledStart}.`,
        scheduledFor,
      );
    }
  } catch (error) {
    logger.warn("Appointment reminder sync failed.", error);
  }
};

const getMyAvailability = async (actor: AppointmentActorContext) => {
  if (actor.role !== AppRole.DOCTOR) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Only doctors can manage appointment availability.",
      "FORBIDDEN",
    );
  }

  const doctorId = await requireDoctorIdForUser(actor.userId);
  return appointmentsRepository.listDoctorAvailability(doctorId);
};

const replaceMyAvailability = async (actor: AppointmentActorContext, input: ReplaceDoctorAvailabilityInput) => {
  if (actor.role !== AppRole.DOCTOR) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Only doctors can manage appointment availability.",
      "FORBIDDEN",
    );
  }

  validateAvailabilitySlots(input.slots);

  const doctorId = await requireDoctorIdForUser(actor.userId);
  return appointmentsRepository.replaceDoctorAvailability(doctorId, input.slots);
};

const getAvailableSlots = async (query: AvailabilitySlotsQuery): Promise<AvailableAppointmentSlot[]> => {
  const availability = await appointmentsRepository.listDoctorAvailability(query.doctorId);
  const busyAppointments = await appointmentsRepository.listBusyAppointmentsForDoctorOnDate(query.doctorId, query.date);
  const targetDate = new Date(`${query.date}T00:00:00.000Z`);
  const dayOfWeek = targetDate.getUTCDay();
  const activeDaySlots = availability.filter((slot) => slot.dayOfWeek === dayOfWeek && slot.isActive);
  const slots: AvailableAppointmentSlot[] = [];

  for (const slot of activeDaySlots) {
    let currentStartMinutes = timeToMinutes(slot.startTime);
    const endMinutes = timeToMinutes(slot.endTime);

    while (currentStartMinutes + slot.slotDurationMinutes <= endMinutes) {
      const hours = String(Math.floor(currentStartMinutes / 60)).padStart(2, "0");
      const minutes = String(currentStartMinutes % 60).padStart(2, "0");
      const start = new Date(`${query.date}T${hours}:${minutes}:00.000Z`);
      const end = new Date(start.getTime() + slot.slotDurationMinutes * 60 * 1000);

      const overlapsBusyAppointment = busyAppointments.some((appointment) => {
        const busyStart = new Date(appointment.scheduledStart);
        const busyEnd = new Date(appointment.scheduledEnd);
        return start < busyEnd && end > busyStart;
      });

      if (!overlapsBusyAppointment && start.getTime() > Date.now()) {
        slots.push({
          start: start.toISOString(),
          end: end.toISOString(),
        });
      }

      currentStartMinutes += slot.slotDurationMinutes;
    }
  }

  return slots;
};

const createAppointment = async (actor: AppointmentActorContext, input: CreateAppointmentInput) => {
  ensureFutureWindow(input.scheduledStart, input.scheduledEnd);

  const { doctorId, patientId } = await resolveScopedDoctorAndPatientIds(actor, input);
  const hasCareTeamRelationship = await appointmentsRepository.doctorHasActivePatientLink(doctorId, patientId);

  if (!hasCareTeamRelationship) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Appointments can only be created for an active doctor-patient relationship.",
      "DOCTOR_PATIENT_LINK_REQUIRED",
    );
  }

  await ensureAppointmentFitsAvailability(doctorId, input.scheduledStart, input.scheduledEnd);
  await ensureNoAppointmentConflicts(doctorId, patientId, input.scheduledStart, input.scheduledEnd);

  const appointment = await appointmentsRepository.createAppointment(
    {
      ...input,
      doctorId,
      patientId,
    },
    actor.userId,
  );

  if (!appointment) {
    throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to create appointment.", "APPOINTMENT_CREATE_FAILED");
  }

  await syncAppointmentReminders(appointment);
  await notificationsService.notifyDoctorOnNewBooking({ appointment });

  return appointment;
};

const listAppointments = async (actor: AppointmentActorContext, filters: AppointmentListFilters) => {
  if (actor.role === AppRole.DOCTOR) {
    const doctorId = await requireDoctorIdForUser(actor.userId);
    return appointmentsRepository.listAppointments({ role: actor.role, doctorId }, filters);
  }

  if (actor.role === AppRole.PATIENT) {
    const patientId = await requirePatientIdForUser(actor.userId);
    return appointmentsRepository.listAppointments({ role: actor.role, patientId }, filters);
  }

  return appointmentsRepository.listAppointments({ role: actor.role }, filters);
};

const getAppointmentById = async (actor: AppointmentActorContext, appointmentId: string) => {
  const appointment = await appointmentsRepository.getAppointmentById(appointmentId);

  if (!appointment) {
    throw new AppError(StatusCodes.NOT_FOUND, "Appointment was not found.", "APPOINTMENT_NOT_FOUND");
  }

  await assertActorCanAccessAppointment(actor, appointment);

  return appointment;
};

const updateAppointment = async (
  actor: AppointmentActorContext,
  appointmentId: string,
  input: UpdateAppointmentInput,
) => {
  const currentAppointment = await getAppointmentById(actor, appointmentId);
  await assertActorCanUpdateAppointment(actor, currentAppointment);

  const nextScheduledStart = input.scheduledStart ?? currentAppointment.scheduledStart;
  const nextScheduledEnd = input.scheduledEnd ?? currentAppointment.scheduledEnd;
  ensureFutureWindow(nextScheduledStart, nextScheduledEnd);

  await ensureAppointmentFitsAvailability(currentAppointment.doctorId, nextScheduledStart, nextScheduledEnd);
  await ensureNoAppointmentConflicts(
    currentAppointment.doctorId,
    currentAppointment.patientId,
    nextScheduledStart,
    nextScheduledEnd,
    currentAppointment.id,
  );

  let updatedAppointment = await appointmentsRepository.updateAppointment(appointmentId, input);

  if (!updatedAppointment) {
    throw new AppError(StatusCodes.NOT_FOUND, "Appointment was not found.", "APPOINTMENT_NOT_FOUND");
  }

  const wasRescheduled =
    nextScheduledStart !== currentAppointment.scheduledStart || nextScheduledEnd !== currentAppointment.scheduledEnd;

  if (wasRescheduled && !terminalStatuses.has(updatedAppointment.status)) {
    updatedAppointment = await appointmentsRepository.updateAppointmentStatus(updatedAppointment.id, {
      status: "RESCHEDULED",
    });
  }

  if (!updatedAppointment) {
    throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to update appointment.", "APPOINTMENT_UPDATE_FAILED");
  }

  await syncAppointmentReminders(updatedAppointment);

  return updatedAppointment;
};

const updateAppointmentStatus = async (
  actor: AppointmentActorContext,
  appointmentId: string,
  input: UpdateAppointmentStatusInput,
) => {
  const currentAppointment = await getAppointmentById(actor, appointmentId);
  await assertActorCanAccessAppointment(actor, currentAppointment);

  if (terminalStatuses.has(currentAppointment.status) && currentAppointment.status !== input.status) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Completed, cancelled, or no-show appointments cannot change status again.",
      "APPOINTMENT_LOCKED",
    );
  }

  if (actor.role === AppRole.PATIENT && input.status !== "CANCELLED") {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Patients can only cancel their own appointments.",
      "FORBIDDEN",
    );
  }

  if (input.status === "CANCELLED" && !input.cancellationReason?.trim()) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "A cancellation reason is required when cancelling an appointment.",
      "CANCELLATION_REASON_REQUIRED",
    );
  }

  if (input.status === "COMPLETED" && new Date(currentAppointment.scheduledStart) > new Date()) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Future appointments cannot be marked as completed.",
      "INVALID_STATUS_TRANSITION",
    );
  }

  const updatedAppointment = await appointmentsRepository.updateAppointmentStatus(appointmentId, input);

  if (!updatedAppointment) {
    throw new AppError(StatusCodes.NOT_FOUND, "Appointment was not found.", "APPOINTMENT_NOT_FOUND");
  }

  await syncAppointmentReminders(updatedAppointment);

  return updatedAppointment;
};

const acceptAppointment = async (actor: AppointmentActorContext, appointmentId: string) => {
  const currentAppointment = await getAppointmentById(actor, appointmentId);
  await assertActorCanManageAppointment(actor, currentAppointment);

  if (currentAppointment.status === "CONFIRMED") {
    return currentAppointment;
  }

  if (currentAppointment.status !== "SCHEDULED" && currentAppointment.status !== "RESCHEDULED") {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Only scheduled or rescheduled appointments can be accepted.",
      "INVALID_STATUS_TRANSITION",
    );
  }

  const updatedAppointment = await appointmentsRepository.updateAppointmentStatus(appointmentId, {
    status: "CONFIRMED",
  });

  if (!updatedAppointment) {
    throw new AppError(StatusCodes.NOT_FOUND, "Appointment was not found.", "APPOINTMENT_NOT_FOUND");
  }

  await syncAppointmentReminders(updatedAppointment);

  return updatedAppointment;
};

const rejectAppointment = async (
  actor: AppointmentActorContext,
  appointmentId: string,
  input: RejectAppointmentInput,
) => {
  const currentAppointment = await getAppointmentById(actor, appointmentId);
  await assertActorCanManageAppointment(actor, currentAppointment);

  const updatedAppointment = await appointmentsRepository.updateAppointmentStatus(appointmentId, {
    status: "CANCELLED",
    cancellationReason: input.cancellationReason,
  });

  if (!updatedAppointment) {
    throw new AppError(StatusCodes.NOT_FOUND, "Appointment was not found.", "APPOINTMENT_NOT_FOUND");
  }

  await syncAppointmentReminders(updatedAppointment);

  return updatedAppointment;
};

const rescheduleAppointment = async (
  actor: AppointmentActorContext,
  appointmentId: string,
  input: RescheduleAppointmentInput,
) => {
  const currentAppointment = await getAppointmentById(actor, appointmentId);
  await assertActorCanManageAppointment(actor, currentAppointment);

  return updateAppointment(actor, appointmentId, input);
};

export const appointmentsService = {
  getMyAvailability,
  replaceMyAvailability,
  getAvailableSlots,
  createAppointment,
  listAppointments,
  getAppointmentById,
  updateAppointment,
  updateAppointmentStatus,
  acceptAppointment,
  rejectAppointment,
  rescheduleAppointment,
};
