import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate, createContactSchema } from "../utils/validation.js";
import * as contactController from "../controllers/contact.controller.js";

const router = Router();

// ── Public Route ─────────────────────────────────────────────────────
router.post("/", validate(createContactSchema), contactController.submitContact);

// ── Admin-only Routes ────────────────────────────────────────────────
router.get("/", authenticate, authorize("ADMIN"), contactController.getContacts);
router.patch(
    "/:contactId/status",
    authenticate,
    authorize("ADMIN"),
    contactController.updateContactStatus,
);

export default router;
