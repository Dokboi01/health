import type { PoolClient } from "pg";

import { DoctorPatientRelationshipStatus } from "../../common/constants/relationship";
import type { PaginatedResult } from "../../common/types/pagination";
import { createPaginationMeta } from "../../common/utils/pagination";
import { runQuery } from "../../config/database";
import type {
  DoctorDirectoryFilters,
  DoctorDirectoryItem,
  DoctorPatientListFilters,
  DoctorPatientListItem,
  DoctorProfile,
  DoctorsRepository,
  LinkPatientInput,
  PatientSearchItem,
  UpdateDoctorPatientRelationshipInput,
  UpdateDoctorProfileInput,
} from "./doctors.types";

type DoctorProfileRow = {
  doctor_id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  license_number: string;
  specialty: string;
  clinic_name: string | null;
  years_experience: number;
  gender: string | null;
  date_of_birth: string | null;
  bio: string | null;
  consultation_fee: string | null;
  verified_at: string | null;
  active_patients: string;
  upcoming_appointments: string;
  active_prescriptions: string;
};

type DoctorDirectoryRow = {
  total_count: string;
  doctor_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  specialty: string;
  clinic_name: string | null;
  verified_at: string | null;
};

type DoctorIdRow = {
  doctor_id: string;
};

type DoctorPatientListRow = {
  total_count: string;
  patient_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  blood_group: string | null;
  genotype: string | null;
  relationship_status: DoctorPatientRelationshipStatus;
  notes: string | null;
  primary_doctor_id: string | null;
  linked_at: string;
};

type PatientSearchRow = {
  total_count: string;
  patient_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  blood_group: string | null;
  genotype: string | null;
  already_linked: boolean;
};

const mapDoctorProfile = (row: DoctorProfileRow): DoctorProfile => ({
  id: row.doctor_id,
  userId: row.user_id,
  email: row.email,
  firstName: row.first_name,
  lastName: row.last_name,
  phone: row.phone,
  avatarUrl: row.avatar_url,
  status: row.status,
  profile: {
    licenseNumber: row.license_number,
    specialty: row.specialty,
    clinicName: row.clinic_name,
    yearsExperience: Number(row.years_experience),
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    bio: row.bio,
    consultationFee: row.consultation_fee === null ? null : Number(row.consultation_fee),
    verifiedAt: row.verified_at,
  },
  metrics: {
    activePatients: Number(row.active_patients),
    upcomingAppointments: Number(row.upcoming_appointments),
    activePrescriptions: Number(row.active_prescriptions),
  },
});

const mapDoctorDirectoryItem = (row: DoctorDirectoryRow): DoctorDirectoryItem => ({
  doctorId: row.doctor_id,
  userId: row.user_id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  specialty: row.specialty,
  clinicName: row.clinic_name,
  verifiedAt: row.verified_at,
});

const mapDoctorPatientListItem = (row: DoctorPatientListRow): DoctorPatientListItem => ({
  patientId: row.patient_id,
  userId: row.user_id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  bloodGroup: row.blood_group,
  genotype: row.genotype,
  relationshipStatus: row.relationship_status,
  notes: row.notes,
  primaryDoctorId: row.primary_doctor_id,
  linkedAt: row.linked_at,
});

const mapPatientSearchItem = (row: PatientSearchRow): PatientSearchItem => ({
  patientId: row.patient_id,
  userId: row.user_id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  bloodGroup: row.blood_group,
  genotype: row.genotype,
  alreadyLinked: row.already_linked,
});

const createEmptyResult = <T>(page: number, limit: number): PaginatedResult<T> => ({
  items: [],
  meta: createPaginationMeta({
    page,
    limit,
    total: 0,
  }),
});

