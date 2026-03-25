import { z } from "zod";

import { paginationQuerySchema } from "../../common/schemas/pagination.schemas";

const medicationStatusSchema = z.enum(["ACTIVE", "PAUSED", "COMPLETED", "EXPIRED"]);
const medicationLogStatusSchema = z.enum(["SCHEDULED", "TAKEN", "SKIPPED", "MISSED"]);
const hhmmTimeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

const medicationScheduleSchema = z.object({
  scheduledTime: hhmmTimeSchema,
  reminderTime: hhmmTimeSchema.optional(),
  timezone: z.string().trim().min(2).max(100).default("Africa/Lagos"),
  label: z.string().trim().max(80).optional(),
  daysOfWeek: z
    .array(z.coerce.number().int().min(0).max(6))
    .max(7)
    .optional()
    .transform((value) => (value && value.length > 0 ? Array.from(new Set(value)).sort() : undefined)),
  isActive: z.boolean().default(true),
});

export const medicationIdParamSchema = z.object({
  medicationId: z.uuid(),
});

export const medicationListQuerySchema = paginationQuerySchema.extend({
  status: medicationStatusSchema.optional(),
  patientId: z.uuid().optional(),
  prescriptionId: z.uuid().optional(),
});

export const medicationLogListQuerySchema = paginationQuerySchema.extend({
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
});

export const medicationAdherenceQuerySchema = z
  .object({
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.dateFrom && value.dateTo && value.dateTo < value.dateFrom) {
      ctx.addIssue({
        code: "custom",
        message: "dateTo must be on or after dateFrom.",
        path: ["dateTo"],
      });
    }
  });

export const replaceMedicationSchedulesSchema = z.object({
  schedules: z.array(medicationScheduleSchema).max(28),
});

export const createMedicationSchema = z
  .object({
    patientId: z.uuid(),
    prescriptionId: z.uuid().optional(),
    name: z.string().trim().min(2).max(180),
    strength: z.string().trim().max(80).optional(),
    dosageForm: z.string().trim().max(120).optional(),
    dosageInstructions: z.string().trim().min(2).max(2000),
    frequency: z.string().trim().min(1).max(120),
    route: z.string().trim().max(120).optional(),
    startDate: z.string().date(),
    endDate: z.string().date().optional(),
    reminderEnabled: z.boolean().default(true),
    notes: z.string().trim().max(2000).optional(),
    schedules: z.array(medicationScheduleSchema).max(28).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        message: "endDate must be on or after startDate.",
        path: ["endDate"],
      });
    }
  });

export const updateMedicationSchema = z
  .object({
    name: z.string().trim().min(2).max(180).optional(),
    strength: z.string().trim().max(80).optional(),
    dosageForm: z.string().trim().max(120).optional(),
    dosageInstructions: z.string().trim().min(2).max(2000).optional(),
    frequency: z.string().trim().min(1).max(120).optional(),
    route: z.string().trim().max(120).optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().nullable().optional(),
    reminderEnabled: z.boolean().optional(),
    status: medicationStatusSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Provide at least one field to update.",
  })
  .superRefine((value, ctx) => {
    if (value.startDate && typeof value.endDate === "string" && value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        message: "endDate must be on or after startDate.",
        path: ["endDate"],
      });
    }
  });

export const createMedicationLogSchema = z
  .object({
    scheduleId: z.uuid().optional(),
    scheduledFor: z.string().datetime({ offset: true }),
    takenAt: z.string().datetime({ offset: true }).optional(),
    status: medicationLogStatusSchema,
    note: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "TAKEN" && !value.takenAt) {
      ctx.addIssue({
        code: "custom",
        message: "takenAt is required when status is TAKEN.",
        path: ["takenAt"],
      });
    }
  });

export const markMedicationTakenSchema = z.object({
  scheduleId: z.uuid().optional(),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
  takenAt: z.string().datetime({ offset: true }).optional(),
  note: z.string().trim().max(1000).optional(),
});
