import type { PoolClient } from "pg";

import { AppRole, UserStatus } from "../../common/constants/roles";

export interface BaseRegistrationInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
}

export interface RegisterPatientInput extends BaseRegistrationInput {
  bloodGroup?: string;
  genotype?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface RegisterDoctorInput extends BaseRegistrationInput {
  licenseNumber: string;
  specialty: string;
  clinicName?: string;
  yearsExperience?: number;
  bio?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface RequestMetadata {
  deviceIp?: string;
  deviceName?: string;
  userAgent?: string;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: AppRole;
  status: UserStatus;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
}

export interface AuthenticatedUserProfile {
  id: string;
  email: string;
  role: AppRole;
  status: UserStatus;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  profile: Record<string, unknown>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export interface AuthResponse {
  user: AuthenticatedUserProfile;
  tokens: AuthTokens;
}

export interface RefreshTokenInsertInput extends RequestMetadata {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface PasswordResetTokenInsertInput extends RequestMetadata {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface ForgotPasswordResponse {
  message: string;
  resetTokenPreview?: string;
  resetTokenExpiresIn?: string;
}

export interface AuthRepository {
  createPatientUser(client: PoolClient, input: RegisterPatientInput, passwordHash: string): Promise<UserRecord>;
  createDoctorUser(client: PoolClient, input: RegisterDoctorInput, passwordHash: string): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(userId: string): Promise<UserRecord | null>;
  getUserProfile(userId: string): Promise<AuthenticatedUserProfile | null>;
  createRefreshToken(input: RefreshTokenInsertInput): Promise<void>;
  findRefreshTokenById(tokenId: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(tokenId: string, client?: PoolClient): Promise<void>;
  revokeAllRefreshTokensForUser(userId: string, client?: PoolClient): Promise<void>;
  createPasswordResetToken(input: PasswordResetTokenInsertInput): Promise<void>;
  findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  markPasswordResetTokenUsed(tokenId: string, client?: PoolClient): Promise<void>;
  revokeActivePasswordResetTokensForUser(userId: string, client?: PoolClient): Promise<void>;
  updateUserPassword(userId: string, passwordHash: string, client?: PoolClient): Promise<void>;
  touchLastLogin(userId: string): Promise<void>;
}
