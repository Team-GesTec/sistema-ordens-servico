import "dotenv/config";
import { defineConfig } from "prisma/config";

// A geração do client depende do schema, não de uma conexão. Comandos que consultam
// ou alteram o banco continuam exigindo DIRECT_URL sem revelar seu conteúdo.
const argumentosPrisma = new Set(process.argv.slice(2).map((arg) => arg.toLowerCase()));
const exigeDirectUrl = ["migrate", "db", "studio", "introspect"].some((arg) => argumentosPrisma.has(arg));
if (exigeDirectUrl && !process.env.DIRECT_URL?.trim()) {
  throw new Error(
    "Variável de ambiente obrigatória ausente: DIRECT_URL. Configure-a localmente em backend/.env antes de executar comandos que acessam o banco.",
  );
}

export default defineConfig({
  schema: "./src/prisma/schema.prisma",
  migrations: {
    path: "./src/prisma/migrations/",
    seed: "tsx ./src/prisma/seed.ts",
  },
  datasource: {
    // Ausente apenas em `prisma generate`; comandos de banco validam a variável acima.
    url: process.env.DIRECT_URL ?? "",
  },
});