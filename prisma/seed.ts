// ── Metro Sewa Database Seed ─────────────────────────────────────────
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Environment variable constants for seeds
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@metrosewa.com";
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || "password123";

async function main() {
    console.log("🌱 Starting Metro Sewa database seed...");

    // ── Hash password for all seed users ─────────────────────────────
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    // ── 1. Create Services ───────────────────────────────────────────
    const plumbingService = await prisma.service.upsert({
        where: { id: "svc_plumbing" },
        update: {},
        create: {
            id: "svc_plumbing",
            name: "Plumbing",
            description:
                "Professional plumbing services including pipe repair, installation, leak fixing, and drainage solutions.",
            price: 1500,
        },
    });

    const electricalService = await prisma.service.upsert({
        where: { id: "svc_electrical" },
        update: {},
        create: {
            id: "svc_electrical",
            name: "Electrical Repair",
            description:
                "Expert electrical services including wiring, switch/socket repair, fan installation, and electrical troubleshooting.",
            price: 1200,
        },
    });

    const cleaningService = await prisma.service.upsert({
        where: { id: "svc_cleaning" },
        update: {},
        create: {
            id: "svc_cleaning",
            name: "Home Cleaning",
            description:
                "Thorough home cleaning services including deep cleaning, kitchen cleaning, bathroom sanitization, and general tidying.",
            price: 2000,
        },
    });

    const paintingService = await prisma.service.upsert({
        where: { id: "svc_painting" },
        update: {},
        create: {
            id: "svc_painting",
            name: "Painting",
            description:
                "Interior and exterior painting services including wall painting, ceiling work, and waterproofing.",
            price: 3000,
        },
    });

    const applianceService = await prisma.service.upsert({
        where: { id: "svc_appliance" },
        update: {},
        create: {
            id: "svc_appliance",
            name: "Appliance Repair",
            description:
                "Repair and maintenance of home appliances including washing machines, refrigerators, ACs, and microwaves.",
            price: 1800,
        },
    });

    console.log("✅ Services created");

    // ── 2. Create Specializations ────────────────────────────────────
    const specPlumbing = await prisma.specialization.upsert({
        where: { name: "Plumbing" },
        update: {},
        create: { name: "Plumbing" },
    });

    const specElectrical = await prisma.specialization.upsert({
        where: { name: "Electrical Repair" },
        update: {},
        create: { name: "Electrical Repair" },
    });

    const specCleaning = await prisma.specialization.upsert({
        where: { name: "Deep Cleaning" },
        update: {},
        create: { name: "Deep Cleaning" },
    });

    const specPainting = await prisma.specialization.upsert({
        where: { name: "Painting" },
        update: {},
        create: { name: "Painting" },
    });

    const specAppliance = await prisma.specialization.upsert({
        where: { name: "Appliance Repair" },
        update: {},
        create: { name: "Appliance Repair" },
    });

    console.log("✅ Specializations created");

    // ── 3. Create Admin User ─────────────────────────────────────────
    const adminUser = await prisma.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: {},
        create: {
            email: ADMIN_EMAIL,
            password: hashedPassword,
            firstName: "Admin",
            lastName: "MetroSewa",
            role: "ADMIN",
            phoneNumber: "9800000001",
            address: "Kathmandu, Nepal",
            isEmailVerified: true,
        },
    });

    // Create Admin profile
    const existingAdmin = await prisma.admin.findUnique({
        where: { userId: adminUser.id },
    });
    if (!existingAdmin) {
        await prisma.admin.create({
            data: { userId: adminUser.id },
        });
    }

    console.log("✅ Admin user created");

    // ── 4. Create Technician User ────────────────────────────────────
    const techUser = await prisma.user.upsert({
        where: { email: "technician@metrosewa.com" },
        update: {},
        create: {
            email: "technician@metrosewa.com",
            password: hashedPassword,
            firstName: "Ram",
            lastName: "Sharma",
            role: "TECHNICIAN",
            phoneNumber: "9800000002",
            address: "Lalitpur, Nepal",
            isEmailVerified: true,
        },
    });

    // Create Technician profile with specializations
    const existingTech = await prisma.technician.findUnique({
        where: { userId: techUser.id },
    });
    if (!existingTech) {
        await prisma.technician.create({
            data: {
                userId: techUser.id,
                bio: "Experienced technician with 5+ years in plumbing and electrical repair. Certified and reliable service provider in the Kathmandu Valley.",
                experience: 5,
                skills: "Plumbing, Electrical Wiring, Pipe Fitting, Water Heater Installation",
                certification: "Nepal Technical Certification Board - Level 3",
                rating: 4.5,
                isAvailable: true,
                isApproved: true,
                specializations: {
                    connect: [{ id: specPlumbing.id }, { id: specElectrical.id }],
                },
            },
        });
    }

    // Create a second technician
    const techUser2 = await prisma.user.upsert({
        where: { email: "sita.tech@metrosewa.com" },
        update: {},
        create: {
            email: "sita.tech@metrosewa.com",
            password: hashedPassword,
            firstName: "Sita",
            lastName: "Thapa",
            role: "TECHNICIAN",
            phoneNumber: "9800000004",
            address: "Bhaktapur, Nepal",
            isEmailVerified: true,
        },
    });

    const existingTech2 = await prisma.technician.findUnique({
        where: { userId: techUser2.id },
    });
    if (!existingTech2) {
        await prisma.technician.create({
            data: {
                userId: techUser2.id,
                bio: "Professional home cleaner and painter with attention to detail. 3 years of experience in residential and commercial cleaning.",
                experience: 3,
                skills: "Deep Cleaning, Wall Painting, Interior Design, Sanitization",
                certification: "Certified Cleaning Professional",
                rating: 4.8,
                isAvailable: true,
                isApproved: true,
                specializations: {
                    connect: [{ id: specCleaning.id }, { id: specPainting.id }],
                },
            },
        });
    }

    console.log("✅ Technician users created");

    // ── 5. Create Regular User ───────────────────────────────────────
    const regularUser = await prisma.user.upsert({
        where: { email: "john.doe@email.com" },
        update: {},
        create: {
            email: "john.doe@email.com",
            password: hashedPassword,
            firstName: "John",
            lastName: "Doe",
            role: "USER",
            phoneNumber: "9800000003",
            address: "Kathmandu, Nepal",
            isEmailVerified: true,
        },
    });

    console.log("✅ Regular user created");

    // ── 6. Create Sample Bookings ────────────────────────────────────
    const existingBooking = await prisma.booking.findFirst({
        where: { userId: regularUser.id, serviceId: plumbingService.id },
    });
    if (!existingBooking) {
        await prisma.booking.create({
            data: {
                userId: regularUser.id,
                serviceId: plumbingService.id,
                description:
                    "Kitchen sink pipe is leaking and needs urgent repair. Water is dripping from the joint area.",
                status: "PENDING",
                scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            },
        });
    }

    const existingBooking2 = await prisma.booking.findFirst({
        where: { userId: regularUser.id, serviceId: cleaningService.id },
    });
    if (!existingBooking2) {
        await prisma.booking.create({
            data: {
                userId: regularUser.id,
                serviceId: cleaningService.id,
                description:
                    "Full home deep cleaning needed for a 3BHK apartment before a family gathering.",
                status: "ASSIGNED",
                scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
            },
        });
    }

    console.log("✅ Sample bookings created");

    // ── Done ─────────────────────────────────────────────────────────
    console.log("\n🎉 Database seeded successfully!");
    console.log("─────────────────────────────────────────────");
    console.log(`🔑 Login Credentials (password: ${DEFAULT_PASSWORD}):`);
    console.log("─────────────────────────────────────────────");
    console.log(`👤 Admin:      ${ADMIN_EMAIL}`);
    console.log("🔧 Technician: technician@metrosewa.com");
    console.log("🔧 Technician: sita.tech@metrosewa.com");
    console.log("👤 User:       john.doe@email.com");
    console.log("─────────────────────────────────────────────");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
