import "dotenv/config"
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./src/prisma/schema.prisma",

  migrations: {
    path: "./src/prisma/migrations",
    seed: "tsx ./src/prisma/seed.ts",
  },

  datasource: {
    url: env("DIRECT_URL"),
  },
});
