import { StatusCodes } from "http-status-codes";

import { AppRole } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { withTransaction } from "../../config/database";
import { recordsRepository } from "./records.repository";
import type {
  CreateMedicalRecordFileInput,
  CreateMedicalRecordInput,
  CreatePatientAllergyInput,
  CreateRecordVitalInput,
  MedicalRecordDetail,
  MedicalRecordListFilters,
  PatientAllergyRecord,
  RecordActorContext,
  RecordListScope,
  ResolvedCreateMedicalRecordInput,
  ResolvedUpdateMedicalRecordInput,
  UpdateMedicalRecordInput,
  UpdatePatientAllergyInput,
} from "./records.types";

const requireDoctorIdForUser = async (userId: string): Promise<string> => {
  const doctorId = await recordsRepository.getDoctorIdByUserId(userId);

  if (!doctorId) {
    throw new AppError(StatusCodes.NOT_FOUND, "Doctor profile was not found.", "DOCTOR_PROFILE_NOT_FOUND");
  }

  return doctorId;
};

const requirePatientIdForUser = async (userId: string): Promise<string> => {
  const patientId = await recordsRepository.getPatientIdByUserId(userId);

  if (!patientId) {
    throw new AppError(StatusCodes.NOT_FOUND, "Patient profile was not found.", "PATIENT_PROFILE_NOT_FOUND");
  }

  return patientId;
};

const assertDoctorCanAccessPatient = async (doctorId: string, patientId: string): Promise<void> => {
  const hasAccess = await recordsRepository.doctorHasActivePatientLink(doctorId, patientId);

  if (!hasAccess) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You can only access medical records for patients linked to your care team.",
      "FORBIDDEN",
    );
  }
};

const assertActorCanAccessPatient = async (actor: RecordActorContext, patientId: string): Promise<void> => {
  if (actor.role === AppRole.ADMIN) {
    return;
  }

  if (actor.role === AppRole.DOCTOR) {
    const doctorId = await requireDoctorIdForUser(actor.userId);
    await assertDoctorCanAccessPatient(doctorId, patientId);
    return;
  }

  const actorPatientId = await requirePatientIdForUser(actor.userId);

  if (actorPatientId !== patientId) {
    throw new AppError(StatusCodes.FORBIDDEN, "You can only access your own medical data.", "FORBIDDEN");
  }
};

const assertActorCanManagePatient = async (actor: RecordActorContext, patientId: string): Promise<string | null> => {
  if (actor.role === AppRole.ADMIN) {
    return null;
  }

  if (actor.role !== AppRole.DOCTOR) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Only doctors and admins can add or change medical records.",
      "FORBIDDEN",
    );
  }

  const doctorId = await requireDoctorIdForUser(actor.userId);
  await assertDoctorCanAccessPatient(doctorId, patientId);
  return doctorId;
};

const filterRecordForPatientView = (record: MedicalRecordDetail): MedicalRecordDetail => ({
  ...record,
  files: record.files.filter((file) => file.isPatientVisible),
  fileCount: record.files.filter((file) => file.isPatientVisible).length,
});

const assertActorCanViewRecord = async (actor: RecordActorContext, record: MedicalRecordDetail): Promise<void> => {
  if (actor.role === AppRole.ADMIN) {
    return;
  }

  if (actor.role === AppRole.DOCTOR) {
    const doctorId = await requireDoctorIdForUser(actor.userId);
    await assertDoctorCanAccessPatient(doctorId, record.patientId);
    return;
  }

  const patientId = await requirePatientIdForUser(actor.userId);

  if (patientId !== record.patientId || !record.isVisibleToPatient) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You do not have access to this medical record.",
      "FORBIDDEN",
    );
  }
};

const assertActorCanEditRecord = async (actor: RecordActorContext, record: MedicalRecordDetail): Promise<void> => {
  if (actor.role === AppRole.ADMIN) {
    return;
  }

  if (actor.role !== AppRole.DOCTOR) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Only doctors and admins can edit medical records.",
      "FORBIDDEN",
    );
  }

  const doctorId = await requireDoctorIdForUser(actor.userId);
  await assertDoctorCanAccessPatient(doctorId, record.patientId);

  if (record.doctorId && record.doctorId !== doctorId) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Only the authoring doctor or an admin can edit this record.",
      "FORBIDDEN",
    );
  }
};

