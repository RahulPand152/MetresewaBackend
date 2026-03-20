import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import {
    validate,
    assignTechnicianSchema,
    createServiceSchema,
    updateServiceSchema,
    replyContactSchema,
    createCategorySchema,
    updateCategorySchema,
    createSubCategorySchema,
    updateSubCategorySchema,
} from "../utils/validation.js";
import * as adminController from "../controllers/admin.controller.js";

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate);
router.use(authorize("ADMIN"));

// ── Dashboard & Analytics ─────────────────────────────────────────────
router.get("/dashboard", adminController.getDashboardStats);
router.get("/analytics", adminController.getAnalytics);

// ── Technician Management ─────────────────────────────────────────────
router.get("/technicians", adminController.getAllTechnicians);
router.patch("/technicians/:technicianId/approve", adminController.approveTechnician);
router.post("/assign-technician", validate(assignTechnicianSchema), adminController.assignTechnician);

// ── User Management ───────────────────────────────────────────────────
router.get("/users", adminController.getAllUsers);
router.delete("/users/:userId", adminController.deleteUser);

// ── Category Management ───────────────────────────────────────────────
// upload.single("icon") — only one icon image allowed
router.get("/categories", adminController.getAllCategories);
router.get("/categories/:categoryId", adminController.getCategoryById);
router.post(
    "/categories",
    upload.single("icon"),
    validate(createCategorySchema),
    adminController.createCategory,
);
router.put(
    "/categories/:categoryId",
    upload.single("icon"),
    validate(updateCategorySchema),
    adminController.updateCategory,
);
router.delete("/categories/:categoryId", adminController.deleteCategory);

// ── SubCategory Management ────────────────────────────────────────────
// upload.fields: "icon" (1) + "images" (up to 10)
router.get("/subcategories", adminController.getAllSubCategories);
router.get("/categories/:categoryId/subcategories", adminController.getSubCategoriesByCategory);
router.post(
    "/subcategories",
    upload.fields([
        { name: "icon", maxCount: 1 },
        { name: "images", maxCount: 10 },
    ]),
    validate(createSubCategorySchema),
    adminController.createSubCategory,
);
router.put(
    "/subcategories/:subCategoryId",
    upload.fields([
        { name: "icon", maxCount: 1 },
        { name: "images", maxCount: 10 },
    ]),
    validate(updateSubCategorySchema),
    adminController.updateSubCategory,
);
router.delete("/subcategories/:subCategoryId", adminController.deleteSubCategory);

// ── Service Management ────────────────────────────────────────────────
// upload.array("images", 10) — multiple service images
router.get("/services", adminController.getAllServices);
router.get("/services/:serviceId", adminController.getServiceById);
router.post(
    "/services",
    upload.array("images", 10),
    validate(createServiceSchema),
    adminController.createService,
);
router.put(
    "/services/:serviceId",
    upload.array("images", 10),
    validate(updateServiceSchema),
    adminController.updateService,
);
router.delete("/services/:serviceId", adminController.deleteService);

// ── Bookings ──────────────────────────────────────────────────────────
router.get("/bookings", adminController.getAllBookings);

// ── Payments ──────────────────────────────────────────────────────────
router.get("/payments", adminController.getAllPayments);

// ── Contact Messages ──────────────────────────────────────────────────
router.get("/contacts", adminController.getAllContacts);
router.post(
    "/contacts/:contactId/reply",
    validate(replyContactSchema),
    adminController.replyContact,
);

export default router;
