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

interface TwoFactorAuthEmailProps {
    email: string;
    otp: string;
}

export const TwoFactorAuthEmail: React.FC<TwoFactorAuthEmailProps> = ({
    email,
    otp,
}) => {
    return (
        <Html>
            <Head />
            <Preview>Your Metro Sewa Two-Factor Authentication Code</Preview>
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
                        <Text style={greeting}>Two-Factor Authentication</Text>

                        <Text style={bodyText}>
                            A sign-in attempt requires further verification. To complete the
                            sign-in, enter the verification code below on the authentication
                            page:
                        </Text>

                        {/* OTP Box */}
                        <Section style={otpBoxSection}>
                            <Text style={otpLabel}>Your 2FA code is:</Text>
                            <Text style={otpCode}>{otp}</Text>
                            <Text style={otpExpiry}>This code will expire in 10 minutes</Text>
                        </Section>

                        {/* Security Notice */}
                        <Section style={warningSection}>
                            <Text style={warningTitle}>
                                <strong>🛡️ Security Alert:</strong>
                            </Text>
                            <ul style={warningList}>
                                <li style={warningItem}>
                                    This code is valid for 10 minutes only
                                </li>
                                <li style={warningItem}>Never share this code with anyone</li>
                                <li style={warningItem}>
                                    Metro Sewa staff will never ask for this code
                                </li>
                                <li style={warningItem}>
                                    If you did not initiate this request, change your password
                                    immediately
                                </li>
                            </ul>
                        </Section>

                        <Text style={bodyText}>
                            If you did not attempt to sign in, your account may be
                            compromised. Please change your password immediately and contact
                            our support team.
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

export default TwoFactorAuthEmail;

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
    backgroundColor: "#7c3aed",
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
    backgroundColor: "#faf5ff",
    border: "2px solid #7c3aed",
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
    color: "#7c3aed",
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
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "4px",
    padding: "15px",
    margin: "20px 0",
    color: "#991b1b",
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
    color: "#991b1b",
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
