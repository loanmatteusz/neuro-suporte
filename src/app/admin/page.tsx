import type { Metadata } from "next";
import Link from "next/link";
import { ModuleMarker } from "@/components/brand/module-marker";
import { ProgressBar } from "@/components/course/progress-bar";
import { siteConfig } from "@/config/site";
import { listParticipants } from "@/data/participants";
import { moduleColor } from "@/lib/module-colors";

export const metadata: Metadata = { title: "Visão geral" };

export default async function AdminOverview() {
  const { rows, aggregate, outline } = await listParticipants();
  const inactive = rows.filter((r) => r.status === "inactive");
  const never = rows.filter((r) => r.status === "never");
  const card = "rounded-card border bg-surface p-5";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold">Visão geral</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={card}><p className="text-sm text-muted-foreground">Participantes ativos</p><p className="text-3xl font-extrabold">{aggregate.participants}</p></div>
        <div className={card}><p className="text-sm text-muted-foreground">Conclusão média do curso</p><p className="text-3xl font-extrabold text-primary">{aggregate.averagePercent}%</p></div>
        <div className={card}><p className="text-sm text-muted-foreground">Precisam de atenção</p><p className="text-3xl font-extrabold">{inactive.length + never.length}</p></div>
      </div>

      <section className={card}>
        <h2 className="text-lg font-bold">Conclusão média por módulo</h2>
        <ul className="mt-4 space-y-4">
          {outline.map((m, i) => (
            <li key={m.id} className="flex items-center gap-3">
              <ModuleMarker color={moduleColor(i)} size="sm" />
              <span className="w-40 shrink-0 truncate sm:w-64">{m.title}</span>
              <div className="flex-1"><ProgressBar percent={aggregate.moduleAverages[m.id] ?? 0} color={moduleColor(i)} label={`Média do módulo ${m.title}`} /></div>
              <span className="w-12 text-right font-bold">{aggregate.moduleAverages[m.id] ?? 0}%</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { title: `Inativos há ${siteConfig.inactiveAfterDays} dias ou mais`, list: inactive, empty: "Ninguém inativo." },
          { title: "Convidados que ainda não acessaram", list: never, empty: "Todos já acessaram." },
        ].map((block) => (
          <section key={block.title} className={card}>
            <h2 className="font-bold">{block.title}</h2>
            {block.list.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{block.empty}</p>
            ) : (
              <ul className="mt-3 divide-y">
                {block.list.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/participants/${r.id}`} className="flex min-h-12 items-center justify-between gap-3 hover:underline">
                      <span className="truncate">{r.name}</span>
                      <span className="text-sm text-muted-foreground">{r.percent}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
