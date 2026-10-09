import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Neuro Suporte</h1>
      <Link href="/login" className="mt-6 inline-block underline">Entrar</Link>
    </main>
  );
}
