import { Router } from "express";

import { AppRole } from "../../common/constants/roles";
import { authenticate, authorize } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import {
  deviceTokenIdParamSchema,
  notificationIdParamSchema,
  notificationListQuerySchema,
  processDueRemindersSchema,
  registerDeviceTokenSchema,
  reminderListQuerySchema,
} from "./notifications.schemas";
import {
  deactivateMyDeviceToken,
  getMyNotificationById,
  listMyDeviceTokens,
  listMyNotifications,
  listMyReminders,
  markAllMyNotificationsRead,
  markMyNotificationRead,
  processDueReminders,
  registerDeviceToken,
} from "./notifications.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ query: notificationListQuerySchema }),
  listMyNotifications,
);
router.get(
  "/reminders",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ query: reminderListQuerySchema }),
  listMyReminders,
);
router.post(
  "/reminders/process",
  authorize(AppRole.ADMIN),
  validate({ body: processDueRemindersSchema }),
  processDueReminders,
);
router.patch(
  "/read-all",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  markAllMyNotificationsRead,
);
router.get(
  "/device-tokens",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  listMyDeviceTokens,
);
router.post(
  "/device-tokens",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ body: registerDeviceTokenSchema }),
  registerDeviceToken,
);
router.delete(
  "/device-tokens/:deviceTokenId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ params: deviceTokenIdParamSchema }),
  deactivateMyDeviceToken,
);
router.get(
  "/:notificationId",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ params: notificationIdParamSchema }),
  getMyNotificationById,
);
router.patch(
  "/:notificationId/read",
  authorize(AppRole.ADMIN, AppRole.DOCTOR, AppRole.PATIENT),
  validate({ params: notificationIdParamSchema }),
  markMyNotificationRead,
);

export const notificationsRoutes = router;
