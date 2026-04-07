import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { validate, updateProfileSchema } from "../utils/validation.js";
import * as userController from "../controllers/user.controller.js";

const router = Router();

// All user routes require authentication + USER role
router.use(authenticate);
router.use(authorize("USER", "ADMIN", "TECHNICIAN"));

router.get("/profile", userController.getProfile);
router.put("/profile", validate(updateProfileSchema), userController.updateProfile);
router.post("/profile/image", upload.single("avatar"), userController.uploadProfileImage);
router.delete("/profile/image", userController.deleteProfileImage);

router.get("/bookings", userController.getMyBookings);

router.get("/notifications", userController.getMyNotifications);
router.patch("/notifications/read-all", userController.markAllNotificationsRead);
router.patch("/notifications/:notificationId/read", userController.markNotificationRead);

export default router;
