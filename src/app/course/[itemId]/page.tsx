import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CompleteButton } from "@/components/course/complete-button";
import { CourseSidebar } from "@/components/course/course-sidebar";
import { PdfActions } from "@/components/course/pdf-actions";
import { YouTubeEmbed } from "@/components/course/youtube-embed";
import { RichText } from "@/components/rich-text/render";
import { flattenOutline, getCompletedItemIds, getContentItem, getCourseOutline, toCourseShape } from "@/data/course";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type Params = { params: Promise<{ itemId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { itemId } = await params;
  const item = await getContentItem(itemId);
  return { title: item?.title ?? "Conteúdo" };
}

export default async function ContentPage({ params }: Params) {
  const { itemId } = await params;
  const user = await requireUser();
  const [item, outline, completed] = await Promise.all([getContentItem(itemId), getCourseOutline(), getCompletedItemIds(user.id)]);
  if (!item) notFound();

  if (user.role === "participant") {
    after(() =>
      prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date(), lastContentItemId: item.id } }),
    );
  }

  const flat = flattenOutline(outline);
  const index = flat.findIndex((i) => i.id === item.id);
  const prev = index > 0 ? flat[index - 1] : null;
  const next = index >= 0 && index < flat.length - 1 ? flat[index + 1] : null;
  const moduleIndex = outline.findIndex((m) => m.id === item.moduleId);
  const mod = outline[moduleIndex];
  const nextModule = outline.slice(moduleIndex + 1).find((m) => m.items.length > 0);

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[18rem_1fr] lg:py-10">
      <CourseSidebar outline={outline} currentId={item.id} completedIds={[...completed]} />
      <article className="min-w-0 space-y-6">
        <header>
          <p className="text-sm text-muted-foreground">
            Módulo {moduleIndex + 1} · {mod?.title}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{item.title}</h1>
        </header>

        {item.type === "VIDEO" && item.youtubeId && <YouTubeEmbed id={item.youtubeId} title={item.title} />}
        <RichText content={item.body} />
        {item.type === "DOCUMENT" && item.pdfKey && <PdfActions itemId={item.id} name={item.pdfName} size={item.pdfSize} />}

        <CompleteButton
          itemId={item.id}
          initialCompleted={completed.has(item.id)}
          completedIds={[...completed]}
          shape={toCourseShape(outline)}
          moduleId={item.moduleId}
          moduleTitle={mod?.title ?? ""}
          nextModuleFirstItem={nextModule ? { id: nextModule.items[0].id, moduleTitle: nextModule.title } : null}
        />

        <nav aria-label="Navegação entre conteúdos" className="flex justify-between gap-3 border-t pt-6">
          {prev ? (
            <Link href={`/course/${prev.id}`} className="inline-flex min-h-11 max-w-[48%] items-center gap-1 text-sm hover:underline">
              <ChevronLeft className="size-4 shrink-0" aria-hidden /> <span className="truncate">{prev.title}</span>
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/course/${next.id}`} className="inline-flex min-h-11 max-w-[48%] items-center gap-1 text-right text-sm font-bold hover:underline">
              <span className="truncate">{next.title}</span> <ChevronRight className="size-4 shrink-0" aria-hidden />
            </Link>
          ) : <span />}
        </nav>
      </article>
    </main>
  );
}
