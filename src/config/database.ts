import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: [], // Completely disable all Prisma logs including SQL queries
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

// Test database connection
export const connectDatabase = async () => {
    try {
        await prisma.$connect();
        console.log(" Database  is connected successfully");
    } catch (error) {
        console.error(" Database connection is failed:", error);
        process.exit(1);
    }
};

export async function disconnectDatabase(): Promise<void> {
    await prisma.$disconnect();
    await pool.end();
    console.log(" Database  is disconnected");
}
