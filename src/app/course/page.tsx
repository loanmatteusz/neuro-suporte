import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ModuleMarker } from "@/components/brand/module-marker";
import { ProgressBar } from "@/components/course/progress-bar";
import { flattenOutline, getCompletedItemIds, getCourseOutline, toCourseShape } from "@/data/course";
import { getSiteSettings } from "@/data/settings";
import { moduleColor } from "@/lib/module-colors";
import { prisma } from "@/lib/prisma";
import { computeProgress } from "@/lib/progress";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Meu curso" };

export default async function CourseHome() {
  const user = await requireUser();
  const [outline, completed, settings, me] = await Promise.all([
    getCourseOutline(),
    getCompletedItemIds(user.id),
    getSiteSettings(),
    prisma.user.findUnique({ where: { id: user.id }, select: { lastContentItemId: true } }),
  ]);
  const progress = computeProgress(toCourseShape(outline), completed);
  const flat = flattenOutline(outline);
  const continueItem =
    flat.find((i) => i.id === me?.lastContentItemId) ?? flat.find((i) => !completed.has(i.id)) ?? flat[0];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <p className="text-muted-foreground">Olá, {user.name.split(" ")[0]}</p>
      <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{settings.courseTitle}</h1>

      <section aria-labelledby="progress-title" className="mt-6 rounded-card border bg-surface p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="progress-title" className="text-lg font-bold">Seu progresso</h2>
          <span className="text-2xl font-extrabold text-primary">{progress.overall.percent}%</span>
        </div>
        <div className="mt-3">
          <ProgressBar percent={progress.overall.percent} label="Progresso geral do curso" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {progress.overall.done} de {progress.overall.total} conteúdos concluídos
        </p>
        {progress.overall.complete ? (
          <p className="mt-4 rounded-xl bg-primary-soft p-4 text-accent-foreground">
            Você concluiu todo o curso. Obrigada por caminhar até aqui — os conteúdos continuam disponíveis sempre que quiser rever.
          </p>
        ) : (
          continueItem && (
            <Link
              href={`/course/${continueItem.id}`}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
              {completed.size === 0 ? "Começar" : "Continuar de onde parei"} <ArrowRight className="size-4" aria-hidden />
            </Link>
          )
        )}
      </section>

      <section aria-labelledby="modules-title" className="mt-10">
        <h2 id="modules-title" className="text-xl font-bold">Módulos</h2>
        {outline.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Ainda não há conteúdos aqui. Volte em breve 💛</p>
        ) : (
          <ol className="mt-4 grid gap-4 sm:grid-cols-2">
            {outline.map((m, i) => {
              const p = progress.modules[m.id];
              const color = moduleColor(i);
              const first = m.items.find((it) => !completed.has(it.id)) ?? m.items[0];
              const body = (
                <>
                  <div className="flex items-start gap-3">
                    <ModuleMarker color={color} size="lg" done={p.complete} />
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">Módulo {i + 1}</p>
                      <h3 className="text-lg font-bold">{m.title}</h3>
                    </div>
                  </div>
                  {m.description && <p className="mt-3 text-muted-foreground">{m.description}</p>}
                  <div className="mt-4">
                    <ProgressBar percent={p.percent} color={color} label={`Progresso do módulo ${m.title}`} />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {m.items.length === 0 ? "Em breve" : `${p.done} de ${p.total} · ${p.percent}%`}
                    </p>
                  </div>
                </>
              );
              return (
                <li key={m.id}>
                  {first ? (
                    <Link href={`/course/${first.id}`} className="block h-full rounded-card border bg-surface p-5 transition-shadow hover:shadow-md">
                      {body}
                    </Link>
                  ) : (
                    <div className="h-full rounded-card border bg-surface p-5">{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
