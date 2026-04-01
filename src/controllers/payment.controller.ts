import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { asyncHandler, AppError } from "../middleware/errorhandle.js";
import { sendSuccess } from "../utils/apiResponse.js";
import axios from "axios";
import { prisma } from "../config/database.js";

// ── Khalti ePayment V2 Configuration ────────────────────────────────────────
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || "test_secret_key_dc74e0fd57cb46cd93832aee0a390234";
// Sandbox: https://dev.khalti.com/api/v2   |   Production: https://khalti.com/api/v2
const KHALTI_BASE_URL = process.env.KHALTI_BASE_URL || "https://dev.khalti.com/api/v2";

// ── Initiate Khalti ePayment ────────────────────────────────────────────────
// Frontend sends: { bookingId, return_url, website_url }
// We look up the booking, compute amount, call Khalti initiate, return payment_url
export const initiateKhaltiPayment = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const { bookingId, return_url, website_url, customer_info } = req.body;

        if (!bookingId) {
            throw new AppError("bookingId is required", 400, true, "VALIDATION_FAILED");
        }

        // Verify the booking exists and belongs to the user
        const booking = await prisma.booking.findFirst({
            where: { id: bookingId, userId: req.user!.id },
            include: { service: true },
        });

        if (!booking) {
            throw new AppError("Booking not found", 404, true, "NOT_FOUND");
        }

        // Prevent duplicate payment
        const existingPayment = await prisma.payment.findFirst({
            where: { bookingId, status: "PAID" },
        });

        if (existingPayment) {
            throw new AppError("Payment already completed for this booking", 409, true, "DUPLICATE_PAYMENT");
        }

        // Calculate amount in paisa (Khalti minimum is Rs 10 = 1000 paisa)
        const priceNPR = booking.service.price || 10;
        const amountInPaisa = Math.max(Math.round(priceNPR * 100), 1000);

        // Build the Khalti ePayment initiate payload
        const khaltiPayload = {
            return_url: return_url || "http://localhost:3000/booking/" + booking.serviceId,
            website_url: website_url || "http://localhost:3000",
            amount: amountInPaisa,
            purchase_order_id: booking.id,
            purchase_order_name: booking.service.name || "MetroSewa Service",
            customer_info: customer_info || {
                name: "Customer",
                email: "customer@metrosewa.com",
                phone: "9800000000",
            },
        };

        try {
            const khaltiResponse = await axios.post(
                `${KHALTI_BASE_URL}/epayment/initiate/`,
                khaltiPayload,
                {
                    headers: {
                        Authorization: `Key ${KHALTI_SECRET_KEY}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const { pidx, payment_url, expires_at, expires_in } = khaltiResponse.data;

            // Store the pidx in a PENDING payment record so we can verify later
            await prisma.payment.create({
                data: {
                    bookingId: booking.id,
                    userId: req.user!.id,
                    amount: priceNPR,
                    status: "PENDING",
                    paymentMethod: "KHALTI",
                    transactionId: pidx, // Store pidx for lookup
                },
            });

            sendSuccess(res, {
                pidx,
                payment_url,
                expires_at,
                expires_in,
                amount: amountInPaisa,
                amountNPR: priceNPR,
            }, "Khalti payment initiated successfully", 200);

        } catch (error: any) {
            console.error("Khalti initiate error:", error.response?.data || error.message);
            const khaltiError = error.response?.data;
            const errorMsg = typeof khaltiError === "object"
                ? JSON.stringify(khaltiError)
                : "Failed to initiate Khalti payment";
            throw new AppError(errorMsg, 400, true, "KHALTI_INITIATE_FAILED");
        }
    }
);

// ── Verify Khalti ePayment (Lookup) ─────────────────────────────────────────
// After Khalti redirects back, frontend sends: { pidx, bookingId }
// We call Khalti lookup API to confirm status === "Completed"
export const verifyKhaltiPayment = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const { pidx, bookingId } = req.body;

        if (!pidx || !bookingId) {
            throw new AppError("pidx and bookingId are required", 400, true, "VALIDATION_FAILED");
        }

        // Find the booking
        const booking = await prisma.booking.findFirst({
            where: { id: bookingId, userId: req.user!.id },
            include: { service: true },
        });

        if (!booking) {
            throw new AppError("Booking not found", 404, true, "NOT_FOUND");
        }

        // Check if already verified
        const existingPaid = await prisma.payment.findFirst({
            where: { bookingId, status: "PAID" },
        });

        if (existingPaid) {
            // Already verified — return success without re-verifying
            sendSuccess(res, existingPaid, "Payment already verified", 200);
            return;
        }

        try {
            // Call Khalti Lookup API
            const lookupResponse = await axios.post(
                `${KHALTI_BASE_URL}/epayment/lookup/`,
                { pidx },
                {
                    headers: {
                        Authorization: `Key ${KHALTI_SECRET_KEY}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const result = lookupResponse.data;
            console.log("Khalti lookup result:", result);

            if (result.status === "Completed") {
                // Update the existing PENDING payment to PAID
                const existingPayment = await prisma.payment.findFirst({
                    where: { bookingId, transactionId: pidx },
                });

                let payment;
                if (existingPayment) {
                    payment = await prisma.payment.update({
                        where: { id: existingPayment.id },
                        data: {
                            status: "PAID",
                            transactionId: result.transaction_id || pidx,
                        },
                    });
                } else {
                    // Create new payment record if none exists
                    const priceNPR = booking.service.price || 10;
                    payment = await prisma.payment.create({
                        data: {
                            bookingId: booking.id,
                            userId: req.user!.id,
                            amount: priceNPR,
                            status: "PAID",
                            paymentMethod: "KHALTI",
                            transactionId: result.transaction_id || pidx,
                        },
                    });
                }

                // Update booking status to CONFIRMED
                await prisma.booking.update({
                    where: { id: booking.id },
                    data: { status: "ASSIGNED" }, // ASSIGNED is roughly "CONFIRMED" per enum
                });

                // Create success notification
                await prisma.notification.create({
                    data: {
                        userId: req.user!.id,
                        type: "PAYMENT_SUCCESS",
                        message: `Payment of NPR ${payment.amount} successful for ${booking.service.name}. Transaction: ${result.transaction_id || pidx}`,
                    },
                });

                sendSuccess(res, {
                    payment,
                    khaltiStatus: result.status,
                    transaction_id: result.transaction_id,
                    total_amount: result.total_amount,
                }, "Payment verified successfully", 200);

            } else {
                // Payment not completed
                // Update existing pending payment to FAILED if status is terminal
                const terminalStatuses = ["User canceled", "Expired", "Failed"];
                if (terminalStatuses.includes(result.status)) {
                    const existingPayment = await prisma.payment.findFirst({
                        where: { bookingId, transactionId: pidx },
                    });
                    if (existingPayment) {
                        await prisma.payment.update({
                            where: { id: existingPayment.id },
                            data: { status: "FAILED" },
                        });
                    }
                }

                throw new AppError(
                    `Payment not completed. Status: ${result.status}`,
                    400,
                    true,
                    "PAYMENT_NOT_COMPLETED"
                );
            }
        } catch (error: any) {
            if (error instanceof AppError) throw error;
            console.error("Khalti lookup error:", error.response?.data || error.message);
            throw new AppError("Payment verification failed", 400, true, "KHALTI_LOOKUP_FAILED");
        }
    }
);

// ── Get Payment Details ───────────────────────────────────────────────────
export const getPaymentDetails = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const paymentId = req.params.id as string;

        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: { booking: true },
        });

        if (!payment) {
            throw new AppError("Payment not found", 404, true, "NOT_FOUND");
        }

        sendSuccess(res, payment, "Payment details retrieved");
    }
);

