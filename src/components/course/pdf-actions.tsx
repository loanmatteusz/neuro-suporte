import { Download, ExternalLink } from "lucide-react";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

export function PdfActions({ itemId, name, size }: { itemId: string; name: string | null; size: number | null }) {
  const href = `/api/pdf/${itemId}`;
  const cls = "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 font-bold";
  return (
    <div className="rounded-card border bg-surface p-5">
      <p className="font-bold">{name ?? "Material em PDF"}</p>
      {size ? <p className="text-sm text-muted-foreground">PDF · {formatSize(size)}</p> : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <a href={href} target="_blank" rel="noopener" className={`${cls} bg-primary text-primary-foreground hover:bg-primary/90`}>
          <ExternalLink className="size-4" aria-hidden /> Abrir PDF
        </a>
        <a href={`${href}?download=1`} className={`${cls} border bg-background hover:bg-muted`}>
          <Download className="size-4" aria-hidden /> Baixar
        </a>
      </div>
      <iframe src={href} title={`Visualização: ${name ?? "PDF"}`} className="mt-5 hidden h-[75vh] w-full rounded-xl border lg:block" />
    </div>
  );
}
