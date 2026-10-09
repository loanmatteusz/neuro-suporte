import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // `prisma generate` não conecta ao banco e roda no postinstall, antes de existir .env.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
