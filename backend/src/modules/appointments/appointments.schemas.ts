import { z } from "zod";

import { paginationQuerySchema } from "../../common/schemas/pagination.schemas";

const appointmentTypeSchema = z.enum(["IN_PERSON", "VIRTUAL", "FOLLOW_UP"]);
const appointmentStatusSchema = z.enum([
  "SCHEDULED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "RESCHEDULED",
]);

const isoDateTimeSchema = z.string().datetime({ offset: true });
const hhmmTimeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

export const appointmentListQuerySchema = paginationQuerySchema.extend({
  status: appointmentStatusSchema.optional(),
  appointmentType: appointmentTypeSchema.optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  doctorId: z.uuid().optional(),
  patientId: z.uuid().optional(),
});

export const appointmentIdParamSchema = z.object({
  appointmentId: z.uuid(),
});

export const createAppointmentSchema = z
  .object({
    doctorId: z.uuid(),
    patientId: z.uuid(),
    appointmentType: appointmentTypeSchema.default("IN_PERSON"),
    scheduledStart: isoDateTimeSchema,
    scheduledEnd: isoDateTimeSchema,
    reason: z.string().trim().max(1000).optional(),
    notes: z.string().trim().max(2000).optional(),
    location: z.string().trim().max(255).optional(),
    meetingLink: z.url().optional(),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.scheduledEnd) <= new Date(value.scheduledStart)) {
      ctx.addIssue({
        code: "custom",
        message: "scheduledEnd must be after scheduledStart.",
        path: ["scheduledEnd"],
      });
    }
  });

export const updateAppointmentSchema = z
  .object({
    appointmentType: appointmentTypeSchema.optional(),
    scheduledStart: isoDateTimeSchema.optional(),
    scheduledEnd: isoDateTimeSchema.optional(),
    reason: z.string().trim().max(1000).optional(),
    notes: z.string().trim().max(2000).optional(),
    location: z.string().trim().max(255).optional(),
    meetingLink: z.url().optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Provide at least one field to update.",
  })
  .superRefine((value, ctx) => {
    if (value.scheduledStart && value.scheduledEnd && new Date(value.scheduledEnd) <= new Date(value.scheduledStart)) {
      ctx.addIssue({
        code: "custom",
        message: "scheduledEnd must be after scheduledStart.",
        path: ["scheduledEnd"],
      });
    }
  });

export const updateAppointmentStatusSchema = z.object({
  status: appointmentStatusSchema,
  cancellationReason: z.string().trim().max(500).optional(),
});

export const rejectAppointmentSchema = z.object({
  cancellationReason: z.string().trim().min(5).max(500),
});

export const rescheduleAppointmentSchema = z
  .object({
    appointmentType: appointmentTypeSchema.optional(),
    scheduledStart: isoDateTimeSchema,
    scheduledEnd: isoDateTimeSchema,
    reason: z.string().trim().max(1000).optional(),
    notes: z.string().trim().max(2000).optional(),
    location: z.string().trim().max(255).optional(),
    meetingLink: z.url().optional(),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.scheduledEnd) <= new Date(value.scheduledStart)) {
      ctx.addIssue({
        code: "custom",
        message: "scheduledEnd must be after scheduledStart.",
        path: ["scheduledEnd"],
      });
    }
  });

export const replaceAvailabilitySchema = z.object({
  slots: z
    .array(
      z.object({
        dayOfWeek: z.coerce.number().int().min(0).max(6),
        startTime: hhmmTimeSchema,
        endTime: hhmmTimeSchema,
        slotDurationMinutes: z.coerce.number().int().min(10).max(240),
        isActive: z.boolean().default(true),
      }),
    )
    .max(50),
});

export const availabilitySlotsQuerySchema = z.object({
  doctorId: z.uuid(),
  date: z.string().date(),
});
