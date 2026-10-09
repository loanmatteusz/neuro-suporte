// Mensagens de erro de envio (SMTP/Node) podem trazer o e-mail do destinatário: no log, só nome e código (sem PII).
export function errorSummary(e: unknown): { name: string; code?: string } {
  const code = (e as { code?: unknown } | null | undefined)?.code;
  return {
    name: e instanceof Error ? e.name : typeof e,
    ...(typeof code === "string" ? { code } : {}),
  };
}
