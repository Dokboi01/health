import type { PoolClient } from "pg";

import { DoctorPatientRelationshipStatus } from "../../common/constants/relationship";
import type { PaginatedResult } from "../../common/types/pagination";
import { createPaginationMeta } from "../../common/utils/pagination";
import { runQuery } from "../../config/database";
import type {
  DoctorSearchItem,
  PatientDoctorListFilters,
  PatientDoctorListItem,
  PatientProfile,
  PatientsRepository,
  UpdatePatientProfileInput,
} from "./patients.types";

type PatientProfileRow = {
  patient_id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  primary_doctor_id: string | null;
  gender: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  genotype: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  height_cm: string | null;
  weight_kg: string | null;
  care_team_size: string;
  upcoming_appointments: string;
  active_medications: string;
};

type PatientIdRow = {
  patient_id: string;
};

type PatientDoctorListRow = {
  total_count: string;
  doctor_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  specialty: string;
  clinic_name: string | null;
  relationship_status: DoctorPatientRelationshipStatus;
  notes: string | null;
  is_primary_doctor: boolean;
  linked_at: string;
};

type DoctorSearchRow = {
  total_count: string;
  doctor_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  specialty: string;
  clinic_name: string | null;
  already_linked: boolean;
};

const mapPatientProfile = (row: PatientProfileRow): PatientProfile => ({
  id: row.patient_id,
  userId: row.user_id,
  email: row.email,
  firstName: row.first_name,
  lastName: row.last_name,
  phone: row.phone,
  avatarUrl: row.avatar_url,
  status: row.status,
  profile: {
    primaryDoctorId: row.primary_doctor_id,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    bloodGroup: row.blood_group,
    genotype: row.genotype,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    city: row.city,
    state: row.state,
    country: row.country,
    heightCm: row.height_cm === null ? null : Number(row.height_cm),
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
  },
  metrics: {
    careTeamSize: Number(row.care_team_size),
    upcomingAppointments: Number(row.upcoming_appointments),
    activeMedications: Number(row.active_medications),
  },
});

const mapPatientDoctorListItem = (row: PatientDoctorListRow): PatientDoctorListItem => ({
  doctorId: row.doctor_id,
  userId: row.user_id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  specialty: row.specialty,
  clinicName: row.clinic_name,
  relationshipStatus: row.relationship_status,
  notes: row.notes,
  isPrimaryDoctor: row.is_primary_doctor,
  linkedAt: row.linked_at,
});

