import type { PoolClient } from "pg";

import type { AppRole } from "../../common/constants/roles";
import type { DoctorPatientRelationshipStatus } from "../../common/constants/relationship";
import type { PaginatedResult } from "../../common/types/pagination";

export interface DoctorActorContext {
  userId: string;
  role: AppRole;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  profile: {
    licenseNumber: string;
    specialty: string;
    clinicName: string | null;
    yearsExperience: number;
    gender: string | null;
    dateOfBirth: string | null;
    bio: string | null;
    consultationFee: number | null;
    verifiedAt: string | null;
  };
  metrics: {
    activePatients: number;
    upcomingAppointments: number;
    activePrescriptions: number;
  };
}

export interface DoctorDirectoryFilters {
  page: number;
  limit: number;
  search?: string;
  specialty?: string;
}

export interface DoctorDirectoryItem {
  doctorId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  specialty: string;
  clinicName: string | null;
  verifiedAt: string | null;
}

export interface UpdateDoctorProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  specialty?: string;
  clinicName?: string;
  yearsExperience?: number;
  gender?: string;
  dateOfBirth?: string;
  bio?: string;
  consultationFee?: number;
}

export interface DoctorPatientListFilters {
  page: number;
  limit: number;
  search?: string;
  relationshipStatus?: DoctorPatientRelationshipStatus;
}

export interface LinkPatientInput {
  patientId: string;
  notes?: string;
}

export interface UpdateDoctorPatientRelationshipInput {
  relationshipStatus?: DoctorPatientRelationshipStatus;
  notes?: string;
}

export interface DoctorPatientListItem {
  patientId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  bloodGroup: string | null;
  genotype: string | null;
  relationshipStatus: DoctorPatientRelationshipStatus;
  notes: string | null;
  primaryDoctorId: string | null;
  linkedAt: string;
}

export interface PatientSearchItem {
  patientId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  bloodGroup: string | null;
  genotype: string | null;
  alreadyLinked: boolean;
}

export interface DoctorsRepository {
  getDoctorIdByUserId(userId: string): Promise<string | null>;
  getDoctorProfileByUserId(userId: string): Promise<DoctorProfile | null>;
  getDoctorProfileByDoctorId(doctorId: string): Promise<DoctorProfile | null>;
  listDoctorsDirectory(filters: DoctorDirectoryFilters): Promise<PaginatedResult<DoctorDirectoryItem>>;
  updateDoctorProfile(client: PoolClient, userId: string, input: UpdateDoctorProfileInput): Promise<void>;
  listDoctorPatients(userId: string, filters: DoctorPatientListFilters): Promise<PaginatedResult<DoctorPatientListItem>>;
  listDoctorPatientsByDoctorId(
    doctorId: string,
    filters: DoctorPatientListFilters,
  ): Promise<PaginatedResult<DoctorPatientListItem>>;
  linkPatientToDoctor(userId: string, input: LinkPatientInput): Promise<DoctorPatientListItem | null>;
  linkPatientToDoctorByDoctorId(
    doctorId: string,
    actorUserId: string,
    input: LinkPatientInput,
  ): Promise<DoctorPatientListItem | null>;
  updateDoctorPatientRelationship(
    userId: string,
    patientId: string,
    input: UpdateDoctorPatientRelationshipInput,
  ): Promise<DoctorPatientListItem | null>;
  updateDoctorPatientRelationshipByDoctorId(
    doctorId: string,
    patientId: string,
    input: UpdateDoctorPatientRelationshipInput,
  ): Promise<DoctorPatientListItem | null>;
  unlinkPatientFromDoctor(doctorId: string, patientId: string): Promise<boolean>;
  searchPatients(userId: string, filters: DoctorPatientListFilters): Promise<PaginatedResult<PatientSearchItem>>;
}
