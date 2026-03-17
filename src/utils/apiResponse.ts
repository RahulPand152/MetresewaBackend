import type { Response } from "express";

export const sendSuccess = (
    res: Response,
    data: unknown = null,
    message: string = "Success",
    statusCode: number = 200,
) => {
    res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

export const sendError = (
    res: Response,
    message: string = "Something went wrong",
    statusCode: number = 500,
    code?: string,
) => {
    res.status(statusCode).json({
        success: false,
        error: {
            status: statusCode,
            message,
            code,
        },
    });
};

export const sendPaginated = (
    res: Response,
    data: unknown[],
    total: number,
    page: number,
    limit: number,
    message: string = "Success",
) => {
    res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    });
};