const mapDoctorSearchItem = (row: DoctorSearchRow): DoctorSearchItem => ({
  doctorId: row.doctor_id,
  userId: row.user_id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  specialty: row.specialty,
  clinicName: row.clinic_name,
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

const getPatientProfileByColumn = async (
  column: "pp.user_id" | "pp.id",
  value: string,
): Promise<PatientProfile | null> => {
  const result = await runQuery<PatientProfileRow>(
    `
      SELECT
        pp.id AS patient_id,
        u.id AS user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.avatar_url,
        u.status,
        pp.primary_doctor_id,
        pp.gender::text AS gender,
        pp.date_of_birth::text AS date_of_birth,
        pp.blood_group,
        pp.genotype,
        pp.emergency_contact_name,
        pp.emergency_contact_phone,
        pp.address_line_1,
        pp.address_line_2,
        pp.city,
        pp.state,
        pp.country,
        pp.height_cm::text AS height_cm,
        pp.weight_kg::text AS weight_kg,
        (
          SELECT COUNT(*)
          FROM doctor_patient_links dpl
          WHERE dpl.patient_id = pp.id
            AND dpl.relationship_status = 'ACTIVE'
        )::text AS care_team_size,
        (
          SELECT COUNT(*)
          FROM appointments a
          WHERE a.patient_id = pp.id
            AND a.status IN ('SCHEDULED', 'CONFIRMED', 'RESCHEDULED')
            AND a.scheduled_start >= NOW()
        )::text AS upcoming_appointments,
        (
          SELECT COUNT(*)
          FROM medications m
          WHERE m.patient_id = pp.id
            AND m.status = 'ACTIVE'
        )::text AS active_medications
      FROM patient_profiles pp
      JOIN users u ON u.id = pp.user_id
      WHERE ${column} = $1
      LIMIT 1
    `,
    [value],
  );

  return result.rowCount ? mapPatientProfile(result.rows[0]) : null;
};

const getPatientIdByUserId = async (userId: string): Promise<string | null> => {
  const result = await runQuery<PatientIdRow>(
    `
      SELECT id AS patient_id
      FROM patient_profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rowCount ? result.rows[0].patient_id : null;
};

const getPatientProfileByUserId = async (userId: string): Promise<PatientProfile | null> =>
  getPatientProfileByColumn("pp.user_id", userId);

const getPatientProfileByPatientId = async (patientId: string): Promise<PatientProfile | null> =>
  getPatientProfileByColumn("pp.id", patientId);

const doctorHasAccessToPatient = async (doctorUserId: string, patientId: string): Promise<boolean> => {
  const result = await runQuery<{ has_access: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM doctor_patient_links dpl
        JOIN doctor_profiles dp ON dp.id = dpl.doctor_id
        WHERE dp.user_id = $1
          AND dpl.patient_id = $2
          AND dpl.relationship_status = 'ACTIVE'
      ) AS has_access
    `,
    [doctorUserId, patientId],
  );

  return Boolean(result.rows[0]?.has_access);
};

const updatePatientProfile = async (
  client: PoolClient,
  userId: string,
  input: UpdatePatientProfileInput,
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
      UPDATE patient_profiles
      SET
        gender = COALESCE($2::gender_type, gender),
        date_of_birth = COALESCE($3::date, date_of_birth),
        blood_group = COALESCE($4, blood_group),
        genotype = COALESCE($5, genotype),
        emergency_contact_name = COALESCE($6, emergency_contact_name),
        emergency_contact_phone = COALESCE($7, emergency_contact_phone),
        address_line_1 = COALESCE($8, address_line_1),
        address_line_2 = COALESCE($9, address_line_2),
        city = COALESCE($10, city),
        state = COALESCE($11, state),
        country = COALESCE($12, country),
        height_cm = COALESCE($13, height_cm),
        weight_kg = COALESCE($14, weight_kg)
      WHERE user_id = $1
    `,
    [
      userId,
      input.gender ?? null,
      input.dateOfBirth ?? null,
      input.bloodGroup ?? null,
      input.genotype ?? null,
      input.emergencyContactName ?? null,
      input.emergencyContactPhone ?? null,
      input.addressLine1 ?? null,
      input.addressLine2 ?? null,
      input.city ?? null,
      input.state ?? null,
      input.country ?? null,
      input.heightCm ?? null,
      input.weightKg ?? null,
    ],
  );
};

const listPatientDoctorsByPatientId = async (
  patientId: string,
  filters: PatientDoctorListFilters,
): Promise<PaginatedResult<PatientDoctorListItem>> => {
  const offset = (filters.page - 1) * filters.limit;
  const searchTerm = filters.search ? `%${filters.search}%` : null;
  const specialtyTerm = filters.specialty ? `%${filters.specialty}%` : null;

  const result = await runQuery<PatientDoctorListRow>(
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
        dpl.relationship_status,
        dpl.notes,
        (pp.primary_doctor_id = dp.id) AS is_primary_doctor,
        dpl.created_at::text AS linked_at
      FROM patient_profiles pp
      JOIN doctor_patient_links dpl ON dpl.patient_id = pp.id
      JOIN doctor_profiles dp ON dp.id = dpl.doctor_id
      JOIN users u ON u.id = dp.user_id
      WHERE pp.id = $1
        AND ($2::text IS NULL OR dpl.relationship_status = $2::doctor_patient_status)
        AND ($3::text IS NULL OR dp.specialty ILIKE $3)
        AND (
          $4::text IS NULL
          OR CONCAT_WS(' ', u.first_name, u.last_name, u.email, COALESCE(dp.clinic_name, '')) ILIKE $4
        )
      ORDER BY (pp.primary_doctor_id = dp.id) DESC, dpl.created_at DESC
      LIMIT $5 OFFSET $6
    `,
    [patientId, filters.relationshipStatus ?? null, specialtyTerm, searchTerm, filters.limit, offset],
  );

  const total = result.rowCount ? Number(result.rows[0].total_count) : 0;

  return {
    items: result.rows.map(mapPatientDoctorListItem),
    meta: createPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      total,
    }),
  };
};

