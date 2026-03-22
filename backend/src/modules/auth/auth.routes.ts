import { Router } from "express";

import { authenticate } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import {
  login as loginController,
  logout,
  me,
  refresh,
  registerDoctor,
  registerPatient,
} from "./auth.controller";
import {
  loginSchema,
  refreshTokenSchema,
  registerDoctorSchema,
  registerPatientSchema,
} from "./auth.schemas";

const router = Router();

router.post("/register/patient", validate({ body: registerPatientSchema }), registerPatient);
router.post("/register/doctor", validate({ body: registerDoctorSchema }), registerDoctor);
router.post("/login", validate({ body: loginSchema }), loginController);
router.post("/refresh", validate({ body: refreshTokenSchema }), refresh);
router.post("/logout", validate({ body: refreshTokenSchema }), logout);
router.get("/me", authenticate, me);

export const authRoutes = router;
