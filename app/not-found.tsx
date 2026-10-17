import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F14] px-6 text-center text-white">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C9A227]">Erro 404</p>
      <h1 className="mt-4 text-3xl font-bold">Página não encontrada</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">O endereço pode ter mudado ou a barbearia não está disponível.</p>
      <Link href="/barbearias" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#C9A227] px-5 py-3 font-semibold text-black transition hover:bg-[#E0BB35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0BB35] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F14]">
        Ver barbearias
      </Link>
    </main>
  );
}
