import type { PoolClient } from "pg";

import { runQuery } from "../../config/database";
import type { UpdateUserProfileInput, UserProfile, UsersRepository } from "./users.types";

type UserProfileRow = {
  id: string;
  email: string;
  role: UserProfile["role"];
  status: UserProfile["status"];
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  language_code: string;
  timezone: string;
  date_format: string;
  push_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  appointment_reminders_enabled: boolean;
  medication_reminders_enabled: boolean;
};

const mapUserProfile = (row: UserProfileRow): UserProfile => ({
  id: row.id,
  email: row.email,
  role: row.role,
  status: row.status,
  firstName: row.first_name,
  lastName: row.last_name,
  phone: row.phone,
  avatarUrl: row.avatar_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  settings: {
    languageCode: row.language_code,
    timezone: row.timezone,
    dateFormat: row.date_format,
    pushNotificationsEnabled: row.push_notifications_enabled,
    emailNotificationsEnabled: row.email_notifications_enabled,
    appointmentRemindersEnabled: row.appointment_reminders_enabled,
    medicationRemindersEnabled: row.medication_reminders_enabled,
  },
});

const getUserProfileById = async (userId: string): Promise<UserProfile | null> => {
  const result = await runQuery<UserProfileRow>(
    `
      SELECT
        u.id,
        u.email,
        u.role,
        u.status,
        u.first_name,
        u.last_name,
        u.phone,
        u.avatar_url,
        u.created_at::text AS created_at,
        u.updated_at::text AS updated_at,
        COALESCE(us.language_code, 'en') AS language_code,
        COALESCE(us.timezone, 'Africa/Lagos') AS timezone,
        COALESCE(us.date_format, 'dd/MM/yyyy') AS date_format,
        COALESCE(us.push_notifications_enabled, TRUE) AS push_notifications_enabled,
        COALESCE(us.email_notifications_enabled, FALSE) AS email_notifications_enabled,
        COALESCE(us.appointment_reminders_enabled, TRUE) AS appointment_reminders_enabled,
        COALESCE(us.medication_reminders_enabled, TRUE) AS medication_reminders_enabled
      FROM users u
      LEFT JOIN user_settings us ON us.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rowCount ? mapUserProfile(result.rows[0]) : null;
};

const ensureUserSettings = async (client: PoolClient, userId: string): Promise<void> => {
  await client.query(
    `
      INSERT INTO user_settings (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `,
    [userId],
  );
};

const updateUserProfile = async (client: PoolClient, userId: string, input: UpdateUserProfileInput): Promise<void> => {
  await ensureUserSettings(client, userId);

  await client.query(
    `
      UPDATE users
      SET
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        phone = COALESCE($4, phone),
        avatar_url = COALESCE($5, avatar_url)
      WHERE id = $1
    `,
    [userId, input.firstName ?? null, input.lastName ?? null, input.phone ?? null, input.avatarUrl ?? null],
  );

  await client.query(
    `
      UPDATE user_settings
      SET
        language_code = COALESCE($2, language_code),
        timezone = COALESCE($3, timezone),
        date_format = COALESCE($4, date_format),
        push_notifications_enabled = COALESCE($5, push_notifications_enabled),
        email_notifications_enabled = COALESCE($6, email_notifications_enabled),
        appointment_reminders_enabled = COALESCE($7, appointment_reminders_enabled),
        medication_reminders_enabled = COALESCE($8, medication_reminders_enabled)
      WHERE user_id = $1
    `,
    [
      userId,
      input.languageCode ?? null,
      input.timezone ?? null,
      input.dateFormat ?? null,
      input.pushNotificationsEnabled ?? null,
      input.emailNotificationsEnabled ?? null,
      input.appointmentRemindersEnabled ?? null,
      input.medicationRemindersEnabled ?? null,
    ],
  );
};

export const usersRepository: UsersRepository = {
  getUserProfileById,
  updateUserProfile,
};
