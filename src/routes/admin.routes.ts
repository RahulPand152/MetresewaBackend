import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate, assignTechnicianSchema, createServiceSchema, updateServiceSchema, replyContactSchema } from "../utils/validation.js";
import * as adminController from "../controllers/admin.controller.js";

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate);
router.use(authorize("ADMIN"));

// ── Dashboard & Analytics ────────────────────────────────────────────────
router.get("/dashboard", adminController.getDashboardStats);
router.get("/analytics", adminController.getAnalytics);

// ── Technician Management ────────────────────────────────────────────
router.get("/technicians", adminController.getAllTechnicians);
router.patch("/technicians/:technicianId/approve", adminController.approveTechnician);
router.post("/assign-technician", validate(assignTechnicianSchema), adminController.assignTechnician);

// ── User Management ──────────────────────────────────────────────────
router.get("/users", adminController.getAllUsers);
router.delete("/users/:userId", adminController.deleteUser);

// ── Service Management ───────────────────────────────────────────────
router.get("/services", adminController.getAllServices);
router.post("/services", validate(createServiceSchema), adminController.createService);
router.put("/services/:serviceId", validate(updateServiceSchema), adminController.updateService);
router.delete("/services/:serviceId", adminController.deleteService);

// ── Bookings ─────────────────────────────────────────────────────────
router.get("/bookings", adminController.getAllBookings);

// ── Payments ─────────────────────────────────────────────────────────
router.get("/payments", adminController.getAllPayments);

// ── Contact Messages ─────────────────────────────────────────────────
router.get("/contacts", adminController.getAllContacts);
router.post("/contacts/:contactId/reply", validate(replyContactSchema), adminController.replyContact);

export default router;
