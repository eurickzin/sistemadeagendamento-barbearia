"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Barbearia {
  id: string;
  nome: string | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [barbearia, setBarbearia] = useState<Barbearia | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarBarbearia() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/painel/login");
        return;
      }

      const { data } = await supabase
        .from("barbearias")
        .select("id, nome")
        .eq("proprietario_id", user.id)
        .maybeSingle();

      if (data) {
        setBarbearia(data);
      }

      setCarregando(false);
    }

    carregarBarbearia();
  }, [router, supabase]);

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/painel/login");
  }

  const estaNaAgenda = pathname === "/painel/agenda";

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[#C9A227]" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#090D12] lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="text-xl font-black tracking-tight">
              NA RÉGUA<span className="text-[#C9A227]">+</span>
            </div>

            <p className="mt-1 text-xs text-zinc-500">
              Gestão
            </p>

            {barbearia?.nome && (
              <p className="mt-3 truncate text-sm font-medium text-zinc-300">
                {barbearia.nome}
              </p>
            )}
          </div>

          <nav className="flex-1 px-3 py-5">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
              Gestão
            </p>

            <div className="space-y-1">
              <Link
                href="/painel"
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  !estaNaAgenda
                    ? "bg-[#C9A227]/10 text-[#C9A227]"
                    : "text-zinc-500 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-lg">▦</span>
                Dashboard
              </Link>

              <Link
                href="/painel/agenda"
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  estaNaAgenda
                    ? "bg-[#C9A227]/10 text-[#C9A227]"
                    : "text-zinc-500 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-lg">◷</span>
                Agenda
              </Link>

              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-zinc-600"
              >
                <span className="text-lg">▤</span>
                Agendamentos
              </button>

              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-zinc-600"
              >
                <span className="text-lg">♙</span>
                Clientes
              </button>

              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-zinc-600"
              >
                <span className="text-lg">✂</span>
                Serviços
              </button>

              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-zinc-600"
              >
                <span className="text-lg">◫</span>
                Horários
              </button>
            </div>

            <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
              Conta
            </p>

            <div className="space-y-1">
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-zinc-600"
              >
                <span className="text-lg">⚙</span>
                Configurações
              </button>

              <Link
                href="/"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-500 transition hover:bg-white/5 hover:text-white"
              >
                <span className="text-lg">↗</span>
                Minha página
              </Link>
            </div>
          </nav>

          <div className="border-t border-white/10 p-3">
            <button
              onClick={sair}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <span className="text-lg">↪</span>
              Sair
            </button>
          </div>
        </aside>

        {/* CONTEÚDO */}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0B0F14]/80 backdrop-blur-xl">
            <div className="flex h-20 items-center justify-between px-6 lg:px-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A227]">
                  {estaNaAgenda ? "Agenda" : "Dashboard"}
                </p>

                <h1 className="mt-1 text-xl font-bold">
                  Olá, barbeiro 👋
                </h1>
              </div>

              <div className="flex items-center gap-5">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-white">
                    {barbearia?.nome || "Na Régua+"}
                  </p>

                  <p className="text-xs text-zinc-500">
                    {new Date().toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <span className="text-lg">🔔</span>
                </div>
              </div>
            </div>
          </header>

          {/* MENU MOBILE */}
          <div className="border-b border-white/10 px-4 py-3 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              <Link
                href="/painel"
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${
                  !estaNaAgenda
                    ? "bg-[#C9A227]/10 text-[#C9A227]"
                    : "text-zinc-500"
                }`}
              >
                Dashboard
              </Link>

              <Link
                href="/painel/agenda"
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${
                  estaNaAgenda
                    ? "bg-[#C9A227]/10 text-[#C9A227]"
                    : "text-zinc-500"
                }`}
              >
                Agenda
              </Link>
            </div>
          </div>

          <div className="px-6 py-8 lg:px-10 lg:py-10">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
