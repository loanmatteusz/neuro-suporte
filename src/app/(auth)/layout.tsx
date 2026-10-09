import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SiteFooter } from "@/components/brand/site-footer";
import { getSiteSettings } from "@/data/settings";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <Link href="/" className="mb-8" aria-label="Voltar para a página inicial">
          <Logo className="h-16" priority />
        </Link>
        <div className="w-full max-w-sm rounded-card border bg-surface p-6 shadow-sm sm:p-8">{children}</div>
      </main>
      <SiteFooter psychologistName={settings.psychologistName} crp={settings.crp} />
    </div>
  );
}
