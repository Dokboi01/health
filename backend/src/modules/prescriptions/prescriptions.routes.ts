import { Router } from "express";

import { AppRole } from "../../common/constants/roles";
import { authenticate, authorize } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import {
  createPrescriptionSchema,
  prescriptionIdParamSchema,
  prescriptionListQuerySchema,
  updatePrescriptionSchema,
  updatePrescriptionStatusSchema,
} from "./prescriptions.schemas";
import {
  createPrescription,
  getPrescriptionById,
  listPrescriptions,
  updatePrescription,
  updatePrescriptionStatus,
} from "./prescriptions.controller";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({ body: createPrescriptionSchema }),
  createPrescription,
);
router.get(
  "/",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ query: prescriptionListQuerySchema }),
  listPrescriptions,
);
router.get(
  "/:prescriptionId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ params: prescriptionIdParamSchema }),
  getPrescriptionById,
);
router.patch(
  "/:prescriptionId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({
    params: prescriptionIdParamSchema,
    body: updatePrescriptionSchema,
  }),
  updatePrescription,
);
router.patch(
  "/:prescriptionId/status",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({
    params: prescriptionIdParamSchema,
    body: updatePrescriptionStatusSchema,
  }),
  updatePrescriptionStatus,
);

export const prescriptionsRoutes = router;
