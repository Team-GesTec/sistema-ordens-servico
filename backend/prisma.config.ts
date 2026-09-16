import "dotenv/config"
import { defineConfig } from "prisma/config";

// ALTERAÇÃO (16/09/2026): `env("DIRECT_URL")` foi trocado por `process.env.DIRECT_URL`.
// O `env()` do Prisma lança erro quando a variável não existe, e isso fazia QUALQUER comando do
// Prisma falhar sem o .env — inclusive o `prisma generate` do postinstall, que nem precisa do
// banco (era por isso que a pasta prisma/generated não existia). Comandos que realmente usam o
// banco (migrate, db seed, studio) continuam precisando do DIRECT_URL no .env.
export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    url: process.env.DIRECT_URL,
  },
});
