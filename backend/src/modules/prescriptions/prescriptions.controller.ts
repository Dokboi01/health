import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import type { AppRole } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { asyncHandler } from "../../common/utils/async-handler";
import { prescriptionsService } from "./prescriptions.service";

const requireActor = (req: Request): { userId: string; role: AppRole } => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication is required.", "UNAUTHORIZED");
  }

  return {
    userId: req.user.id,
    role: req.user.role,
  };
};

export const createPrescription = asyncHandler(async (req: Request, res: Response) => {
  const data = await prescriptionsService.createPrescription(requireActor(req), req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Prescription created successfully.",
    data,
  });
});

export const listPrescriptions = asyncHandler(async (req: Request, res: Response) => {
  const data = await prescriptionsService.listPrescriptions(requireActor(req), req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const getPrescriptionById = asyncHandler(async (req: Request, res: Response) => {
  const { prescriptionId } = req.params as { prescriptionId: string };
  const data = await prescriptionsService.getPrescriptionById(requireActor(req), prescriptionId);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const updatePrescription = asyncHandler(async (req: Request, res: Response) => {
  const { prescriptionId } = req.params as { prescriptionId: string };
  const data = await prescriptionsService.updatePrescription(
    requireActor(req),
    prescriptionId,
    req.body,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Prescription updated successfully.",
    data,
  });
});

export const updatePrescriptionStatus = asyncHandler(async (req: Request, res: Response) => {
  const { prescriptionId } = req.params as { prescriptionId: string };
  const data = await prescriptionsService.updatePrescriptionStatus(
    requireActor(req),
    prescriptionId,
    req.body,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Prescription status updated successfully.",
    data,
  });
});
