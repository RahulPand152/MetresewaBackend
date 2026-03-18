import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { asyncHandler, AppError } from "../middleware/errorhandle.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { prisma } from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendWelcomeEmail, sendOTPEmail } from "../services/email.service.js";
import { generateOTP, generateOTPExpiration, isOTPExpired } from "../utils/otpUtils.js";

// ── Generate JWT ─────────────────────────────────────────────────────
const generateToken = (payload: { id: string; email: string; role: string }): string => {
    const secret = process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_EXPIRE || "30d";
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

const generateRefreshToken = (payload: { id: string }): string => {
    const secret = process.env.JWT_REFRESH_SECRET!;
    const expiresIn = process.env.JWT_REFRESH_EXPIRE || "60d";
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

// ── Register User ────────────────────────────────────────────────────
export const register = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const data = req.body;
        const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
        if (existingUser) {
            throw new AppError("Email already registered", 409, true, "DUPLICATE_EMAIL");
        }

        const hashedPassword = await bcrypt.hash(data.password, 12);

        const otp = generateOTP();
        const otpExpires = generateOTPExpiration();

        const user = await prisma.user.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                password: hashedPassword,
                phoneNumber: data.phoneNumber,
                address: data.address,
                role: "USER",
                otp,
                otpExpires,
                otpPurpose: "registration",
            },
        });

        await sendOTPEmail(user.email, otp, "registration");

        sendSuccess(res, null, "Registration initiated. Please check your email for the OTP.", 201);
    },
);

// ── Register Technician ──────────────────────────────────────────────
export const registerTechnician = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const data = req.body;
        const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
        if (existingUser) {
            throw new AppError("Email already registered", 409, true, "DUPLICATE_EMAIL");
        }

        const hashedPassword = await bcrypt.hash(data.password, 12);

        const otp = generateOTP();
        const otpExpires = generateOTPExpiration();

        const user = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    password: hashedPassword,
                    phoneNumber: data.phoneNumber,
                    address: data.address,
                    role: "TECHNICIAN",
                    otp,
                    otpExpires,
                    otpPurpose: "registration",
                },
            });

            await tx.technician.create({
                data: {
                    userId: newUser.id,
                    bio: data.bio,
                    experience: data.experience,
                    skills: data.skills,
                    certification: data.certification,
                },
            });

            return newUser;
        });

        await sendOTPEmail(user.email, otp, "registration");

        sendSuccess(res, null, "Registration initiated. Please check your email for the OTP.", 201);
    },
);

// ── Verify Registration OTP ──────────────────────────────────────────
export const verifyRegistrationOTP = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const { email, otp } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.otpPurpose !== "registration" || !user.otp || !user.otpExpires) {
            throw new AppError("Invalid or expired OTP", 400, true, "INVALID_OTP");
        }

        if (isOTPExpired(user.otpExpires)) {
            throw new AppError("OTP has expired", 400, true, "OTP_EXPIRED");
        }

        if (user.otp !== otp) {
            throw new AppError("Invalid OTP", 400, true, "INVALID_OTP");
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                otp: null,
                otpExpires: null,
                otpPurpose: null,
            },
        });

        const token = generateToken({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role });
        const refreshToken = generateRefreshToken({ id: updatedUser.id });

        sendWelcomeEmail(updatedUser.email, updatedUser.firstName, updatedUser.role as "USER" | "TECHNICIAN");

        const { password: _, ...userWithoutPassword } = updatedUser;
        sendSuccess(res, { user: userWithoutPassword, token, refreshToken }, "Email verified successfully", 200);
    },
);

// ── Login ────────────────────────────────────────────────────────────
export const login = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new AppError("Invalid email or password", 401, true, "INVALID_CREDENTIALS");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new AppError("Invalid email or password", 401, true, "INVALID_CREDENTIALS");
        }

        if (!user.isEmailVerified) {
            throw new AppError("Please verify your email before logging in", 401, true, "EMAIL_NOT_VERIFIED");
        }

        const token = generateToken({ id: user.id, email: user.email, role: user.role });
        const refreshToken = generateRefreshToken({ id: user.id });

        const { password: _, ...userWithoutPassword } = user;
        sendSuccess(res, { user: userWithoutPassword, token, refreshToken }, "Login successful");
    },
);

