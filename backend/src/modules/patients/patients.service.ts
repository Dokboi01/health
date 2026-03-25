import { StatusCodes } from "http-status-codes";

import { AppRole } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { withTransaction } from "../../config/database";
import { patientsRepository } from "./patients.repository";
import type {
  PatientActorContext,
  PatientDoctorListFilters,
  UpdatePatientProfileInput,
} from "./patients.types";

const requirePatientIdForUser = async (userId: string): Promise<string> => {
  const patientId = await patientsRepository.getPatientIdByUserId(userId);

  if (!patientId) {
    throw new AppError(StatusCodes.NOT_FOUND, "Patient profile was not found.", "PATIENT_PROFILE_NOT_FOUND");
  }

  return patientId;
};

const assertActorCanAccessPatient = async (actor: PatientActorContext, patientId: string): Promise<void> => {
  if (actor.role === AppRole.ADMIN) {
    return;
  }

  if (actor.role === AppRole.PATIENT) {
    const actorPatientId = await requirePatientIdForUser(actor.userId);

    if (actorPatientId !== patientId) {
      throw new AppError(StatusCodes.FORBIDDEN, "You can only access your own patient profile.", "FORBIDDEN");
    }

    return;
  }

  const hasAccess = await patientsRepository.doctorHasAccessToPatient(actor.userId, patientId);

  if (!hasAccess) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You can only access patients linked to your care team.",
      "FORBIDDEN",
    );
  }
};

const assertActorCanManagePatient = async (actor: PatientActorContext, patientId: string): Promise<void> => {
  if (actor.role === AppRole.ADMIN) {
    return;
  }

  const actorPatientId = await requirePatientIdForUser(actor.userId);

  if (actorPatientId !== patientId) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You can only update your own primary doctor settings.",
      "FORBIDDEN",
    );
  }
};

const getMyProfile = async (userId: string) => {
  const profile = await patientsRepository.getPatientProfileByUserId(userId);

  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, "Patient profile was not found.", "PATIENT_PROFILE_NOT_FOUND");
  }

  return profile;
};

const getPatientById = async (actor: PatientActorContext, patientId: string) => {
  await assertActorCanAccessPatient(actor, patientId);

  const profile = await patientsRepository.getPatientProfileByPatientId(patientId);

  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, "Patient profile was not found.", "PATIENT_PROFILE_NOT_FOUND");
  }

  return profile;
};

const updateMyProfile = async (userId: string, input: UpdatePatientProfileInput) => {
  await withTransaction(async (client) => {
    await patientsRepository.updatePatientProfile(client, userId, input);
  });

  return getMyProfile(userId);
};

const setupMyProfile = async (userId: string, input: UpdatePatientProfileInput) => updateMyProfile(userId, input);

const getMyDoctors = async (userId: string, filters: PatientDoctorListFilters) =>
  patientsRepository.listPatientDoctors(userId, filters);

const getPatientDoctors = async (actor: PatientActorContext, patientId: string, filters: PatientDoctorListFilters) => {
  await assertActorCanAccessPatient(actor, patientId);

  return patientsRepository.listPatientDoctorsByPatientId(patientId, filters);
};

const setPrimaryDoctor = async (userId: string, doctorId: string) => {
  const profile = await patientsRepository.setPrimaryDoctor(userId, doctorId);

  if (!profile) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Primary doctor can only be set from an active linked care team relationship.",
      "PRIMARY_DOCTOR_NOT_ALLOWED",
    );
  }

  return profile;
};

const setPrimaryDoctorForPatient = async (actor: PatientActorContext, patientId: string, doctorId: string) => {
  await assertActorCanManagePatient(actor, patientId);

  const profile = await patientsRepository.setPrimaryDoctorByPatientId(patientId, doctorId);

  if (!profile) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Primary doctor can only be set from an active linked care team relationship.",
      "PRIMARY_DOCTOR_NOT_ALLOWED",
    );
  }

  return profile;
};

const searchDoctors = async (userId: string, filters: PatientDoctorListFilters) =>
  patientsRepository.searchDoctors(userId, filters);

export const patientsService = {
  getMyProfile,
  getPatientById,
  updateMyProfile,
  setupMyProfile,
  getMyDoctors,
  getPatientDoctors,
  setPrimaryDoctor,
  setPrimaryDoctorForPatient,
  searchDoctors,
};
