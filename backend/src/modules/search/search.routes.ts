import { Router } from "express";

import { AppRole } from "../../common/constants/roles";
import { authenticate, authorize } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { doctorPatientListQuerySchema } from "../doctors/doctors.schemas";
import { patientDoctorListQuerySchema } from "../patients/patients.schemas";
import { searchDoctors, searchPatients } from "./search.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/patients",
  authorize(AppRole.DOCTOR),
  validate({ query: doctorPatientListQuerySchema }),
  searchPatients,
);

router.get(
  "/doctors",
  authorize(AppRole.PATIENT),
  validate({ query: patientDoctorListQuerySchema }),
  searchDoctors,
);

export const searchRoutes = router;

