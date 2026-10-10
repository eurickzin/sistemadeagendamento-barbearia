"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/ui/Icon";

export interface BarbeariaParaAgendar {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
}

export default function BarbeariaPickerModal({
  aberto,
  favoritasIds,
  onFechar,
  onSelecionar,
}: {
  aberto: boolean;
  favoritasIds: string[];
  onFechar: () => void;
  onSelecionar: (barbearia: BarbeariaParaAgendar) => void;
}) {
  const [barbearias, setBarbearias] = useState<BarbeariaParaAgendar[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!aberto) return;

    let cancelado = false;
    async function carregarBarbearias() {
      setCarregando(true);
      setErro("");
      const { data, error } = await createClient()
        .from("barbearias")
        .select("id, nome, slug, logo_url")
        .eq("ativa", true)
        .order("nome", { ascending: true });

      if (cancelado) return;
      if (error) {
        setErro("Não foi possível carregar as barbearias. Tente novamente.");
        setBarbearias([]);
      } else {
        setBarbearias((data ?? []) as BarbeariaParaAgendar[]);
      }
      setCarregando(false);
    }

    carregarBarbearias();
    return () => {
      cancelado = true;
    };
  }, [aberto, tentativa]);

  const barbeariasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return [...barbearias]
      .filter((barbearia) => barbearia.nome.toLocaleLowerCase("pt-BR").includes(termo))
      .sort((a, b) => Number(favoritasIds.includes(b.id)) - Number(favoritasIds.includes(a.id)));
  }, [barbearias, busca, favoritasIds]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-end justify-center overflow-y-auto bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onFechar();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-escolher-barbearia"
        className="my-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto border border-[#C9A227]/20 bg-[#0B0F14] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">Novo agendamento</p>
            <h2 id="titulo-escolher-barbearia" className="mt-2 text-xl font-bold sm:text-2xl">
              Em qual barbearia você quer agendar?
            </h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar seleção de barbearia"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-2xl text-zinc-400 transition hover:text-white"
          >
            ×
          </button>
        </div>

        <label htmlFor="busca-barbearia-agendamento" className="sr-only">Pesquisar barbearias</label>
        <div className="mt-5 flex items-center gap-3 border border-white/10 bg-[#11151B] px-4 focus-within:border-[#C9A227]">
          <Icon name="search" className="h-5 w-5 shrink-0 text-zinc-500" />
          <input
            id="busca-barbearia-agendamento"
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar pelo nome"
            className="min-h-12 min-w-0 flex-1 bg-transparent py-3 text-white outline-none placeholder:text-zinc-500"
          />
        </div>

        <div className="mt-4 max-h-[50dvh] space-y-2 overflow-y-auto" aria-live="polite">
          {carregando && (
            <p className="py-8 text-center text-sm text-zinc-400">Carregando barbearias...</p>
          )}

          {!carregando && erro && (
            <div className="py-6 text-center">
              <p role="alert" className="text-sm text-red-400">{erro}</p>
              <button type="button" onClick={() => setTentativa((valor) => valor + 1)} className="mt-3 min-h-11 px-4 text-sm font-semibold text-[#C9A227]">
                Tentar novamente
              </button>
            </div>
          )}

          {!carregando && !erro && barbeariasFiltradas.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-400">
              {barbearias.length ? "Nenhuma barbearia encontrada para essa busca." : "Ainda não há barbearias disponíveis."}
            </p>
          )}

          {!carregando && !erro && barbeariasFiltradas.map((barbearia) => {
            const favorita = favoritasIds.includes(barbearia.id);
            return (
              <button
                key={barbearia.id}
                type="button"
                onClick={() => onSelecionar(barbearia)}
                className="flex min-h-16 w-full items-center gap-3 border border-white/10 px-3 py-3 text-left transition hover:border-[#C9A227]/50 hover:bg-white/5 focus-visible:border-[#C9A227]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden bg-[#C9A227]/10 text-lg font-bold text-[#C9A227]">
                  {barbearia.logo_url ? (
                    <img src={barbearia.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    barbearia.nome.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{barbearia.nome}</span>
                {favorita && <span className="shrink-0 text-xs font-medium text-[#C9A227]">Favorita</span>}
                <span aria-hidden="true" className="text-zinc-500">→</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
