import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV === "production") {
  console.log("[build] Aplicando migrations no banco de produção…");
  execSync("pnpm prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log(`[build] VERCEL_ENV=${process.env.VERCEL_ENV ?? "local"}: migrations não aplicadas.`);
}
