import type { JSONContent } from "@tiptap/core";

export function isEmptyDoc(content: JSONContent | null | undefined): boolean {
  if (!content?.content?.length) return true;
  return content.content.every((n) => n.type === "paragraph" && !n.content?.length);
}
