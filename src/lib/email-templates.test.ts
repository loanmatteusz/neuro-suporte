import { describe, expect, test } from "vitest";
import { escapeHtml } from "./escape-html";
import { inviteEmail, newContentEmail, otpEmail } from "./email-templates";

test("escapeHtml", () => {
  expect(escapeHtml(`<b>"Ana" & 'Bia'</b>`)).toBe("&lt;b&gt;&quot;Ana&quot; &amp; &#39;Bia&#39;&lt;/b&gt;");
});

describe("templates", () => {
  test("otp contém o código e a validade no html e no texto", () => {
    const e = otpEmail({ otp: "123456", minutes: 10 });
    expect(e.subject).toBe("Seu código de acesso: 123456");
    expect(e.html).toContain("123456");
    expect(e.text).toContain("10 minutos");
  });

  test("convite escapa nome com HTML e mantém texto literal na versão texto", () => {
    const e = inviteEmail({
      name: `<script>alert(1)</script> & "Zé"`,
      loginUrl: "https://neuro.vercel.app/login?email=ze%40x.com",
      psychologistName: "Dra. <i>X</i>",
    });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.html).not.toContain("<i>X</i>");
    expect(e.text).toContain(`<script>alert(1)</script> & "Zé"`);
    expect(e.html).toContain('href="https://neuro.vercel.app/login?email=ze%40x.com"');
  });

  test("aviso de novo conteúdo escapa o título", () => {
    const e = newContentEmail({ name: "Ana", title: "A & B <c>", url: "https://x/course/1", psychologistName: "P" });
    expect(e.subject).toBe("Novo conteúdo no Neuro Suporte: A & B <c>");
    expect(e.html).toContain("A &amp; B &lt;c&gt;");
  });

  test("todos têm o aviso ético", () => {
    for (const e of [
      otpEmail({ otp: "1", minutes: 10 }),
      inviteEmail({ name: "a", loginUrl: "https://x", psychologistName: "p" }),
      newContentEmail({ name: "a", title: "t", url: "https://x", psychologistName: "p" }),
    ]) {
      expect(e.text).toContain("não substitui acompanhamento profissional individual");
    }
  });

  test("URL com aspas/javascript é recusada", () => {
    expect(() => inviteEmail({ name: "a", loginUrl: 'javascript:alert(1)', psychologistName: "p" })).toThrow();
  });
});
