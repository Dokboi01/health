import { StatusCodes } from "http-status-codes";

import { AppRole } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { firebaseMessagingProvider } from "./fcm.provider";
import { notificationsRepository } from "./notifications.repository";
import type {
  AppointmentBookedNotificationInput,
  CreateNotificationInput,
  NotificationActorContext,
  NotificationListFilters,
  NotificationRecord,
  PrescriptionUpdatedNotificationInput,
  ProcessDueRemindersInput,
  PushNotificationPayload,
  RegisterDeviceTokenInput,
  ReminderListFilters,
  ReminderProcessingResult,
} from "./notifications.types";

const reminderTypeToNotificationType = (relatedType: "APPOINTMENT" | "MEDICATION" | "GENERAL") => {
  if (relatedType === "APPOINTMENT") {
    return "APPOINTMENT_REMINDER" as const;
  }

  if (relatedType === "MEDICATION") {
    return "MEDICATION_REMINDER" as const;
  }

  return "SYSTEM" as const;
};

const serializePushData = (data?: Record<string, unknown>): Record<string, string> | undefined => {
  if (!data) {
    return undefined;
  }

  const entries = Object.entries(data).flatMap(([key, value]) => {
    if (value === undefined || value === null) {
      return [];
    }

    if (typeof value === "string") {
      return [[key, value] as const];
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return [[key, String(value)] as const];
    }

    return [[key, JSON.stringify(value)] as const];
  });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const dispatchPushIfPossible = async (
  userId: string,
  payload: PushNotificationPayload,
): Promise<{ successCount: number; failureCount: number }> => {
  const deviceTokens = await notificationsRepository.listActiveDeviceTokens(userId);

  if (deviceTokens.length === 0) {
    return {
      successCount: 0,
      failureCount: 0,
    };
  }

  const result = await firebaseMessagingProvider.sendToTokens(
    deviceTokens.map((token) => token.token),
    payload,
  );

  if (result.invalidTokens.length > 0) {
    await notificationsRepository.deactivateDeviceTokensByValue(result.invalidTokens);
  }

  if (!result.skipped) {
    await notificationsRepository.touchDeviceTokens(deviceTokens.map((token) => token.token));
  }

  return {
    successCount: result.successCount,
    failureCount: result.failureCount,
  };
};

const createAndDispatchNotification = async (
  input: CreateNotificationInput,
): Promise<{ notification: NotificationRecord; pushSuccessCount: number; pushFailureCount: number }> => {
  const notification = await notificationsRepository.createNotification(input);
  const pushResult = await dispatchPushIfPossible(input.userId, {
    title: input.title,
    body: input.body,
    data: serializePushData({
      notificationId: notification.id,
      type: input.type,
      ...(input.data ?? {}),
    }),
  });

  return {
    notification,
    pushSuccessCount: pushResult.successCount,
    pushFailureCount: pushResult.failureCount,
  };
};

const getNotificationByIdForActor = async (actor: NotificationActorContext, notificationId: string) => {
  const notification = await notificationsRepository.getNotificationById(notificationId);

  if (!notification || notification.userId !== actor.userId) {
    throw new AppError(StatusCodes.NOT_FOUND, "Notification was not found.", "NOTIFICATION_NOT_FOUND");
  }

  return notification;
};

const listMyNotifications = async (actor: NotificationActorContext, filters: NotificationListFilters) =>
  notificationsRepository.listNotifications(actor.userId, filters);

const getMyNotificationById = async (actor: NotificationActorContext, notificationId: string) =>
  getNotificationByIdForActor(actor, notificationId);

const markMyNotificationRead = async (actor: NotificationActorContext, notificationId: string) => {
  const notification = await notificationsRepository.markNotificationRead(actor.userId, notificationId);

  if (!notification) {
    throw new AppError(StatusCodes.NOT_FOUND, "Notification was not found.", "NOTIFICATION_NOT_FOUND");
  }

  return notification;
};

const markAllMyNotificationsRead = async (actor: NotificationActorContext) =>
  notificationsRepository.markAllNotificationsRead(actor.userId);

const listMyReminders = async (actor: NotificationActorContext, filters: ReminderListFilters) =>
  notificationsRepository.listReminders(actor.userId, filters);

const registerDeviceToken = async (actor: NotificationActorContext, input: RegisterDeviceTokenInput) =>
  notificationsRepository.upsertDeviceToken(actor.userId, input);

const listMyDeviceTokens = async (actor: NotificationActorContext) =>
  notificationsRepository.listDeviceTokens(actor.userId);

const deactivateMyDeviceToken = async (actor: NotificationActorContext, deviceTokenId: string) => {
  const deactivated = await notificationsRepository.deactivateDeviceToken(actor.userId, deviceTokenId);

  if (!deactivated) {
    throw new AppError(StatusCodes.NOT_FOUND, "Device token was not found.", "DEVICE_TOKEN_NOT_FOUND");
  }
};

const processDueReminders = async (input: ProcessDueRemindersInput = {}): Promise<ReminderProcessingResult> => {
  const limit = input.limit ?? env.REMINDER_DISPATCH_BATCH_SIZE;
  const reminders = await notificationsRepository.listDueReminders(limit, new Date().toISOString());
  const result: ReminderProcessingResult = {
    requestedLimit: limit,
    processedCount: 0,
    failedCount: 0,
    pushSuccessCount: 0,
    pushFailureCount: 0,
  };

  for (const reminder of reminders) {
    try {
      const notificationType = reminderTypeToNotificationType(reminder.relatedType);
      const delivery = await createAndDispatchNotification({
        userId: reminder.userId,
        type: notificationType,
        title: reminder.title,
        body: reminder.message,
        data: {
          reminderId: reminder.id,
          relatedType: reminder.relatedType,
          relatedId: reminder.relatedId,
          scheduledFor: reminder.scheduledFor,
          channel: reminder.channel,
        },
      });

      await notificationsRepository.markReminderSent(reminder.id);
      result.processedCount += 1;
      result.pushSuccessCount += delivery.pushSuccessCount;
      result.pushFailureCount += delivery.pushFailureCount;
    } catch (error) {
      result.failedCount += 1;
      await notificationsRepository.markReminderFailed(reminder.id);
      logger.warn("Reminder dispatch failed.", {
        reminderId: reminder.id,
        error,
      });
    }
  }

  return result;
};

const notifyDoctorOnNewBooking = async ({ appointment }: AppointmentBookedNotificationInput): Promise<void> => {
  if (appointment.bookedByUserId && appointment.bookedByUserId === appointment.doctor.userId) {
    return;
  }

  try {
    await createAndDispatchNotification({
      userId: appointment.doctor.userId,
      type: "APPOINTMENT_BOOKED",
      title: "New appointment booking",
      body: `${appointment.patient.firstName} ${appointment.patient.lastName} booked an appointment for ${appointment.scheduledStart}.`,
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        scheduledStart: appointment.scheduledStart,
        appointmentType: appointment.appointmentType,
      },
    });
  } catch (error) {
    logger.warn("Failed to notify doctor about new booking.", {
      appointmentId: appointment.id,
      error,
    });
  }
};

