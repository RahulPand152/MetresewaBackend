import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { asyncHandler, AppError } from "../middleware/errorhandle.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { prisma } from "../config/database.js";
import { sendBookingConfirmation } from "../services/email.service.js";

// ── Create Booking ───────────────────────────────────────────────────
export const createBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        const data = req.body;

        const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
        if (!service) {
            throw new AppError("Service not found", 404, true, "NOT_FOUND");
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, firstName: true },
        });

        const booking = await prisma.booking.create({
            data: {
                userId,
                serviceId: data.serviceId,
                description: data.description,
                address: data.address,
                quantity: data.quantity ? Number(data.quantity) : 1,
                scheduledDate: new Date(data.scheduledDate),
            } as any,
            include: { service: true },
        });

        // Create notification
        await prisma.notification.create({
            data: {
                userId,
                type: "BOOKING_CREATED",
                message: `Your booking for ${service.name} has been created`,
            },
        });

        // Send confirmation email
        if (user) {
            sendBookingConfirmation(
                user.email,
                user.firstName,
                service.name,
                booking.scheduledDate.toISOString(),
                booking.id,
            );
        }

        sendSuccess(res, booking, "Booking created", 201);
    },
);

// ── Create Batch Bookings ────────────────────────────────────────────
export const createBatchBookings = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        // Expected payload: { items: {serviceId, quantity}[], description, address, scheduledDate }
        const { items, description, address, scheduledDate } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            throw new AppError("No items provided", 400, true, "VALIDATION_ERROR");
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, firstName: true },
        });

        const createdBookings = [];

        // We run in a transaction or loop. For simplicity, just loop sequentially to handle errors clearly
        for (const item of items) {
            const service = await prisma.service.findUnique({ where: { id: item.serviceId } });
            if (!service) continue; // Skip invalid services

            const booking = await prisma.booking.create({
                data: {
                    userId,
                    serviceId: service.id,
                    description,
                    address,
                    quantity: item.quantity ? Number(item.quantity) : 1,
                    scheduledDate: new Date(scheduledDate),
                } as any,
                include: { service: true },
            });

            createdBookings.push(booking);

            // Create notification per item
            await prisma.notification.create({
                data: {
                    userId,
                    type: "BOOKING_CREATED",
                    message: `Your booking for ${service.name} has been created`,
                },
            });

            // Send confirmation email per item
            if (user) {
                sendBookingConfirmation(
                    user.email,
                    user.firstName,
                    service.name,
                    booking.scheduledDate.toISOString(),
                    booking.id,
                );
            }
        }

        if (createdBookings.length === 0) {
            throw new AppError("Failed to create any bookings due to invalid services.", 400, true, "VALIDATION_ERROR");
        }

        sendSuccess(res, createdBookings, "Batch bookings created", 201);
    },
);

// ── Get Booking ──────────────────────────────────────────────────────
export const getBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const bookingId = req.params.bookingId as string;
        const userId = req.user!.id;

        const booking = await prisma.booking.findFirst({
            where: { id: bookingId, userId },
            include: {
                service: true,
                technicians: {
                    include: {
                        user: {
                            select: { firstName: true, lastName: true, phoneNumber: true },
                        },
                    },
                },
                reviews: true,
                payment: true,
            },
        });

        if (!booking) {
            throw new AppError("Booking not found", 404, true, "NOT_FOUND");
        }

        sendSuccess(res, booking, "Booking retrieved");
    },
);

// ── Get User Bookings ────────────────────────────────────────────────
export const getUserBookings = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        const bookings = await prisma.booking.findMany({
            where: { userId },
            include: {
                service: true,
                technicians: {
                    include: {
                        user: { select: { firstName: true, lastName: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        sendSuccess(res, bookings, "Bookings retrieved");
    },
);

// ── Cancel Booking ───────────────────────────────────────────────────
export const cancelBooking = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const bookingId = req.params.bookingId as string;
        const userId = req.user!.id;

        const booking = await prisma.booking.findFirst({
            where: { id: bookingId, userId },
        });

        if (!booking) {
            throw new AppError("Booking not found", 404, true, "NOT_FOUND");
        }

        if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
            throw new AppError(
                `Cannot cancel a booking that is ${booking.status.toLowerCase()}`,
                400,
                true,
                "INVALID_STATUS",
            );
        }

        const updated = await prisma.booking.update({
            where: { id: bookingId },
            data: { status: "CANCELLED" },
            include: { service: true },
        });

        sendSuccess(res, updated, "Booking cancelled");
    },
);

// ── Create Review ────────────────────────────────────────────────────
export const createReview = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        const data = req.body;

        const booking = await prisma.booking.findFirst({
            where: { id: data.bookingId, userId, status: "COMPLETED" },
            include: { technicians: true },
        });

        if (!booking) {
            throw new AppError(
                "Booking not found or not completed yet",
                404,
                true,
                "NOT_FOUND",
            );
        }

        // Check if review already exists
        const existingReview = await prisma.review.findFirst({
            where: { bookingId: data.bookingId, userId },
        });

        if (existingReview) {
            throw new AppError("You have already reviewed this booking", 409, true, "DUPLICATE_REVIEW");
        }

        const review = await prisma.review.create({
            data: {
                userId,
                bookingId: data.bookingId,
                rating: data.rating,
                comment: data.comment,
            },
        });

        // Update technician rating if technician assigned
        if (booking.technicians.length > 0) {
            for (const tech of booking.technicians) {
                const allReviews = await prisma.review.findMany({
                    where: {
                        booking: {
                            technicians: { some: { id: tech.id } },
                        },
                    },
                    select: { rating: true },
                });

                const avgRating =
                    allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

                await prisma.technician.update({
                    where: { id: tech.id },
                    data: { rating: Math.round(avgRating * 10) / 10 },
                });
            }
        }

        sendSuccess(res, review, "Review submitted", 201);
    },
);
