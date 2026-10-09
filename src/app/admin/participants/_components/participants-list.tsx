"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { ProgressBar } from "@/components/course/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { STATUS_LABEL, type ParticipantStatus } from "@/lib/participant-status";
import { cn } from "@/lib/utils";

type Row = { id: string; name: string; email: string; createdAt: string; lastSeenAt: string | null; percent: number; status: ParticipantStatus };
type SortKey = "name" | "percent" | "lastSeenAt" | "createdAt";

const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("pt-BR").format(new Date(iso)) : "—");
const STATUS_CLASS: Record<ParticipantStatus, string> = {
  active: "bg-mint-soft text-mint",
  inactive: "bg-amber-soft text-amber",
  never: "bg-lavender-soft text-lavender",
  disabled: "bg-muted text-muted-foreground",
};

export function ParticipantsList({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = term ? rows.filter((r) => r.name.toLowerCase().includes(term) || r.email.includes(term)) : rows;
    const by: Record<SortKey, (a: Row, b: Row) => number> = {
      name: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
      percent: (a, b) => b.percent - a.percent,
      lastSeenAt: (a, b) => (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? ""),
      createdAt: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return [...filtered].sort(by[sort]);
  }, [rows, q, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar por nome ou e-mail</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou e-mail" className="h-12 pl-9" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span>Ordenar por</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-12 rounded-xl border bg-surface px-3">
            <option value="name">Nome</option>
            <option value="percent">Progresso</option>
            <option value="lastSeenAt">Último acesso</option>
            <option value="createdAt">Data de cadastro</option>
          </select>
        </label>
      </div>
      {list.length === 0 ? (
        <p className="rounded-card border border-dashed p-8 text-center text-muted-foreground">{rows.length ? "Ninguém encontrado com essa busca." : "Nenhum participante ainda. Convide o primeiro!"}</p>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/participants/${r.id}`} className="block rounded-card border bg-surface p-4 hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">{r.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{r.email}</p>
                  </div>
                  <Badge className={cn("rounded-lg", STATUS_CLASS[r.status])}>{STATUS_LABEL[r.status]}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1"><ProgressBar percent={r.percent} label={`Progresso de ${r.name}`} /></div>
                  <span className="w-12 text-right font-bold">{r.percent}%</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Cadastro: {fmt(r.createdAt)} · Último acesso: {fmt(r.lastSeenAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
