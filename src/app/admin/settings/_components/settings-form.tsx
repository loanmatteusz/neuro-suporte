"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/core";
import { updateSettings } from "@/app/admin/settings/actions";
import { ImageUploader } from "@/components/admin/image-uploader";
import { RichTextEditor } from "@/components/rich-text/editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SettingsInput } from "@/lib/validations";

type Values = Omit<SettingsInput, "aboutCourse" | "audience" | "learnings" | "bio" | "approach"> & Record<"aboutCourse" | "audience" | "learnings" | "bio" | "approach", JSONContent>;

const TEXT_FIELDS: { key: "courseTitle" | "courseSubtitle" | "psychologistName" | "crp" | "contactUrl"; label: string; hint?: string }[] = [
  { key: "courseTitle", label: "Título do curso" },
  { key: "courseSubtitle", label: "Frase de apresentação" },
  { key: "psychologistName", label: "Seu nome (como aparece no site)" },
  { key: "crp", label: "CRP" },
  { key: "contactUrl", label: "Link de contato", hint: "Ex.: link do WhatsApp https://wa.me/55DDDNUMERO" },
];
const DOC_FIELDS: { key: "aboutCourse" | "audience" | "learnings" | "bio" | "approach"; label: string }[] = [
  { key: "aboutCourse", label: "Sobre o curso" },
  { key: "audience", label: "Para quem é" },
  { key: "learnings", label: "O que você vai aprender" },
  { key: "bio", label: "Sobre você" },
  { key: "approach", label: "Sua abordagem" },
];

export function SettingsForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();
  const set = <K extends keyof Values>(k: K, v: Values[K]) => setValues((s) => ({ ...s, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await updateSettings(values);
      if (!r.ok) return void (setErrors(r.fieldErrors ?? {}), toast.error(r.error));
      setErrors({});
      toast.success("Apresentação atualizada.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-2">
        <Label>Sua foto</Label>
        <ImageUploader value={values.photoKey ?? null} onChange={(k) => set("photoKey", k)} />
        {errors.photoKey && <p className="text-sm text-destructive">{errors.photoKey[0]}</p>}
      </div>
      {TEXT_FIELDS.map((f) => (
        <div key={f.key} className="space-y-2">
          <Label htmlFor={f.key}>{f.label}</Label>
          <Input id={f.key} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className="h-12" aria-invalid={Boolean(errors[f.key])} />
          {f.hint && <p className="text-sm text-muted-foreground">{f.hint}</p>}
          {errors[f.key] && <p className="text-sm text-destructive">{errors[f.key][0]}</p>}
        </div>
      ))}
      {DOC_FIELDS.map((f) => (
        <div key={f.key} className="space-y-2">
          <Label htmlFor={f.key}>{f.label}</Label>
          <RichTextEditor id={f.key} label={f.label} value={values[f.key]} onChange={(v) => set(f.key, v)} />
          {errors[f.key] && <p className="text-sm text-destructive">{errors[f.key][0]}</p>}
        </div>
      ))}
      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <Button type="submit" className="h-12 w-full sm:w-auto sm:px-8" disabled={pending}>{pending ? "Salvando…" : "Salvar apresentação"}</Button>
      </div>
    </form>
  );
}
