import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { globalErrorHandler, notFoundHandler } from "./middleware/errorhandle.js";

// ── Route Imports ────────────────────────────────────────────────────
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import technicianRoutes from "./routes/technician.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import publicRoutes from "./routes/public.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

dotenv.config();
const app = express();
const PORT = process.env["PORT"] || 5000;
const rawBodyLimit = process.env.REQUEST_BODY_LIMIT?.trim();
const REQUEST_BODY_LIMIT = rawBodyLimit
    ? /^[0-9]+$/.test(rawBodyLimit)
        ? `${rawBodyLimit}mb`
        : rawBodyLimit
    : "30mb";

app.set("trust proxy", 1);

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "200"),
    message: "Too many requests from this IP, please try again later.",
});

// ── Global Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    }),
);
app.use(morgan("combined"));
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));
app.use(limiter);

// ── Health-check ─────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (_req, res) => {
    res.json({ message: "Welcome to Metro-Sewa backend API" });
});

// ── API Routes ───────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/technicians", technicianRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/payment", paymentRoutes);

// ── Error Handling (must be after routes) ────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── Start Server ─────────────────────────────────────────────────────
async function main() {
    await connectDatabase();

    app.listen(PORT, () => {
        console.log(`Metro-Sewa backend is running on http://localhost:${PORT}`);
    });
}

// ── Graceful Shutdown ────────────────────────────────────────────────
process.on("SIGINT", async () => {
    await disconnectDatabase();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await disconnectDatabase();
    process.exit(0);
});

// ── Graceful Shutdown ────────────────────────────────────────────────
process.on("SIGINT", async () => {
    await disconnectDatabase();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await disconnectDatabase();
    process.exit(0);
});

main().catch(console.error);
