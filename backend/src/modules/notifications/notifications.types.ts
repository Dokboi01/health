import type { AppRole } from "../../common/constants/roles";
import type { PaginatedResult } from "../../common/types/pagination";
import type { AppointmentRecord } from "../appointments/appointments.types";
import type { PrescriptionRecord } from "../prescriptions/prescriptions.types";

export type NotificationType =
  | "SYSTEM"
  | "APPOINTMENT_REMINDER"
  | "MEDICATION_REMINDER"
  | "APPOINTMENT_BOOKED"
  | "PRESCRIPTION_CREATED"
  | "PRESCRIPTION_UPDATED"
  | "PRESCRIPTION_STATUS_UPDATED";

export type NotificationChannel = "IN_APP" | "PUSH" | "EMAIL" | "SMS";
export type ReminderRelatedType = "APPOINTMENT" | "MEDICATION" | "GENERAL";
export type ReminderStatus = "PENDING" | "SENT" | "FAILED" | "CANCELLED";
export type DevicePlatform = "ANDROID" | "IOS" | "WEB";

export interface NotificationActorContext {
  userId: string;
  role: AppRole;
}

export interface NotificationListFilters {
  page: number;
  limit: number;
  isRead?: boolean;
  type?: NotificationType;
}

export interface ReminderListFilters {
  page: number;
  limit: number;
  status?: ReminderStatus;
  relatedType?: ReminderRelatedType;
  dateFrom?: string;
  dateTo?: string;
}

export interface ProcessDueRemindersInput {
  limit?: number;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface ReminderRecord {
  id: string;
  userId: string;
  relatedType: ReminderRelatedType;
  relatedId: string | null;
  title: string;
  message: string;
  scheduledFor: string;
  sentAt: string | null;
  status: ReminderStatus;
  channel: NotificationChannel;
  createdAt: string;
  updatedAt: string;
}

export interface DueReminderRecord extends ReminderRecord {}

export interface DeviceTokenRecord {
  id: string;
  userId: string;
  token: string;
  platform: DevicePlatform;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterDeviceTokenInput {
  token: string;
  platform: DevicePlatform;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushDispatchResult {
  skipped: boolean;
  reason?: string;
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}

export interface ReminderProcessingResult {
  requestedLimit: number;
  processedCount: number;
  failedCount: number;
  pushSuccessCount: number;
  pushFailureCount: number;
}

export interface NotificationsRepository {
  listNotifications(userId: string, filters: NotificationListFilters): Promise<PaginatedResult<NotificationRecord>>;
  getNotificationById(notificationId: string): Promise<NotificationRecord | null>;
  markNotificationRead(userId: string, notificationId: string): Promise<NotificationRecord | null>;
  markAllNotificationsRead(userId: string): Promise<number>;
  listReminders(userId: string, filters: ReminderListFilters): Promise<PaginatedResult<ReminderRecord>>;
  listDueReminders(limit: number, asOf: string): Promise<DueReminderRecord[]>;
  markReminderSent(reminderId: string): Promise<void>;
  markReminderFailed(reminderId: string): Promise<void>;
  createNotification(input: CreateNotificationInput): Promise<NotificationRecord>;
  upsertDeviceToken(userId: string, input: RegisterDeviceTokenInput): Promise<DeviceTokenRecord>;
  listDeviceTokens(userId: string): Promise<DeviceTokenRecord[]>;
  deactivateDeviceToken(userId: string, deviceTokenId: string): Promise<boolean>;
  listActiveDeviceTokens(userId: string): Promise<DeviceTokenRecord[]>;
  touchDeviceTokens(tokens: string[]): Promise<void>;
  deactivateDeviceTokensByValue(tokens: string[]): Promise<void>;
}

export interface FirebaseMessagingProvider {
  sendToTokens(tokens: string[], payload: PushNotificationPayload): Promise<PushDispatchResult>;
}

export interface AppointmentBookedNotificationInput {
  appointment: AppointmentRecord;
}

export interface PrescriptionUpdatedNotificationInput {
  prescription: PrescriptionRecord;
  changeType: "CREATED" | "UPDATED" | "STATUS_CHANGED";
}
