import crypto from "crypto";

/**
 * Generate a 6-digit OTP code
 */
export const generateOTP = (): string => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Generate OTP expiration time (10 minutes from now)
 */
export const generateOTPExpiration = (): Date => {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 10);
    return expirationTime;
};

/**
 * Check if OTP is expired
 */
export const isOTPExpired = (expiresAt: Date): boolean => {
    return new Date() > expiresAt;
};

/**
 * Validate OTP format (6 digits)
 */
export const isValidOTPFormat = (otp: string): boolean => {
    return /^\d{6}$/.test(otp);
};