const getDoctorProfileByColumn = async (
  column: "dp.user_id" | "dp.id",
  value: string,
): Promise<DoctorProfile | null> => {
  const result = await runQuery<DoctorProfileRow>(
    `
      SELECT
        dp.id AS doctor_id,
        u.id AS user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.avatar_url,
        u.status,
        dp.license_number,
        dp.specialty,
        dp.clinic_name,
        dp.years_experience,
        dp.gender::text AS gender,
        dp.date_of_birth::text AS date_of_birth,
        dp.bio,
        dp.consultation_fee::text AS consultation_fee,
        dp.verified_at::text AS verified_at,
        (
          SELECT COUNT(*)
          FROM doctor_patient_links dpl
          WHERE dpl.doctor_id = dp.id
            AND dpl.relationship_status = 'ACTIVE'
        )::text AS active_patients,
        (
          SELECT COUNT(*)
          FROM appointments a
          WHERE a.doctor_id = dp.id
            AND a.status IN ('SCHEDULED', 'CONFIRMED', 'RESCHEDULED')
            AND a.scheduled_start >= NOW()
        )::text AS upcoming_appointments,
        (
          SELECT COUNT(*)
          FROM prescriptions p
          WHERE p.doctor_id = dp.id
            AND p.status = 'ACTIVE'
        )::text AS active_prescriptions
      FROM doctor_profiles dp
      JOIN users u ON u.id = dp.user_id
      WHERE ${column} = $1
      LIMIT 1
    `,
    [value],
  );

  return result.rowCount ? mapDoctorProfile(result.rows[0]) : null;
};

