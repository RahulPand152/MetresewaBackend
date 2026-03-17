import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { asyncHandler, AppError } from "../middleware/errorhandle.js";
import { sendSuccess, sendPaginated } from "../utils/apiResponse.js";
import { prisma } from "../config/database.js";
import { sendTechnicianAssignment, sendContactReply } from "../services/email.service.js";

// ── Assign Technician ────────────────────────────────────────────────
export const assignTechnician = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const { bookingId, technicianId } = req.body;

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { service: true },
        });

        if (!booking) {
            throw new AppError("Booking not found", 404, true, "NOT_FOUND");
        }

        if (booking.status !== "PENDING") {
            throw new AppError("Booking is not in PENDING status", 400, true, "INVALID_STATUS");
        }

        const technician = await prisma.technician.findUnique({
            where: { id: technicianId },
            include: {
                user: { select: { email: true, firstName: true } },
            },
        });

        if (!technician) {
            throw new AppError("Technician not found", 404, true, "NOT_FOUND");
        }

        if (!technician.isApproved) {
            throw new AppError("Technician is not approved", 400, true, "NOT_APPROVED");
        }

        if (!technician.isAvailable) {
            throw new AppError("Technician is not available", 400, true, "NOT_AVAILABLE");
        }

        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: "ASSIGNED",
                assignedByAdmin: true,
                technicians: { connect: { id: technicianId } },
            },
            include: {
                service: true,
                technicians: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
        });

        // Create notification for technician
        await prisma.notification.create({
            data: {
                userId: technician.userId,
                type: "BOOKING_ASSIGNED",
                message: `You have been assigned to booking for ${booking.service.name}`,
            },
        });

        // Send email to technician
        sendTechnicianAssignment(
            technician.user.email,
            technician.user.firstName,
            booking.service.name,
            booking.scheduledDate.toISOString(),
            booking.id,
        );

        sendSuccess(res, updatedBooking, "Technician assigned to booking");
    },
);

// ── Approve Technician ───────────────────────────────────────────────
export const approveTechnician = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const technicianId = req.params.technicianId as string;
        const technician = await prisma.technician.findUnique({
            where: { id: technicianId },
        });

        if (!technician) {
            throw new AppError("Technician not found", 404, true, "NOT_FOUND");
        }

        const updated = await prisma.technician.update({
            where: { id: technicianId },
            data: { isApproved: true },
            include: {
                user: {
                    select: { firstName: true, lastName: true, email: true },
                },
            },
        });

        sendSuccess(res, updated, "Technician approved");
    },
);

// ── Get All Technicians ──────────────────────────────────────────────
export const getAllTechnicians = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
        const technicians = await prisma.technician.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phoneNumber: true,
                    },
                },
                specializations: true,
            },
            orderBy: { createdAt: "desc" },
        });
        sendSuccess(res, technicians, "Technicians retrieved");
    },
);

// ── Get All Bookings ─────────────────────────────────────────────────
export const getAllBookings = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true } },
                    service: true,
                    technicians: {
                        include: {
                            user: { select: { firstName: true, lastName: true } },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.booking.count(),
        ]);

        sendPaginated(res, bookings, total, page, limit, "Bookings retrieved");
    },
);

// ── Get All Payments ─────────────────────────────────────────────────
export const getAllPayments = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true } },
                    booking: { include: { service: true } },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.payment.count(),
        ]);

        sendPaginated(res, payments, total, page, limit, "Payments retrieved");
    },
);

// ── Get All Contacts ─────────────────────────────────────────────────
export const getAllContacts = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
        const contacts = await prisma.contactMessage.findMany({
            orderBy: { createdAt: "desc" },
        });
        sendSuccess(res, contacts, "Contact messages retrieved");
    },
);

// ── Reply to Contact ─────────────────────────────────────────────────
export const replyContact = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const contactId = req.params.contactId as string;
        const adminNotes = req.body.adminNotes;

        const contact = await prisma.contactMessage.findUnique({ where: { id: contactId } });
        if (!contact) {
            throw new AppError("Contact message not found", 404, true, "NOT_FOUND");
        }

        const updatedContact = await prisma.contactMessage.update({
            where: { id: contactId },
            data: {
                adminNotes,
                status: "REVIEWED",
            },
        });

        // Send reply email
        sendContactReply(contact.email, contact.fullName, contact.title, adminNotes);
        sendSuccess(res, updatedContact, "Reply sent");
    },
);

// ── Create Service ───────────────────────────────────────────────────
export const createService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const service = await prisma.service.create({ data: req.body });
        sendSuccess(res, service, "Service created", 201);
    },
);

// ── Update Service ───────────────────────────────────────────────────
export const updateService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const serviceId = req.params.serviceId as string;
        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) {
            throw new AppError("Service not found", 404, true, "NOT_FOUND");
        }

        const updated = await prisma.service.update({ where: { id: serviceId }, data: req.body });
        sendSuccess(res, updated, "Service updated");
    },
);

// ── Delete Service ───────────────────────────────────────────────────
export const deleteService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const serviceId = req.params.serviceId as string;
        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) {
            throw new AppError("Service not found", 404, true, "NOT_FOUND");
        }

        await prisma.service.delete({ where: { id: serviceId } });
        sendSuccess(res, null, "Service deleted");
    },
);

// ── Get All Services ─────────────────────────────────────────────────
export const getAllServices = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
        const services = await prisma.service.findMany({ orderBy: { createdAt: "desc" } });
        sendSuccess(res, services, "Services retrieved");
    },
);

// ── Dashboard Stats ──────────────────────────────────────────────────
export const getDashboardStats = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
        const [
            totalUsers,
            totalTechnicians,
            totalBookings,
            pendingBookings,
            completedBookings,
            totalRevenueAgg,
        ] = await Promise.all([
            prisma.user.count({ where: { role: "USER" } }),
            prisma.technician.count(),
            prisma.booking.count(),
            prisma.booking.count({ where: { status: "PENDING" } }),
            prisma.booking.count({ where: { status: "COMPLETED" } }),
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: { status: "PAID" },
            }),
        ]);

        const stats = {
            totalUsers,
            totalTechnicians,
            totalBookings,
            pendingBookings,
            completedBookings,
            totalRevenue: totalRevenueAgg._sum.amount || 0,
        };

        sendSuccess(res, stats, "Dashboard stats retrieved");
    },
);
