import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../../common/errors/app-error";
import { asyncHandler } from "../../common/utils/async-handler";
import { authService } from "./auth.service";

const getRequestMetadata = (req: Request) => ({
  deviceIp: req.ip,
  deviceName: req.header("x-device-name") ?? undefined,
  userAgent: req.header("user-agent") ?? undefined,
});

export const registerPatient = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.registerPatient(req.body, getRequestMetadata(req));

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Patient account created successfully.",
    data,
  });
});

export const registerDoctor = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.registerDoctor(req.body, getRequestMetadata(req));

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Doctor account created successfully.",
    data,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.login(req.body, getRequestMetadata(req));

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Login successful.",
    data,
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.refresh(req.body.refreshToken, getRequestMetadata(req));

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Session refreshed successfully.",
    data,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.body.refreshToken);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Logout successful.",
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication is required.", "UNAUTHORIZED");
  }

  const data = await authService.getCurrentUser(req.user.id);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
});

