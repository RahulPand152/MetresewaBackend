import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { asyncHandler, AppError } from "../middleware/errorhandle.js";
import { sendSuccess, sendPaginated } from "../utils/apiResponse.js";
import { prisma } from "../config/database.js";
import { sendTechnicianAssignment, sendContactReply } from "../services/email.service.js";
import { uploadImage, deleteImage } from "../services/cloudinary.service.js";

// ─────────────────────────────────────────────────────────────────────
//  CATEGORY CRUD
// ─────────────────────────────────────────────────────────────────────

// ── Get All Categories ───────────────────────────────────────────────
export const getAllCategories = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
        const categories = await prisma.category.findMany({
            include: {
                _count: { select: { subCategories: true, services: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        sendSuccess(res, categories, "Categories retrieved");
    },
);

// ── Get Category By Id ───────────────────────────────────────────────
export const getCategoryById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const categoryId = req.params.categoryId as string;
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                subCategories: {
                    include: { images: true },
                    orderBy: { createdAt: "desc" },
                },
                _count: { select: { services: true } },
            },
        });
        if (!category) throw new AppError("Category not found", 404, true, "NOT_FOUND");
        sendSuccess(res, category, "Category retrieved");
    },
);

// ── Create Category ──────────────────────────────────────────────────
export const createCategory = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const { name, description, isActive } = req.body;

        let icon: string | undefined;
        let iconPublicId: string | undefined;

        // Upload icon if provided
        if (req.file) {
            const result = await uploadImage(req.file.buffer, "metro-sewa/categories");
            icon = result.url;
            iconPublicId = result.publicId;
        }

        const category = await prisma.category.create({
            data: {
                name,
                description,
                isActive: isActive === "true" || isActive === true ? true : true,
                icon,
                iconPublicId,
            },
        });

        sendSuccess(res, category, "Category created", 201);
    },
);

// ── Update Category ──────────────────────────────────────────────────
export const updateCategory = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const categoryId = req.params.categoryId as string;
        const { name, description, isActive } = req.body;

        const existing = await prisma.category.findUnique({ where: { id: categoryId } });
        if (!existing) throw new AppError("Category not found", 404, true, "NOT_FOUND");

        let icon = existing.icon ?? undefined;
        let iconPublicId = existing.iconPublicId ?? undefined;

        // Replace icon if new file uploaded
        if (req.file) {
            if (existing.iconPublicId) await deleteImage(existing.iconPublicId);
            const result = await uploadImage(req.file.buffer, "metro-sewa/categories");
            icon = result.url;
            iconPublicId = result.publicId;
        }

        const updated = await prisma.category.update({
            where: { id: categoryId },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(isActive !== undefined && { isActive: isActive === "true" || isActive === true }),
                icon,
                iconPublicId,
            },
        });

        sendSuccess(res, updated, "Category updated");
    },
);

// ── Delete Category ──────────────────────────────────────────────────
export const deleteCategory = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const categoryId = req.params.categoryId as string;
        const existing = await prisma.category.findUnique({
            where: { id: categoryId },
            include: { subCategories: { include: { images: true } } },
        });
        if (!existing) throw new AppError("Category not found", 404, true, "NOT_FOUND");

        // Delete all subcategory images from Cloudinary
        for (const sub of existing.subCategories) {
            if (sub.iconPublicId) await deleteImage(sub.iconPublicId);
            for (const img of sub.images) await deleteImage(img.publicId);
        }

        // Delete category icon from Cloudinary
        if (existing.iconPublicId) await deleteImage(existing.iconPublicId);

        await prisma.category.delete({ where: { id: categoryId } });
        sendSuccess(res, null, "Category deleted");
    },
);

// ─────────────────────────────────────────────────────────────────────
//  SUBCATEGORY CRUD
// ─────────────────────────────────────────────────────────────────────

