import { z } from "zod/v4";

// ── Auth Schemas ─────────────────────────────────────────────────────

// User registration — role is always USER (set by route, not body)
export const registerSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
});

// Technician registration — role is always TECHNICIAN (set by route, not body)
export const technicianRegisterSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    // Technician-specific fields
    bio: z.string().optional(),
    experience: z.number().int().min(0).optional(),
    skills: z.string().optional(),
    certification: z.string().optional(),
});

export const loginSchema = z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
});

export const requestPasswordResetSchema = z.object({
    email: z.email("Invalid email address"),
});

export const verifyOTPSchema = z.object({
    email: z.email("Invalid email address"),
    otp: z.string().min(6, "OTP must be 6 characters").max(6, "OTP must be 6 characters"),
});

export const resetPasswordSchema = z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

// ── Booking Schemas ──────────────────────────────────────────────────
export const createBookingSchema = z.object({
    serviceId: z.string().uuid("Invalid service ID"),
    description: z.string().optional(),
    scheduledDate: z.string().datetime("Invalid date format"),
});

export const updateBookingStatusSchema = z.object({
    status: z.enum(["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

// ── Review Schema ────────────────────────────────────────────────────
export const createReviewSchema = z.object({
    bookingId: z.string().uuid("Invalid booking ID"),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional(),
});

// ── Category Schemas ─────────────────────────────────────────────────
export const createCategorySchema = z.object({
    name: z.string().min(2, "Category name is required"),
    description: z.string().optional(),
    isActive: z.preprocess((v) => v === "true" || v === true, z.boolean()).optional(),
});

export const updateCategorySchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    isActive: z.preprocess((v) => v === "true" || v === true, z.boolean()).optional(),
});

// ── SubCategory Schemas ──────────────────────────────────────────────
export const createSubCategorySchema = z.object({
    categoryId: z.string().uuid("Invalid category ID"),
    name: z.string().min(2, "SubCategory name is required"),
    description: z.string().optional(),
    isActive: z.preprocess((v) => v === "true" || v === true, z.boolean()).optional(),
});

export const updateSubCategorySchema = z.object({
    categoryId: z.string().uuid("Invalid category ID").optional(),
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    isActive: z.preprocess((v) => v === "true" || v === true, z.boolean()).optional(),
});

// ── Service Schema ───────────────────────────────────────────────────
export const createServiceSchema = z.object({
    name: z.string().min(2, "Service name is required"),
    description: z.string().optional(),
    price: z.preprocess((v) => (v !== undefined && v !== "" ? Number(v) : undefined), z.number().positive("Price must be positive").optional()),
    categoryId: z.string().uuid("Invalid category ID").optional(),
    subCategoryId: z.string().uuid("Invalid subcategory ID").optional(),
    isActive: z.preprocess((v) => v === "true" || v === true, z.boolean()).optional(),
});

export const updateServiceSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    price: z.preprocess((v) => (v !== undefined && v !== "" ? Number(v) : undefined), z.number().positive().optional()),
    categoryId: z.string().uuid("Invalid category ID").optional(),
    subCategoryId: z.string().uuid("Invalid subcategory ID").optional(),
    isActive: z.preprocess((v) => v === "true" || v === true, z.boolean()).optional(),
});

// ── Contact Schema ───────────────────────────────────────────────────
export const createContactSchema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.email("Invalid email"),
    phone: z.string().optional(),
    title: z.string().min(2, "Title is required"),
    message: z.string().min(10, "Message must be at least 10 characters"),
});

export const replyContactSchema = z.object({
    adminNotes: z.string().min(1, "Reply message is required"),
});

// ── Admin Schemas ────────────────────────────────────────────────────
export const assignTechnicianSchema = z.object({
    bookingId: z.string().uuid("Invalid booking ID"),
    technicianId: z.string().uuid("Invalid technician ID"),
});

// ── Technician Schemas ───────────────────────────────────────────────
export const updateTechnicianProfileSchema = z.object({
    bio: z.string().optional(),
    experience: z.number().int().min(0).optional(),
    skills: z.string().optional(),
    certification: z.string().optional(),
});

// ── Validation Middleware Helper ─────────────────────────────────────
import type { Request, Response, NextFunction } from "express";

export const validate = (schema: z.ZodType) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        schema.parse(req.body);
        next();
    };
};
