"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageIcon, Loader2, X } from "lucide-react";
import { requestUpload } from "@/app/admin/upload-actions";
import { siteConfig } from "@/config/site";

const GENERIC_ERROR = "Não conseguimos enviar a imagem. Tente de novo.";

export function ImageUploader({ value, onChange }: { value: string | null; onChange: (key: string | null) => void }) {
  const [preview, setPreview] = useState<string | null>(value ? "/api/photo" : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const r = await requestUpload("image", { fileName: file.name, size: file.size, contentType: file.type });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const put = await fetch(r.data.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error(GENERIC_ERROR);
      setPreview(URL.createObjectURL(file));
      onChange(r.data.key);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    maxSize: siteConfig.imageMaxBytes,
    disabled: busy,
    onDropAccepted: ([f]) => void upload(f),
    onDropRejected: ([r]) => setError(r.errors[0]?.code === "file-too-large" ? "A imagem pode ter no máximo 5 MB." : "Envie uma imagem JPG, PNG ou WebP."),
  });

  return (
    <div className="flex items-center gap-4">
      <div {...getRootProps()} className="flex size-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-surface">
        <input {...getInputProps()} aria-label="Escolher foto" />
        {busy ? <Loader2 className="size-6 animate-spin" aria-hidden /> : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Sua foto" className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="space-y-1 text-sm">
        <p>Toque na imagem para trocar a foto (JPG, PNG ou WebP, até 5 MB).</p>
        {value && (
          <button type="button" onClick={() => { onChange(null); setPreview(null); }} className="inline-flex min-h-11 items-center gap-1 underline">
            <X className="size-4" aria-hidden /> Remover foto
          </button>
        )}
        {error && <p role="alert" className="text-destructive">{error}</p>}
      </div>
    </div>
  );
}
