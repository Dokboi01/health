import type { AppRole } from "../constants/roles";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: AppRole;
      };
    }
  }
}

export {};

