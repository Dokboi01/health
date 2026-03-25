import { Router } from "express";

import { AppRole } from "../../common/constants/roles";
import { authenticate, authorize } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import {
  doctorDirectoryQuerySchema,
  doctorIdParamSchema,
  doctorPatientRelationshipParamsSchema,
  doctorPatientListQuerySchema,
  linkPatientSchema,
  patientIdParamSchema,
  updateDoctorPatientRelationshipSchema,
  updateDoctorProfileSchema,
} from "./doctors.schemas";
import {
  getDoctorById,
  getDoctorPatients,
  getMyDoctorProfile,
  getMyPatients,
  linkPatient,
  linkPatientToDoctor,
  listDoctors,
  setupMyDoctorProfile,
  unlinkPatientFromDoctor,
  updateMyDoctorProfile,
  updateDoctorPatientRelationship,
  updatePatientRelationship,
} from "./doctors.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/me",
  authorize(AppRole.DOCTOR),
  getMyDoctorProfile,
);
router.post(
  "/me/setup",
  authorize(AppRole.DOCTOR),
  validate({ body: updateDoctorProfileSchema }),
  setupMyDoctorProfile,
);
router.patch(
  "/me",
  authorize(AppRole.DOCTOR),
  validate({ body: updateDoctorProfileSchema }),
  updateMyDoctorProfile,
);
router.get(
  "/me/patients",
  authorize(AppRole.DOCTOR),
  validate({ query: doctorPatientListQuerySchema }),
  getMyPatients,
);
router.post(
  "/me/patients",
  authorize(AppRole.DOCTOR),
  validate({ body: linkPatientSchema }),
  linkPatient,
);
router.patch(
  "/me/patients/:patientId",
  authorize(AppRole.DOCTOR),
  validate({
    params: patientIdParamSchema,
    body: updateDoctorPatientRelationshipSchema,
  }),
  updatePatientRelationship,
);
router.get(
  "/",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ query: doctorDirectoryQuerySchema }),
  listDoctors,
);
router.get(
  "/:doctorId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ params: doctorIdParamSchema }),
  getDoctorById,
);
router.get(
  "/:doctorId/patients",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({
    params: doctorIdParamSchema,
    query: doctorPatientListQuerySchema,
  }),
  getDoctorPatients,
);
router.post(
  "/:doctorId/patients",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({
    params: doctorIdParamSchema,
    body: linkPatientSchema,
  }),
  linkPatientToDoctor,
);
router.patch(
  "/:doctorId/patients/:patientId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({
    params: doctorPatientRelationshipParamsSchema,
    body: updateDoctorPatientRelationshipSchema,
  }),
  updateDoctorPatientRelationship,
);
router.delete(
  "/:doctorId/patients/:patientId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({ params: doctorPatientRelationshipParamsSchema }),
  unlinkPatientFromDoctor,
);

export const doctorsRoutes = router;
