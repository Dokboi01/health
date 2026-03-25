import { StatusCodes } from "http-status-codes";

import { AppRole } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { withTransaction } from "../../config/database";
import { notificationsService } from "../notifications/notifications.service";
import { prescriptionsRepository } from "./prescriptions.repository";
import type {
  CreatePrescriptionInput,
  GeneratedMedicationSeed,
  PrescriptionActorContext,
  PrescriptionItemInput,
  PrescriptionListFilters,
  PrescriptionRecord,
  UpdatePrescriptionInput,
  UpdatePrescriptionStatusInput,
} from "./prescriptions.types";

const getTodayUtcDate = (): string => new Date().toISOString().slice(0, 10);

const addDaysToDate = (dateValue: string, days: number): string => {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const requireDoctorIdForActor = async (
  actor: PrescriptionActorContext,
  requestedDoctorId?: string,
): Promise<string> => {
  if (actor.role === AppRole.DOCTOR) {
    const doctorId = await prescriptionsRepository.getDoctorIdByUserId(actor.userId);

    if (!doctorId) {
      throw new AppError(StatusCodes.NOT_FOUND, "Doctor profile was not found.", "DOCTOR_PROFILE_NOT_FOUND");
    }

    if (requestedDoctorId && requestedDoctorId !== doctorId) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Doctors can only prescribe from their own profile.",
        "FORBIDDEN",
      );
    }

    return doctorId;
  }

  if (!requestedDoctorId) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "doctorId is required when an admin creates a prescription.",
      "DOCTOR_ID_REQUIRED",
    );
  }

  return requestedDoctorId;
};

const requirePatientIdForUser = async (userId: string): Promise<string> => {
  const patientId = await prescriptionsRepository.getPatientIdByUserId(userId);

  if (!patientId) {
    throw new AppError(StatusCodes.NOT_FOUND, "Patient profile was not found.", "PATIENT_PROFILE_NOT_FOUND");
  }

  return patientId;
};

const assertDoctorCanAccessPatient = async (doctorUserId: string, patientId: string): Promise<void> => {
  const hasAccess = await prescriptionsRepository.doctorHasAccessToPatient(doctorUserId, patientId);

  if (!hasAccess) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You can only access prescriptions for patients in your care team.",
      "FORBIDDEN",
    );
  }
};

const assertActorCanAccessPrescription = async (
  actor: PrescriptionActorContext,
  prescription: PrescriptionRecord,
): Promise<void> => {
  if (actor.role === AppRole.ADMIN) {
    return;
  }

  if (actor.role === AppRole.DOCTOR) {
    await assertDoctorCanAccessPatient(actor.userId, prescription.patientId);
    return;
  }

  const patientId = await requirePatientIdForUser(actor.userId);

  if (patientId !== prescription.patientId) {
    throw new AppError(StatusCodes.FORBIDDEN, "You cannot access this prescription.", "FORBIDDEN");
  }
};

const resolvePatientListScope = async (actor: PrescriptionActorContext): Promise<{ patientId?: string }> => {
  if (actor.role !== AppRole.PATIENT) {
    return {};
  }

  const patientId = await requirePatientIdForUser(actor.userId);
  return { patientId };
};

const buildMedicationSeeds = (
  prescriptionId: string,
  patientId: string,
  createdByUserId: string,
  startDate: string,
  fallbackEndDate: string | undefined,
  items: PrescriptionItemInput[],
): GeneratedMedicationSeed[] =>
  items.map((item) => ({
    patientId,
    prescriptionId,
    createdByUserId,
    name: item.medicationName,
    strength: item.strength,
    dosageInstructions: item.dosage,
    frequency: item.frequency,
    route: item.route,
    startDate,
    endDate:
      item.durationDays && item.durationDays > 0
        ? addDaysToDate(startDate, item.durationDays - 1)
        : fallbackEndDate ?? null,
    notes: item.notes,
  }));

