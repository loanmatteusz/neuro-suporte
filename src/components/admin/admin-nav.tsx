"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Visão geral", exact: true },
  { href: "/admin/content", label: "Conteúdo" },
  { href: "/admin/participants", label: "Participantes" },
  { href: "/admin/settings", label: "Apresentação" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Painel" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 whitespace-nowrap">
        {LINKS.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn("inline-flex min-h-11 items-center rounded-xl px-4 font-bold", active ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
