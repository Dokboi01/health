import { Router } from "express";

import { AppRole } from "../../common/constants/roles";
import { authenticate, authorize } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import {
  allergyIdParamSchema,
  createMedicalRecordFileSchema,
  createMedicalRecordSchema,
  createPatientAllergySchema,
  createRecordVitalSchema,
  medicalRecordListQuerySchema,
  patientIdParamSchema,
  recordIdParamSchema,
  updateMedicalRecordSchema,
  updatePatientAllergySchema,
} from "./records.schemas";
import {
  addMedicalRecordFile,
  addRecordVitals,
  createMedicalRecord,
  createPatientAllergy,
  getMedicalRecordById,
  listMedicalRecords,
  listPatientAllergies,
  updateMedicalRecord,
  updatePatientAllergy,
} from "./records.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/patients/:patientId/allergies",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ params: patientIdParamSchema }),
  listPatientAllergies,
);
router.post(
  "/patients/:patientId/allergies",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({
    params: patientIdParamSchema,
    body: createPatientAllergySchema,
  }),
  createPatientAllergy,
);
router.patch(
  "/allergies/:allergyId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({
    params: allergyIdParamSchema,
    body: updatePatientAllergySchema,
  }),
  updatePatientAllergy,
);
router.post(
  "/",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({ body: createMedicalRecordSchema }),
  createMedicalRecord,
);
router.get(
  "/",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ query: medicalRecordListQuerySchema }),
  listMedicalRecords,
);
router.get(
  "/:recordId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ params: recordIdParamSchema }),
  getMedicalRecordById,
);
router.patch(
  "/:recordId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({
    params: recordIdParamSchema,
    body: updateMedicalRecordSchema,
  }),
  updateMedicalRecord,
);
router.post(
  "/:recordId/vitals",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({
    params: recordIdParamSchema,
    body: createRecordVitalSchema,
  }),
  addRecordVitals,
);
router.post(
  "/:recordId/files",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({
    params: recordIdParamSchema,
    body: createMedicalRecordFileSchema,
  }),
  addMedicalRecordFile,
);

export const recordsRoutes = router;
