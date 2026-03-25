import { z } from "zod";

export const updateUserProfileSchema = z
  .object({
    firstName: z.string().trim().min(2).max(100).optional(),
    lastName: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().min(7).max(20).optional(),
    avatarUrl: z.url().optional(),
    languageCode: z.string().trim().min(2).max(10).optional(),
    timezone: z.string().trim().min(2).max(100).optional(),
    dateFormat: z.string().trim().min(2).max(20).optional(),
    pushNotificationsEnabled: z.boolean().optional(),
    emailNotificationsEnabled: z.boolean().optional(),
    appointmentRemindersEnabled: z.boolean().optional(),
    medicationRemindersEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Provide at least one field to update.",
  });
