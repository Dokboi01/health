import { z } from "zod";

import { paginationQuerySchema } from "../../common/schemas/pagination.schemas";

const prescriptionStatusSchema = z.enum(["ACTIVE", "COMPLETED", "CANCELLED", "EXPIRED"]);

const prescriptionItemSchema = z.object({
  medicationName: z.string().trim().min(2).max(180),
  strength: z.string().trim().max(80).optional(),
  dosage: z.string().trim().min(1).max(120),
  frequency: z.string().trim().min(1).max(120),
  route: z.string().trim().max(120).optional(),
  durationDays: z.coerce.number().int().min(1).max(365).optional(),
  refillCount: z.coerce.number().int().min(0).max(20).default(0),
  notes: z.string().trim().max(1500).optional(),
});

export const prescriptionIdParamSchema = z.object({
  prescriptionId: z.uuid(),
});

export const prescriptionListQuerySchema = paginationQuerySchema.extend({
  status: prescriptionStatusSchema.optional(),
  patientId: z.uuid().optional(),
  appointmentId: z.uuid().optional(),
});

export const createPrescriptionSchema = z
  .object({
    doctorId: z.uuid().optional(),
    patientId: z.uuid(),
    appointmentId: z.uuid().optional(),
    diagnosis: z.string().trim().max(2000).optional(),
    instructions: z.string().trim().max(4000).optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    items: z.array(prescriptionItemSchema).min(1).max(20),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        message: "endDate must be on or after startDate.",
        path: ["endDate"],
      });
    }
  });

export const updatePrescriptionSchema = z
  .object({
    appointmentId: z.uuid().nullable().optional(),
    diagnosis: z.string().trim().max(2000).optional(),
    instructions: z.string().trim().max(4000).optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    items: z.array(prescriptionItemSchema).min(1).max(20).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Provide at least one field to update.",
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        message: "endDate must be on or after startDate.",
        path: ["endDate"],
      });
    }
  });

export const updatePrescriptionStatusSchema = z.object({
  status: prescriptionStatusSchema,
});