// ── Logout ───────────────────────────────────────────────────────────
export const logout = asyncHandler(
    async (_req: AuthRequest, res: Response, _next: NextFunction) => {
        sendSuccess(res, null, "Logout successful");
    },
);

// ── Get Profile ──────────────────────────────────────────────────────
export const getProfile = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                address: true,
                avatar: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                technician: true,
            },
        });

        if (!user) {
            throw new AppError("User not found", 404, true, "USER_NOT_FOUND");
        }

        sendSuccess(res, user, "Profile retrieved");
    },
);

// ── Update Profile ───────────────────────────────────────────────────
export const updateProfile = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        const user = await prisma.user.update({
            where: { id: userId },
            data: req.body,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                address: true,
                avatar: true,
                role: true,
                updatedAt: true,
            },
        });
        sendSuccess(res, user, "Profile updated");
    },
);

// ── Upload Profile Image ─────────────────────────────────────────────
export const uploadProfileImage = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        if (!req.file) {
            res.status(400).json({ success: false, error: { message: "No file provided" } });
            return;
        }
        const { uploadImage } = await import("../services/cloudinary.service.js");
        const { url } = await uploadImage(req.file.buffer, "metro-sewa/profiles");

        const user = await prisma.user.update({
            where: { id: req.user!.id },
            data: { avatar: url },
            select: { id: true, avatar: true },
        });

        sendSuccess(res, user, "Profile image uploaded");
    },
);

// ── Delete Profile Image ─────────────────────────────────────────────
export const deleteProfileImage = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const userId = req.user!.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { avatar: true },
        });

        if (user?.avatar) {
            const { deleteImage } = await import("../services/cloudinary.service.js");
            const parts = user.avatar.split("/");
            const uploadIndex = parts.indexOf("upload");
            if (uploadIndex !== -1) {
                const publicId = parts.slice(uploadIndex + 2).join("/").replace(/\.[^.]+$/, "");
                await deleteImage(publicId);
            }
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { avatar: null },
            select: { id: true, avatar: true },
        });

        sendSuccess(res, updated, "Profile image deleted");
    },
);

// ── Request Password Reset (OTP-based) ──────────────────────────────
export const requestPasswordReset = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const email = req.body.email;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Don't reveal whether the email exists
            sendSuccess(res, { message: "If the email exists, a reset OTP has been sent." }, "If the email exists, a reset OTP has been sent.");
            return;
        }

        const otp = generateOTP();
        const otpExpires = generateOTPExpiration();

        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp,
                otpExpires,
                otpPurpose: "forgot-password",
            },
        });

        await sendOTPEmail(user.email, otp, "forgot-password");

        sendSuccess(res, { message: "If the email exists, a reset OTP has been sent." }, "If the email exists, a reset OTP has been sent.");
    },
);

// ── Verify OTP 
export const verifyOTP = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const { email, otp } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.otp || !user.otpExpires) {
            throw new AppError("Invalid or expired OTP", 400, true, "INVALID_OTP");
        }

        if (isOTPExpired(user.otpExpires)) {
            throw new AppError("OTP has expired", 400, true, "OTP_EXPIRED");
        }

        if (user.otp !== otp) {
            throw new AppError("Invalid OTP", 400, true, "INVALID_OTP");
        }

        // Clear OTP after successful verification
        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp: null,
                otpExpires: null,
                otpPurpose: null,
            },
        });

        sendSuccess(res, { verified: true, email: user.email }, "OTP verified successfully.");
    },
);

// ── Reset Password (OTP-verified) ───────────────────────────────────
export const resetPassword = asyncHandler(
    async (req: AuthRequest, res: Response, _next: NextFunction) => {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new AppError("User not found", 404, true, "USER_NOT_FOUND");
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });

        sendSuccess(res, { message: "Password has been reset successfully." }, "Password has been reset successfully.");
    },
);
