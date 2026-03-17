import { render } from "@react-email/render";
import React from "react";
import transporter, { EMAIL_FROM } from "../config/email.js";
import { OTPEmail } from "../emails/OTPEmail.js";
import { WelcomeEmail } from "../emails/WelcomeEmail.js";
import { TwoFactorAuthEmail } from "../emails/TwoFactorAuthEmail.js";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (error) {
    console.error("Email send failed:", error);
    // Don't throw — email failure shouldn't break the main flow
  }
};

// ── OTP Email (Registration & Forgot Password) ──────────────────────
export const sendOTPEmail = async (
  email: string,
  otp: string,
  purpose: "registration" | "forgot-password",
): Promise<void> => {
  const isRegistration = purpose === "registration";
  const subject = isRegistration
    ? "Verify Your Email — Metro Sewa"
    : "Password Reset Code — Metro Sewa";

  const html = await render(
    React.createElement(OTPEmail, { email, otp, purpose }),
  );

  await sendEmail({ to: email, subject, html });
};

// ── Welcome Email ────────────────────────────────────────────────────
export const sendWelcomeEmail = async (
  email: string,
  firstName: string,
  role: "USER" | "TECHNICIAN" = "USER",
): Promise<void> => {
  const html = await render(
    React.createElement(WelcomeEmail, { firstName, role }),
  );

  await sendEmail({
    to: email,
    subject: "Welcome to Metro Sewa!",
    html,
  });
};

// ── Two-Factor Authentication Email ─────────────────────────────────
export const sendTwoFactorAuthEmail = async (
  email: string,
  otp: string,
): Promise<void> => {
  const html = await render(
    React.createElement(TwoFactorAuthEmail, { email, otp }),
  );

  await sendEmail({
    to: email,
    subject: "Your 2FA Code — Metro Sewa",
    html,
  });
};

// ── Booking Confirmation ─────────────────────────────────────────────
export const sendBookingConfirmation = async (
  email: string,
  firstName: string,
  serviceName: string,
  scheduledDate: string,
  bookingId: string,
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: "Booking Confirmed — Metro Sewa",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Booking Confirmed ✅</h2>
        <p>Hi ${firstName},</p>
        <p>Your booking has been confirmed. Here are the details:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold;">Booking ID</td><td style="padding: 8px;">${bookingId}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Service</td><td style="padding: 8px;">${serviceName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Scheduled Date</td><td style="padding: 8px;">${scheduledDate}</td></tr>
        </table>
        <p>We'll assign a technician shortly and notify you.</p>
        <hr style="border: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 12px;">© Metro Sewa. All rights reserved.</p>
      </div>
    `,
  });
};

// ── Technician Assignment ────────────────────────────────────────────
export const sendTechnicianAssignment = async (
  technicianEmail: string,
  technicianName: string,
  serviceName: string,
  scheduledDate: string,
  bookingId: string,
): Promise<void> => {
  await sendEmail({
    to: technicianEmail,
    subject: "New Job Assigned — Metro Sewa",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Job Assignment 🔧</h2>
        <p>Hi ${technicianName},</p>
        <p>You have been assigned a new job:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold;">Booking ID</td><td style="padding: 8px;">${bookingId}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Service</td><td style="padding: 8px;">${serviceName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Scheduled Date</td><td style="padding: 8px;">${scheduledDate}</td></tr>
        </table>
        <p>Please log in to your dashboard to accept or manage this job.</p>
        <hr style="border: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 12px;">© Metro Sewa. All rights reserved.</p>
      </div>
    `,
  });
};

// ── Contact Form Reply ───────────────────────────────────────────────
export const sendContactReply = async (
  email: string,
  fullName: string,
  originalTitle: string,
  replyMessage: string,
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: `Re: ${originalTitle} — Metro Sewa`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Reply to Your Message</h2>
        <p>Hi ${fullName},</p>
        <p>Thank you for contacting Metro Sewa. Here is our response to your inquiry "<strong>${originalTitle}</strong>":</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p>${replyMessage}</p>
        </div>
        <p>If you have further questions, feel free to reach out.</p>
        <hr style="border: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 12px;">© Metro Sewa. All rights reserved.</p>
      </div>
    `,
  });
};
