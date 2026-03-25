import { StatusCodes } from "http-status-codes";

import { AppRole } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { withTransaction } from "../../config/database";
import { doctorsRepository } from "./doctors.repository";
import type {
  DoctorActorContext,
  DoctorDirectoryFilters,
  DoctorPatientListFilters,
  LinkPatientInput,
  UpdateDoctorPatientRelationshipInput,
  UpdateDoctorProfileInput,
} from "./doctors.types";

const requireDoctorIdForUser = async (userId: string): Promise<string> => {
  const doctorId = await doctorsRepository.getDoctorIdByUserId(userId);

  if (!doctorId) {
    throw new AppError(StatusCodes.NOT_FOUND, "Doctor profile was not found.", "DOCTOR_PROFILE_NOT_FOUND");
  }

  return doctorId;
};

const assertActorCanManageDoctor = async (actor: DoctorActorContext, doctorId: string): Promise<void> => {
  if (actor.role === AppRole.ADMIN) {
    return;
  }

  const actorDoctorId = await requireDoctorIdForUser(actor.userId);

  if (actorDoctorId !== doctorId) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You can only manage your own patient relationships.",
      "FORBIDDEN",
    );
  }
};

const getMyProfile = async (userId: string) => {
  const profile = await doctorsRepository.getDoctorProfileByUserId(userId);

  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, "Doctor profile was not found.", "DOCTOR_PROFILE_NOT_FOUND");
  }

  return profile;
};

const listDoctors = async (filters: DoctorDirectoryFilters) => doctorsRepository.listDoctorsDirectory(filters);

const getDoctorById = async (doctorId: string) => {
  const profile = await doctorsRepository.getDoctorProfileByDoctorId(doctorId);

  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, "Doctor profile was not found.", "DOCTOR_PROFILE_NOT_FOUND");
  }

  return profile;
};

const updateMyProfile = async (userId: string, input: UpdateDoctorProfileInput) => {
  await withTransaction(async (client) => {
    await doctorsRepository.updateDoctorProfile(client, userId, input);
  });

  return getMyProfile(userId);
};

const setupMyProfile = async (userId: string, input: UpdateDoctorProfileInput) => updateMyProfile(userId, input);

const getMyPatients = async (userId: string, filters: DoctorPatientListFilters) =>
  doctorsRepository.listDoctorPatients(userId, filters);

const getDoctorPatients = async (actor: DoctorActorContext, doctorId: string, filters: DoctorPatientListFilters) => {
  await assertActorCanManageDoctor(actor, doctorId);

  return doctorsRepository.listDoctorPatientsByDoctorId(doctorId, filters);
};

const linkPatient = async (userId: string, input: LinkPatientInput) => {
  const relationship = await doctorsRepository.linkPatientToDoctor(userId, input);

  if (!relationship) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "The selected patient could not be linked to this doctor.",
      "PATIENT_LINK_FAILED",
    );
  }

  return relationship;
};

const linkPatientForDoctor = async (actor: DoctorActorContext, doctorId: string, input: LinkPatientInput) => {
  await assertActorCanManageDoctor(actor, doctorId);

  const relationship = await doctorsRepository.linkPatientToDoctorByDoctorId(doctorId, actor.userId, input);

  if (!relationship) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "The selected patient could not be linked to this doctor.",
      "PATIENT_LINK_FAILED",
    );
  }

  return relationship;
};

const updatePatientRelationship = async (
  userId: string,
  patientId: string,
  input: UpdateDoctorPatientRelationshipInput,
) => {
  const relationship = await doctorsRepository.updateDoctorPatientRelationship(userId, patientId, input);

  if (!relationship) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "Doctor-patient relationship was not found.",
      "PATIENT_RELATIONSHIP_NOT_FOUND",
    );
  }

  return relationship;
};

const updatePatientRelationshipForDoctor = async (
  actor: DoctorActorContext,
  doctorId: string,
  patientId: string,
  input: UpdateDoctorPatientRelationshipInput,
) => {
  await assertActorCanManageDoctor(actor, doctorId);

  const relationship = await doctorsRepository.updateDoctorPatientRelationshipByDoctorId(doctorId, patientId, input);

  if (!relationship) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "Doctor-patient relationship was not found.",
      "PATIENT_RELATIONSHIP_NOT_FOUND",
    );
  }

  return relationship;
};

const unlinkPatientRelationship = async (actor: DoctorActorContext, doctorId: string, patientId: string) => {
  await assertActorCanManageDoctor(actor, doctorId);

  const removed = await doctorsRepository.unlinkPatientFromDoctor(doctorId, patientId);

  if (!removed) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "Doctor-patient relationship was not found.",
      "PATIENT_RELATIONSHIP_NOT_FOUND",
    );
  }
};

const searchPatients = async (userId: string, filters: DoctorPatientListFilters) =>
  doctorsRepository.searchPatients(userId, filters);

export const doctorsService = {
  getMyProfile,
  listDoctors,
  getDoctorById,
  updateMyProfile,
  setupMyProfile,
  getMyPatients,
  getDoctorPatients,
  linkPatient,
  linkPatientForDoctor,
  updatePatientRelationship,
  updatePatientRelationshipForDoctor,
  unlinkPatientRelationship,
  searchPatients,
};
