import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../../common/errors/app-error";
import { asyncHandler } from "../../common/utils/async-handler";
import { doctorsService } from "../doctors/doctors.service";
import { patientsService } from "../patients/patients.service";

const requireUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication is required.", "UNAUTHORIZED");
  }

  return req.user.id;
};

export const searchPatients = asyncHandler(async (req: Request, res: Response) => {
  const data = await doctorsService.searchPatients(requireUserId(req), req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

export const searchDoctors = asyncHandler(async (req: Request, res: Response) => {
  const data = await patientsService.searchDoctors(requireUserId(req), req.query as never);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

