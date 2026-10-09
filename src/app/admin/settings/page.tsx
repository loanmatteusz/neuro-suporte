import type { Metadata } from "next";
import { getSiteSettings } from "@/data/settings";
import { SettingsForm } from "./_components/settings-form";

export const metadata: Metadata = { title: "Apresentação" };

export default async function SettingsPage() {
  const s = await getSiteSettings();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Apresentação</h1>
        <p className="text-muted-foreground">Estes textos aparecem na página inicial do site e no rodapé.</p>
      </div>
      <SettingsForm initial={s} />
    </div>
  );
}
