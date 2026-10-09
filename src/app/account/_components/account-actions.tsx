"use client";

import { useRouter } from "next/navigation";
import { LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMyAccount } from "@/app/account/actions";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { authClient } from "@/lib/auth-client";

export function AccountActions({ canDelete }: { canDelete: boolean }) {
  const router = useRouter();
  const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 font-bold hover:bg-muted";
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button type="button" className={btn} onClick={async () => { await authClient.signOut(); router.replace("/"); router.refresh(); }}>
        <LogOut className="size-4" aria-hidden /> Sair
      </button>
      {canDelete && (
        <ConfirmDelete
          title="Excluir a sua conta?"
          description="Seus dados e todo o seu progresso serão apagados para sempre. Se quiser voltar depois, será preciso um novo convite."
          confirmLabel="Excluir minha conta"
          onConfirm={async () => {
            const r = await deleteMyAccount();
            if (!r.ok) return void toast.error(r.error);
            await authClient.signOut().catch(() => undefined);
            router.replace("/");
            router.refresh();
          }}
          trigger={<button type="button" className={`${btn} border-destructive/40 text-destructive`}><Trash2 className="size-4" aria-hidden /> Excluir minha conta</button>}
        />
      )}
    </div>
  );
}
