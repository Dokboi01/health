import { Router } from "express";

import { AppRole } from "../../common/constants/roles";
import { authenticate, authorize } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import {
  appointmentIdParamSchema,
  appointmentListQuerySchema,
  availabilitySlotsQuerySchema,
  createAppointmentSchema,
  rejectAppointmentSchema,
  replaceAvailabilitySchema,
  rescheduleAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
} from "./appointments.schemas";
import {
  acceptAppointment,
  createAppointment,
  getAppointmentById,
  getAvailableSlots,
  getMyAvailability,
  listAppointments,
  rejectAppointment,
  replaceMyAvailability,
  rescheduleAppointment,
  updateAppointment,
  updateAppointmentStatus,
} from "./appointments.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/availability/me",
  authorize(AppRole.DOCTOR),
  getMyAvailability,
);
router.put(
  "/availability/me",
  authorize(AppRole.DOCTOR),
  validate({ body: replaceAvailabilitySchema }),
  replaceMyAvailability,
);
router.get(
  "/availability/slots",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ query: availabilitySlotsQuerySchema }),
  getAvailableSlots,
);
router.post(
  "/",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ body: createAppointmentSchema }),
  createAppointment,
);
router.get(
  "/",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ query: appointmentListQuerySchema }),
  listAppointments,
);
router.get(
  "/:appointmentId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ params: appointmentIdParamSchema }),
  getAppointmentById,
);
router.patch(
  "/:appointmentId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({
    params: appointmentIdParamSchema,
    body: updateAppointmentSchema,
  }),
  updateAppointment,
);
router.patch(
  "/:appointmentId/status",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({
    params: appointmentIdParamSchema,
    body: updateAppointmentStatusSchema,
  }),
  updateAppointmentStatus,
);
router.post(
  "/:appointmentId/accept",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({ params: appointmentIdParamSchema }),
  acceptAppointment,
);
router.post(
  "/:appointmentId/reject",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({
    params: appointmentIdParamSchema,
    body: rejectAppointmentSchema,
  }),
  rejectAppointment,
);
router.post(
  "/:appointmentId/reschedule",
  authorize(AppRole.ADMIN, AppRole.DOCTOR),
  validate({
    params: appointmentIdParamSchema,
    body: rescheduleAppointmentSchema,
  }),
  rescheduleAppointment,
);

export const appointmentsRoutes = router;