// ── Get SubCategories (optionally by category) ───────────────────────
export const getAllSubCategories = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const categoryId = req.query.categoryId as string | undefined;
        const subCategories = await prisma.subCategory.findMany({
            where: categoryId ? { categoryId: categoryId as string } : undefined,
            include: {
                images: true,
                category: { select: { id: true, name: true } },
                _count: { select: { services: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        sendSuccess(res, subCategories, "SubCategories retrieved");
    },
);

// ── Get SubCategories by Category (path param) ───────────────────────
export const getSubCategoriesByCategory = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const categoryId = req.params.categoryId as string;
        const category = await prisma.category.findUnique({ where: { id: categoryId } });
        if (!category) throw new AppError("Category not found", 404, true, "NOT_FOUND");

        const subCategories = await prisma.subCategory.findMany({
            where: { categoryId },
            include: { images: true, _count: { select: { services: true } } },
            orderBy: { createdAt: "desc" },
        });
        sendSuccess(res, subCategories, "SubCategories retrieved");
    },
);

// ── Create SubCategory ───────────────────────────────────────────────
export const createSubCategory = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const { categoryId, name, description, isActive } = req.body;

        const category = await prisma.category.findUnique({ where: { id: categoryId } });
        if (!category) throw new AppError("Category not found", 404, true, "NOT_FOUND");

        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

        // Single icon
        let icon: string | undefined;
        let iconPublicId: string | undefined;
        if (files?.["icon"]?.[0]) {
            const result = await uploadImage(files["icon"][0].buffer, "metro-sewa/subcategories/icons");
            icon = result.url;
            iconPublicId = result.publicId;
        }

        // Multiple extra images
        const extraImages: { url: string; publicId: string }[] = [];
        if (files?.["images"]) {
            for (const file of files["images"]) {
                const result = await uploadImage(file.buffer, "metro-sewa/subcategories/images");
                extraImages.push({ url: result.url, publicId: result.publicId });
            }
        }

        const subCategory = await prisma.subCategory.create({
            data: {
                categoryId,
                name,
                description,
                isActive: isActive === "true" || isActive === true ? true : true,
                icon,
                iconPublicId,
                images: {
                    create: extraImages,
                },
            },
            include: { images: true },
        });

        sendSuccess(res, subCategory, "SubCategory created", 201);
    },
);

// ── Update SubCategory ───────────────────────────────────────────────
export const updateSubCategory = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const subCategoryId = req.params.subCategoryId as string;
        const { categoryId, name, description, isActive, removeImageIds } = req.body;

        const existing = await prisma.subCategory.findUnique({
            where: { id: subCategoryId },
            include: { images: true },
        });
        if (!existing) throw new AppError("SubCategory not found", 404, true, "NOT_FOUND");

        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

        // Replace icon if uploaded
        let icon = existing.icon ?? undefined;
        let iconPublicId = existing.iconPublicId ?? undefined;
        if (files?.["icon"]?.[0]) {
            if (existing.iconPublicId) await deleteImage(existing.iconPublicId);
            const result = await uploadImage(files["icon"][0].buffer, "metro-sewa/subcategories/icons");
            icon = result.url;
            iconPublicId = result.publicId;
        }

        // Remove specific extra images if requested
        if (removeImageIds) {
            const ids: string[] = Array.isArray(removeImageIds) ? removeImageIds : [removeImageIds];
            const toDelete = existing.images.filter((img) => ids.includes(img.id));
            for (const img of toDelete) await deleteImage(img.publicId);
            await prisma.subCategoryImage.deleteMany({ where: { id: { in: ids } } });
        }

        // Append new extra images
        const extraImages: { url: string; publicId: string }[] = [];
        if (files?.["images"]) {
            for (const file of files["images"]) {
                const result = await uploadImage(file.buffer, "metro-sewa/subcategories/images");
                extraImages.push({ url: result.url, publicId: result.publicId });
            }
        }

        const updated = await prisma.subCategory.update({
            where: { id: subCategoryId },
            data: {
                ...(categoryId && { categoryId }),
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(isActive !== undefined && { isActive: isActive === "true" || isActive === true }),
                icon,
                iconPublicId,
                ...(extraImages.length > 0 && { images: { create: extraImages } }),
            },
            include: { images: true },
        });

        sendSuccess(res, updated, "SubCategory updated");
    },
);

// ── Delete SubCategory ───────────────────────────────────────────────
export const deleteSubCategory = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const subCategoryId = req.params.subCategoryId as string;
        const existing = await prisma.subCategory.findUnique({
            where: { id: subCategoryId },
            include: { images: true },
        });
        if (!existing) throw new AppError("SubCategory not found", 404, true, "NOT_FOUND");

        // Delete all images from Cloudinary
        if (existing.iconPublicId) await deleteImage(existing.iconPublicId);
        for (const img of existing.images) await deleteImage(img.publicId);

        await prisma.subCategory.delete({ where: { id: subCategoryId } });
        sendSuccess(res, null, "SubCategory deleted");
    },
);

