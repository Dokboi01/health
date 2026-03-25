import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import type { AppRole } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { asyncHandler } from "../../common/utils/async-handler";
import { notificationsService } from "./notifications.service";

const requireActor = (req: Request): { userId: string; role: AppRole } => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication is required.", "UNAUTHORIZED");
  }

  return {
    userId: req.user.id,
    role: req.user.role,
  };
};

export const listMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationsService.listMyNotifications(requireActor(req), req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data: data.items,
    meta: data.meta,
  });
});

export const getMyNotificationById = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationsService.getMyNotificationById(requireActor(req), String(req.params.notificationId));

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const markMyNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationsService.markMyNotificationRead(requireActor(req), String(req.params.notificationId));

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Notification marked as read.",
    data,
  });
});

export const markAllMyNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  const updatedCount = await notificationsService.markAllMyNotificationsRead(requireActor(req));

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Notifications marked as read.",
    data: {
      updatedCount,
    },
  });
});

export const listMyReminders = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationsService.listMyReminders(requireActor(req), req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data: data.items,
    meta: data.meta,
  });
});

export const registerDeviceToken = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationsService.registerDeviceToken(requireActor(req), req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Device token registered successfully.",
    data,
  });
});

export const listMyDeviceTokens = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationsService.listMyDeviceTokens(requireActor(req));

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const deactivateMyDeviceToken = asyncHandler(async (req: Request, res: Response) => {
  await notificationsService.deactivateMyDeviceToken(requireActor(req), String(req.params.deviceTokenId));

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Device token deactivated successfully.",
  });
});

export const processDueReminders = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationsService.processDueReminders(req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Reminder dispatch completed.",
    data,
  });
});
