import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { asyncHandler, AppError } from "../middleware/errorhandle.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { prisma } from "../config/database.js";

// ── Get My Technician Profile ────────────────────────────────────────
export const getProfile = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const technician = await prisma.technician.findUnique({
            where: { userId: req.user!.id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phoneNumber: true,
                        address: true,
                        avatar: true,
                    },
                },
                specializations: true,
            },
        });

        if (!technician) {
            throw new AppError("Technician profile not found", 404, true, "NOT_FOUND");
        }

        sendSuccess(res, technician, "Technician profile retrieved");
    },
);

// ── Update Profile ───────────────────────────────────────────────────
export const updateProfile = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        const technician = await prisma.technician.findUnique({ where: { userId } });
        if (!technician) {
            throw new AppError("Technician profile not found", 404, true, "NOT_FOUND");
        }

        const updated = await prisma.technician.update({
            where: { userId },
            data: req.body,
            include: {
                user: {
                    select: { firstName: true, lastName: true, email: true },
                },
            },
        });

        sendSuccess(res, updated, "Technician profile updated");
    },
);

// ── Toggle Availability ──────────────────────────────────────────────
export const toggleAvailability = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        const technician = await prisma.technician.findUnique({ where: { userId } });
        if (!technician) {
            throw new AppError("Technician profile not found", 404, true, "NOT_FOUND");
        }

        const result = await prisma.technician.update({
            where: { userId },
            data: { isAvailable: !technician.isAvailable },
            select: { id: true, isAvailable: true },
        });

        sendSuccess(res, result, `Availability set to ${result.isAvailable}`);
    },
);

// ── Get Assigned Bookings ────────────────────────────────────────────
export const getAssignedBookings = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        const technician = await prisma.technician.findUnique({ where: { userId } });
        if (!technician) {
            throw new AppError("Technician profile not found", 404, true, "NOT_FOUND");
        }

        const bookings = await prisma.booking.findMany({
            where: {
                technicians: { some: { id: technician.id } },
            },
            include: {
                service: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                        address: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        sendSuccess(res, bookings, "Assigned bookings retrieved");
    },
);

// ── Accept Job ───────────────────────────────────────────────────────
export const acceptJob = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        const bookingId = req.params.bookingId as string;

        const technician = await prisma.technician.findUnique({ where: { userId } });
        if (!technician) {
            throw new AppError("Technician profile not found", 404, true, "NOT_FOUND");
        }

        const booking = await prisma.booking.findFirst({
            where: {
                id: bookingId,
                technicians: { some: { id: technician.id } },
                status: "ASSIGNED",
            },
        });

        if (!booking) {
            throw new AppError("Booking not found or not assigned to you", 404, true, "NOT_FOUND");
        }

        const updated = await prisma.booking.update({
            where: { id: bookingId },
            data: { status: "IN_PROGRESS" },
            include: { service: true },
        });

        sendSuccess(res, updated, "Job accepted");
    },
);

// ── Complete Job ─────────────────────────────────────────────────────
export const completeJob = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        const bookingId = req.params.bookingId as string;

        const technician = await prisma.technician.findUnique({ where: { userId } });
        if (!technician) {
            throw new AppError("Technician profile not found", 404, true, "NOT_FOUND");
        }

        const booking = await prisma.booking.findFirst({
            where: {
                id: bookingId,
                technicians: { some: { id: technician.id } },
                status: "IN_PROGRESS",
            },
        });

        if (!booking) {
            throw new AppError("Booking not found or not in progress", 404, true, "NOT_FOUND");
        }

        const updated = await prisma.booking.update({
            where: { id: bookingId },
            data: { status: "COMPLETED" },
            include: { service: true },
        });

        sendSuccess(res, updated, "Job completed");
    },
);
