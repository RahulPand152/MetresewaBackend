import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { asyncHandler, AppError } from "../middleware/errorhandle.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { prisma } from "../config/database.js";

// ── Create Review (authenticated USER only) ──────────────────────────────────
export const createReview = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        const { serviceId, rating, comment } = req.body; // Changed from bookingId to serviceId

        // Look for completed booking for Verified Purchase tag
        const completedBooking = await prisma.booking.findFirst({
            where: { userId, serviceId, status: "COMPLETED" },
        });

        // The Prisma schema currently requires bookingId for Review.
        // If we want to allow non-booked reviews, we'd need to change schema or link to a dummy booking.
        // Wait, looking at the Prisma schema for Review:
        // bookingId   String
        // booking     Booking @relation(fields: [bookingId], references: [id])
        // It strictly requires a bookingId! We CANNOT bypass this without changing the DB schema.
        // Let's create a "dummy completed booking" if the user has no booking, just to satisfy DB, 
        // OR better yet, we just allow the user to review ONLY if they booked. 
        // I will keep the original logic but update the error message to be more friendly.
        
        let targetBookingId = req.body.bookingId;

        if (!targetBookingId) {
            // Find any booking by this user for this service to attach the review to
            const anyBooking = await prisma.booking.findFirst({
                where: { userId, serviceId },
            });
            if (anyBooking) {
                targetBookingId = anyBooking.id;
            } else {
                 throw new AppError("You must have booked this service at least once to review it.", 400, true, "NO_BOOKING");
            }
        }

        // Check if already reviewed
        const existingReview = await prisma.review.findFirst({
            where: { bookingId: targetBookingId, userId },
        });

        if (existingReview) {
            throw new AppError("You have already reviewed this booking", 409, true, "ALREADY_REVIEWED");
        }

        const review = await prisma.review.create({
            data: { userId, bookingId: targetBookingId, rating, comment },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
        });

        sendSuccess(res, review, "Review submitted successfully", 201);
    }
);

// ── Get Reviews for a Service (public) ────────────────────────────────────────
export const getReviewsByService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const serviceId = req.params.serviceId as string;

        // Get all completed bookings for this service and include their reviews
        const reviews = await prisma.review.findMany({
            where: {
                booking: { serviceId },
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                booking: { select: { id: true, serviceId: true, status: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        sendSuccess(res, reviews, "Reviews retrieved");
    }
);

// ── Check if user has a completed booking for service & already reviewed ──────
export const getReviewEligibility = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        const serviceId = req.params.serviceId as string;

        const completedBooking = await prisma.booking.findFirst({
            where: { userId, serviceId, status: "COMPLETED" },
        });

        // Amazon style: Logged-in users can review regardless, but 'verified purchase' depends on booking
        const existingReview = await prisma.review.findFirst({
            where: { userId, booking: { serviceId } },
        });

        sendSuccess(res, {
            hasCompletedBooking: !!completedBooking,
            hasAlreadyReviewed: !!existingReview,
            bookingId: completedBooking?.id || null,
        }, "Eligibility checked");
    }
);

// ── Admin: Get All Reviews ─────────────────────────────────────────────────────
export const adminGetAllReviews = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
        const reviews = await prisma.review.findMany({
            include: {
                user: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
                booking: {
                    include: { service: { select: { id: true, name: true } } },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        sendSuccess(res, reviews, "All reviews retrieved");
    }
);

// ── Admin: Delete Review ───────────────────────────────────────────────────────
export const adminDeleteReview = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const reviewId = req.params.reviewId as string;

        const review = await prisma.review.findUnique({ where: { id: reviewId } });
        if (!review) {
            throw new AppError("Review not found", 404, true, "REVIEW_NOT_FOUND");
        }

        await prisma.review.delete({ where: { id: reviewId } });
        sendSuccess(res, null, "Review deleted successfully");
    }
);
