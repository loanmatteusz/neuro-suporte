export type ParticipantStatus = "disabled" | "never" | "inactive" | "active";

export function participantStatus(p: { banned: boolean | null; lastSeenAt: Date | null }, now: Date, inactiveAfterDays: number): ParticipantStatus {
  if (p.banned) return "disabled";
  if (!p.lastSeenAt) return "never";
  return now.getTime() - p.lastSeenAt.getTime() >= inactiveAfterDays * 86_400_000 ? "inactive" : "active";
}

export const STATUS_LABEL: Record<ParticipantStatus, string> = {
  disabled: "Acesso desativado",
  never: "Convidado, ainda não acessou",
  inactive: "Inativo",
  active: "Ativo",
};
