import { Router } from "express";

import { AppRole } from "../../common/constants/roles";
import { authenticate, authorize } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import {
  createMedicationLogSchema,
  createMedicationSchema,
  markMedicationTakenSchema,
  medicationAdherenceQuerySchema,
  medicationIdParamSchema,
  medicationListQuerySchema,
  medicationLogListQuerySchema,
  replaceMedicationSchedulesSchema,
  updateMedicationSchema,
} from "./medications.schemas";
import {
  createMedication,
  createMedicationLog,
  getMedicationAdherence,
  getMedicationById,
  listMedicationLogs,
  listMedicationSchedules,
  listMedications,
  markMedicationTaken,
  replaceMedicationSchedules,
  updateMedication,
} from "./medications.controller";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({ body: createMedicationSchema }),
  createMedication,
);
router.get(
  "/",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ query: medicationListQuerySchema }),
  listMedications,
);
router.get(
  "/:medicationId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ params: medicationIdParamSchema }),
  getMedicationById,
);
router.patch(
  "/:medicationId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({
    params: medicationIdParamSchema,
    body: updateMedicationSchema,
  }),
  updateMedication,
);
router.get(
  "/:medicationId/schedules",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ params: medicationIdParamSchema }),
  listMedicationSchedules,
);
router.put(
  "/:medicationId/schedules",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({
    params: medicationIdParamSchema,
    body: replaceMedicationSchedulesSchema,
  }),
  replaceMedicationSchedules,
);
router.post(
  "/:medicationId/logs",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({
    params: medicationIdParamSchema,
    body: createMedicationLogSchema,
  }),
  createMedicationLog,
);
router.post(
  "/:medicationId/mark-taken",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({
    params: medicationIdParamSchema,
    body: markMedicationTakenSchema,
  }),
  markMedicationTaken,
);
router.get(
  "/:medicationId/logs",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({
    params: medicationIdParamSchema,
    query: medicationLogListQuerySchema,
  }),
  listMedicationLogs,
);
router.get(
  "/:medicationId/adherence",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({
    params: medicationIdParamSchema,
    query: medicationAdherenceQuerySchema,
  }),
  getMedicationAdherence,
);

export const medicationsRoutes = router;