const notifyPatientOnPrescriptionUpdate = async ({
  prescription,
  changeType,
}: PrescriptionUpdatedNotificationInput): Promise<void> => {
  const type =
    changeType === "CREATED"
      ? "PRESCRIPTION_CREATED"
      : changeType === "STATUS_CHANGED"
        ? "PRESCRIPTION_STATUS_UPDATED"
        : "PRESCRIPTION_UPDATED";
  const actionLabel =
    changeType === "CREATED" ? "created" : changeType === "STATUS_CHANGED" ? "status changed" : "updated";

  try {
    await createAndDispatchNotification({
      userId: prescription.patient.userId,
      type,
      title: "Prescription update",
      body: `Your prescription has been ${actionLabel} by Dr. ${prescription.doctor.lastName}.`,
      data: {
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        doctorId: prescription.doctorId,
        status: prescription.status,
        itemCount: prescription.items.length,
        changeType,
      },
    });
  } catch (error) {
    logger.warn("Failed to notify patient about prescription update.", {
      prescriptionId: prescription.id,
      error,
    });
  }
};

export const notificationsService = {
  listMyNotifications,
  getMyNotificationById,
  markMyNotificationRead,
  markAllMyNotificationsRead,
  listMyReminders,
  registerDeviceToken,
  listMyDeviceTokens,
  deactivateMyDeviceToken,
  processDueReminders,
  notifyDoctorOnNewBooking,
  notifyPatientOnPrescriptionUpdate,
};
