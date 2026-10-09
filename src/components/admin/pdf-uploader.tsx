"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { requestUpload } from "@/app/admin/upload-actions";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export type UploadedPdf = { key: string; name: string; size: number };

export function PdfUploader({ value, onChange }: { value: UploadedPdf | null; onChange: (v: UploadedPdf | null) => void }) {
  const [state, setState] = useState<"idle" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setState("uploading");
    try {
      const res = await requestUpload("pdf", { fileName: file.name, size: file.size, contentType: file.type });
      if (!res.ok) throw new Error(res.error);
      const put = await fetch(res.data.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("Não conseguimos enviar o arquivo. Tente de novo.");
      onChange({ key: res.data.key, name: file.name, size: file.size });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setState("idle");
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: siteConfig.pdfMaxBytes,
    disabled: state === "uploading",
    onDropAccepted: ([file]) => void upload(file),
    onDropRejected: ([r]) =>
      setError(r.errors[0]?.code === "file-too-large" ? "O PDF pode ter no máximo 20 MB." : "Envie um arquivo PDF."),
  });

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-surface p-4">
        <div className="flex min-w-0 items-center gap-3">
          <FileText className="size-6 shrink-0 text-primary" aria-hidden />
          <span className="truncate">{value.name}</span>
        </div>
        <button type="button" onClick={() => onChange(null)} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm hover:bg-muted">
          <X className="size-4" aria-hidden /> Remover
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn("flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center", isDragActive && "border-primary bg-primary-soft")}
      >
        <input {...getInputProps()} aria-label="Escolher arquivo PDF" />
        {state === "uploading" ? (
          <>
            <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
            <p>Enviando…</p>
          </>
        ) : (
          <>
            <Upload className="size-6 text-primary" aria-hidden />
            <p className="font-bold">Toque para escolher um PDF</p>
            <p className="text-sm text-muted-foreground">ou arraste o arquivo para cá · até 20 MB</p>
          </>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
