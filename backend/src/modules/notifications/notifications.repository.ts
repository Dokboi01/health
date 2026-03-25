import type { PaginatedResult } from "../../common/types/pagination";
import { createPaginationMeta } from "../../common/utils/pagination";
import { runQuery } from "../../config/database";
import type {
  CreateNotificationInput,
  DeviceTokenRecord,
  DueReminderRecord,
  NotificationListFilters,
  NotificationRecord,
  NotificationsRepository,
  RegisterDeviceTokenInput,
  ReminderListFilters,
  ReminderRecord,
} from "./notifications.types";

type NotificationRow = {
  total_count?: string;
  id: string;
  user_id: string;
  type: NotificationRecord["type"];
  title: string;
  body: string;
  data: unknown;
  read_at: string | null;
  created_at: string;
};

type ReminderRow = {
  total_count?: string;
  id: string;
  user_id: string;
  related_type: ReminderRecord["relatedType"];
  related_id: string | null;
  title: string;
  message: string;
  scheduled_for: string;
  sent_at: string | null;
  status: ReminderRecord["status"];
  channel: ReminderRecord["channel"];
  created_at: string;
  updated_at: string;
};

type DeviceTokenRow = {
  id: string;
  user_id: string;
  token: string;
  platform: DeviceTokenRecord["platform"];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

const mapJsonObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
};

const mapNotificationRecord = (row: NotificationRow): NotificationRecord => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  title: row.title,
  body: row.body,
  data: mapJsonObject(row.data),
  readAt: row.read_at,
  createdAt: row.created_at,
});

