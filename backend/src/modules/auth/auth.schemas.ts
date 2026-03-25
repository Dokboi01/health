import { z } from "zod";

const baseRegistrationSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  dateOfBirth: z.string().date().optional(),
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

export const registerPatientSchema = baseRegistrationSchema.extend({
  bloodGroup: z.string().trim().max(5).optional(),
  genotype: z.string().trim().max(10).optional(),
  emergencyContactName: z.string().trim().max(160).optional(),
  emergencyContactPhone: z.string().trim().max(20).optional(),
});

export const registerDoctorSchema = baseRegistrationSchema.extend({
  licenseNumber: z.string().trim().min(5).max(120),
  specialty: z.string().trim().min(2).max(150),
  clinicName: z.string().trim().max(180).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
  bio: z.string().trim().max(1000).optional(),
});

export const loginSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20),
});

export const forgotPasswordSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32),
  password: passwordSchema,
});
