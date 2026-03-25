import { Router } from "express";

import { AppRole } from "../../common/constants/roles";
import { authenticate, authorize } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import {
  patientIdParamSchema,
  patientDoctorListQuerySchema,
  setPrimaryDoctorSchema,
  updatePatientProfileSchema,
} from "./patients.schemas";
import {
  getMyDoctors,
  getMyPatientProfile,
  getPatientDoctors,
  getPatientProfile,
  setMyPrimaryDoctor,
  setPatientPrimaryDoctor,
  setupMyPatientProfile,
  updateMyPatientProfile,
} from "./patients.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/me",
  authorize(AppRole.PATIENT),
  getMyPatientProfile,
);
router.post(
  "/me/setup",
  authorize(AppRole.PATIENT),
  validate({ body: updatePatientProfileSchema }),
  setupMyPatientProfile,
);
router.patch(
  "/me",
  authorize(AppRole.PATIENT),
  validate({ body: updatePatientProfileSchema }),
  updateMyPatientProfile,
);
router.get(
  "/me/doctors",
  authorize(AppRole.PATIENT),
  validate({ query: patientDoctorListQuerySchema }),
  getMyDoctors,
);
router.patch(
  "/me/primary-doctor",
  authorize(AppRole.PATIENT),
  validate({ body: setPrimaryDoctorSchema }),
  setMyPrimaryDoctor,
);
router.get(
  "/:patientId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ params: patientIdParamSchema }),
  getPatientProfile,
);
router.get(
  "/:patientId/doctors",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({
    params: patientIdParamSchema,
    query: patientDoctorListQuerySchema,
  }),
  getPatientDoctors,
);
router.patch(
  "/:patientId/primary-doctor",
  authorize(AppRole.ADMIN, AppRole.PATIENT),
  validate({
    params: patientIdParamSchema,
    body: setPrimaryDoctorSchema,
  }),
  setPatientPrimaryDoctor,
);

export const patientsRoutes = router;
