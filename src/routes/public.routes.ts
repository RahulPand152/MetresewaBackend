import { Router } from "express";
import * as publicController from "../controllers/public.controller.js";

const router = Router();

// ── Public Categories & Services ──────────────────────────────────────
router.get("/categories", publicController.getPublicCategories);
router.get("/services", publicController.getPublicServices);

export default router;
