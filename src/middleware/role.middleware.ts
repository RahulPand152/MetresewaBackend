import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware.js";
import { AppError } from "./errorhandle.js";

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, _res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError("Authentication required", 401, true, "NOT_AUTHENTICATED"));
        }

        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    "You do not have permission to perform this action",
                    403,
                    true,
                    "FORBIDDEN",
                ),
            );
        }

        next();
    };
};
