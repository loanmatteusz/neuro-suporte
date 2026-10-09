import type { JSONContent } from "@tiptap/core";

const paragraph = (text: string): JSONContent => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const bullets = (items: string[]): JSONContent => ({
  type: "doc",
  content: [
    {
      type: "bulletList",
      content: items.map((text) => ({
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      })),
    },
  ],
});

export const siteConfig = {
  name: "Neuro Suporte",
  defaults: {
    courseTitle: "Neuro Suporte",
    courseSubtitle: "Um caminho acolhedor para pais e cuidadores de crianças autistas.",
    aboutCourse: paragraph(
      "Um curso em módulos curtos, com vídeos e materiais de apoio, para você entender melhor o seu filho e encontrar caminhos possíveis no dia a dia — no seu ritmo, de onde estiver.",
    ),
    audience: bullets([
      "Mães, pais e cuidadores de crianças autistas",
      "Quem recebeu o diagnóstico há pouco tempo e quer se orientar",
      "Familiares que querem apoiar a rotina da criança",
    ]),
    learnings: bullets([
      "O que é o autismo, em linguagem simples",
      "Como rotinas previsíveis podem ajudar a criança e a família",
      "Formas de comunicação e de fortalecer o vínculo",
    ]),
    psychologistName: "[Nome da Psicóloga]",
    crp: "CRP 00/00000",
    bio: paragraph("Psicóloga dedicada ao acompanhamento de famílias de crianças autistas. [Texto de apresentação a ser enviado.]"),
    approach: paragraph("[Descreva aqui a abordagem de trabalho.]"),
    contactUrl: "https://wa.me/5500000000000",
  },
  ethicsNotice: "Este conteúdo é educativo e não substitui acompanhamento profissional individual.",
  inactiveAfterDays: 14,
  sessionDays: 60,
  otpMinutes: 10,
  pdfMaxBytes: 20 * 1024 * 1024,
  imageMaxBytes: 5 * 1024 * 1024,
  notifyBatchSize: 10,
} as const;

export type SiteDefaults = typeof siteConfig.defaults;
