import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSiteSettings } from "@/data/settings";
import { getSessionUser } from "@/lib/session";
import { EmailForm } from "./_components/email-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/course");
  const [{ email }, settings] = await Promise.all([searchParams, getSiteSettings()]);
  return (
    <>
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="mt-2 text-muted-foreground">Digite o seu e-mail. Vamos enviar um código para você entrar — sem senha.</p>
      <EmailForm defaultEmail={email ?? ""} psychologistName={settings.psychologistName} contactUrl={settings.contactUrl} />
    </>
  );
}
