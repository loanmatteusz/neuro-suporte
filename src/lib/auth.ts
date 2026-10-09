import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP } from "better-auth/plugins";
import { siteConfig } from "@/config/site";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { otpEmail } from "@/lib/email-templates";
import { normalizeEmail } from "@/lib/email-address";
import { loginGate } from "@/lib/login-gate";

const DAY = 60 * 60 * 24;

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  session: { expiresIn: siteConfig.sessionDays * DAY, updateAge: DAY },
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
      "/sign-in/email-otp": { window: 60, max: 5 },
    },
  },
  advanced: { ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] } },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/email-otp/send-verification-otp") return;
      const email = normalizeEmail(String(ctx.body?.email ?? ""));
      const user = await prisma.user.findUnique({ where: { email }, select: { banned: true } });
      const gate = loginGate(user);
      if (gate !== "ok") throw new APIError("FORBIDDEN", { message: gate, code: gate });
    }),
  },
  plugins: [
    emailOTP({
      disableSignUp: true,
      otpLength: 6,
      expiresIn: siteConfig.otpMinutes * 60,
      async sendVerificationOTP({ email, otp }) {
        if (process.env.NODE_ENV !== "production") console.info(`[auth:dev] OTP para ${email}: ${otp}`);
        // Aguardado de propósito: em serverless um envio solto pode ser interrompido.
        await sendMail({ to: email, ...otpEmail({ otp, minutes: siteConfig.otpMinutes }) });
      },
    }),
    admin({ defaultRole: "participant", adminRoles: ["admin"] }),
    nextCookies(),
  ],
});
