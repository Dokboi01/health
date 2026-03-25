import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

import { AuthTokenType, UserStatus } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { withTransaction } from "../../config/database";
import { env } from "../../config/env";
import { authRepository } from "./auth.repository";
import type {
  AuthResponse,
  ForgotPasswordInput,
  ForgotPasswordResponse,
  LoginInput,
  RegisterDoctorInput,
  RegisterPatientInput,
  RequestMetadata,
  ResetPasswordInput,
  UserRecord,
} from "./auth.types";

type RefreshTokenPayload = JwtPayload & {
  email: string;
  role: UserRecord["role"];
  type: AuthTokenType;
  sub: string;
  jti: string;
};

const passwordResetAcceptedMessage =
  "If an account with that email exists, a password reset link has been prepared.";

const durationToMilliseconds = (duration: string): number => {
  const parsed = /^(\d+)([smhd])$/.exec(duration.trim());

  if (!parsed) {
    throw new Error(`Unsupported duration format: ${duration}`);
  }

  const value = Number(parsed[1]);
  const unit = parsed[2];

  switch (unit) {
    case "s":
      return value * 1_000;
    case "m":
      return value * 60_000;
    case "h":
      return value * 3_600_000;
    case "d":
      return value * 86_400_000;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }
};

const hashToken = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");

const assertUserCanAuthenticate = (user: UserRecord | null): UserRecord => {
  if (!user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid email or password.", "INVALID_CREDENTIALS");
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError(StatusCodes.FORBIDDEN, "This account is not active.", "ACCOUNT_INACTIVE");
  }

  return user;
};

const signAccessToken = (user: UserRecord): string =>
  jwt.sign(
    {
      email: user.email,
      role: user.role,
      type: AuthTokenType.ACCESS,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
      subject: user.id,
    },
  );

const signRefreshToken = (user: UserRecord, tokenId: string): string =>
  jwt.sign(
    {
      email: user.email,
      role: user.role,
      type: AuthTokenType.REFRESH,
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
      jwtid: tokenId,
      subject: user.id,
    },
  );

const issueSession = async (user: UserRecord, metadata?: RequestMetadata): Promise<AuthResponse> => {
  const accessToken = signAccessToken(user);
  const refreshTokenId = crypto.randomUUID();
  const refreshToken = signRefreshToken(user, refreshTokenId);

  await authRepository.createRefreshToken({
    id: refreshTokenId,
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + durationToMilliseconds(env.JWT_REFRESH_EXPIRES_IN)),
    ...metadata,
  });

  const profile = await authRepository.getUserProfile(user.id);

  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, "Authenticated user profile was not found.", "PROFILE_NOT_FOUND");
  }

  return {
    user: profile,
    tokens: {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshTokenExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
  };
};

const verifyRefreshToken = async (refreshToken: string): Promise<RefreshTokenPayload> => {
  const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

  if (payload.type !== AuthTokenType.REFRESH || !payload.sub || !payload.jti) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid refresh token.", "INVALID_TOKEN");
  }

  const tokenRecord = await authRepository.findRefreshTokenById(payload.jti);

  if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt.getTime() <= Date.now()) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Refresh token is expired or revoked.", "INVALID_TOKEN");
  }

  if (tokenRecord.tokenHash !== hashToken(refreshToken)) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Refresh token mismatch detected.", "INVALID_TOKEN");
  }

  return payload;
};

const buildForgotPasswordResponse = (resetToken?: string): ForgotPasswordResponse => ({
  message: passwordResetAcceptedMessage,
  ...(env.NODE_ENV !== "production" && resetToken
    ? {
        resetTokenPreview: resetToken,
        resetTokenExpiresIn: env.PASSWORD_RESET_EXPIRES_IN,
      }
    : {}),
});

const registerPatient = async (
  input: RegisterPatientInput,
  metadata?: RequestMetadata,
): Promise<AuthResponse> => {
  const existingUser = await authRepository.findUserByEmail(input.email);

  if (existingUser) {
    throw new AppError(StatusCodes.CONFLICT, "An account with this email already exists.", "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  const user = await withTransaction((client) =>
    authRepository.createPatientUser(client, input, passwordHash),
  );

  await authRepository.touchLastLogin(user.id);

  return issueSession(user, metadata);
};

const registerDoctor = async (
  input: RegisterDoctorInput,
  metadata?: RequestMetadata,
): Promise<AuthResponse> => {
  const existingUser = await authRepository.findUserByEmail(input.email);

  if (existingUser) {
    throw new AppError(StatusCodes.CONFLICT, "An account with this email already exists.", "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  const user = await withTransaction((client) =>
    authRepository.createDoctorUser(client, input, passwordHash),
  );

  await authRepository.touchLastLogin(user.id);

  return issueSession(user, metadata);
};

const login = async (input: LoginInput, metadata?: RequestMetadata): Promise<AuthResponse> => {
  const user = assertUserCanAuthenticate(await authRepository.findUserByEmail(input.email));
  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid email or password.", "INVALID_CREDENTIALS");
  }

  await authRepository.touchLastLogin(user.id);

  return issueSession(user, metadata);
};

const refresh = async (refreshToken: string, metadata?: RequestMetadata): Promise<AuthResponse> => {
  const payload = await verifyRefreshToken(refreshToken);
  await authRepository.revokeRefreshToken(payload.jti);

  const user = assertUserCanAuthenticate(await authRepository.findUserById(payload.sub));

  return issueSession(user, metadata);
};

const logout = async (refreshToken: string): Promise<void> => {
  try {
    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

    if (payload.jti) {
      await authRepository.revokeRefreshToken(payload.jti);
    }
  } catch {
    // Logout stays idempotent even if the token is already expired or malformed.
  }
};

const forgotPassword = async (
  input: ForgotPasswordInput,
  metadata?: RequestMetadata,
): Promise<ForgotPasswordResponse> => {
  const user = await authRepository.findUserByEmail(input.email);

  if (!user || user.status !== UserStatus.ACTIVE) {
    return buildForgotPasswordResponse();
  }

  const rawResetToken = crypto.randomBytes(32).toString("hex");

  await authRepository.revokeActivePasswordResetTokensForUser(user.id);
  await authRepository.createPasswordResetToken({
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash: hashToken(rawResetToken),
    expiresAt: new Date(Date.now() + durationToMilliseconds(env.PASSWORD_RESET_EXPIRES_IN)),
    ...metadata,
  });

  return buildForgotPasswordResponse(rawResetToken);
};

const resetPassword = async (input: ResetPasswordInput): Promise<void> => {
  const tokenRecord = await authRepository.findPasswordResetTokenByHash(hashToken(input.token));

  if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt.getTime() <= Date.now()) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "The password reset token is invalid or has expired.",
      "INVALID_RESET_TOKEN",
    );
  }

  const user = assertUserCanAuthenticate(await authRepository.findUserById(tokenRecord.userId));
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  await withTransaction(async (client) => {
    await authRepository.updateUserPassword(user.id, passwordHash, client);
    await authRepository.markPasswordResetTokenUsed(tokenRecord.id, client);
    await authRepository.revokeActivePasswordResetTokensForUser(user.id, client);
    await authRepository.revokeAllRefreshTokensForUser(user.id, client);
  });
};

const getCurrentUser = async (userId: string) => {
  const profile = await authRepository.getUserProfile(userId);

  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, "User profile was not found.", "PROFILE_NOT_FOUND");
  }

  return profile;
};

export const authService = {
  registerPatient,
  registerDoctor,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser,
};
