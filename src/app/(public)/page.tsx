import Link from "next/link";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { ModuleMarker } from "@/components/brand/module-marker";
import { RichText } from "@/components/rich-text/render";
import { siteConfig } from "@/config/site";
import { getCourseOutline } from "@/data/course";
import { getSiteSettings } from "@/data/settings";
import { moduleColor } from "@/lib/module-colors";

export default async function LandingPage() {
  const [s, outline] = await Promise.all([getSiteSettings(), getCourseOutline()]);
  const initials = s.psychologistName.replace(/[^\p{L} ]/gu, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const section = "mx-auto max-w-5xl px-4 py-12 sm:py-16";

  return (
    <main>
      <section className={`${section} text-center`}>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">{s.courseTitle}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{s.courseSubtitle}</p>
        <Link href="/login" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 text-lg font-bold text-primary-foreground hover:bg-primary/90">
          Entrar no curso <ArrowRight className="size-5" aria-hidden />
        </Link>
        <p className="mt-3 text-sm text-muted-foreground">Acesso por convite. Você entra só com o seu e-mail.</p>
      </section>

      <section className="bg-surface">
        <div className={`${section} grid gap-10 md:grid-cols-2`}>
          <div>
            <h2 className="text-2xl font-bold">Sobre o curso</h2>
            <RichText content={s.aboutCourse} className="mt-3" />
          </div>
          <div className="space-y-8">
            <div><h2 className="text-2xl font-bold">Para quem é</h2><RichText content={s.audience} className="mt-3" /></div>
            <div><h2 className="text-2xl font-bold">O que você vai aprender</h2><RichText content={s.learnings} className="mt-3" /></div>
          </div>
        </div>
      </section>

      {outline.length > 0 && (
        <section className={section}>
          <h2 className="text-2xl font-bold">Como o curso é organizado</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {outline.map((m, i) => (
              <li key={m.id} className="rounded-card border bg-surface p-5">
                <ModuleMarker color={moduleColor(i)} size="lg" />
                <p className="mt-3 text-sm text-muted-foreground">Módulo {i + 1} · {m.items.length} conteúdo{m.items.length === 1 ? "" : "s"}</p>
                <h3 className="text-lg font-bold">{m.title}</h3>
                {m.description && <p className="mt-1 text-muted-foreground">{m.description}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="bg-surface">
        <div className={`${section} flex flex-col gap-8 md:flex-row md:items-start`}>
          {s.photoKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/photo" alt={`Foto de ${s.psychologistName}`} className="size-40 shrink-0 rounded-full object-cover" />
          ) : (
            <div aria-hidden className="flex size-40 shrink-0 items-center justify-center rounded-full bg-primary-soft font-heading text-4xl font-extrabold text-accent-foreground">{initials}</div>
          )}
          <div>
            <h2 className="text-2xl font-bold">{s.psychologistName}</h2>
            <p className="text-muted-foreground">Psicóloga · {s.crp}</p>
            <RichText content={s.bio} className="mt-4" />
            <h3 className="mt-6 text-lg font-bold">Abordagem</h3>
            <RichText content={s.approach} className="mt-2" />
            <a href={s.contactUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4">
              Falar com {s.psychologistName}
            </a>
          </div>
        </div>
      </section>

      <section className={section}>
        <div className="flex gap-4 rounded-card bg-primary-soft p-6 text-accent-foreground">
          <HeartHandshake className="size-8 shrink-0" aria-hidden />
          <p className="text-lg">{siteConfig.ethicsNotice}</p>
        </div>
      </section>
    </main>
  );
}
