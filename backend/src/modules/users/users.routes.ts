import { Router } from "express";

import { authenticate } from "../../common/middleware/auth.middleware";
import { validate } from "../../common/middleware/validate.middleware";
import { getMyUserProfile, updateMyUserProfile } from "./users.controller";
import { updateUserProfileSchema } from "./users.schemas";

const router = Router();

router.use(authenticate);

router.get("/me", getMyUserProfile);
router.patch("/me", validate({ body: updateUserProfileSchema }), updateMyUserProfile);

export const usersRoutes = router;
