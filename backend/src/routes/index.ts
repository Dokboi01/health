import { Router } from "express";

import { appointmentsRoutes } from "../modules/appointments/appointments.routes";
import { authRoutes } from "../modules/auth/auth.routes";
import { doctorsRoutes } from "../modules/doctors/doctors.routes";
import { healthRoutes } from "../modules/health/health.routes";
import { medicationsRoutes } from "../modules/medications/medications.routes";
import { notificationsRoutes } from "../modules/notifications/notifications.routes";
import { patientsRoutes } from "../modules/patients/patients.routes";
import { prescriptionsRoutes } from "../modules/prescriptions/prescriptions.routes";
import { recordsRoutes } from "../modules/records/records.routes";
import { searchRoutes } from "../modules/search/search.routes";
import { usersRoutes } from "../modules/users/users.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/doctors", doctorsRoutes);
router.use("/patients", patientsRoutes);
router.use("/appointments", appointmentsRoutes);
router.use("/prescriptions", prescriptionsRoutes);
router.use("/medications", medicationsRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/records", recordsRoutes);
router.use("/search", searchRoutes);

export const apiRouter = router;
