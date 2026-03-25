import { z } from "zod";

import { DoctorPatientRelationshipStatus } from "../../common/constants/relationship";
import { paginationQuerySchema } from "../../common/schemas/pagination.schemas";

export const updateDoctorProfileSchema = z
  .object({
    firstName: z.string().trim().min(2).max(100).optional(),
    lastName: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().min(7).max(20).optional(),
    avatarUrl: z.url().optional(),
    specialty: z.string().trim().min(2).max(150).optional(),
    clinicName: z.string().trim().max(180).optional(),
    yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
    dateOfBirth: z.string().date().optional(),
    bio: z.string().trim().max(1200).optional(),
    consultationFee: z.coerce.number().min(0).max(1000000).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Provide at least one field to update.",
  });

export const doctorPatientListQuerySchema = paginationQuerySchema.extend({
  relationshipStatus: z.nativeEnum(DoctorPatientRelationshipStatus).optional(),
});

export const doctorDirectoryQuerySchema = paginationQuerySchema.extend({
  specialty: z.string().trim().max(150).optional(),
});

export const linkPatientSchema = z.object({
  patientId: z.uuid(),
  notes: z.string().trim().max(500).optional(),
});

export const doctorIdParamSchema = z.object({
  doctorId: z.uuid(),
});

export const patientIdParamSchema = z.object({
  patientId: z.uuid(),
});

export const doctorPatientRelationshipParamsSchema = z.object({
  doctorId: z.uuid(),
  patientId: z.uuid(),
});

export const updateDoctorPatientRelationshipSchema = z
  .object({
    relationshipStatus: z.nativeEnum(DoctorPatientRelationshipStatus).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Provide at least one field to update.",
  });