const assertActorCanAppendToRecord = async (actor: RecordActorContext, record: MedicalRecordDetail): Promise<void> => {
  if (actor.role === AppRole.ADMIN) {
    return;
  }

  if (actor.role !== AppRole.DOCTOR) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Only doctors and admins can add files or vitals to medical records.",
      "FORBIDDEN",
    );
  }

  const doctorId = await requireDoctorIdForUser(actor.userId);
  await assertDoctorCanAccessPatient(doctorId, record.patientId);
};

const loadRecordOrFail = async (recordId: string): Promise<MedicalRecordDetail> => {
  const record = await recordsRepository.getMedicalRecordById(recordId);

  if (!record) {
    throw new AppError(StatusCodes.NOT_FOUND, "Medical record was not found.", "MEDICAL_RECORD_NOT_FOUND");
  }

  return record;
};

const resolveRecordListScope = async (
  actor: RecordActorContext,
  filters: MedicalRecordListFilters,
): Promise<RecordListScope> => {
  if (actor.role === AppRole.ADMIN) {
    return { role: actor.role };
  }

  if (actor.role === AppRole.DOCTOR) {
    const doctorId = await requireDoctorIdForUser(actor.userId);

    if (filters.doctorId && filters.doctorId !== doctorId) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Doctors can only query records authored under their own profile.",
        "FORBIDDEN",
      );
    }

    if (filters.patientId) {
      await assertDoctorCanAccessPatient(doctorId, filters.patientId);
    }

    return {
      role: actor.role,
      doctorId,
    };
  }

  const patientId = await requirePatientIdForUser(actor.userId);

  if (filters.patientId && filters.patientId !== patientId) {
    throw new AppError(StatusCodes.FORBIDDEN, "You can only query your own records.", "FORBIDDEN");
  }

  return {
    role: actor.role,
    patientId,
  };
};

const createMedicalRecord = async (actor: RecordActorContext, input: CreateMedicalRecordInput) => {
  let resolvedDoctorId: string | null = null;

  if (actor.role === AppRole.DOCTOR) {
    resolvedDoctorId = await assertActorCanManagePatient(actor, input.patientId);

    if (input.doctorId && input.doctorId !== resolvedDoctorId) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Doctors can only create records under their own profile.",
        "FORBIDDEN",
      );
    }
  } else if (actor.role === AppRole.ADMIN) {
    resolvedDoctorId = input.doctorId ?? null;
  } else {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Only doctors and admins can create medical records.",
      "FORBIDDEN",
    );
  }

  if (input.appointmentId) {
    const appointment = await recordsRepository.getAppointmentSnapshot(input.appointmentId);

    if (!appointment) {
      throw new AppError(StatusCodes.NOT_FOUND, "Appointment was not found.", "APPOINTMENT_NOT_FOUND");
    }

    if (appointment.patientId !== input.patientId) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "The selected appointment does not belong to this patient.",
        "INVALID_APPOINTMENT_PATIENT",
      );
    }

    if (resolvedDoctorId && appointment.doctorId !== resolvedDoctorId) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "The selected appointment does not belong to this doctor.",
        "INVALID_APPOINTMENT_DOCTOR",
      );
    }

    if (!resolvedDoctorId) {
      resolvedDoctorId = appointment.doctorId;
    }
  }

  const payload: ResolvedCreateMedicalRecordInput = {
    ...input,
    doctorId: resolvedDoctorId,
    lastUpdatedByUserId: actor.userId,
  };

  let recordId = "";

  await withTransaction(async (client) => {
    recordId = await recordsRepository.createMedicalRecord(client, payload);
  });

  const record = await loadRecordOrFail(recordId);
  await assertActorCanViewRecord(actor, record);
  return record;
};

const listMedicalRecords = async (actor: RecordActorContext, filters: MedicalRecordListFilters) => {
  const scope = await resolveRecordListScope(actor, filters);
  return recordsRepository.listMedicalRecords(scope, filters);
};

const getMedicalRecordById = async (actor: RecordActorContext, recordId: string) => {
  const record = await loadRecordOrFail(recordId);
  await assertActorCanViewRecord(actor, record);

  return actor.role === AppRole.PATIENT ? filterRecordForPatientView(record) : record;
};