// ─────────────────────────────────────────────────────────────────────
//  SERVICE CRUD (updated with category + images)
// ─────────────────────────────────────────────────────────────────────

// ── Get All Services ─────────────────────────────────────────────────
export const getAllServices = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
        const services = await prisma.service.findMany({
            include: {
                images: true,
                category: { select: { id: true, name: true, icon: true } },
                subCategory: { select: { id: true, name: true, icon: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        sendSuccess(res, services, "Services retrieved");
    },
);

// ── Get Service By Id ────────────────────────────────────────────────
export const getServiceById = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const serviceId = req.params.serviceId as string;
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: {
                images: true,
                category: { select: { id: true, name: true, icon: true } },
                subCategory: { select: { id: true, name: true, icon: true } },
            },
        });
        if (!service) throw new AppError("Service not found", 404, true, "NOT_FOUND");
        sendSuccess(res, service, "Service retrieved");
    },
);

// ── Create Service ───────────────────────────────────────────────────
export const createService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const { name, description, price, categoryId, subCategoryId, isActive } = req.body;

        // Upload multiple images if provided
        const files = req.files as Express.Multer.File[] | undefined;
        const serviceImages: { url: string; publicId: string; isMain: boolean }[] = [];

        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const result = await uploadImage(files[i].buffer, "metro-sewa/services");
                serviceImages.push({ url: result.url, publicId: result.publicId, isMain: i === 0 });
            }
        }

        const service = await prisma.service.create({
            data: {
                name,
                description,
                price: price ? Number(price) : undefined,
                categoryId: categoryId || undefined,
                subCategoryId: subCategoryId || undefined,
                isActive: isActive === "true" || isActive === true ? true : true,
                images: { create: serviceImages },
            },
            include: {
                images: true,
                category: { select: { id: true, name: true, icon: true } },
                subCategory: { select: { id: true, name: true, icon: true } },
            },
        });

        sendSuccess(res, service, "Service created", 201);
    },
);

// ── Update Service ───────────────────────────────────────────────────
export const updateService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const serviceId = req.params.serviceId as string;
        const { name, description, price, categoryId, subCategoryId, isActive, removeImageIds } = req.body;

        const existing = await prisma.service.findUnique({
            where: { id: serviceId },
            include: { images: true },
        });
        if (!existing) throw new AppError("Service not found", 404, true, "NOT_FOUND");

        // Remove selected images
        if (removeImageIds) {
            const ids: string[] = Array.isArray(removeImageIds) ? removeImageIds : [removeImageIds];
            const toDelete = existing.images.filter((img) => ids.includes(img.id));
            for (const img of toDelete) await deleteImage(img.publicId);
            await prisma.serviceImage.deleteMany({ where: { id: { in: ids } } });
        }

        // Append new images
        const files = req.files as Express.Multer.File[] | undefined;
        const newImages: { url: string; publicId: string; isMain: boolean }[] = [];
        const remainingImages = existing.images.filter(
            (img) => !Array.isArray(removeImageIds) ? removeImageIds !== img.id : !removeImageIds?.includes(img.id)
        );

        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const result = await uploadImage(files[i].buffer, "metro-sewa/services");
                // Mark as main if no existing images remain
                newImages.push({ url: result.url, publicId: result.publicId, isMain: remainingImages.length === 0 && i === 0 });
            }
        }

        const updated = await prisma.service.update({
            where: { id: serviceId },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(price !== undefined && price !== "" && { price: Number(price) }),
                ...(categoryId !== undefined && { categoryId: categoryId || null }),
                ...(subCategoryId !== undefined && { subCategoryId: subCategoryId || null }),
                ...(isActive !== undefined && { isActive: isActive === "true" || isActive === true }),
                ...(newImages.length > 0 && { images: { create: newImages } }),
            },
            include: {
                images: true,
                category: { select: { id: true, name: true, icon: true } },
                subCategory: { select: { id: true, name: true, icon: true } },
            },
        });

        sendSuccess(res, updated, "Service updated");
    },
);

// ── Delete Service ───────────────────────────────────────────────────
export const deleteService = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const serviceId = req.params.serviceId as string;
        const existing = await prisma.service.findUnique({
            where: { id: serviceId },
            include: { images: true },
        });
        if (!existing) throw new AppError("Service not found", 404, true, "NOT_FOUND");

        // Delete all images from Cloudinary
        for (const img of existing.images) await deleteImage(img.publicId);

        await prisma.service.delete({ where: { id: serviceId } });
        sendSuccess(res, null, "Service deleted");
    },
);