const mapReminderRecord = (row: ReminderRow): ReminderRecord => ({
  id: row.id,
  userId: row.user_id,
  relatedType: row.related_type,
  relatedId: row.related_id,
  title: row.title,
  message: row.message,
  scheduledFor: row.scheduled_for,
  sentAt: row.sent_at,
  status: row.status,
  channel: row.channel,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapDeviceTokenRecord = (row: DeviceTokenRow): DeviceTokenRecord => ({
  id: row.id,
  userId: row.user_id,
  token: row.token,
  platform: row.platform,
  isActive: row.is_active,
  lastUsedAt: row.last_used_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const createEmptyResult = <T>(page: number, limit: number): PaginatedResult<T> => ({
  items: [],
  meta: createPaginationMeta({
    page,
    limit,
    total: 0,
  }),
});

const listNotifications = async (
  userId: string,
  filters: NotificationListFilters,
): Promise<PaginatedResult<NotificationRecord>> => {
  const values: unknown[] = [userId];
  const whereClauses = ["user_id = $1"];
  const offset = (filters.page - 1) * filters.limit;

  if (typeof filters.isRead === "boolean") {
    whereClauses.push(filters.isRead ? "read_at IS NOT NULL" : "read_at IS NULL");
  }

  if (filters.type) {
    values.push(filters.type);
    whereClauses.push(`type = $${values.length}`);
  }

  values.push(filters.limit, offset);

  const result = await runQuery<NotificationRow>(
    `
      SELECT
        id,
        user_id,
        type,
        title,
        body,
        data,
        read_at::text AS read_at,
        created_at::text AS created_at,
        COUNT(*) OVER()::text AS total_count
      FROM notifications
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values,
  );

  if (!result.rowCount) {
    return createEmptyResult(filters.page, filters.limit);
  }

  return {
    items: result.rows.map(mapNotificationRecord),
    meta: createPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      total: Number(result.rows[0].total_count ?? 0),
    }),
  };
};

const getNotificationById = async (notificationId: string): Promise<NotificationRecord | null> => {
  const result = await runQuery<NotificationRow>(
    `
      SELECT
        id,
        user_id,
        type,
        title,
        body,
        data,
        read_at::text AS read_at,
        created_at::text AS created_at
      FROM notifications
      WHERE id = $1
      LIMIT 1
    `,
    [notificationId],
  );

  return result.rowCount ? mapNotificationRecord(result.rows[0]) : null;
};

const markNotificationRead = async (userId: string, notificationId: string): Promise<NotificationRecord | null> => {
  const result = await runQuery<{ id: string }>(
    `
      UPDATE notifications
      SET read_at = COALESCE(read_at, NOW())
      WHERE id = $1
        AND user_id = $2
      RETURNING id
    `,
    [notificationId, userId],
  );

  return result.rowCount ? getNotificationById(result.rows[0].id) : null;
};

const markAllNotificationsRead = async (userId: string): Promise<number> => {
  const result = await runQuery(
    `
      UPDATE notifications
      SET read_at = NOW()
      WHERE user_id = $1
        AND read_at IS NULL
    `,
    [userId],
  );

  return Number(result.rowCount ?? 0);
};

const listReminders = async (userId: string, filters: ReminderListFilters): Promise<PaginatedResult<ReminderRecord>> => {
  const values: unknown[] = [userId];
  const whereClauses = ["user_id = $1"];
  const offset = (filters.page - 1) * filters.limit;

  if (filters.status) {
    values.push(filters.status);
    whereClauses.push(`status = $${values.length}::reminder_status`);
  }

  if (filters.relatedType) {
    values.push(filters.relatedType);
    whereClauses.push(`related_type = $${values.length}::reminder_related_type`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    whereClauses.push(`scheduled_for::date >= $${values.length}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    whereClauses.push(`scheduled_for::date <= $${values.length}::date`);
  }

  values.push(filters.limit, offset);

  const result = await runQuery<ReminderRow>(
    `
      SELECT
        id,
        user_id,
        related_type,
        related_id,
        title,
        message,
        scheduled_for::text AS scheduled_for,
        sent_at::text AS sent_at,
        status,
        channel,
        created_at::text AS created_at,
        updated_at::text AS updated_at,
        COUNT(*) OVER()::text AS total_count
      FROM reminders
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY scheduled_for DESC, created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values,
  );

  if (!result.rowCount) {
    return createEmptyResult(filters.page, filters.limit);
  }

  return {
    items: result.rows.map(mapReminderRecord),
    meta: createPaginationMeta({
      page: filters.page,
      limit: filters.limit,
      total: Number(result.rows[0].total_count ?? 0),
    }),
  };
};

const listDueReminders = async (limit: number, asOf: string): Promise<DueReminderRecord[]> => {
  const result = await runQuery<ReminderRow>(
    `
      SELECT
        id,
        user_id,
        related_type,
        related_id,
        title,
        message,
        scheduled_for::text AS scheduled_for,
        sent_at::text AS sent_at,
        status,
        channel,
        created_at::text AS created_at,
        updated_at::text AS updated_at
      FROM reminders
      WHERE status = 'PENDING'
        AND scheduled_for <= $1::timestamptz
      ORDER BY scheduled_for ASC, created_at ASC
      LIMIT $2
    `,
    [asOf, limit],
  );

  return result.rows.map(mapReminderRecord);
};

const markReminderSent = async (reminderId: string): Promise<void> => {
  await runQuery(
    `
      UPDATE reminders
      SET
        status = 'SENT',
        sent_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `,
    [reminderId],
  );
};

const markReminderFailed = async (reminderId: string): Promise<void> => {
  await runQuery(
    `
      UPDATE reminders
      SET
        status = 'FAILED',
        updated_at = NOW()
      WHERE id = $1
    `,
    [reminderId],
  );
};

const createNotification = async (input: CreateNotificationInput): Promise<NotificationRecord> => {
  const result = await runQuery<NotificationRow>(
    `
      INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        data
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING
        id,
        user_id,
        type,
        title,
        body,
        data,
        read_at::text AS read_at,
        created_at::text AS created_at
    `,
    [input.userId, input.type, input.title, input.body, JSON.stringify(input.data ?? {})],
  );

  return mapNotificationRecord(result.rows[0]);
};

const upsertDeviceToken = async (userId: string, input: RegisterDeviceTokenInput): Promise<DeviceTokenRecord> => {
  const result = await runQuery<DeviceTokenRow>(
    `
      INSERT INTO device_tokens (
        user_id,
        token,
        platform,
        is_active,
        last_used_at
      )
      VALUES ($1, $2, $3::device_platform, TRUE, NOW())
      ON CONFLICT (token)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        is_active = TRUE,
        last_used_at = NOW()
      RETURNING
        id,
        user_id,
        token,
        platform,
        is_active,
        last_used_at::text AS last_used_at,
        created_at::text AS created_at,
        updated_at::text AS updated_at
    `,
    [userId, input.token, input.platform],
  );

  return mapDeviceTokenRecord(result.rows[0]);
};

const listDeviceTokens = async (userId: string): Promise<DeviceTokenRecord[]> => {
  const result = await runQuery<DeviceTokenRow>(
    `
      SELECT
        id,
        user_id,
        token,
        platform,
        is_active,
        last_used_at::text AS last_used_at,
        created_at::text AS created_at,
        updated_at::text AS updated_at
      FROM device_tokens
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId],
  );

  return result.rows.map(mapDeviceTokenRecord);
};

const deactivateDeviceToken = async (userId: string, deviceTokenId: string): Promise<boolean> => {
  const result = await runQuery<{ id: string }>(
    `
      UPDATE device_tokens
      SET
        is_active = FALSE,
        updated_at = NOW()
      WHERE id = $1
        AND user_id = $2
      RETURNING id
    `,
    [deviceTokenId, userId],
  );

  return Boolean(result.rowCount);
};

const listActiveDeviceTokens = async (userId: string): Promise<DeviceTokenRecord[]> => {
  const result = await runQuery<DeviceTokenRow>(
    `
      SELECT
        id,
        user_id,
        token,
        platform,
        is_active,
        last_used_at::text AS last_used_at,
        created_at::text AS created_at,
        updated_at::text AS updated_at
      FROM device_tokens
      WHERE user_id = $1
        AND is_active = TRUE
      ORDER BY created_at DESC
    `,
    [userId],
  );

  return result.rows.map(mapDeviceTokenRecord);
};

const touchDeviceTokens = async (tokens: string[]): Promise<void> => {
  if (tokens.length === 0) {
    return;
  }

  await runQuery(
    `
      UPDATE device_tokens
      SET
        last_used_at = NOW(),
        updated_at = NOW()
      WHERE token = ANY($1::text[])
    `,
    [tokens],
  );
};

const deactivateDeviceTokensByValue = async (tokens: string[]): Promise<void> => {
  if (tokens.length === 0) {
    return;
  }

  await runQuery(
    `
      UPDATE device_tokens
      SET
        is_active = FALSE,
        updated_at = NOW()
      WHERE token = ANY($1::text[])
    `,
    [tokens],
  );
};

export const notificationsRepository: NotificationsRepository = {
  listNotifications,
  getNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
  listReminders,
  listDueReminders,
  markReminderSent,
  markReminderFailed,
  createNotification,
  upsertDeviceToken,
  listDeviceTokens,
  deactivateDeviceToken,
  listActiveDeviceTokens,
  touchDeviceTokens,
  deactivateDeviceTokensByValue,
};
