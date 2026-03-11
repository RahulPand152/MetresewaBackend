import "dotenv/config";
import express from "express"
import cors from "cors"
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

dotenv.config()
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
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes default
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "200"), // limit each IP to 200 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
});

// ── Middleware 
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



// ── Health-check route    
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

//Routes
app.get("/", (_req, res) => {
    res.json({ message: "Welcome to Metro-Sewa backend" });
});

// ── Start server 
async function main() {
    await connectDatabase();

    app.listen(PORT, () => {
        console.log(` Metro-Sewa backend is running on http://localhost:${PORT}`);
    });
}

// ── Graceful shutdown 
process.on("SIGINT", async () => {
    await disconnectDatabase();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await disconnectDatabase();
    process.exit(0);
});

main().catch(console.error);