const getDoctorIdByUserId = async (userId: string): Promise<string | null> => {
  const result = await runQuery<DoctorIdRow>(
    `
      SELECT id AS doctor_id
      FROM doctor_profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rowCount ? result.rows[0].doctor_id : null;
};

const getDoctorProfileByUserId = async (userId: string): Promise<DoctorProfile | null> =>
  getDoctorProfileByColumn("dp.user_id", userId);

const getDoctorProfileByDoctorId = async (doctorId: string): Promise<DoctorProfile | null> =>
  getDoctorProfileByColumn("dp.id", doctorId);

const listDoctorsDirectory = async (
  filters: DoctorDirectoryFilters,
): Promise<PaginatedResult<DoctorDirectoryItem>> => {
  const offset = (filters.page - 1) * filters.limit;
  const searchTerm = filters.search ? `%${filters.search}%` : null;
  const specialtyTerm = filters.specialty ? `%${filters.specialty}%` : null;

  const result = await runQuery<DoctorDirectoryRow>(
    `
      SELECT
        COUNT(*) OVER()::text AS total_count,
        dp.id AS doctor_id,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        dp.specialty,
        dp.clinic_name,
        dp.verified_at::text AS verified_at
      FROM doctor_profiles dp
      JOIN users u ON u.id = dp.user_id
      WHERE u.role = 'DOCTOR'
        AND u.status = 'ACTIVE'
        AND ($1::text IS NULL OR dp.specialty ILIKE $1)
        AND (
          $2::text IS NULL
          OR CONCAT_WS(' ', u.first_name, u.last_name, u.email, COALESCE(dp.clinic_name, '')) ILIKE $2
        )
      ORDER BY (dp.verified_at IS NOT NULL) DESC, u.first_name ASC, u.last_name ASC
      LIMIT $3 OFFSET $4
    `,
    [specialtyTerm, searchTerm, filters.limit, offset],
  );

  const total = result.rowCount ? Number(result.rows[0].total_count) : 0;

  return {
    items: result.rows.map(mapDoctorDirectoryItem),
    meta: createPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      total,
    }),
  };
};

const updateDoctorProfile = async (
  client: PoolClient,
  userId: string,
  input: UpdateDoctorProfileInput,
): Promise<void> => {
  await client.query(
    `
      UPDATE users
      SET
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        phone = COALESCE($4, phone),
        avatar_url = COALESCE($5, avatar_url)
      WHERE id = $1
    `,
    [userId, input.firstName ?? null, input.lastName ?? null, input.phone ?? null, input.avatarUrl ?? null],
  );

  await client.query(
    `
      UPDATE doctor_profiles
      SET
        specialty = COALESCE($2, specialty),
        clinic_name = COALESCE($3, clinic_name),
        years_experience = COALESCE($4, years_experience),
        gender = COALESCE($5::gender_type, gender),
        date_of_birth = COALESCE($6::date, date_of_birth),
        bio = COALESCE($7, bio),
        consultation_fee = COALESCE($8, consultation_fee)
      WHERE user_id = $1
    `,
    [
      userId,
      input.specialty ?? null,
      input.clinicName ?? null,
      input.yearsExperience ?? null,
      input.gender ?? null,
      input.dateOfBirth ?? null,
      input.bio ?? null,
      input.consultationFee ?? null,
    ],
  );
};

const listDoctorPatientsByDoctorId = async (
  doctorId: string,
  filters: DoctorPatientListFilters,
): Promise<PaginatedResult<DoctorPatientListItem>> => {
  const offset = (filters.page - 1) * filters.limit;
  const searchTerm = filters.search ? `%${filters.search}%` : null;

  const result = await runQuery<DoctorPatientListRow>(
    `
      SELECT
        COUNT(*) OVER()::text AS total_count,
        pp.id AS patient_id,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        pp.blood_group,
        pp.genotype,
        dpl.relationship_status,
        dpl.notes,
        pp.primary_doctor_id,
        dpl.created_at::text AS linked_at
      FROM doctor_patient_links dpl
      JOIN patient_profiles pp ON pp.id = dpl.patient_id
      JOIN users u ON u.id = pp.user_id
      WHERE dpl.doctor_id = $1
        AND ($2::text IS NULL OR dpl.relationship_status = $2::doctor_patient_status)
        AND (
          $3::text IS NULL
          OR CONCAT_WS(' ', u.first_name, u.last_name, u.email, COALESCE(u.phone, '')) ILIKE $3
        )
      ORDER BY dpl.created_at DESC, u.first_name ASC
      LIMIT $4 OFFSET $5
    `,
    [doctorId, filters.relationshipStatus ?? null, searchTerm, filters.limit, offset],
  );

  const total = result.rowCount ? Number(result.rows[0].total_count) : 0;

  return {
    items: result.rows.map(mapDoctorPatientListItem),
    meta: createPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      total,
    }),
  };
};

const listDoctorPatients = async (
  userId: string,
  filters: DoctorPatientListFilters,
): Promise<PaginatedResult<DoctorPatientListItem>> => {
  const doctorId = await getDoctorIdByUserId(userId);

  if (!doctorId) {
    return createEmptyResult(filters.page, filters.limit);
  }

  return listDoctorPatientsByDoctorId(doctorId, filters);
};

const linkPatientToDoctorByDoctorId = async (
  doctorId: string,
  actorUserId: string,
  input: LinkPatientInput,
): Promise<DoctorPatientListItem | null> => {
  const result = await runQuery<DoctorPatientListRow>(
    `
      WITH patient_context AS (
        SELECT id, user_id, blood_group, genotype, primary_doctor_id
        FROM patient_profiles
        WHERE id = $2
      ),
      upsert_link AS (
        INSERT INTO doctor_patient_links (doctor_id, patient_id, relationship_status, notes, created_by_user_id)
        SELECT
          $1,
          pc.id,
          'ACTIVE',
          $3,
          $4
        FROM patient_context pc
        ON CONFLICT (doctor_id, patient_id)
        DO UPDATE
        SET
          relationship_status = 'ACTIVE',
          notes = COALESCE(EXCLUDED.notes, doctor_patient_links.notes),
          updated_at = NOW()
        RETURNING patient_id, relationship_status, notes, created_at
      )
      SELECT
        '1'::text AS total_count,
        pc.id AS patient_id,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        pc.blood_group,
        pc.genotype,
        ul.relationship_status,
        ul.notes,
        pc.primary_doctor_id,
        ul.created_at::text AS linked_at
      FROM upsert_link ul
      JOIN patient_context pc ON pc.id = ul.patient_id
      JOIN users u ON u.id = pc.user_id
      LIMIT 1
    `,
    [doctorId, input.patientId, input.notes ?? null, actorUserId],
  );

  return result.rowCount ? mapDoctorPatientListItem(result.rows[0]) : null;
};

const linkPatientToDoctor = async (userId: string, input: LinkPatientInput): Promise<DoctorPatientListItem | null> => {
  const doctorId = await getDoctorIdByUserId(userId);

  if (!doctorId) {
    return null;
  }

  return linkPatientToDoctorByDoctorId(doctorId, userId, input);
};

const updateDoctorPatientRelationshipByDoctorId = async (
  doctorId: string,
  patientId: string,
  input: UpdateDoctorPatientRelationshipInput,
): Promise<DoctorPatientListItem | null> => {
  const result = await runQuery<DoctorPatientListRow>(
    `
      WITH updated_link AS (
        UPDATE doctor_patient_links dpl
        SET
          relationship_status = COALESCE($3::doctor_patient_status, dpl.relationship_status),
          notes = COALESCE($4, dpl.notes),
          updated_at = NOW()
        WHERE dpl.doctor_id = $1
          AND dpl.patient_id = $2
        RETURNING dpl.patient_id, dpl.relationship_status, dpl.notes, dpl.created_at
      )
      SELECT
        '1'::text AS total_count,
        pp.id AS patient_id,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        pp.blood_group,
        pp.genotype,
        ul.relationship_status,
        ul.notes,
        pp.primary_doctor_id,
        ul.created_at::text AS linked_at
      FROM updated_link ul
      JOIN patient_profiles pp ON pp.id = ul.patient_id
      JOIN users u ON u.id = pp.user_id
      LIMIT 1
    `,
    [doctorId, patientId, input.relationshipStatus ?? null, input.notes ?? null],
  );

  return result.rowCount ? mapDoctorPatientListItem(result.rows[0]) : null;
};

const updateDoctorPatientRelationship = async (
  userId: string,
  patientId: string,
  input: UpdateDoctorPatientRelationshipInput,
): Promise<DoctorPatientListItem | null> => {
  const doctorId = await getDoctorIdByUserId(userId);

  if (!doctorId) {
    return null;
  }

  return updateDoctorPatientRelationshipByDoctorId(doctorId, patientId, input);
};

const unlinkPatientFromDoctor = async (doctorId: string, patientId: string): Promise<boolean> => {
  const result = await runQuery<{ patient_id: string }>(
    `
      UPDATE doctor_patient_links
      SET
        relationship_status = 'ARCHIVED',
        updated_at = NOW()
      WHERE doctor_id = $1
        AND patient_id = $2
        AND relationship_status <> 'ARCHIVED'
      RETURNING patient_id
    `,
    [doctorId, patientId],
  );

  return Boolean(result.rowCount);
};

const searchPatients = async (
  userId: string,
  filters: DoctorPatientListFilters,
): Promise<PaginatedResult<PatientSearchItem>> => {
  const offset = (filters.page - 1) * filters.limit;
  const searchTerm = filters.search ? `%${filters.search}%` : null;

  const result = await runQuery<PatientSearchRow>(
    `
      WITH doctor_context AS (
        SELECT id
        FROM doctor_profiles
        WHERE user_id = $1
      )
      SELECT
        COUNT(*) OVER()::text AS total_count,
        pp.id AS patient_id,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        pp.blood_group,
        pp.genotype,
        EXISTS (
          SELECT 1
          FROM doctor_patient_links dpl
          JOIN doctor_context dc ON dc.id = dpl.doctor_id
          WHERE dpl.patient_id = pp.id
            AND dpl.relationship_status <> 'ARCHIVED'
        ) AS already_linked
      FROM patient_profiles pp
      JOIN users u ON u.id = pp.user_id
      WHERE u.role = 'PATIENT'
        AND u.status = 'ACTIVE'
        AND (
          $2::text IS NULL
          OR CONCAT_WS(' ', u.first_name, u.last_name, u.email, COALESCE(u.phone, '')) ILIKE $2
        )
      ORDER BY u.first_name ASC, u.last_name ASC
      LIMIT $3 OFFSET $4
    `,
    [userId, searchTerm, filters.limit, offset],
  );

  const total = result.rowCount ? Number(result.rows[0].total_count) : 0;

  return {
    items: result.rows.map(mapPatientSearchItem),
    meta: createPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      total,
    }),
  };
};

export const doctorsRepository: DoctorsRepository = {
  getDoctorIdByUserId,
  getDoctorProfileByUserId,
  getDoctorProfileByDoctorId,
  listDoctorsDirectory,
  updateDoctorProfile,
  listDoctorPatients,
  listDoctorPatientsByDoctorId,
  linkPatientToDoctor,
  linkPatientToDoctorByDoctorId,
  updateDoctorPatientRelationship,
  updateDoctorPatientRelationshipByDoctorId,
  unlinkPatientFromDoctor,
  searchPatients,
};
