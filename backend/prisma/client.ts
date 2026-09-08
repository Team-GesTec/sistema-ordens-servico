import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
// Aqui dá erro por que
import { PrismaClient } from "./generated/client";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({
    adapter,
});