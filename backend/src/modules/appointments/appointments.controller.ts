import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import type { AppRole } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { asyncHandler } from "../../common/utils/async-handler";
import { appointmentsService } from "./appointments.service";

const requireActor = (req: Request): { userId: string; role: AppRole } => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication is required.", "UNAUTHORIZED");
  }

  return {
    userId: req.user.id,
    role: req.user.role,
  };
};

export const getMyAvailability = asyncHandler(async (req: Request, res: Response) => {
  const data = await appointmentsService.getMyAvailability(requireActor(req));

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const replaceMyAvailability = asyncHandler(async (req: Request, res: Response) => {
  const data = await appointmentsService.replaceMyAvailability(requireActor(req), req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Doctor availability updated successfully.",
    data,
  });
});

export const getAvailableSlots = asyncHandler(async (req: Request, res: Response) => {
  const data = await appointmentsService.getAvailableSlots(req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const data = await appointmentsService.createAppointment(requireActor(req), req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Appointment created successfully.",
    data,
  });
});

export const listAppointments = asyncHandler(async (req: Request, res: Response) => {
  const data = await appointmentsService.listAppointments(requireActor(req), req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const getAppointmentById = asyncHandler(async (req: Request, res: Response) => {
  const data = await appointmentsService.getAppointmentById(requireActor(req), String(req.params.appointmentId));

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const updateAppointment = asyncHandler(async (req: Request, res: Response) => {
  const data = await appointmentsService.updateAppointment(
    requireActor(req),
    String(req.params.appointmentId),
    req.body,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Appointment updated successfully.",
    data,
  });
});

export const updateAppointmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const data = await appointmentsService.updateAppointmentStatus(
    requireActor(req),
    String(req.params.appointmentId),
    req.body,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Appointment status updated successfully.",
    data,
  });
});

export const acceptAppointment = asyncHandler(async (req: Request, res: Response) => {
  const data = await appointmentsService.acceptAppointment(requireActor(req), String(req.params.appointmentId));

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Appointment accepted successfully.",
    data,
  });
});

export const rejectAppointment = asyncHandler(async (req: Request, res: Response) => {
  const data = await appointmentsService.rejectAppointment(
    requireActor(req),
    String(req.params.appointmentId),
    req.body,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Appointment rejected successfully.",
    data,
  });
});

export const rescheduleAppointment = asyncHandler(async (req: Request, res: Response) => {
  const data = await appointmentsService.rescheduleAppointment(
    requireActor(req),
    String(req.params.appointmentId),
    req.body,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Appointment rescheduled successfully.",
    data,
  });
});
