import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CodeForm } from "./_components/code-form";

export const metadata: Metadata = { title: "Digite o código" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  if (!email) redirect("/login");
  return (
    <>
      <h1 className="text-2xl font-bold">Digite o código</h1>
      <p className="mt-2 text-muted-foreground">
        Enviamos um código de 6 números para <strong className="text-ink">{email}</strong>. Pode levar um minutinho para chegar — confira também a caixa de spam.
      </p>
      <CodeForm email={email} />
    </>
  );
}
