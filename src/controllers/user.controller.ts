import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { asyncHandler, AppError } from "../middleware/errorhandle.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { prisma } from "../config/database.js";

// ── Get My Profile ───────────────────────────────────────────────────
export const getProfile = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                address: true,
                avatar: true,
                role: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw new AppError("User not found", 404, true, "USER_NOT_FOUND");
        }
        sendSuccess(res, user, "Profile retrieved");
    },
);

// ── Update My Profile ────────────────────────────────────────────────
export const updateProfile = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const user = await prisma.user.update({
            where: { id: req.user!.id },
            data: req.body,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                address: true,
                avatar: true,
                role: true,
                updatedAt: true,
            },
        });
        sendSuccess(res, user, "Profile updated");
    },
);

// ── Upload Profile Image ─────────────────────────────────────────────
export const uploadProfileImage = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        if (!req.file) {
            res.status(400).json({ success: false, error: { message: "No file provided" } });
            return;
        }
        const { uploadImage } = await import("../services/cloudinary.service.js");
        const { url } = await uploadImage(req.file.buffer, "metro-sewa/profiles");

        const user = await prisma.user.update({
            where: { id: req.user!.id },
            data: { avatar: url },
            select: { id: true, avatar: true },
        });
        sendSuccess(res, user, "Profile image uploaded");
    },
);

// ── Delete Profile Image ─────────────────────────────────────────────
export const deleteProfileImage = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { avatar: true },
        });

        if (user?.avatar) {
            const { deleteImage } = await import("../services/cloudinary.service.js");
            const parts = user.avatar.split("/");
            const uploadIndex = parts.indexOf("upload");
            if (uploadIndex !== -1) {
                const publicId = parts.slice(uploadIndex + 2).join("/").replace(/\.[^.]+$/, "");
                await deleteImage(publicId);
            }
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { avatar: null },
            select: { id: true, avatar: true },
        });
        sendSuccess(res, updated, "Profile image deleted");
    },
);

// ── Get My Bookings ──────────────────────────────────────────────────
export const getMyBookings = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const bookings = await prisma.booking.findMany({
            where: { userId: req.user!.id },
            include: {
                service: {
                    include: { category: { select: { name: true } } }
                },
                technicians: {
                    include: {
                        user: { select: { firstName: true, lastName: true } },
                    },
                },
                payment: true,
            },
            orderBy: { createdAt: "desc" },
        });
        sendSuccess(res, bookings, "Bookings retrieved");
    },
);

// ── Get My Notifications ─────────────────────────────────────────────
export const getMyNotifications = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user!.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        sendSuccess(res, notifications, "Notifications retrieved");
    },
);

// ── Mark Notification Read ───────────────────────────────────────────
export const markNotificationRead = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const notificationId = req.params.notificationId as string;
        const existing = await prisma.notification.findFirst({
            where: { id: notificationId, userId: req.user!.id },
        });

        if (!existing) {
            throw new AppError("Notification not found", 404, true, "NOT_FOUND");
        }

        const notification = await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
        sendSuccess(res, notification, "Notification marked as read");
    },
);
