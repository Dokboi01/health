import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../../common/errors/app-error";
import { asyncHandler } from "../../common/utils/async-handler";
import { usersService } from "./users.service";

const requireUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication is required.", "UNAUTHORIZED");
  }

  return req.user.id;
};

export const getMyUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = await usersService.getMyProfile(requireUserId(req));

  res.status(StatusCodes.OK).json({
    success: true,
    message: "User profile fetched successfully.",
    data,
  });
});

export const updateMyUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = await usersService.updateMyProfile(requireUserId(req), req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "User profile updated successfully.",
    data,
  });
});