const createPrescription = async (actor: PrescriptionActorContext, input: CreatePrescriptionInput) => {
  if (actor.role !== AppRole.ADMIN && actor.role !== AppRole.DOCTOR) {
    throw new AppError(StatusCodes.FORBIDDEN, "Only admins and doctors can create prescriptions.", "FORBIDDEN");
  }

  const doctorId = await requireDoctorIdForActor(actor, input.doctorId);

  if (actor.role === AppRole.DOCTOR) {
    await assertDoctorCanAccessPatient(actor.userId, input.patientId);
  } else {
    const hasAssignedDoctor = await prescriptionsRepository.doctorProfileHasAccessToPatient(doctorId, input.patientId);

    if (!hasAssignedDoctor) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "The selected doctor must be actively linked to the patient before prescribing.",
        "DOCTOR_PATIENT_LINK_REQUIRED",
      );
    }
  }

  if (input.appointmentId) {
    const appointmentMatches = await prescriptionsRepository.appointmentMatchesDoctorPatient(
      input.appointmentId,
      doctorId,
      input.patientId,
    );

    if (!appointmentMatches) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "The selected appointment does not belong to the supplied doctor and patient.",
        "APPOINTMENT_MISMATCH",
      );
    }
  }

  const startDate = input.startDate ?? getTodayUtcDate();
  const prescriptionId = await withTransaction(async (client) => {
    const createdPrescriptionId = await prescriptionsRepository.createPrescription(client, {
      doctorId,
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      diagnosis: input.diagnosis,
      instructions: input.instructions,
      startDate,
      endDate: input.endDate,
    });

    await prescriptionsRepository.replacePrescriptionItems(client, createdPrescriptionId, input.items);

    const medicationSeeds = buildMedicationSeeds(
      createdPrescriptionId,
      input.patientId,
      actor.userId,
      startDate,
      input.endDate,
      input.items,
    );

    await prescriptionsRepository.createMedicationTrackers(client, medicationSeeds);

    return createdPrescriptionId;
  });

  const prescription = await prescriptionsRepository.getPrescriptionById(prescriptionId);

  if (!prescription) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Prescription was created but could not be reloaded.",
      "PRESCRIPTION_RELOAD_FAILED",
    );
  }

  await notificationsService.notifyPatientOnPrescriptionUpdate({
    prescription,
    changeType: "CREATED",
  });

  return prescription;
};

const listPrescriptions = async (actor: PrescriptionActorContext, filters: PrescriptionListFilters) => {
  const patientScope = await resolvePatientListScope(actor);

  return prescriptionsRepository.listPrescriptions(
    {
      role: actor.role,
      doctorUserId: actor.role === AppRole.DOCTOR ? actor.userId : undefined,
      patientId: patientScope.patientId,
    },
    filters,
  );
};

const getPrescriptionById = async (actor: PrescriptionActorContext, prescriptionId: string) => {
  const prescription = await prescriptionsRepository.getPrescriptionById(prescriptionId);

  if (!prescription) {
    throw new AppError(StatusCodes.NOT_FOUND, "Prescription was not found.", "PRESCRIPTION_NOT_FOUND");
  }

  await assertActorCanAccessPrescription(actor, prescription);
  return prescription;
};

const updatePrescription = async (
  actor: PrescriptionActorContext,
  prescriptionId: string,
  input: UpdatePrescriptionInput,
) => {
  if (actor.role !== AppRole.ADMIN && actor.role !== AppRole.DOCTOR) {
    throw new AppError(StatusCodes.FORBIDDEN, "Only admins and doctors can update prescriptions.", "FORBIDDEN");
  }

  const currentPrescription = await getPrescriptionById(actor, prescriptionId);

  if (currentPrescription.status !== "ACTIVE") {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Only active prescriptions can be edited.",
      "PRESCRIPTION_LOCKED",
    );
  }

  if (typeof input.appointmentId === "string") {
    const appointmentMatches = await prescriptionsRepository.appointmentMatchesDoctorPatient(
      input.appointmentId,
      currentPrescription.doctorId,
      currentPrescription.patientId,
    );

    if (!appointmentMatches) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "The selected appointment does not belong to this prescription's doctor and patient.",
        "APPOINTMENT_MISMATCH",
      );
    }
  }

  await withTransaction(async (client) => {
    const updated = await prescriptionsRepository.updatePrescriptionHeader(client, prescriptionId, input);

    if (!updated) {
      throw new AppError(StatusCodes.NOT_FOUND, "Prescription was not found.", "PRESCRIPTION_NOT_FOUND");
    }

    if (input.items) {
      await prescriptionsRepository.replacePrescriptionItems(client, prescriptionId, input.items);
    }
  });

  const prescription = await prescriptionsRepository.getPrescriptionById(prescriptionId);

  if (!prescription) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Prescription was updated but could not be reloaded.",
      "PRESCRIPTION_RELOAD_FAILED",
    );
  }

  await notificationsService.notifyPatientOnPrescriptionUpdate({
    prescription,
    changeType: "UPDATED",
  });

  return prescription;
};

const updatePrescriptionStatus = async (
  actor: PrescriptionActorContext,
  prescriptionId: string,
  input: UpdatePrescriptionStatusInput,
) => {
  if (actor.role !== AppRole.ADMIN && actor.role !== AppRole.DOCTOR) {
    throw new AppError(StatusCodes.FORBIDDEN, "Only admins and doctors can change prescription status.", "FORBIDDEN");
  }

  await getPrescriptionById(actor, prescriptionId);

  const prescription = await prescriptionsRepository.updatePrescriptionStatus(prescriptionId, input);

  if (!prescription) {
    throw new AppError(StatusCodes.NOT_FOUND, "Prescription was not found.", "PRESCRIPTION_NOT_FOUND");
  }

  await notificationsService.notifyPatientOnPrescriptionUpdate({
    prescription,
    changeType: "STATUS_CHANGED",
  });

  return prescription;
};

export const prescriptionsService = {
  createPrescription,
  listPrescriptions,
  getPrescriptionById,
  updatePrescription,
  updatePrescriptionStatus,
};
