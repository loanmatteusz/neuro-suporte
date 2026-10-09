"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { richTextExtensions } from "./extensions";

export function RichTextEditor({ value, onChange, label, id }: { value: JSONContent | null; onChange: (v: JSONContent) => void; label: string; id: string }) {
  const editor = useEditor({
    extensions: richTextExtensions,
    content: value ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        "aria-label": label,
        class: "prose prose-stone max-w-none min-h-40 px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  if (!editor) return <div className="min-h-52 rounded-xl border bg-surface" />;

  const btn = (active: boolean) => cn("inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted", active && "bg-primary-soft text-accent-foreground");
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Cole o link (deixe vazio para remover):", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "" ) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-surface focus-within:ring-2 focus-within:ring-ring">
      <div role="toolbar" aria-label={`Formatação: ${label}`} className="flex flex-wrap gap-1 border-b p-1">
        <button type="button" aria-label="Negrito" aria-pressed={editor.isActive("bold")} className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></button>
        <button type="button" aria-label="Itálico" aria-pressed={editor.isActive("italic")} className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></button>
        <button type="button" aria-label="Título" aria-pressed={editor.isActive("heading", { level: 2 })} className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></button>
        <button type="button" aria-label="Subtítulo" aria-pressed={editor.isActive("heading", { level: 3 })} className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></button>
        <button type="button" aria-label="Lista" aria-pressed={editor.isActive("bulletList")} className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" /></button>
        <button type="button" aria-label="Lista numerada" aria-pressed={editor.isActive("orderedList")} className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></button>
        <button type="button" aria-label="Link" aria-pressed={editor.isActive("link")} className={btn(editor.isActive("link"))} onClick={setLink}><Link2 className="size-4" /></button>
        <button type="button" aria-label="Desfazer" className={btn(false)} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="size-4" /></button>
        <button type="button" aria-label="Refazer" className={btn(false)} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="size-4" /></button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
