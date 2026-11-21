import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./src/prisma/schema.prisma",
  migrations: {
    path: "./src/prisma/migrations/",
    seed: "tsx ./src/prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
    // Migrations já versionadas podem ser aplicadas sem shadow database.
    // A URL só é necessária ao criar migrations com `prisma migrate dev`.
    ...(process.env.SHADOW_DATABASE_URL
      ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
      : {}),
  },
});