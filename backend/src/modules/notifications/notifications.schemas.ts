import { z } from "zod";

import { paginationQuerySchema } from "../../common/schemas/pagination.schemas";

const notificationTypeSchema = z.enum([
  "SYSTEM",
  "APPOINTMENT_REMINDER",
  "MEDICATION_REMINDER",
  "APPOINTMENT_BOOKED",
  "PRESCRIPTION_CREATED",
  "PRESCRIPTION_UPDATED",
  "PRESCRIPTION_STATUS_UPDATED",
]);

const reminderStatusSchema = z.enum(["PENDING", "SENT", "FAILED", "CANCELLED"]);
const reminderRelatedTypeSchema = z.enum(["APPOINTMENT", "MEDICATION", "GENERAL"]);
const devicePlatformSchema = z.enum(["ANDROID", "IOS", "WEB"]);
const booleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");

export const notificationIdParamSchema = z.object({
  notificationId: z.uuid(),
});

export const deviceTokenIdParamSchema = z.object({
  deviceTokenId: z.uuid(),
});

export const notificationListQuerySchema = z.object({
  page: paginationQuerySchema.shape.page,
  limit: paginationQuerySchema.shape.limit,
  isRead: booleanQuerySchema.optional(),
  type: notificationTypeSchema.optional(),
});

export const reminderListQuerySchema = z
  .object({
    page: paginationQuerySchema.shape.page,
    limit: paginationQuerySchema.shape.limit,
    status: reminderStatusSchema.optional(),
    relatedType: reminderRelatedTypeSchema.optional(),
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

export const registerDeviceTokenSchema = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: devicePlatformSchema,
});

export const processDueRemindersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});