// ── Confirm Cash On Delivery ─────────────────────────────────────────────
export const confirmCOD = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const { bookingId } = req.body;

        if (!bookingId) {
            throw new AppError("Booking ID is required", 400, true, "VALIDATION_ERROR");
        }

        // Verify the booking belongs to the current user
        const booking = await prisma.booking.findFirst({
            where: { id: bookingId, userId: req.user!.id },
            include: { service: true },
        });

        if (!booking) {
            throw new AppError("Booking not found or unauthorized", 404, true, "NOT_FOUND");
        }

        // Check if payment record already exists
        const existingPayment = await prisma.payment.findFirst({
            where: { bookingId },
        });

        if (existingPayment) {
            // Already initialized a payment, maybe a Khalti failure or already COD
            if (existingPayment.status === "PAID") {
                throw new AppError("Booking is already paid", 400, true, "ALREADY_PAID");
            }
            // Update to COD if it was failed/pending Khalti
            await prisma.payment.update({
                where: { id: existingPayment.id },
                data: {
                    status: "PENDING",
                    paymentMethod: "COD",
                    transactionId: `COD-${Date.now()}`
                }
            });
        } else {
            const priceNPR = booking.service.price || 10;
            // Create pending COD payment
            await prisma.payment.create({
                data: {
                    bookingId: booking.id,
                    userId: req.user!.id,
                    amount: priceNPR,
                    status: "PENDING",
                    paymentMethod: "COD",
                    transactionId: `COD-${Date.now()}`,
                },
            });
        }

        // Update booking status to Confirmed/ASSIGNED so we know they committed
        const updatedBooking = await prisma.booking.update({
            where: { id: booking.id },
            data: { status: "ASSIGNED" },
        });

        // Create success notification
        await prisma.notification.create({
            data: {
                userId: req.user!.id,
                type: "BOOKING_ASSIGNED",
                message: `Booking for ${booking.service.name} confirmed with Cash on Delivery.`,
            },
        });

        sendSuccess(res, updatedBooking, "Booking confirmed with Cash on Delivery", 200);
    }
);
