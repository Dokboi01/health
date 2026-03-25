import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import type { AppRole } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { asyncHandler } from "../../common/utils/async-handler";
import { patientsService } from "./patients.service";

const requireActor = (req: Request): { userId: string; role: AppRole } => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication is required.", "UNAUTHORIZED");
  }

  return {
    userId: req.user.id,
    role: req.user.role,
  };
};

export const getMyPatientProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = await patientsService.getMyProfile(requireActor(req).userId);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const getPatientProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = await patientsService.getPatientById(requireActor(req), String(req.params.patientId));

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const updateMyPatientProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = await patientsService.updateMyProfile(requireActor(req).userId, req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Patient profile updated successfully.",
    data,
  });
});

export const setupMyPatientProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = await patientsService.setupMyProfile(requireActor(req).userId, req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Patient profile setup completed successfully.",
    data,
  });
});

export const getMyDoctors = asyncHandler(async (req: Request, res: Response) => {
  const data = await patientsService.getMyDoctors(requireActor(req).userId, req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const getPatientDoctors = asyncHandler(async (req: Request, res: Response) => {
  const data = await patientsService.getPatientDoctors(requireActor(req), String(req.params.patientId), req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const setMyPrimaryDoctor = asyncHandler(async (req: Request, res: Response) => {
  const data = await patientsService.setPrimaryDoctor(requireActor(req).userId, req.body.doctorId);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Primary doctor updated successfully.",
    data,
  });
});

export const setPatientPrimaryDoctor = asyncHandler(async (req: Request, res: Response) => {
  const data = await patientsService.setPrimaryDoctorForPatient(
    requireActor(req),
    String(req.params.patientId),
    req.body.doctorId,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Primary doctor updated successfully.",
    data,
  });
});

export const searchDoctors = asyncHandler(async (req: Request, res: Response) => {
  const data = await patientsService.searchDoctors(requireActor(req).userId, req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});
