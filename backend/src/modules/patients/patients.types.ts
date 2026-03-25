import type { PoolClient } from "pg";

import type { AppRole } from "../../common/constants/roles";
import type { DoctorPatientRelationshipStatus } from "../../common/constants/relationship";
import type { PaginatedResult } from "../../common/types/pagination";

export interface PatientActorContext {
  userId: string;
  role: AppRole;
}

export interface PatientProfile {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  profile: {
    primaryDoctorId: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    bloodGroup: string | null;
    genotype: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    heightCm: number | null;
    weightKg: number | null;
  };
  metrics: {
    careTeamSize: number;
    upcomingAppointments: number;
    activeMedications: number;
  };
}

export interface UpdatePatientProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  genotype?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  heightCm?: number;
  weightKg?: number;
}

export interface PatientDoctorListFilters {
  page: number;
  limit: number;
  search?: string;
  specialty?: string;
  relationshipStatus?: DoctorPatientRelationshipStatus;
}

export interface PatientDoctorListItem {
  doctorId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  specialty: string;
  clinicName: string | null;
  relationshipStatus: DoctorPatientRelationshipStatus;
  notes: string | null;
  isPrimaryDoctor: boolean;
  linkedAt: string;
}

export interface DoctorSearchItem {
  doctorId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  specialty: string;
  clinicName: string | null;
  alreadyLinked: boolean;
}

export interface SetPrimaryDoctorInput {
  doctorId: string;
}

export interface PatientsRepository {
  getPatientIdByUserId(userId: string): Promise<string | null>;
  getPatientProfileByUserId(userId: string): Promise<PatientProfile | null>;
  getPatientProfileByPatientId(patientId: string): Promise<PatientProfile | null>;
  doctorHasAccessToPatient(doctorUserId: string, patientId: string): Promise<boolean>;
  updatePatientProfile(client: PoolClient, userId: string, input: UpdatePatientProfileInput): Promise<void>;
  listPatientDoctors(userId: string, filters: PatientDoctorListFilters): Promise<PaginatedResult<PatientDoctorListItem>>;
  listPatientDoctorsByPatientId(
    patientId: string,
    filters: PatientDoctorListFilters,
  ): Promise<PaginatedResult<PatientDoctorListItem>>;
  setPrimaryDoctor(userId: string, doctorId: string): Promise<PatientProfile | null>;
  setPrimaryDoctorByPatientId(patientId: string, doctorId: string): Promise<PatientProfile | null>;
  searchDoctors(userId: string, filters: PatientDoctorListFilters): Promise<PaginatedResult<DoctorSearchItem>>;
}
