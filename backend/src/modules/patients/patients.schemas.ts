import { z } from "zod";

import { DoctorPatientRelationshipStatus } from "../../common/constants/relationship";
import { paginationQuerySchema } from "../../common/schemas/pagination.schemas";

export const updatePatientProfileSchema = z
  .object({
    firstName: z.string().trim().min(2).max(100).optional(),
    lastName: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().min(7).max(20).optional(),
    avatarUrl: z.url().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
    dateOfBirth: z.string().date().optional(),
    bloodGroup: z.string().trim().max(5).optional(),
    genotype: z.string().trim().max(10).optional(),
    emergencyContactName: z.string().trim().max(160).optional(),
    emergencyContactPhone: z.string().trim().max(20).optional(),
    addressLine1: z.string().trim().max(255).optional(),
    addressLine2: z.string().trim().max(255).optional(),
    city: z.string().trim().max(120).optional(),
    state: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
    heightCm: z.coerce.number().min(0).max(300).optional(),
    weightKg: z.coerce.number().min(0).max(600).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Provide at least one field to update.",
  });

export const patientDoctorListQuerySchema = paginationQuerySchema.extend({
  specialty: z.string().trim().max(150).optional(),
  relationshipStatus: z.nativeEnum(DoctorPatientRelationshipStatus).optional(),
});

export const patientIdParamSchema = z.object({
  patientId: z.uuid(),
});

export const setPrimaryDoctorSchema = z.object({
  doctorId: z.uuid(),
});
