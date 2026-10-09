"use client";

import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { notifyParticipants } from "@/app/admin/content/notify-actions";
import { ConfirmDelete } from "@/components/admin/confirm-delete";

export function NotifyButton({ itemId, notifiedAt, recipients }: { itemId: string; notifiedAt: Date | null; recipients: number }) {
  const router = useRouter();
  const when = notifiedAt ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(notifiedAt) : null;
  return (
    <ConfirmDelete
      title={when ? `Avisar de novo? (já avisado em ${when})` : "Avisar participantes?"}
      description={`Vamos enviar um e-mail para ${recipients} participante${recipients === 1 ? "" : "s"} ativo${recipients === 1 ? "" : "s"} contando sobre este conteúdo.`}
      confirmLabel="Enviar e-mails"
      tone="primary"
      onConfirm={async () => {
        const r = await notifyParticipants(itemId);
        if (!r.ok) return void toast.error(r.error);
        if (r.data.failed) toast.warning(`Enviados: ${r.data.sent}. Não enviados: ${r.data.failed}.`);
        else toast.success(`E-mail enviado para ${r.data.sent} participante${r.data.sent === 1 ? "" : "s"}.`);
        router.refresh();
      }}
      trigger={
        <button type="button" disabled={recipients === 0} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 font-bold hover:bg-muted disabled:opacity-50">
          <Mail className="size-4" aria-hidden /> {when ? `Avisado em ${when}` : "Avisar participantes"}
        </button>
      }
    />
  );
}