// ─────────────────────────────────────────────────────────────────────
//  TECHNICIAN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────

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
                        avatar: true,
                        address: true,
                    },
                },
                specializations: true,
            },
            orderBy: { createdAt: "desc" },
        });
        sendSuccess(res, technicians, "Technicians retrieved");
    },
);

// ─────────────────────────────────────────────────────────────────────
//  USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────

// ── Get All Users ────────────────────────────────────────────────────
export const getAllUsers = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
        const users = await prisma.user.findMany({
            where: { role: "USER" },
            include: {
                _count: {
                    select: { bookings: true }
                }
            },
            orderBy: { createdAt: "desc" },
        });
        sendSuccess(res, users, "Users retrieved");
    },
);

// ── Delete User ──────────────────────────────────────────────────────
export const deleteUser = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.params.userId as string;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new AppError("User not found", 404, true, "NOT_FOUND");
        }

        // Delete all related records to avoid foreign key constraint errors
        await prisma.$transaction([
            prisma.notification.deleteMany({ where: { userId: userId } }),
            prisma.review.deleteMany({ where: { userId: userId } }),
            prisma.payment.deleteMany({ where: { userId: userId } }),
            prisma.message.deleteMany({ where: { senderId: userId } }),
            prisma.message.deleteMany({ where: { receiverId: userId } }),
            prisma.booking.deleteMany({ where: { userId: userId } }),
            prisma.technician.deleteMany({ where: { userId: userId } }),
            prisma.admin.deleteMany({ where: { userId: userId } }),
            prisma.user.delete({ where: { id: userId } })
        ]);

        sendSuccess(res, null, "User deleted successfully");
    },
);

// ─────────────────────────────────────────────────────────────────────
//  BOOKINGS / PAYMENTS / CONTACTS
// ─────────────────────────────────────────────────────────────────────

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
                    service: { include: { images: true, category: { select: { id: true, name: true } } } },
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

// ─────────────────────────────────────────────────────────────────────
//  DASHBOARD & ANALYTICS
// ─────────────────────────────────────────────────────────────────────

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
            totalCategories,
            totalServices,
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
            prisma.category.count(),
            prisma.service.count(),
        ]);

        const stats = {
            totalUsers,
            totalTechnicians,
            totalBookings,
            pendingBookings,
            completedBookings,
            totalRevenue: totalRevenueAgg._sum.amount || 0,
            totalCategories,
            totalServices,
        };

        sendSuccess(res, stats, "Dashboard stats retrieved");
    },
);

// ── Analytics ────────────────────────────────────────────────────────
export const getAnalytics = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
        // Bookings by status
        const bookingsStatusGroups = await prisma.booking.groupBy({
            by: ["status"],
            _count: { _all: true },
        });

        const bookingsByStatus = bookingsStatusGroups.reduce(
            (acc, curr) => {
                acc[curr.status] = curr._count._all;
                return acc;
            },
            {} as Record<string, number>,
        );

        // Last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const [recentUsers, recentPayments] = await Promise.all([
            prisma.user.findMany({
                where: { createdAt: { gte: sixMonthsAgo } },
                select: { createdAt: true },
            }),
            prisma.payment.findMany({
                where: { createdAt: { gte: sixMonthsAgo }, status: "PAID" },
                select: { createdAt: true, amount: true },
            }),
        ]);

        const usersByMonth: Record<string, number> = {};
        recentUsers.forEach((user) => {
            const month = user.createdAt.toLocaleString("default", { month: "short" });
            usersByMonth[month] = (usersByMonth[month] || 0) + 1;
        });

        const revenueByMonth: Record<string, number> = {};
        recentPayments.forEach((payment) => {
            const month = payment.createdAt.toLocaleString("default", { month: "short" });
            revenueByMonth[month] = (revenueByMonth[month] || 0) + payment.amount;
        });

        // Services grouped by category
        const servicesByCategory = await prisma.category.findMany({
            select: {
                name: true,
                _count: { select: { services: true } },
            },
        });

        const analytics = {
            bookingsByStatus,
            usersByMonth,
            revenueByMonth,
            servicesByCategory: servicesByCategory.map((c) => ({
                category: c.name,
                count: c._count.services,
            })),
        };

        sendSuccess(res, analytics, "Analytics retrieved");
    },
);
