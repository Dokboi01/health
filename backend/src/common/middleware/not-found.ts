import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../errors/app-error";

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(
    new AppError(
      StatusCodes.NOT_FOUND,
      `Route ${req.method} ${req.originalUrl} was not found.`,
      "ROUTE_NOT_FOUND",
    ),
  );
};

