import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database.js";
import { AppError } from "./errorhandle.js";

// Extend Express Request to include user info
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

export const authenticate = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new AppError("Access denied. No token provided.", 401, true, "NO_TOKEN");
        }

        const token = authHeader.split(" ")[1]!;
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new AppError("JWT secret not configured", 500, false);
        }

        const decoded = jwt.verify(token, secret) as { id: string; email: string; role: string };

        // Verify user still exists in database
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true },
        });

        if (!user) {
            throw new AppError("User no longer exists", 401, true, "USER_NOT_FOUND");
        }

        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        next();
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else if (error instanceof jwt.JsonWebTokenError) {
            next(new AppError("Invalid token", 401, true, "INVALID_TOKEN"));
        } else if (error instanceof jwt.TokenExpiredError) {
            next(new AppError("Token has expired", 401, true, "EXPIRED_TOKEN"));
        } else {
            next(new AppError("Authentication failed", 401, true, "AUTH_FAILED"));
        }
    }
};
