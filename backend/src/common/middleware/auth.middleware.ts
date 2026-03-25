import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { env } from "../../config/env";
import { AppResource, PermissionAction, hasPermission, type PermissionScope } from "../constants/permissions";
import { AppRole, AuthTokenType } from "../constants/roles";
import { AppError } from "../errors/app-error";

type AccessTokenPayload = JwtPayload & {
  email: string;
  role: AppRole;
  type: AuthTokenType;
  sub: string;
};

const extractBearerToken = (authorizationHeader?: string): string => {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Missing or invalid authorization header.", "UNAUTHORIZED");
  }

  return authorizationHeader.replace("Bearer ", "").trim();
};

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    if (payload.type !== AuthTokenType.ACCESS || !payload.sub || !payload.role) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid access token.", "UNAUTHORIZED");
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize =
  (...allowedRoles: AppRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(StatusCodes.UNAUTHORIZED, "Authentication is required.", "UNAUTHORIZED"));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError(StatusCodes.FORBIDDEN, "You do not have permission to access this resource.", "FORBIDDEN"));
      return;
    }

    next();
  };

export const authorizePermission =
  (
    resource: AppResource,
    action: PermissionAction,
    scope: Exclude<PermissionScope, "none"> = "all",
  ) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(StatusCodes.UNAUTHORIZED, "Authentication is required.", "UNAUTHORIZED"));
      return;
    }

    if (!hasPermission({ role: req.user.role, resource, action, scope })) {
      next(
        new AppError(
          StatusCodes.FORBIDDEN,
          "You do not have permission to perform this action.",
          "FORBIDDEN",
        ),
      );
      return;
    }

    next();
  };
