import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import type { AppRole } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { asyncHandler } from "../../common/utils/async-handler";
import { recordsService } from "./records.service";

const requireActor = (req: Request): { userId: string; role: AppRole } => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication is required.", "UNAUTHORIZED");
  }

  return {
    userId: req.user.id,
    role: req.user.role,
  };
};

export const createMedicalRecord = asyncHandler(async (req: Request, res: Response) => {
  const data = await recordsService.createMedicalRecord(requireActor(req), req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Medical record created successfully.",
    data,
  });
});

export const listMedicalRecords = asyncHandler(async (req: Request, res: Response) => {
  const data = await recordsService.listMedicalRecords(requireActor(req), req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data: data.items,
    meta: data.meta,
  });
});

export const getMedicalRecordById = asyncHandler(async (req: Request, res: Response) => {
  const data = await recordsService.getMedicalRecordById(requireActor(req), String(req.params.recordId));

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const updateMedicalRecord = asyncHandler(async (req: Request, res: Response) => {
  const data = await recordsService.updateMedicalRecord(requireActor(req), String(req.params.recordId), req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Medical record updated successfully.",
    data,
  });
});

export const addRecordVitals = asyncHandler(async (req: Request, res: Response) => {
  const data = await recordsService.addRecordVitals(requireActor(req), String(req.params.recordId), req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Vital signs recorded successfully.",
    data,
  });
});

export const addMedicalRecordFile = asyncHandler(async (req: Request, res: Response) => {
  const data = await recordsService.addMedicalRecordFile(requireActor(req), String(req.params.recordId), req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Medical record file attached successfully.",
    data,
  });
});

export const listPatientAllergies = asyncHandler(async (req: Request, res: Response) => {
  const data = await recordsService.listPatientAllergies(requireActor(req), String(req.params.patientId));

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const createPatientAllergy = asyncHandler(async (req: Request, res: Response) => {
  const data = await recordsService.createPatientAllergy(requireActor(req), String(req.params.patientId), req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Patient allergy recorded successfully.",
    data,
  });
});

export const updatePatientAllergy = asyncHandler(async (req: Request, res: Response) => {
  const data = await recordsService.updatePatientAllergy(requireActor(req), String(req.params.allergyId), req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Patient allergy updated successfully.",
    data,
  });
});
