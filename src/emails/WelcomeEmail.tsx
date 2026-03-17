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

interface WelcomeEmailProps {
    firstName: string;
    role: "USER" | "TECHNICIAN";
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
    firstName,
    role,
}) => {
    const isTechnician = role === "TECHNICIAN";
    const previewText = isTechnician
        ? `Welcome to Metro Sewa, ${firstName}! Your technician account is ready.`
        : `Welcome to Metro Sewa, ${firstName}! Start booking home services.`;

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
                            Welcome to Metro Sewa, {firstName}! 🎉
                        </Text>

                        <Text style={bodyText}>
                            {isTechnician
                                ? "Thank you for joining Metro Sewa as a technician! Your account has been created successfully. Once approved by our admin team, you'll be able to receive job assignments and start earning."
                                : "Thank you for joining Metro Sewa! We're excited to help you with all your home service needs. You can now browse services and book appointments at your convenience."}
                        </Text>

                        {/* Features Box */}
                        <Section style={featuresBox}>
                            <Text style={featuresTitle}>
                                {isTechnician
                                    ? "🔧 What you can do as a Technician:"
                                    : "🏠 What you can do:"}
                            </Text>
                            <ul style={featuresList}>
                                {isTechnician ? (
                                    <>
                                        <li style={featureItem}>
                                            Receive and manage job assignments
                                        </li>
                                        <li style={featureItem}>
                                            Communicate with customers directly
                                        </li>
                                        <li style={featureItem}>
                                            Build your reputation with reviews
                                        </li>
                                        <li style={featureItem}>
                                            Track your earnings and performance
                                        </li>
                                    </>
                                ) : (
                                    <>
                                        <li style={featureItem}>
                                            Browse and book home services easily
                                        </li>
                                        <li style={featureItem}>
                                            Get skilled technicians assigned to your bookings
                                        </li>
                                        <li style={featureItem}>
                                            Track your bookings in real-time
                                        </li>
                                        <li style={featureItem}>
                                            Rate and review completed services
                                        </li>
                                    </>
                                )}
                            </ul>
                        </Section>

                        {/* Getting Started */}
                        <Section style={infoSection}>
                            <Text style={infoTitle}>
                                <strong>🚀 Getting Started:</strong>
                            </Text>
                            <Text style={bodyText}>
                                {isTechnician
                                    ? "Complete your profile by adding your skills, certifications, and experience. Our admin team will review and approve your account shortly."
                                    : "Complete your profile and start exploring available services in your area. Book your first appointment today!"}
                            </Text>
                        </Section>

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

export default WelcomeEmail;

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
    fontSize: "22px",
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

const featuresBox = {
    backgroundColor: "#eef2ff",
    border: "1px solid #c7d2fe",
    borderRadius: "8px",
    padding: "20px",
    margin: "20px 0",
};

const featuresTitle = {
    fontSize: "16px",
    fontWeight: "600" as const,
    color: "#333",
    margin: "0 0 10px 0",
};

const featuresList = {
    margin: "10px 0",
    paddingLeft: "20px",
};

const featureItem = {
    fontSize: "15px",
    margin: "8px 0",
    color: "#4338ca",
};

const infoSection = {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "4px",
    padding: "15px",
    margin: "20px 0",
};

const infoTitle = {
    fontSize: "14px",
    fontWeight: "600" as const,
    margin: "0 0 5px 0",
    color: "#166534",
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