const listPatientDoctors = async (
  userId: string,
  filters: PatientDoctorListFilters,
): Promise<PaginatedResult<PatientDoctorListItem>> => {
  const patientId = await getPatientIdByUserId(userId);

  if (!patientId) {
    return createEmptyResult(filters.page, filters.limit);
  }

  return listPatientDoctorsByPatientId(patientId, filters);
};

const setPrimaryDoctorByPatientId = async (patientId: string, doctorId: string): Promise<PatientProfile | null> => {
  const updateResult = await runQuery<{ patient_id: string }>(
    `
      UPDATE patient_profiles pp
      SET
        primary_doctor_id = $2,
        updated_at = NOW()
      WHERE pp.id = $1
        AND EXISTS (
          SELECT 1
          FROM doctor_patient_links dpl
          WHERE dpl.patient_id = pp.id
            AND dpl.doctor_id = $2
            AND dpl.relationship_status = 'ACTIVE'
        )
      RETURNING pp.id AS patient_id
    `,
    [patientId, doctorId],
  );

  if (!updateResult.rowCount) {
    return null;
  }

  return getPatientProfileByPatientId(patientId);
};

const setPrimaryDoctor = async (userId: string, doctorId: string): Promise<PatientProfile | null> => {
  const patientId = await getPatientIdByUserId(userId);

  if (!patientId) {
    return null;
  }

  return setPrimaryDoctorByPatientId(patientId, doctorId);
};

const searchDoctors = async (
  userId: string,
  filters: PatientDoctorListFilters,
): Promise<PaginatedResult<DoctorSearchItem>> => {
  const offset = (filters.page - 1) * filters.limit;
  const searchTerm = filters.search ? `%${filters.search}%` : null;
  const specialtyTerm = filters.specialty ? `%${filters.specialty}%` : null;

  const result = await runQuery<DoctorSearchRow>(
    `
      WITH patient_context AS (
        SELECT id
        FROM patient_profiles
        WHERE user_id = $1
      )
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
        EXISTS (
          SELECT 1
          FROM doctor_patient_links dpl
          JOIN patient_context pc ON pc.id = dpl.patient_id
          WHERE dpl.doctor_id = dp.id
            AND dpl.relationship_status <> 'ARCHIVED'
        ) AS already_linked
      FROM doctor_profiles dp
      JOIN users u ON u.id = dp.user_id
      WHERE u.role = 'DOCTOR'
        AND u.status = 'ACTIVE'
        AND ($2::text IS NULL OR dp.specialty ILIKE $2)
        AND (
          $3::text IS NULL
          OR CONCAT_WS(' ', u.first_name, u.last_name, u.email, COALESCE(dp.clinic_name, '')) ILIKE $3
        )
      ORDER BY u.first_name ASC, u.last_name ASC
      LIMIT $4 OFFSET $5
    `,
    [userId, specialtyTerm, searchTerm, filters.limit, offset],
  );

  const total = result.rowCount ? Number(result.rows[0].total_count) : 0;

  return {
    items: result.rows.map(mapDoctorSearchItem),
    meta: createPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      total,
    }),
  };
};

export const patientsRepository: PatientsRepository = {
  getPatientIdByUserId,
  getPatientProfileByUserId,
  getPatientProfileByPatientId,
  doctorHasAccessToPatient,
  updatePatientProfile,
  listPatientDoctors,
  listPatientDoctorsByPatientId,
  setPrimaryDoctor,
  setPrimaryDoctorByPatientId,
  searchDoctors,
};
