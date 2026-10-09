"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/core";
import { createContentItem, deleteContentItem, updateContentItem } from "@/app/admin/content/actions";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { PdfUploader, type UploadedPdf } from "@/components/admin/pdf-uploader";
import { RichTextEditor } from "@/components/rich-text/editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractYouTubeId, youtubeEmbedUrl } from "@/lib/youtube";

type Props = {
  mode: "create" | "edit";
  id?: string;
  moduleId: string;
  moduleTitle: string;
  type: "VIDEO" | "DOCUMENT";
  initial?: { title: string; youtubeId: string | null; body: JSONContent | null; pdf: UploadedPdf | null };
  extraActions?: React.ReactNode; // botão "Avisar participantes" (Task 16)
};

export function ItemForm({ mode, id, moduleId, moduleTitle, type, initial, extraActions }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.youtubeId ? `https://youtu.be/${initial.youtubeId}` : "");
  const [body, setBody] = useState<JSONContent | null>(initial?.body ?? null);
  const [pdf, setPdf] = useState<UploadedPdf | null>(initial?.pdf ?? null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();
  const previewId = type === "VIDEO" ? extractYouTubeId(url) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input =
      type === "VIDEO"
        ? ({ type, moduleId, title, youtubeUrl: url, body } as const)
        : ({ type, moduleId, title, body, pdf } as const);
    start(async () => {
      if (mode === "create") {
        const r = await createContentItem(input);
        if (!r.ok) return void (setErrors(r.fieldErrors ?? {}), toast.error(r.error));
        toast.success("Conteúdo criado.");
        router.replace(`/admin/content/${r.data.id}`);
      } else {
        const r = await updateContentItem(id!, input);
        if (!r.ok) return void (setErrors(r.fieldErrors ?? {}), toast.error(r.error));
        setErrors({});
        toast.success("Alterações salvas.");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {type === "VIDEO" ? "Aula em vídeo" : "Documento"} · Módulo “{moduleTitle}”
      </p>

      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-12" aria-invalid={Boolean(errors.title)} />
        {errors.title && <p className="text-sm text-destructive">{errors.title[0]}</p>}
      </div>

      {type === "VIDEO" && (
        <div className="space-y-2">
          <Label htmlFor="youtube">Link do vídeo no YouTube</Label>
          <Input id="youtube" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="h-12" inputMode="url" aria-invalid={Boolean(errors.youtubeUrl)} />
          <p className="text-sm text-muted-foreground">Dica: no YouTube, deixe o vídeo como “Não listado”.</p>
          {errors.youtubeUrl && <p className="text-sm text-destructive">{errors.youtubeUrl[0]}</p>}
          {previewId ? (
            <div className="space-y-2">
              <p className="text-sm font-bold">Confira se é o vídeo certo:</p>
              <div className="relative aspect-video overflow-hidden rounded-card">
                <iframe src={youtubeEmbedUrl(previewId)} title="Pré-visualização do vídeo" className="absolute inset-0 size-full" allowFullScreen />
              </div>
            </div>
          ) : (
            url.trim() && <p className="text-sm text-destructive">Ainda não reconhecemos esse link do YouTube.</p>
          )}
        </div>
      )}

      {type === "DOCUMENT" && (
        <div className="space-y-2">
          <Label>Arquivo PDF (opcional se houver texto)</Label>
          <PdfUploader value={pdf} onChange={setPdf} />
          {errors.pdf && <p className="text-sm text-destructive">{errors.pdf[0]}</p>}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="body">{type === "VIDEO" ? "Texto de apoio (opcional)" : "Texto"}</Label>
        <RichTextEditor id="body" label="Texto" value={body} onChange={setBody} />
        {errors.body && <p className="text-sm text-destructive">{errors.body[0]}</p>}
      </div>

      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:flex-wrap sm:items-center">
        <Button type="submit" className="h-12 px-6" disabled={pending}>
          {pending ? "Salvando…" : mode === "create" ? "Criar conteúdo" : "Salvar alterações"}
        </Button>
        {mode === "edit" && (
          <>
            <Link href={`/course/${id}`} target="_blank" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 font-bold hover:bg-muted">
              <ExternalLink className="size-4" aria-hidden /> Ver como participante
            </Link>
            {extraActions}
            <ConfirmDelete
              title="Excluir este conteúdo?"
              description="O progresso dos participantes neste conteúdo deixa de contar. Isso não pode ser desfeito."
              onConfirm={async () => {
                const r = await deleteContentItem(id!);
                if (!r.ok) return void toast.error(r.error);
                toast.success("Conteúdo excluído.");
                router.replace("/admin/content");
              }}
              trigger={<button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-bold text-destructive hover:bg-muted"><Trash2 className="size-4" aria-hidden /> Excluir</button>}
            />
          </>
        )}
        <Link href="/admin/content" className="inline-flex min-h-12 items-center justify-center px-2 underline underline-offset-4 sm:ml-auto">
          Voltar
        </Link>
      </div>
    </form>
  );
}
