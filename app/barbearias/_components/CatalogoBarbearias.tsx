
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/ui/Icon";

interface Barbearia {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  logo_url: string | null;
}

export default function CatalogoBarbearias({
  barbearias,
  erroInicial,
}: {
  barbearias: Barbearia[];
  erroInicial: boolean;
}) {
  const [busca, setBusca] = useState("");

  const barbeariasFiltradas = barbearias.filter((barbearia) =>
    barbearia.nome.toLowerCase().includes(busca.trim().toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 py-4 pl-4 pr-14 sm:gap-4 sm:py-5 sm:pl-5 sm:pr-16">
          <Link href="/" className="text-xl font-black tracking-tight">
            Na Régua<span className="text-[#C9A227]">+</span>
          </Link>

          <Link
            href="/painel/login"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold transition hover:border-[#C9A227] hover:text-[#C9A227]"
          >
            Área do barbeiro
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-5 sm:pb-16 md:pt-20">
        <Link
          href="/"
          className="mb-8 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#E5B932] px-5 py-3 text-sm font-extrabold text-[#0B0F14] shadow-[0_8px_26px_rgba(229,185,50,0.28)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-[#F2CA4E] hover:shadow-[0_12px_32px_rgba(229,185,50,0.38)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E5B932]/40"
        >
          <span aria-hidden="true" className="text-xl leading-none">←</span>
          Voltar para o início
        </Link>

        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#C9A227]">
            Encontre seu próximo corte
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            Encontre sua
            <span className="text-[#C9A227]"> barbearia.</span>
          </h1>

          <p className="mt-5 max-w-2xl leading-7 text-zinc-400">
            Explore as barbearias disponíveis, conheça seus serviços
            e encontre o lugar ideal para renovar seu visual.
          </p>
        </div>

        <div className="mt-10 max-w-xl">
          <label
            htmlFor="busca-barbearia"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Buscar barbearia pelo nome
          </label>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#11151B] px-4 transition focus-within:border-[#C9A227]">
            <svg
              aria-hidden="true"
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 text-zinc-500"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            <input
              id="busca-barbearia"
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Ex.: Barbearia do João"
              className="w-full bg-transparent py-4 text-white outline-none placeholder:text-zinc-600"
            />
          </div>
        </div>

        <div className="mb-6 mt-12 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Barbearias disponíveis</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Escolha uma barbearia para conhecer seus serviços.
            </p>
          </div>

          {!erroInicial && (
            <span className="text-sm text-zinc-500">
              {barbeariasFiltradas.length}{" "}
              {barbeariasFiltradas.length === 1
                ? "resultado"
                : "resultados"}
            </span>
          )}
        </div>

        {erroInicial ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-red-300">
            Não foi possível carregar as barbearias. Tente novamente mais tarde.
          </div>
        ) : barbeariasFiltradas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
            <div className="mb-4 flex justify-center text-[#C9A227]"><Icon name="scissors" className="h-10 w-10" /></div>

            <h3 className="text-xl font-bold">
              {barbearias.length === 0
                ? "Ainda não há barbearias disponíveis"
                : "Nenhuma barbearia encontrada"}
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
              {barbearias.length === 0
                ? "Novos estabelecimentos poderão aparecer aqui quando estiverem cadastrados e ativos."
                : "Tente pesquisar usando outro nome."}
            </p>

            {busca && (
              <button
                onClick={() => setBusca("")}
                className="mt-5 rounded-xl bg-[#C9A227] px-5 py-3 font-bold text-black transition hover:bg-[#E0BB35]"
              >
                Limpar pesquisa
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {barbeariasFiltradas.map((barbearia) => (
              <article
                key={barbearia.id}
                className="group flex min-h-28 overflow-hidden rounded-2xl border border-white/10 bg-[#11151B] transition duration-200 hover:border-[#C9A227]/50 hover:bg-[#151A21]"
              >
                <div className="flex w-24 shrink-0 items-center justify-center bg-gradient-to-br from-[#242017] to-[#15171B] sm:w-28">
                  {barbearia.logo_url ? (
                    <Image
                      src={barbearia.logo_url}
                      alt={`Logo da ${barbearia.nome}`}
                      width={112}
                      height={112}
                      sizes="(max-width: 640px) 96px, 112px"
                      quality={70}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#C9A227]/30 bg-[#C9A227]/10 text-2xl font-black text-[#C9A227]">
                      {barbearia.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col items-start p-3 sm:p-4">
                  <h3 className="w-full truncate text-base font-bold transition group-hover:text-[#C9A227] sm:text-lg">
                    {barbearia.nome}
                  </h3>

                  <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-5 text-zinc-400 sm:text-sm">
                    {barbearia.descricao ||
                      "Conheça nossos serviços e encontre seu próximo corte."}
                  </p>

                  <Link
                    href={`/barbearia/${barbearia.slug}`}
                    className="mt-2 inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg bg-[#C9A227] px-3 py-1.5 text-xs font-bold text-black transition hover:bg-[#E0BB35]"
                  >
                    Ver barbearia
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-white/10 px-5 py-7 text-center text-sm text-zinc-600">
        Encontre sua próxima experiência com Na Régua+.
      </footer>
    </main>
  );
}
