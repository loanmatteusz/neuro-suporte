import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";
import type { EmailContent } from "./email-templates";

export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM);
}

let transporter: Transporter | null = null;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

export async function sendMail({ to, subject, html, text }: { to: string } & EmailContent): Promise<void> {
  if (!isEmailConfigured()) {
    if (process.env.VERCEL_ENV === "production") throw new Error("SMTP não configurado.");
    console.info(`\n[email:dev] Para: ${to}\nAssunto: ${subject}\n${text}\n`);
    return;
  }
  await getTransporter().sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
}
