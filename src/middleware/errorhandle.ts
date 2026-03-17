import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod/v4";

// ── Custom Application Error ─────────────────────────────────────────
export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;
    public code?: string;

    constructor(
        message: string,
        statusCode: number = 500,
        isOperational: boolean = true,
        code?: string,
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}

// ── Async Handler Wrapper ────────────────────────────────────────────
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// ── Prisma Error Handler ─────────────────────────────────────────────
const handlePrismaError = (error: any): AppError => {
    switch (error.code) {
        case "P2000":
            return new AppError("The provided value is too long for the field", 400, true, "INVALID_INPUT");
        case "P2001":
            return new AppError("Record not found", 404, true, "NOT_FOUND");
        case "P2002": {
            const target = error.meta?.target as string[] | undefined;
            const field = target?.[0] || "field";
            return new AppError(`${field} already exists`, 409, true, "DUPLICATE_ENTRY");
        }
        case "P2003":
            return new AppError("Foreign key constraint failed", 400, true, "FOREIGN_KEY_CONSTRAINT");
        case "P2025":
            return new AppError("Record not found for operation", 404, true, "RECORD_NOT_FOUND");
        default:
            return new AppError("Database operation failed", 500, true, "DATABASE_ERROR");
    }
};

// ── Zod Error Handler ────────────────────────────────────────────────
const handleZodError = (error: ZodError): AppError => {
    const errors = error.issues
        .map((err) => {
            const path = err.path.join(".");
            return `${path}: ${err.message}`;
        })
        .join(", ");

    return new AppError(`Validation failed: ${errors}`, 400, true, "VALIDATION_ERROR");
};

// ── Dev Error Response ───────────────────────────────────────────────
const sendErrorDev = (err: AppError, res: Response) => {
    res.status(err.statusCode).json({
        success: false,
        error: {
            status: err.statusCode,
            message: err.message,
            code: err.code,
            stack: err.stack,
        },
    });
};

// ── Prod Error Response ──────────────────────────────────────────────
const sendErrorProd = (err: AppError, res: Response) => {
    if (err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                status: err.statusCode,
                message: err.message,
                code: err.code,
            },
        });
    } else {
        console.error("ERROR:", err);
        res.status(500).json({
            success: false,
            error: {
                status: 500,
                message: "Something went wrong on our end. Please try again later.",
                code: "INTERNAL_SERVER_ERROR",
            },
        });
    }
};

// ── Global Error Handler Middleware ──────────────────────────────────
export const globalErrorHandler = (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
    err.statusCode = err.statusCode || 500;

    let error = { ...err, message: err.message };

    // Prisma known request errors
    if (err.constructor?.name === "PrismaClientKnownRequestError") {
        error = handlePrismaError(err);
    }

    // Prisma validation errors
    if (err.constructor?.name === "PrismaClientValidationError") {
        error = new AppError("Invalid data provided", 400, true, "VALIDATION_ERROR");
    }

    // Zod validation errors
    if (err instanceof ZodError) {
        error = handleZodError(err);
    }

    // JWT errors
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        error = err.name === "TokenExpiredError"
            ? new AppError("Token has expired", 401, true, "EXPIRED_TOKEN")
            : new AppError("Invalid token", 401, true, "INVALID_TOKEN");
    }

    // Multer file upload errors
    if (err.code === "LIMIT_FILE_SIZE") {
        error = new AppError("File too large (max 5MB)", 400, true, "FILE_TOO_LARGE");
    }

    if (process.env.NODE_ENV === "development") {
        sendErrorDev(error, res);
    } else {
        sendErrorProd(error, res);
    }
};

// ── 404 Not-Found Handler ────────────────────────────────────────────
export const notFoundHandler = (
    req: Request,
    _res: Response,
    next: NextFunction,
) => {
    next(new AppError(`Route ${req.originalUrl} not found`, 404, true, "ROUTE_NOT_FOUND"));
};
