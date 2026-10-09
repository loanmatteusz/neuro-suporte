import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const isProd = process.env.VERCEL_ENV === "production";
const smtp = isProd ? z.string().min(1) : z.string().optional();

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    SMTP_HOST: smtp,
    SMTP_PORT: z.coerce.number().int().default(465),
    SMTP_USER: smtp,
    SMTP_PASS: smtp,
    EMAIL_FROM: smtp,
    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().min(1),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  },
  client: {},
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
});
