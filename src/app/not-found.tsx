import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-extrabold">Página não encontrada</h1>
      <p className="mt-3 text-muted-foreground">Talvez este conteúdo tenha mudado de lugar.</p>
      <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-primary px-6 font-bold text-primary-foreground">Voltar ao início</Link>
    </main>
  );
}
