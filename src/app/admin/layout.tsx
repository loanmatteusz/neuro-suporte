import Link from "next/link";
import { Eye } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="border-b bg-surface">
        <div className="mx-auto max-w-5xl space-y-3 px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3">
              <Logo className="h-9" />
              <span className="font-heading font-bold text-muted-foreground">Painel</span>
            </Link>
            <Link href="/course" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold hover:bg-muted">
              <Eye className="size-4" aria-hidden /> Ver como participante
            </Link>
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
