import type { JSONContent } from "@tiptap/core";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { isEmptyDoc } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import { richTextExtensions } from "./extensions";

export function RichText({ content, className }: { content: JSONContent | null; className?: string }) {
  if (!content || isEmptyDoc(content)) return null;
  const html = renderToHTMLString({ extensions: richTextExtensions, content });
  return (
    <div
      className={cn("prose prose-stone max-w-none prose-headings:font-heading prose-a:text-primary prose-p:leading-relaxed", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