const updateMedicalRecord = async (
  actor: RecordActorContext,
  recordId: string,
  input: UpdateMedicalRecordInput,
) => {
  const existing = await loadRecordOrFail(recordId);
  await assertActorCanEditRecord(actor, existing);

  const payload: ResolvedUpdateMedicalRecordInput = {
    ...input,
    lastUpdatedByUserId: actor.userId,
  };

  await withTransaction(async (client) => {
    const updated = await recordsRepository.updateMedicalRecord(client, recordId, payload);

    if (!updated) {
      throw new AppError(StatusCodes.NOT_FOUND, "Medical record was not found.", "MEDICAL_RECORD_NOT_FOUND");
    }
  });

  return getMedicalRecordById(actor, recordId);
};

const addRecordVitals = async (
  actor: RecordActorContext,
  recordId: string,
  input: CreateRecordVitalInput,
) => {
  const record = await loadRecordOrFail(recordId);
  await assertActorCanAppendToRecord(actor, record);

  let vitalId = "";

  await withTransaction(async (client) => {
    vitalId = await recordsRepository.createPatientVital(client, recordId, record.patientId, actor.userId, input);
  });

  const vital = await recordsRepository.getPatientVitalById(vitalId);

  if (!vital) {
    throw new AppError(StatusCodes.NOT_FOUND, "Vital signs entry was not found.", "VITAL_SIGNS_NOT_FOUND");
  }

  return vital;
};

const addMedicalRecordFile = async (
  actor: RecordActorContext,
  recordId: string,
  input: CreateMedicalRecordFileInput,
) => {
  const record = await loadRecordOrFail(recordId);
  await assertActorCanAppendToRecord(actor, record);

  let fileId = "";

  await withTransaction(async (client) => {
    fileId = await recordsRepository.createMedicalRecordFile(client, recordId, actor.userId, input);
    await recordsRepository.createFileAsset(client, recordId, record.patientId, record.doctorId, actor.userId, input);
  });

  const file = await recordsRepository.getMedicalRecordFileById(fileId);

  if (!file) {
    throw new AppError(StatusCodes.NOT_FOUND, "Medical record file was not found.", "MEDICAL_RECORD_FILE_NOT_FOUND");
  }

  return file;
};

const listPatientAllergies = async (actor: RecordActorContext, patientId: string): Promise<PatientAllergyRecord[]> => {
  await assertActorCanAccessPatient(actor, patientId);
  return recordsRepository.listPatientAllergies(patientId);
};

const createPatientAllergy = async (
  actor: RecordActorContext,
  patientId: string,
  input: CreatePatientAllergyInput,
) => {
  await assertActorCanManagePatient(actor, patientId);

  let allergyId = "";

  await withTransaction(async (client) => {
    allergyId = await recordsRepository.createPatientAllergy(client, patientId, input);
  });

  const allergy = await recordsRepository.getPatientAllergyById(allergyId);

  if (!allergy) {
    throw new AppError(StatusCodes.NOT_FOUND, "Allergy record was not found.", "ALLERGY_NOT_FOUND");
  }

  return allergy;
};

const updatePatientAllergy = async (
  actor: RecordActorContext,
  allergyId: string,
  input: UpdatePatientAllergyInput,
) => {
  const existing = await recordsRepository.getPatientAllergyById(allergyId);

  if (!existing) {
    throw new AppError(StatusCodes.NOT_FOUND, "Allergy record was not found.", "ALLERGY_NOT_FOUND");
  }

  await assertActorCanManagePatient(actor, existing.patientId);

  await withTransaction(async (client) => {
    const updated = await recordsRepository.updatePatientAllergy(client, allergyId, input);

    if (!updated) {
      throw new AppError(StatusCodes.NOT_FOUND, "Allergy record was not found.", "ALLERGY_NOT_FOUND");
    }
  });

  const allergy = await recordsRepository.getPatientAllergyById(allergyId);

  if (!allergy) {
    throw new AppError(StatusCodes.NOT_FOUND, "Allergy record was not found.", "ALLERGY_NOT_FOUND");
  }

  return allergy;
};

export const recordsService = {
  createMedicalRecord,
  listMedicalRecords,
  getMedicalRecordById,
  updateMedicalRecord,
  addRecordVitals,
  addMedicalRecordFile,
  listPatientAllergies,
  createPatientAllergy,
  updatePatientAllergy,
};
