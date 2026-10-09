import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { ModuleMarker } from "@/components/brand/module-marker";
import { ProgressBar } from "@/components/course/progress-bar";
import { getParticipantDetail } from "@/data/participants";
import { moduleColor } from "@/lib/module-colors";
import { STATUS_LABEL } from "@/lib/participant-status";
import { ParticipantActions } from "./_components/participant-actions";

const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d) : "—");

export default async function ParticipantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getParticipantDetail(id);
  if (!detail) notFound();
  const { user, progress, outline, completedAt } = detail;

  return (
    <div className="space-y-8">
      <Link href="/admin/participants" className="text-sm underline underline-offset-4">← Participantes</Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold">{user.name}</h1>
        <p className="text-muted-foreground">{user.email}</p>
        <p className="text-sm">
          {STATUS_LABEL[user.status]} · Cadastro {fmt(user.createdAt)} · Convite enviado {fmt(user.inviteSentAt)} · Último acesso {fmt(user.lastSeenAt)}
        </p>
      </header>
      <ParticipantActions p={{ id: user.id, name: user.name, email: user.email, banned: user.banned }} />

      <section className="rounded-card border bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Progresso geral</h2>
          <span className="text-2xl font-extrabold text-primary">{progress.overall.percent}%</span>
        </div>
        <div className="mt-3"><ProgressBar percent={progress.overall.percent} label="Progresso geral" /></div>
        <p className="mt-2 text-sm text-muted-foreground">{progress.overall.done} de {progress.overall.total} conteúdos</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Por módulo</h2>
        {outline.map((m, i) => {
          const p = progress.modules[m.id];
          return (
            <div key={m.id} className="rounded-card border bg-surface p-5">
              <div className="flex items-center gap-3">
                <ModuleMarker color={moduleColor(i)} done={p.complete} />
                <h3 className="flex-1 font-bold">{m.title}</h3>
                <span className="font-bold">{p.percent}%</span>
              </div>
              <ul className="mt-3 divide-y">
                {m.items.map((it) => {
                  const at = completedAt.get(it.id) ?? null;
                  return (
                    <li key={it.id} className="flex items-center gap-3 py-2">
                      {at ? <CheckCircle2 className="size-5 text-primary" aria-label="Concluído" /> : <Circle className="size-5 text-muted-foreground" aria-label="Não concluído" />}
                      <span className="flex-1">{it.title}</span>
                      <span className="text-sm text-muted-foreground">{at ? fmt(at) : "—"}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
