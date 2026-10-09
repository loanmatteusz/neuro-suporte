import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { AccountActions } from "./_components/account-actions";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <h1 className="text-3xl font-extrabold">Minha conta</h1>
      <dl className="space-y-3 rounded-card border bg-surface p-5">
        <div><dt className="text-sm text-muted-foreground">Nome</dt><dd className="font-bold">{user.name}</dd></div>
        <div><dt className="text-sm text-muted-foreground">E-mail</dt><dd className="font-bold">{user.email}</dd></div>
      </dl>
      <p className="text-sm text-muted-foreground">Para corrigir o seu nome ou e-mail, fale com a psicóloga.</p>
      <AccountActions canDelete={user.role === "participant"} />
    </main>
  );
}
