import nodemailer from "nodemailer";
import type { EmailContent } from "../../src/lib/email-templates";

type Send = (mail: { to: string } & EmailContent) => Promise<void>;

/** `isReal` é false quando o SMTP não está configurado e `send` só imprime no console. */
export function createScriptMailer(): { send: Send; isReal: boolean } {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
    return {
      isReal: false,
      send: async ({ to, subject, text }) => {
        console.info(`[email:dev] Para: ${to} · ${subject}\n${text}\n`);
      },
    };
  }
  const port = Number(SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  return {
    isReal: true,
    send: async ({ to, subject, html, text }) => {
      await transport.sendMail({ from: EMAIL_FROM, to, subject, html, text });
    },
  };
}
