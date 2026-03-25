import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import type { AppRole } from "../../common/constants/roles";
import { AppError } from "../../common/errors/app-error";
import { asyncHandler } from "../../common/utils/async-handler";
import { doctorsService } from "./doctors.service";

const requireActor = (req: Request): { userId: string; role: AppRole } => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication is required.", "UNAUTHORIZED");
  }

  return {
    userId: req.user.id,
    role: req.user.role,
  };
};

export const getMyDoctorProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = await doctorsService.getMyProfile(requireActor(req).userId);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const listDoctors = asyncHandler(async (req: Request, res: Response) => {
  const data = await doctorsService.listDoctors(req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const getDoctorById = asyncHandler(async (req: Request, res: Response) => {
  const data = await doctorsService.getDoctorById(String(req.params.doctorId));

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const updateMyDoctorProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = await doctorsService.updateMyProfile(requireActor(req).userId, req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Doctor profile updated successfully.",
    data,
  });
});

export const setupMyDoctorProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = await doctorsService.setupMyProfile(requireActor(req).userId, req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Doctor profile setup completed successfully.",
    data,
  });
});

export const getMyPatients = asyncHandler(async (req: Request, res: Response) => {
  const data = await doctorsService.getMyPatients(requireActor(req).userId, req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const getDoctorPatients = asyncHandler(async (req: Request, res: Response) => {
  const data = await doctorsService.getDoctorPatients(requireActor(req), String(req.params.doctorId), req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const linkPatient = asyncHandler(async (req: Request, res: Response) => {
  const data = await doctorsService.linkPatient(requireActor(req).userId, req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Patient linked successfully.",
    data,
  });
});

export const linkPatientToDoctor = asyncHandler(async (req: Request, res: Response) => {
  const data = await doctorsService.linkPatientForDoctor(requireActor(req), String(req.params.doctorId), req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Patient linked successfully.",
    data,
  });
});

export const updatePatientRelationship = asyncHandler(async (req: Request, res: Response) => {
  const data = await doctorsService.updatePatientRelationship(
    requireActor(req).userId,
    String(req.params.patientId),
    req.body,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Doctor-patient relationship updated successfully.",
    data,
  });
});

export const updateDoctorPatientRelationship = asyncHandler(async (req: Request, res: Response) => {
  const data = await doctorsService.updatePatientRelationshipForDoctor(
    requireActor(req),
    String(req.params.doctorId),
    String(req.params.patientId),
    req.body,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Doctor-patient relationship updated successfully.",
    data,
  });
});

export const unlinkPatientFromDoctor = asyncHandler(async (req: Request, res: Response) => {
  await doctorsService.unlinkPatientRelationship(requireActor(req), String(req.params.doctorId), String(req.params.patientId));

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Doctor-patient relationship archived successfully.",
  });
});

export const searchPatients = asyncHandler(async (req: Request, res: Response) => {
  const data = await doctorsService.searchPatients(requireActor(req).userId, req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});
