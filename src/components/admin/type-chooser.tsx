"use client";

import Link from "next/link";
import { FileText, Plus, Video } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function TypeChooser({ moduleId, moduleTitle }: { moduleId: string; moduleTitle: string }) {
  const card = "flex min-h-28 flex-col items-center justify-center gap-2 rounded-card border-2 p-4 text-center font-bold hover:border-primary hover:bg-primary-soft";
  return (
    <Dialog>
      <DialogTrigger className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed px-4 text-sm font-bold hover:bg-muted">
        <Plus className="size-4" aria-hidden /> Adicionar conteúdo
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>O que você quer adicionar?</DialogTitle>
          <DialogDescription>No módulo “{moduleTitle}”.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/admin/content/new?moduleId=${moduleId}&type=VIDEO`} className={card}>
            <Video className="size-8 text-primary" aria-hidden /> Aula em vídeo
            <span className="text-sm font-normal text-muted-foreground">Link do YouTube + texto</span>
          </Link>
          <Link href={`/admin/content/new?moduleId=${moduleId}&type=DOCUMENT`} className={card}>
            <FileText className="size-8 text-primary" aria-hidden /> Documento
            <span className="text-sm font-normal text-muted-foreground">PDF e/ou texto</span>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
