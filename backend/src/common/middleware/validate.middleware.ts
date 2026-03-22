import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ZodType } from "zod";

import { AppError } from "../errors/app-error";

type ValidationSchemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export const validate =
  (schemas: ValidationSchemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const failures: Array<{ source: string; issues: unknown }> = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (result.success) {
        req.body = result.data;
      } else {
        failures.push({ source: "body", issues: result.error.issues });
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (result.success) {
        req.params = result.data as Request["params"];
      } else {
        failures.push({ source: "params", issues: result.error.issues });
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (result.success) {
        req.query = result.data as Request["query"];
      } else {
        failures.push({ source: "query", issues: result.error.issues });
      }
    }

    if (failures.length > 0) {
      next(
        new AppError(
          StatusCodes.UNPROCESSABLE_ENTITY,
          "Request validation failed.",
          "VALIDATION_ERROR",
          failures,
        ),
      );
      return;
    }

    next();
  };

