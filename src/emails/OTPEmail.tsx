import React from "react";
import {
    Body,
    Container,
    Head,
    Hr,
    Html,
    Preview,
    Row,
    Section,
    Text,
} from "@react-email/components";

interface OTPEmailProps {
    email: string;
    otp: string;
    purpose: "registration" | "forgot-password";
}

export const OTPEmail: React.FC<OTPEmailProps> = ({ email, otp, purpose }) => {
    const isRegistration = purpose === "registration";
    const previewText = isRegistration
        ? "Verify your email to complete Metro Sewa registration"
        : "Reset your Metro Sewa password";

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={headerSection}>
                        <Row>
                            <Text style={headerTitle}>Metro Sewa</Text>
                        </Row>
                    </Section>

                    {/* Main Content */}
                    <Section style={contentSection}>
                        <Text style={greeting}>
                            {isRegistration
                                ? "Email Verification Required"
                                : "Password Reset Request"}
                        </Text>

                        <Text style={bodyText}>
                            {isRegistration
                                ? "Thank you for registering with Metro Sewa! To complete your registration, please verify your email address using the code below:"
                                : "We received a request to reset your password. Use the verification code below to proceed:"}
                        </Text>

                        {/* OTP Box */}
                        <Section style={otpBoxSection}>
                            <Text style={otpLabel}>Your verification code is:</Text>
                            <Text style={otpCode}>{otp}</Text>
                            <Text style={otpExpiry}>This code will expire in 10 minutes</Text>
                        </Section>

                        {/* Security Notice */}
                        <Section style={warningSection}>
                            <Text style={warningTitle}>
                                <strong>🔒 Security Notice:</strong>
                            </Text>
                            <ul style={warningList}>
                                <li style={warningItem}>
                                    This code is valid for 10 minutes only
                                </li>
                                <li style={warningItem}>Never share this code with anyone</li>
                                <li style={warningItem}>
                                    If you didn&apos;t request this, please ignore this email
                                </li>
                            </ul>
                        </Section>

                        <Text style={bodyText}>
                            {isRegistration
                                ? "Once verified, you can access all Metro Sewa features and book home services!"
                                : "After verification, you will be able to set a new password for your account."}
                        </Text>

                        <Hr style={hr} />

                        {/* Footer */}
                        <Text style={footerText}>
                            © {new Date().getFullYear()} Metro Sewa. All rights reserved.
                        </Text>
                        <Text style={footerNote}>
                            This is an automated message, please do not reply to this email.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default OTPEmail;

// ── Styles ───────────────────────────────────────────────────────────
const main = {
    backgroundColor: "#f8f9fa",
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    color: "#333",
};

const container = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "0",
    marginBottom: "64px",
};

const headerSection = {
    backgroundColor: "#2563eb",
    padding: "30px 20px",
    textAlign: "center" as const,
};

const headerTitle = {
    color: "#ffffff",
    fontSize: "28px",
    fontWeight: "bold" as const,
    margin: "0",
};

const contentSection = {
    padding: "30px 30px",
};

const greeting = {
    fontSize: "20px",
    fontWeight: "600" as const,
    color: "#333",
    margin: "0 0 15px 0",
};

const bodyText = {
    fontSize: "16px",
    lineHeight: "1.6",
    color: "#666",
    margin: "15px 0",
};

const otpBoxSection = {
    backgroundColor: "#f0f4f8",
    border: "2px solid #2563eb",
    borderRadius: "8px",
    padding: "20px",
    textAlign: "center" as const,
    margin: "20px 0",
};

const otpLabel = {
    fontSize: "16px",
    color: "#666",
    margin: "0 0 10px 0",
};

const otpCode = {
    fontSize: "36px",
    fontWeight: "bold" as const,
    color: "#2563eb",
    letterSpacing: "8px",
    margin: "10px 0",
    fontFamily: "monospace",
};

const otpExpiry = {
    fontSize: "14px",
    color: "#666",
    margin: "10px 0 0 0",
};

const warningSection = {
    backgroundColor: "#fff3cd",
    border: "1px solid #ffeaa7",
    borderRadius: "4px",
    padding: "15px",
    margin: "20px 0",
    color: "#856404",
};

const warningTitle = {
    fontSize: "14px",
    fontWeight: "600" as const,
    margin: "0 0 10px 0",
};

const warningList = {
    margin: "10px 0",
    paddingLeft: "20px",
};

const warningItem = {
    fontSize: "14px",
    margin: "5px 0",
    color: "#856404",
};

const hr = {
    borderColor: "#e9ecef",
    margin: "30px 0",
};

const footerText = {
    fontSize: "14px",
    color: "#999",
    textAlign: "center" as const,
    margin: "10px 0",
};

const footerNote = {
    fontSize: "12px",
    color: "#999",
    textAlign: "center" as const,
    margin: "10px 0 0 0",
};
