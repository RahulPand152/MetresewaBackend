import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { asyncHandler, AppError } from "../middleware/errorhandle.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { prisma } from "../config/database.js";

// ── Submit Contact Message (public) ──────────────────────────────────
export const submitContact = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
        const contact = await prisma.contactMessage.create({ data: req.body });
        sendSuccess(res, contact, "Your message has been submitted", 201);
    },
);

// ── Get All Contact Messages (admin) ─────────────────────────────────
export const getContacts = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
        const contacts = await prisma.contactMessage.findMany({
            orderBy: { createdAt: "desc" },
        });
        sendSuccess(res, contacts, "Contact messages retrieved");
    },
);

// ── Update Contact Status (admin) ────────────────────────────────────
export const updateContactStatus = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const contactId = req.params.contactId as string;
        const status = req.body.status;

        const contact = await prisma.contactMessage.findUnique({ where: { id: contactId } });
        if (!contact) {
            throw new AppError("Contact message not found", 404, true, "NOT_FOUND");
        }

        const updated = await prisma.contactMessage.update({
            where: { id: contactId },
            data: { status },
        });

        sendSuccess(res, updated, "Contact status updated");
    },
);
