import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { ZodError } from "zod";

import { AppError } from "../errors/app-error";

type PostgresError = Error & {
  code?: string;
  detail?: string;
};

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: error.message,
      },
    });
    return;
  }

  const postgresError = error as PostgresError;

  if (postgresError.code === "23505") {
    res.status(StatusCodes.CONFLICT).json({
      success: false,
      error: {
        code: "DUPLICATE_RESOURCE",
        message: postgresError.detail ?? "A unique constraint was violated.",
      },
    });
    return;
  }

  console.error(error);

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong on the server.",
    },
  });
};

