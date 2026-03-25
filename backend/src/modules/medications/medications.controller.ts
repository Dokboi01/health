import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import type { AppRole } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { asyncHandler } from "../../common/utils/async-handler";
import { medicationsService } from "./medications.service";

const requireActor = (req: Request): { userId: string; role: AppRole } => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication is required.", "UNAUTHORIZED");
  }

  return {
    userId: req.user.id,
    role: req.user.role,
  };
};

export const createMedication = asyncHandler(async (req: Request, res: Response) => {
  const data = await medicationsService.createMedication(requireActor(req), req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Medication created successfully.",
    data,
  });
});

export const listMedications = asyncHandler(async (req: Request, res: Response) => {
  const data = await medicationsService.listMedications(requireActor(req), req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const getMedicationById = asyncHandler(async (req: Request, res: Response) => {
  const { medicationId } = req.params as { medicationId: string };
  const data = await medicationsService.getMedicationById(requireActor(req), medicationId);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const updateMedication = asyncHandler(async (req: Request, res: Response) => {
  const { medicationId } = req.params as { medicationId: string };
  const data = await medicationsService.updateMedication(requireActor(req), medicationId, req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Medication updated successfully.",
    data,
  });
});

export const listMedicationSchedules = asyncHandler(async (req: Request, res: Response) => {
  const { medicationId } = req.params as { medicationId: string };
  const data = await medicationsService.listMedicationSchedules(requireActor(req), medicationId);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const replaceMedicationSchedules = asyncHandler(async (req: Request, res: Response) => {
  const { medicationId } = req.params as { medicationId: string };
  const data = await medicationsService.replaceMedicationSchedules(requireActor(req), medicationId, req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Medication schedules updated successfully.",
    data,
  });
});

export const createMedicationLog = asyncHandler(async (req: Request, res: Response) => {
  const { medicationId } = req.params as { medicationId: string };
  const data = await medicationsService.createMedicationLog(
    requireActor(req),
    medicationId,
    req.body,
  );

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Medication log created successfully.",
    data,
  });
});

export const markMedicationTaken = asyncHandler(async (req: Request, res: Response) => {
  const { medicationId } = req.params as { medicationId: string };
  const data = await medicationsService.markMedicationTaken(
    requireActor(req),
    medicationId,
    req.body,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Medication marked as taken successfully.",
    data,
  });
});

export const listMedicationLogs = asyncHandler(async (req: Request, res: Response) => {
  const { medicationId } = req.params as { medicationId: string };
  const data = await medicationsService.listMedicationLogs(
    requireActor(req),
    medicationId,
    req.query as never,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const getMedicationAdherence = asyncHandler(async (req: Request, res: Response) => {
  const { medicationId } = req.params as { medicationId: string };
  const data = await medicationsService.getMedicationAdherence(
    requireActor(req),
    medicationId,
    req.query as never,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});
