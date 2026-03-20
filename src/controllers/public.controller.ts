import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../middleware/errorhandle.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { prisma } from "../config/database.js";

// ── Get Public Categories ───────────────────────────────────────────
export const getPublicCategories = asyncHandler(
    async (_req: Request, res: Response, _next: NextFunction) => {
        const categories = await prisma.category.findMany({
            where: { isActive: true },
            include: {
                _count: { select: { services: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        sendSuccess(res, categories, "Categories retrieved");
    },
);

// ── Get Public Services ─────────────────────────────────────────────
export const getPublicServices = asyncHandler(
    async (_req: Request, res: Response, _next: NextFunction) => {
        const services = await prisma.service.findMany({
            where: { isActive: true },
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
