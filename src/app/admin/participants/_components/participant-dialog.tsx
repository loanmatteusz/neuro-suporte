"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { inviteParticipant, updateParticipant } from "@/app/admin/participants/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ParticipantDialog({ trigger, participant }: { trigger: React.ReactNode; participant?: { id: string; name: string; email: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(participant?.name ?? "");
  const [email, setEmail] = useState(participant?.email ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      if (participant) {
        const r = await updateParticipant(participant.id, { name, email });
        if (!r.ok) return void (setErrors(r.fieldErrors ?? {}), toast.error(r.error));
        toast.success("Dados atualizados.");
      } else {
        const r = await inviteParticipant({ name, email });
        if (!r.ok) return void (setErrors(r.fieldErrors ?? {}), toast.error(r.error));
        if (r.data.emailSent) toast.success("Convite enviado por e-mail.");
        else toast.warning("Participante cadastrado, mas o e-mail não foi enviado. Use “Reenviar convite”.");
        setName("");
        setEmail("");
      }
      setErrors({});
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{participant ? "Editar participante" : "Convidar participante"}</DialogTitle>
          {!participant && <DialogDescription>A pessoa recebe um e-mail de boas-vindas explicando como entrar.</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="p-name">Nome do responsável</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} className="h-12" autoComplete="off" aria-invalid={Boolean(errors.name)} />
            {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-email">E-mail</Label>
            <Input id="p-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" autoComplete="off" aria-invalid={Boolean(errors.email)} />
            {errors.email && <p className="text-sm text-destructive">{errors.email[0]}</p>}
          </div>
          <Button type="submit" className="h-12 w-full" disabled={pending}>
            {pending ? "Salvando…" : participant ? "Salvar" : "Convidar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
