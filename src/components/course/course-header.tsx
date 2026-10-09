import Link from "next/link";
import { CircleUser, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export function CourseHeader({ userName, isAdmin }: { userName: string; isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/course" aria-label="Início do curso">
          <Logo className="h-9" />
        </Link>
        <nav className="flex items-center gap-1">
          {isAdmin && (
            <Link href="/admin" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold hover:bg-muted">
              <LayoutDashboard className="size-4" aria-hidden /> Painel
            </Link>
          )}
          <Link href="/account" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm hover:bg-muted">
            <CircleUser className="size-5" aria-hidden />
            <span className="max-w-32 truncate">{userName.split(" ")[0]}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
