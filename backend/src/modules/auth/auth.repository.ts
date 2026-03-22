import type { PoolClient } from "pg";

import { AppRole } from "../../common/constants/roles";
import { runQuery } from "../../config/database";
import type {
  AuthRepository,
  AuthenticatedUserProfile,
  RefreshTokenInsertInput,
  RefreshTokenRecord,
  RegisterDoctorInput,
  RegisterPatientInput,
  UserRecord,
} from "./auth.types";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: AppRole;
  status: UserRecord["status"];
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
};

const mapUserRow = (row: UserRow): UserRecord => ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
  role: row.role,
  status: row.status,
  firstName: row.first_name,
  lastName: row.last_name,
  phone: row.phone,
  avatarUrl: row.avatar_url,
});

const ensureUserSettings = async (client: PoolClient, userId: string): Promise<void> => {
  await client.query("INSERT INTO user_settings (user_id) VALUES ($1)", [userId]);
};

const createPatientUser = async (
  client: PoolClient,
  input: RegisterPatientInput,
  passwordHash: string,
): Promise<UserRecord> => {
  const userResult = await client.query<UserRow>(
    `
      INSERT INTO users (email, password_hash, role, first_name, last_name, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, password_hash, role, status, first_name, last_name, phone, avatar_url
    `,
    [input.email, passwordHash, AppRole.PATIENT, input.firstName, input.lastName, input.phone ?? null],
  );

  const user = mapUserRow(userResult.rows[0]);

  await client.query(
    `
      INSERT INTO patient_profiles (
        user_id,
        gender,
        date_of_birth,
        blood_group,
        genotype,
        emergency_contact_name,
        emergency_contact_phone
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      user.id,
      input.gender ?? null,
      input.dateOfBirth ?? null,
      input.bloodGroup ?? null,
      input.genotype ?? null,
      input.emergencyContactName ?? null,
      input.emergencyContactPhone ?? null,
    ],
  );

  await ensureUserSettings(client, user.id);

  return user;
};

const createDoctorUser = async (
  client: PoolClient,
  input: RegisterDoctorInput,
  passwordHash: string,
): Promise<UserRecord> => {
  const userResult = await client.query<UserRow>(
    `
      INSERT INTO users (email, password_hash, role, first_name, last_name, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, password_hash, role, status, first_name, last_name, phone, avatar_url
    `,
    [input.email, passwordHash, AppRole.DOCTOR, input.firstName, input.lastName, input.phone ?? null],
  );

  const user = mapUserRow(userResult.rows[0]);

  await client.query(
    `
      INSERT INTO doctor_profiles (
        user_id,
        license_number,
        specialty,
        clinic_name,
        years_experience,
        gender,
        date_of_birth,
        bio
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      user.id,
      input.licenseNumber,
      input.specialty,
      input.clinicName ?? null,
      input.yearsExperience ?? 0,
      input.gender ?? null,
      input.dateOfBirth ?? null,
      input.bio ?? null,
    ],
  );

  await ensureUserSettings(client, user.id);

  return user;
};

const findUserByEmail = async (email: string): Promise<UserRecord | null> => {
  const result = await runQuery<UserRow>(
    `
      SELECT id, email, password_hash, role, status, first_name, last_name, phone, avatar_url
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email],
  );

  return result.rowCount ? mapUserRow(result.rows[0]) : null;
};

const findUserById = async (userId: string): Promise<UserRecord | null> => {
  const result = await runQuery<UserRow>(
    `
      SELECT id, email, password_hash, role, status, first_name, last_name, phone, avatar_url
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rowCount ? mapUserRow(result.rows[0]) : null;
};

const getUserProfile = async (userId: string): Promise<AuthenticatedUserProfile | null> => {
  const result = await runQuery<{
    id: string;
    email: string;
    role: AppRole;
    status: UserRecord["status"];
    first_name: string;
    last_name: string;
    phone: string | null;
    avatar_url: string | null;
    doctor_license_number: string | null;
    doctor_specialty: string | null;
    doctor_clinic_name: string | null;
    doctor_years_experience: number | null;
    patient_blood_group: string | null;
    patient_genotype: string | null;
    patient_primary_doctor_id: string | null;
    patient_emergency_contact_name: string | null;
    patient_emergency_contact_phone: string | null;
  }>(
    `
      SELECT
        u.id,
        u.email,
        u.role,
        u.status,
        u.first_name,
        u.last_name,
        u.phone,
        u.avatar_url,
        dp.license_number AS doctor_license_number,
        dp.specialty AS doctor_specialty,
        dp.clinic_name AS doctor_clinic_name,
        dp.years_experience AS doctor_years_experience,
        pp.blood_group AS patient_blood_group,
        pp.genotype AS patient_genotype,
        pp.primary_doctor_id AS patient_primary_doctor_id,
        pp.emergency_contact_name AS patient_emergency_contact_name,
        pp.emergency_contact_phone AS patient_emergency_contact_phone
      FROM users u
      LEFT JOIN doctor_profiles dp ON dp.user_id = u.id
      LEFT JOIN patient_profiles pp ON pp.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId],
  );

  if (!result.rowCount) {
    return null;
  }

  const row = result.rows[0];

  const profile =
    row.role === AppRole.DOCTOR
      ? {
          licenseNumber: row.doctor_license_number,
          specialty: row.doctor_specialty,
          clinicName: row.doctor_clinic_name,
          yearsExperience: row.doctor_years_experience,
        }
      : row.role === AppRole.PATIENT
        ? {
            bloodGroup: row.patient_blood_group,
            genotype: row.patient_genotype,
            primaryDoctorId: row.patient_primary_doctor_id,
            emergencyContactName: row.patient_emergency_contact_name,
            emergencyContactPhone: row.patient_emergency_contact_phone,
          }
        : {};

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    profile,
  };
};

const createRefreshToken = async (input: RefreshTokenInsertInput): Promise<void> => {
  await runQuery(
    `
      INSERT INTO refresh_tokens (id, user_id, token_hash, device_name, device_ip, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      input.id,
      input.userId,
      input.tokenHash,
      input.deviceName ?? null,
      input.deviceIp ?? null,
      input.userAgent ?? null,
      input.expiresAt,
    ],
  );
};

const findRefreshTokenById = async (tokenId: string): Promise<RefreshTokenRecord | null> => {
  const result = await runQuery<{
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    revoked_at: Date | null;
  }>(
    `
      SELECT id, user_id, token_hash, expires_at, revoked_at
      FROM refresh_tokens
      WHERE id = $1
      LIMIT 1
    `,
    [tokenId],
  );

  if (!result.rowCount) {
    return null;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
};

const revokeRefreshToken = async (tokenId: string): Promise<void> => {
  await runQuery("UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL", [tokenId]);
};

const touchLastLogin = async (userId: string): Promise<void> => {
  await runQuery("UPDATE users SET last_login_at = NOW() WHERE id = $1", [userId]);
};

export const authRepository: AuthRepository = {
  createPatientUser,
  createDoctorUser,
  findUserByEmail,
  findUserById,
  getUserProfile,
  createRefreshToken,
  findRefreshTokenById,
  revokeRefreshToken,
  touchLastLogin,
};

