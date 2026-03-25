import type { PoolClient } from "pg";

import type { AppRole } from "../../common/constants/roles";
import type { PaginatedResult } from "../../common/types/pagination";

export type MedicalRecordType =
  | "CONSULTATION"
  | "LAB_RESULT"
  | "VITAL"
  | "IMMUNIZATION"
  | "ALLERGY"
  | "IMAGING"
  | "DISCHARGE"
  | "OTHER";

export type TestResultStatus = "NORMAL" | "ABNORMAL" | "CRITICAL" | "PENDING";
export type StorageProvider = "S3" | "CLOUDINARY" | "OTHER";

export interface RecordActorContext {
  userId: string;
  role: AppRole;
}

export interface RecordListScope {
  role: AppRole;
  doctorId?: string;
  patientId?: string;
}

export interface MedicalRecordListFilters {
  page: number;
  limit: number;
  search?: string;
  patientId?: string;
  doctorId?: string;
  recordType?: MedicalRecordType;
  dateFrom?: string;
  dateTo?: string;
  isVisibleToPatient?: boolean;
}

export interface MedicalRecordTestResultInput {
  testName: string;
  resultValue?: string;
  unit?: string;
  referenceRange?: string;
  status?: TestResultStatus;
  notes?: string;
  recordedAt?: string;
}

export interface MedicalRecordTestResult {
  testName: string;
  resultValue: string | null;
  unit: string | null;
  referenceRange: string | null;
  status: TestResultStatus | null;
  notes: string | null;
  recordedAt: string | null;
}

export interface MedicalRecordPatientSummary {
  patientId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  bloodGroup: string | null;
}

export interface MedicalRecordDoctorSummary {
  doctorId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  specialty: string;
  clinicName: string | null;
}

export interface MedicalRecordFileRecord {
  id: string;
  medicalRecordId: string;
  fileName: string;
  fileUrl: string;
  fileType: string | null;
  fileSizeBytes: number | null;
  storageProvider: StorageProvider;
  providerAssetId: string | null;
  checksumSha256: string | null;
  isPatientVisible: boolean;
  uploadedByUserId: string | null;
  createdAt: string;
}

export interface PatientVitalRecord {
  id: string;
  patientId: string;
  medicalRecordId: string | null;
  recordedByUserId: string | null;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  temperatureC: number | null;
  oxygenSaturation: number | null;
  glucoseLevel: number | null;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  notes: string | null;
  recordedAt: string;
  createdAt: string;
}

export interface PatientAllergyRecord {
  id: string;
  patientId: string;
  allergen: string;
  reaction: string | null;
  severity: string | null;
  notedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecordSummary {
  id: string;
  patientId: string;
  doctorId: string | null;
  appointmentId: string | null;
  recordType: MedicalRecordType;
  title: string;
  summary: string | null;
  diagnosis: string | null;
  followUpDate: string | null;
  isVisibleToPatient: boolean;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
  doctor: MedicalRecordDoctorSummary | null;
  patient: MedicalRecordPatientSummary;
  fileCount: number;
  vitalCount: number;
}

export interface MedicalRecordDetail extends MedicalRecordSummary {
  clinicalNotes: string | null;
  treatmentPlan: string | null;
  source: string | null;
  testResults: MedicalRecordTestResult[];
  files: MedicalRecordFileRecord[];
  vitals: PatientVitalRecord[];
  allergies: PatientAllergyRecord[];
  lastUpdatedByUserId: string | null;
}

export interface CreateMedicalRecordInput {
  patientId: string;
  appointmentId?: string;
  doctorId?: string;
  recordType: MedicalRecordType;
  title: string;
  summary?: string;
  clinicalNotes?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  source?: string;
  followUpDate?: string;
  recordedAt?: string;
  isVisibleToPatient?: boolean;
  testResults?: MedicalRecordTestResultInput[];
}

export interface UpdateMedicalRecordInput {
  recordType?: MedicalRecordType;
  title?: string;
  summary?: string | null;
  clinicalNotes?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  source?: string | null;
  followUpDate?: string | null;
  recordedAt?: string;
  isVisibleToPatient?: boolean;
  testResults?: MedicalRecordTestResultInput[];
}

export interface ResolvedCreateMedicalRecordInput extends Omit<CreateMedicalRecordInput, "doctorId"> {
  doctorId: string | null;
  lastUpdatedByUserId: string;
}

export interface ResolvedUpdateMedicalRecordInput extends UpdateMedicalRecordInput {
  lastUpdatedByUserId: string;
}

export interface CreateRecordVitalInput {
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperatureC?: number;
  oxygenSaturation?: number;
  glucoseLevel?: number;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  notes?: string;
  recordedAt?: string;
}

export interface CreateMedicalRecordFileInput {
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSizeBytes?: number;
  storageProvider: StorageProvider;
  providerAssetId?: string;
  checksumSha256?: string;
  isPatientVisible?: boolean;
}

export interface CreatePatientAllergyInput {
  allergen: string;
  reaction?: string;
  severity?: string;
  notedAt?: string;
}

export interface UpdatePatientAllergyInput {
  allergen?: string;
  reaction?: string | null;
  severity?: string | null;
  notedAt?: string | null;
}

export interface AppointmentSnapshot {
  id: string;
  doctorId: string;
  patientId: string;
}

export interface RecordsRepository {
  getDoctorIdByUserId(userId: string): Promise<string | null>;
  getPatientIdByUserId(userId: string): Promise<string | null>;
  doctorHasActivePatientLink(doctorId: string, patientId: string): Promise<boolean>;
  getAppointmentSnapshot(appointmentId: string): Promise<AppointmentSnapshot | null>;
  listMedicalRecords(
    scope: RecordListScope,
    filters: MedicalRecordListFilters,
  ): Promise<PaginatedResult<MedicalRecordSummary>>;
  getMedicalRecordById(recordId: string): Promise<MedicalRecordDetail | null>;
  createMedicalRecord(client: PoolClient, input: ResolvedCreateMedicalRecordInput): Promise<string>;
  updateMedicalRecord(
    client: PoolClient,
    recordId: string,
    input: ResolvedUpdateMedicalRecordInput,
  ): Promise<boolean>;
  createPatientVital(
    client: PoolClient,
    recordId: string,
    patientId: string,
    recordedByUserId: string,
    input: CreateRecordVitalInput,
  ): Promise<string>;
  getPatientVitalById(vitalId: string): Promise<PatientVitalRecord | null>;
  createMedicalRecordFile(
    client: PoolClient,
    recordId: string,
    uploadedByUserId: string,
    input: CreateMedicalRecordFileInput,
  ): Promise<string>;
  createFileAsset(
    client: PoolClient,
    recordId: string,
    patientId: string,
    doctorId: string | null,
    uploadedByUserId: string,
    input: CreateMedicalRecordFileInput,
  ): Promise<void>;
  getMedicalRecordFileById(fileId: string): Promise<MedicalRecordFileRecord | null>;
  listPatientAllergies(patientId: string): Promise<PatientAllergyRecord[]>;
  createPatientAllergy(client: PoolClient, patientId: string, input: CreatePatientAllergyInput): Promise<string>;
  updatePatientAllergy(client: PoolClient, allergyId: string, input: UpdatePatientAllergyInput): Promise<boolean>;
  getPatientAllergyById(allergyId: string): Promise<PatientAllergyRecord | null>;
}
