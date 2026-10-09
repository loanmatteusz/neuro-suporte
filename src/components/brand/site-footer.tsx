import Link from "next/link";
import { siteConfig } from "@/config/site";

export function SiteFooter({ psychologistName, crp }: { psychologistName: string; crp: string }) {
  return (
    <footer className="border-t bg-surface">
      <div className="mx-auto max-w-5xl space-y-2 px-4 py-8 text-sm text-muted-foreground">
        <p className="font-medium text-ink">{siteConfig.ethicsNotice}</p>
        <p>
          {psychologistName} · {crp}
        </p>
        <p>
          <Link href="/privacy" className="underline underline-offset-4 hover:text-ink">
            Política de privacidade
          </Link>
        </p>
      </div>
    </footer>
  );
}
