export type LoginGateResult = "ok" | "NOT_INVITED" | "ACCESS_DISABLED";

export function loginGate(user: { banned: boolean | null } | null): LoginGateResult {
  if (!user) return "NOT_INVITED";
  if (user.banned) return "ACCESS_DISABLED";
  return "ok";
}

const disabled = "Seu acesso está pausado no momento. Fale com a psicóloga para retomar.";

// "{psychologist}" é trocado pelo nome em SiteSettings na tela de login.
export const LOGIN_ERROR_MESSAGES = {
  NOT_INVITED: "Este e-mail ainda não tem acesso. Fale com {psychologist} para receber seu convite.",
  ACCESS_DISABLED: disabled,
  BANNED_USER: disabled,
  INVALID_OTP: "Código incorreto ou expirado. Confira o e-mail ou peça um novo código.",
  TOO_MANY_REQUESTS: "Muitas tentativas seguidas. Espere um minuto e tente de novo.",
  UNKNOWN: "Não conseguimos continuar agora. Tente de novo em instantes.",
} as const;
