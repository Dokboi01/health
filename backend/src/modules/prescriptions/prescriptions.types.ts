import type { PoolClient } from "pg";

import type { AppRole } from "../../common/constants/roles";
import type { PaginatedResult } from "../../common/types/pagination";

export type PrescriptionStatus = "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED";

export interface PrescriptionActorContext {
  userId: string;
  role: AppRole;
}

export interface PrescriptionListScope {
  role: AppRole;
  doctorUserId?: string;
  patientId?: string;
}

export interface PrescriptionItemInput {
  medicationName: string;
  strength?: string;
  dosage: string;
  frequency: string;
  route?: string;
  durationDays?: number;
  refillCount?: number;
  notes?: string;
}

export interface CreatePrescriptionInput {
  doctorId?: string;
  patientId: string;
  appointmentId?: string;
  diagnosis?: string;
  instructions?: string;
  startDate?: string;
  endDate?: string;
  items: PrescriptionItemInput[];
}

export interface UpdatePrescriptionInput {
  appointmentId?: string | null;
  diagnosis?: string;
  instructions?: string;
  startDate?: string;
  endDate?: string;
  items?: PrescriptionItemInput[];
}

export interface UpdatePrescriptionStatusInput {
  status: PrescriptionStatus;
}

export interface PrescriptionListFilters {
  page: number;
  limit: number;
  status?: PrescriptionStatus;
  patientId?: string;
  appointmentId?: string;
}

export interface PrescriptionItem {
  id: string;
  medicationName: string;
  strength: string | null;
  dosage: string;
  frequency: string;
  route: string | null;
  durationDays: number | null;
  refillCount: number;
  notes: string | null;
  createdAt: string;
}

export interface PrescriptionRecord {
  id: string;
  doctorId: string;
  patientId: string;
  appointmentId: string | null;
  status: PrescriptionStatus;
  diagnosis: string | null;
  instructions: string | null;
  issuedAt: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  doctor: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    specialty: string;
  };
  patient: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  items: PrescriptionItem[];
}

export interface PrescriptionInsertData {
  doctorId: string;
  patientId: string;
  appointmentId?: string | null;
  diagnosis?: string;
  instructions?: string;
  startDate?: string;
  endDate?: string;
}

export interface GeneratedMedicationSeed {
  patientId: string;
  prescriptionId: string;
  createdByUserId: string;
  name: string;
  strength?: string;
  dosageInstructions: string;
  frequency: string;
  route?: string;
  startDate: string;
  endDate?: string | null;
  notes?: string;
}

export interface PrescriptionsRepository {
  getDoctorIdByUserId(userId: string): Promise<string | null>;
  getPatientIdByUserId(userId: string): Promise<string | null>;
  doctorHasAccessToPatient(doctorUserId: string, patientId: string): Promise<boolean>;
  doctorProfileHasAccessToPatient(doctorId: string, patientId: string): Promise<boolean>;
  appointmentMatchesDoctorPatient(
    appointmentId: string,
    doctorId: string,
    patientId: string,
  ): Promise<boolean>;
  createPrescription(client: PoolClient, input: PrescriptionInsertData): Promise<string>;
  updatePrescriptionHeader(client: PoolClient, prescriptionId: string, input: UpdatePrescriptionInput): Promise<boolean>;
  replacePrescriptionItems(client: PoolClient, prescriptionId: string, items: PrescriptionItemInput[]): Promise<void>;
  createMedicationTrackers(client: PoolClient, medications: GeneratedMedicationSeed[]): Promise<void>;
  listPrescriptions(
    scope: PrescriptionListScope,
    filters: PrescriptionListFilters,
  ): Promise<PaginatedResult<PrescriptionRecord>>;
  getPrescriptionById(prescriptionId: string): Promise<PrescriptionRecord | null>;
  updatePrescriptionStatus(
    prescriptionId: string,
    input: UpdatePrescriptionStatusInput,
  ): Promise<PrescriptionRecord | null>;
}
