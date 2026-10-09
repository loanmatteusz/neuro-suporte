import { siteConfig } from "@/config/site";
import { escapeHtml } from "./escape-html";

export type EmailContent = { subject: string; html: string; text: string };

function safeUrl(url: string): string {
  const u = new URL(url);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("URL inválida para e-mail");
  return escapeHtml(u.toString());
}

function layout(bodyHtml: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#FBF8F3;font-family:Arial,Helvetica,sans-serif;color:#26323B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#FFFFFF;border-radius:20px;padding:32px">
<tr><td style="font-size:22px;font-weight:bold;color:#1F7A66;padding-bottom:16px">${escapeHtml(siteConfig.name)}</td></tr>
<tr><td style="font-size:17px;line-height:1.6">${bodyHtml}</td></tr>
<tr><td style="font-size:13px;color:#5B6670;padding-top:24px">${escapeHtml(siteConfig.ethicsNotice)}</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${href}" style="background:#1F7A66;color:#FFFFFF;text-decoration:none;padding:14px 24px;border-radius:12px;display:inline-block;font-weight:bold">${escapeHtml(label)}</a></p>`;
}

export function otpEmail({ otp, minutes }: { otp: string; minutes: number }): EmailContent {
  return {
    subject: `Seu código de acesso: ${otp}`,
    html: layout(
      `<p>Use este código para entrar:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${escapeHtml(otp)}</p><p>Ele vale por ${minutes} minutos. Se não foi você que pediu, pode ignorar este e-mail.</p>`,
    ),
    text: `Seu código de acesso ao ${siteConfig.name}: ${otp}\nEle vale por ${minutes} minutos.\n\n${siteConfig.ethicsNotice}`,
  };
}

export function inviteEmail({ name, loginUrl, psychologistName }: { name: string; loginUrl: string; psychologistName: string }): EmailContent {
  const href = safeUrl(loginUrl);
  return {
    subject: `Seu acesso ao ${siteConfig.name} está pronto`,
    html: layout(
      `<p>Olá, ${escapeHtml(name)}!</p><p>${escapeHtml(psychologistName)} convidou você para o curso ${escapeHtml(siteConfig.name)}. É bem simples entrar:</p><ol><li>Abra o site e digite o seu e-mail.</li><li>Digite o código que chegar no seu e-mail. Não precisa de senha.</li></ol>${button(href, "Entrar no curso")}<p>Siga no seu ritmo — os conteúdos ficam liberados desde o primeiro acesso.</p>`,
    ),
    text: `Olá, ${name}!\n\n${psychologistName} convidou você para o curso ${siteConfig.name}.\n1. Abra ${loginUrl} e digite o seu e-mail.\n2. Digite o código que chegar no seu e-mail. Não precisa de senha.\n\n${siteConfig.ethicsNotice}`,
  };
}

export function newContentEmail({ name, title, url, psychologistName }: { name: string; title: string; url: string; psychologistName: string }): EmailContent {
  const href = safeUrl(url);
  return {
    subject: `Novo conteúdo no ${siteConfig.name}: ${title}`,
    html: layout(
      `<p>Olá, ${escapeHtml(name)}!</p><p>${escapeHtml(psychologistName)} publicou um novo conteúdo: <strong>${escapeHtml(title)}</strong>.</p>${button(href, "Ver conteúdo")}<p>Quando for possível para você, sem pressa.</p>`,
    ),
    text: `Olá, ${name}!\n\n${psychologistName} publicou um novo conteúdo: ${title}.\n${url}\n\n${siteConfig.ethicsNotice}`,
  };
}
