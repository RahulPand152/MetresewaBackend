import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate, createBookingSchema, createReviewSchema } from "../utils/validation.js";
import * as bookingController from "../controllers/booking.controller.js";

const router = Router();

// All booking routes require authentication + USER role
router.use(authenticate);
router.use(authorize("USER"));

router.post("/", validate(createBookingSchema), bookingController.createBooking);
router.get("/", bookingController.getUserBookings);
router.get("/:bookingId", bookingController.getBooking);
router.patch("/:bookingId/cancel", bookingController.cancelBooking);
router.post("/review", validate(createReviewSchema), bookingController.createReview);

export default router;
