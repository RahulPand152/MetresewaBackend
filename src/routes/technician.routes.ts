import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate, updateTechnicianProfileSchema } from "../utils/validation.js";
import * as technicianController from "../controllers/technician.controller.js";

const router = Router();

// All technician routes require authentication + TECHNICIAN role
router.use(authenticate);
router.use(authorize("TECHNICIAN"));

router.get("/profile", technicianController.getProfile);
router.put("/profile", validate(updateTechnicianProfileSchema), technicianController.updateProfile);
router.patch("/availability", technicianController.toggleAvailability);

router.get("/bookings", technicianController.getAssignedBookings);
router.get("/bookings/:bookingId", technicianController.getAssignedBookingById);
router.patch("/bookings/:bookingId/accept", technicianController.acceptJob);
router.patch("/bookings/:bookingId/complete", technicianController.completeJob);

export default router;
