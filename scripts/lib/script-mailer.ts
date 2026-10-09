import nodemailer from "nodemailer";
import type { EmailContent } from "../../src/lib/email-templates";

export function createScriptMailer() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
    return async ({ to, subject, text }: { to: string } & EmailContent) => {
      console.info(`[email:dev] Para: ${to} · ${subject}\n${text}\n`);
    };
  }
  const port = Number(SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  return async ({ to, subject, html, text }: { to: string } & EmailContent) => {
    await transport.sendMail({ from: EMAIL_FROM, to, subject, html, text });
  };
}
