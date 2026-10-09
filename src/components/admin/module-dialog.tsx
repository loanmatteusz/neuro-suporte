"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createModule, updateModule } from "@/app/admin/content/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ModuleDialog({ trigger, module }: { trigger: React.ReactNode; module?: { id: string; title: string; description: string | null } }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(module?.title ?? "");
  const [description, setDescription] = useState(module?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const input = { title, description };
      const res = module ? await updateModule(module.id, input) : await createModule(input);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(module ? "Módulo atualizado." : "Módulo criado.");
      setOpen(false);
      if (!module) {
        setTitle("");
        setDescription("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{module ? "Editar módulo" : "Novo módulo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="module-title">Título</Label>
            <Input id="module-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-12" aria-invalid={Boolean(errors.title)} />
            {errors.title && <p className="text-sm text-destructive">{errors.title[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="module-description">Descrição curta (opcional)</Label>
            <Textarea id="module-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            {errors.description && <p className="text-sm text-destructive">{errors.description[0]}</p>}
          </div>
          <Button type="submit" className="h-12 w-full" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
