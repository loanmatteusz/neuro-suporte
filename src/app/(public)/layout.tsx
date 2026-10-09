import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SiteFooter } from "@/components/brand/site-footer";
import { getSiteSettings } from "@/data/settings";
import { getSessionUser } from "@/lib/session";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([getSiteSettings(), getSessionUser()]);
  const cta = user ? { href: user.role === "admin" ? "/admin" : "/course", label: "Ir para o curso" } : { href: "/login", label: "Entrar" };
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" aria-label="Página inicial"><Logo className="h-10" priority /></Link>
        <Link href={cta.href} className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90">
          {cta.label}
        </Link>
      </header>
      <div className="flex-1">{children}</div>
      <SiteFooter psychologistName={settings.psychologistName} crp={settings.crp} />
    </div>
  );
}
