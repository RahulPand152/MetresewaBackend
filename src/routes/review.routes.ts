import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate, createReviewSchema } from "../utils/validation.js";
import * as reviewController from "../controllers/review.controller.js";

const router = Router();

// ── Public: Get reviews for a service ─────────────────────────────────────────
router.get("/service/:serviceId", reviewController.getReviewsByService);

// ── Authenticated: Create a review + eligibility check ────────────────────────
router.post(
    "/",
    authenticate,
    authorize("USER"),
    validate(createReviewSchema),
    reviewController.createReview
);

router.get(
    "/eligibility/:serviceId",
    authenticate,
    authorize("USER", "ADMIN", "TECHNICIAN"),
    reviewController.getReviewEligibility
);

// ── Admin: All reviews + delete ───────────────────────────────────────────────
router.get(
    "/admin/all",
    authenticate,
    authorize("ADMIN"),
    reviewController.adminGetAllReviews
);

router.delete(
    "/admin/:reviewId",
    authenticate,
    authorize("ADMIN"),
    reviewController.adminDeleteReview
);

export default router;
