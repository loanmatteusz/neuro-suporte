"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Pencil, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteParticipant, resendInvite, setParticipantActive } from "@/app/admin/participants/actions";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { ParticipantDialog } from "@/app/admin/participants/_components/participant-dialog";

const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 font-bold hover:bg-muted disabled:opacity-50";

export function ParticipantActions({ p }: { p: { id: string; name: string; email: string; banned: boolean } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(success);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <ParticipantDialog participant={p} trigger={<button type="button" className={btn}><Pencil className="size-4" aria-hidden /> Editar</button>} />
      <button type="button" className={btn} disabled={pending || p.banned} onClick={() => run(() => resendInvite(p.id), "Convite reenviado.")}>
        <Mail className="size-4" aria-hidden /> Reenviar convite
      </button>
      <button type="button" className={btn} disabled={pending} onClick={() => run(() => setParticipantActive(p.id, p.banned), p.banned ? "Acesso reativado." : "Acesso desativado.")}>
        <Power className="size-4" aria-hidden /> {p.banned ? "Reativar acesso" : "Desativar acesso"}
      </button>
      <ConfirmDelete
        title={`Excluir ${p.name}?`}
        description="Todos os dados e o progresso desta pessoa serão apagados (LGPD). Isso não pode ser desfeito. Para só pausar o acesso, use “Desativar acesso”."
        onConfirm={async () => {
          const r = await deleteParticipant(p.id);
          if (!r.ok) return void toast.error(r.error);
          toast.success("Participante excluído.");
          router.replace("/admin/participants");
        }}
        trigger={<button type="button" className={`${btn} border-destructive/40 text-destructive`}><Trash2 className="size-4" aria-hidden /> Excluir</button>}
      />
    </div>
  );
}
