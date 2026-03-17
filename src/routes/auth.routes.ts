import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { validate, registerSchema, technicianRegisterSchema, loginSchema, updateProfileSchema, requestPasswordResetSchema, resetPasswordSchema, verifyOTPSchema } from "../utils/validation.js";
import * as authController from "../controllers/auth.controller.js";

const router = Router();

// ── Public Routes ────────────────────────────────────────────────────
router.post("/register", validate(registerSchema), authController.register);
router.post("/technician-register", validate(technicianRegisterSchema), authController.registerTechnician);
router.post("/login", validate(loginSchema), authController.login);
router.post("/forgot-password", validate(requestPasswordResetSchema), authController.requestPasswordReset);
router.post("/verify-registration-otp", validate(verifyOTPSchema), authController.verifyRegistrationOTP);
router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);

// ── Protected Routes ─────────────────────────────────────────────────
router.post("/logout", authenticate, authController.logout);
router.get("/profile", authenticate, authController.getProfile);
router.put("/profile", authenticate, validate(updateProfileSchema), authController.updateProfile);
router.post("/profile/image", authenticate, upload.single("avatar"), authController.uploadProfileImage);
router.delete("/profile/image", authenticate, authController.deleteProfileImage);

export default router;
