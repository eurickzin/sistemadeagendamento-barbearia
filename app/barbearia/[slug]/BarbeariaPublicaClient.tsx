"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/ui/Icon";

const AgendamentoModal = dynamic(
  () => import("@/components/booking/AgendamentoModal"),
  { loading: () => null },
);

export interface Barbearia {
  id: string;
  nome: string;
  slug: string;
  telefone: string | null;
  descricao: string | null;
  logo_url: string | null;
  capa_url: string | null;
  instagram: string | null;
  endereco: string | null;
  horario_abertura: string;
  horario_fechamento: string;
  ativa: boolean;
}

export interface Servico {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  duracao: number;
  ativo: boolean;
}

interface BarbeiroPublico {
  id: string;
  nome: string;
  horario_abertura: string;
  horario_fechamento: string;
  dia_folga: number;
}

const DIAS_SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

export default function PaginaPublicaBarbearia({
  barbeariaInicial,
  servicosIniciais,
  erroInicial = "",
}: {
  barbeariaInicial: Barbearia | null;
  servicosIniciais: Servico[];
  erroInicial?: string;
}) {
  const barbearia = barbeariaInicial;
  const barbeariaId = barbearia?.id;
  const [servicos, setServicos] = useState(servicosIniciais);
  const [carregandoServicos, setCarregandoServicos] = useState(true);
  const [servicosVisiveis, setServicosVisiveis] = useState(false);
  const [barbeiros, setBarbeiros] = useState<BarbeiroPublico[]>([]);
  const [carregandoBarbeiros, setCarregandoBarbeiros] = useState(true);
  const [erroBarbeiros, setErroBarbeiros] = useState("");
  const [erro, setErro] = useState(erroInicial);
  const [modalAgendamentoAberto, setModalAgendamentoAberto] =
    useState(false);
  const [servicoInicialId, setServicoInicialId] =
    useState<number | null>(null);
  const [barbeiroInicialId, setBarbeiroInicialId] = useState<string | null>(null);

  useEffect(() => {
    if (!barbeariaId) return;
    let cancelado = false;

    async function carregarDadosPublicos() {
      setCarregandoServicos(true);
      setErro("");
      setServicos([]);
      setCarregandoBarbeiros(true);
      const supabase = createClient();
      const [resultadoServicos, resultadoBarbeiros] = await Promise.all([
        supabase
          .from("servicos")
          .select("id, nome, descricao, preco, duracao, ativo")
          .eq("barbearia_id", barbeariaId)
          .eq("ativo", true)
          .is("excluido_em", null)
          .order("nome", { ascending: true }),
        supabase
          .from("barbeiros")
          .select("id, nome, horario_abertura, horario_fechamento, dia_folga")
          .eq("barbearia_id", barbeariaId)
          .eq("ativo", true)
          .order("nome", { ascending: true }),
      ]);

      if (cancelado) return;
      if (resultadoServicos.error) {
        console.error("Erro ao carregar serviços:", resultadoServicos.error.message);
        setErro("Não foi possível carregar os serviços.");
      } else {
        setServicos((resultadoServicos.data ?? []) as Servico[]);
      }
      if (resultadoBarbeiros.error) {
        console.error("Erro ao carregar barbeiros:", resultadoBarbeiros.error.message);
        setErroBarbeiros("Não foi possível carregar a equipe agora.");
      } else {
        setBarbeiros((resultadoBarbeiros.data ?? []) as BarbeiroPublico[]);
      }
      setCarregandoServicos(false);
      setCarregandoBarbeiros(false);
    }

    carregarDadosPublicos();
    return () => {
      cancelado = true;
    };
  }, [barbeariaId]);

  function formatarPreco(preco: number) {
    return Number(preco).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarTelefone(telefone: string) {
    const digitos = telefone.replace(/\D/g, "");
    const internacional = digitos.startsWith("55") && digitos.length >= 12;
    const nacional = internacional ? digitos.slice(2) : digitos;
    const prefixo = internacional ? "+55 " : "";

    if (nacional.length === 11) {
      return `${prefixo}(${nacional.slice(0, 2)}) ${nacional[2]} ${nacional.slice(3, 7)}-${nacional.slice(7)}`;
    }

    if (nacional.length === 10) {
      return `${prefixo}(${nacional.slice(0, 2)}) ${nacional.slice(2, 6)}-${nacional.slice(6)}`;
    }

    return telefone;
  }

  function telefoneParaWhatsApp(telefone: string) {
    const digitos = telefone.replace(/\D/g, "");
    return digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;
  }

  const instagramUsuario = barbearia?.instagram
    ?.trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];

  function abrirAgendamento(servicoId: number | null = null, barbeiroId: string | null = null) {
    setServicoInicialId(servicoId);
    setBarbeiroInicialId(barbeiroId);
    setModalAgendamentoAberto(true);
  }

  function fecharAgendamento() {
    setModalAgendamentoAberto(false);
    setServicoInicialId(null);
    setBarbeiroInicialId(null);
  }

  if (erro && !barbearia) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-6 text-white">
        <div className="max-w-md text-center">
          <div className="mb-5 flex justify-center text-[#C9A227]"><Icon name="scissors" className="h-12 w-12" /></div>
          <h1 className="text-2xl font-bold">Ops!</h1>
          <p className="mt-3 text-zinc-400">{erro}</p>
          <a
            href="/"
            className="mt-6 inline-block rounded-xl bg-[#C9A227] px-6 py-3 font-semibold text-black transition hover:bg-[#E0BB35]"
          >
            Voltar ao início
          </a>
        </div>
      </main>
    );
  }

  if (!barbearia) return null;

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">

<header className="border-b border-white/10">
  <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
    <a href="/" className="text-xl font-black tracking-tight">
      Na Régua<span className="text-[#C9A227]">+</span>
    </a>

    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/barbearias"
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-[#C9A227]/40 hover:bg-white/5 hover:text-[#C9A227]"
      >
        <span aria-hidden="true">←</span>
        Voltar para barbearias
      </Link>

      <span className="rounded-full border border-[#C9A227]/30 px-3 py-1 text-xs text-[#C9A227]">
        Agendamento online
      </span>
    </div>
  </div>
</header>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12 md:pt-16">
        <div className="public-barbershop-hero relative isolate overflow-hidden border border-white/10 bg-gradient-to-br from-[#1a1d23] via-[#12161c] to-[#0b0f14] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8 md:p-10">
          {barbearia.capa_url && <img src={barbearia.capa_url} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-20" />}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b0f14]/95 via-[#0b0f14]/80 to-[#0b0f14]/45" />
          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:gap-8">
            {barbearia.logo_url ? (
              <img
                src={barbearia.logo_url}
                alt={`Logo da ${barbearia.nome}`}
                className="h-24 w-24 shrink-0 rounded-2xl border border-white/15 bg-[#0b0f14] object-cover shadow-xl sm:h-28 sm:w-28"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[#C9A227] text-4xl font-black text-[#0B0F14] shadow-xl sm:h-28 sm:w-28">
                {barbearia.nome.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C9A227]/30 bg-[#C9A227]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E0BB35]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C9A227]" aria-hidden="true" />
                Agendamento online
              </p>

              <h1 className="break-words text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
                {barbearia.nome}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
                {barbearia.descricao ||
                  "Confira nossos serviços e escolha o que combina com você."}
              </p>

              <div className="mt-6 grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {barbearia.endereco && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(barbearia.endereco)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Abrir ${barbearia.endereco} no Google Maps`}
                    className="group flex min-w-0 items-start gap-3 border border-white/10 bg-black/20 p-3.5 transition hover:border-[#C9A227]/50 hover:bg-white/5 sm:p-4"
                  >
                    <Icon name="mapPin" className="mt-0.5 h-5 w-5 shrink-0 text-[#C9A227]" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Endereço</p>
                      <p className="mt-1 break-words text-sm font-medium leading-5 text-zinc-100 transition group-hover:text-[#E0BB35]">{barbearia.endereco}</p>
                    </div>
                  </a>
                )}

                <div className="flex min-w-0 items-start gap-3 border border-white/10 bg-black/20 p-3.5 sm:p-4">
                  <Icon name="calendar" className="mt-0.5 h-5 w-5 shrink-0 text-[#C9A227]" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Atendimento</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-100">
                      {barbearia.horario_abertura?.slice(0, 5) ?? "08:00"} às {barbearia.horario_fechamento?.slice(0, 5) ?? "21:00"}
                    </p>
                  </div>
                </div>

                {instagramUsuario && (
                  <a
                    href={`https://instagram.com/${instagramUsuario}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Abrir Instagram de @${instagramUsuario}`}
                    className="group flex min-w-0 items-start gap-3 border border-white/10 bg-black/20 p-3.5 transition hover:border-[#C9A227]/50 hover:bg-white/5 sm:p-4"
                  >
                    <Icon name="instagram" className="mt-0.5 h-5 w-5 shrink-0 text-[#C9A227]" />
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Instagram</span>
                      <span className="mt-1 block truncate whitespace-nowrap text-sm font-semibold text-zinc-100 transition group-hover:text-[#E0BB35]">@{instagramUsuario}</span>
                    </span>
                  </a>
                )}

                {barbearia.telefone && (
                  <a
                    href={`https://wa.me/${telefoneParaWhatsApp(barbearia.telefone)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex min-w-0 items-start gap-3 border border-white/10 bg-black/20 p-3.5 transition hover:border-[#C9A227]/50 hover:bg-white/5 sm:p-4"
                  >
                    <Icon name="whatsapp" className="mt-0.5 h-5 w-5 shrink-0 text-[#C9A227]" />
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">WhatsApp</span>
                      <span className="mt-1 block whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-100 transition group-hover:text-[#E0BB35]">{formatarTelefone(barbearia.telefone)}</span>
                    </span>
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={() => abrirAgendamento()}
                className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#E5B932] px-7 py-4 text-base font-extrabold text-[#0B0F14] shadow-[0_12px_34px_rgba(229,185,50,0.3)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-[#F2CA4E] hover:shadow-[0_16px_40px_rgba(229,185,50,0.38)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E5B932]/40 sm:w-auto"
              >
                <Icon name="calendar" className="h-5 w-5" />
                Agendar horário
                <span aria-hidden="true" className="text-lg">→</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">
              Nosso catálogo
            </p>

            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              Serviços disponíveis
            </h2>

            <p className="mt-2 text-zinc-400">
              Confira os serviços oferecidos por esta barbearia.
            </p>
            </div>
            <button
              type="button"
              aria-expanded={servicosVisiveis}
              aria-controls="lista-servicos-publica"
              onClick={() => setServicosVisiveis((visiveis) => !visiveis)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#C9A227]/50 px-5 py-2.5 text-sm font-bold text-[#E0BB35] transition hover:bg-[#C9A227]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0BB35]"
            >
              {servicosVisiveis ? "Ocultar serviços" : "Ver serviços"}
              <span aria-hidden="true" className={`transition-transform ${servicosVisiveis ? "rotate-180" : ""}`}>⌄</span>
            </button>
          </div>

          {servicosVisiveis && <div id="lista-servicos-publica" className="scroll-mt-24">
          {carregandoServicos ? (
            <div className="grid animate-pulse gap-4 md:grid-cols-2" aria-label="Carregando serviços">
              {[0, 1].map((item) => (
                <div key={item} className="h-52 rounded-2xl border border-white/10 bg-[#11151B]" />
              ))}
            </div>
          ) : erro ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
              {erro}
            </p>
          ) : servicos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
              <p className="text-lg font-semibold">
                Nenhum serviço disponível no momento
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                Volte em breve para conferir as novidades.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {servicos.map((servico) => (
                <article
                  key={servico.id}
                  className="rounded-2xl border border-white/10 bg-[#11151B] p-5 transition hover:border-[#C9A227]/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold">
                        {servico.nome}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {servico.descricao ||
                          "Um serviço feito para você."}
                      </p>
                    </div>

                    <span className="shrink-0 text-[#C9A227]"><Icon name="scissors" /></span>
                  </div>

                  <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-4">
                    <div>
                      <p className="text-xs text-zinc-500">
                        Duração
                      </p>
                      <p className="mt-1 text-sm text-zinc-300">
                        {servico.duracao} minutos
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-zinc-500">
                        Preço
                      </p>
                      <p className="mt-1 text-xl font-bold text-[#C9A227]">
                        {formatarPreco(servico.preco)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => abrirAgendamento(servico.id)}
                    className="mt-5 w-full rounded-lg border border-[#C9A227]/50 px-4 py-2.5 font-semibold text-[#C9A227] transition hover:bg-[#C9A227] hover:text-[#0B0F14]"
                  >
                    Agendar este serviço
                  </button>
                </article>
              ))}
            </div>
          )}
          </div>}
        </div>

        <section className="mt-12" aria-labelledby="titulo-barbeiros-disponiveis">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">Nossa equipe</p>
            <h2 id="titulo-barbeiros-disponiveis" className="mt-2 text-2xl font-bold md:text-3xl">Barbeiros disponíveis</h2>
            <p className="mt-2 text-zinc-400">Escolha seu profissional durante o agendamento.</p>
          </div>

          {carregandoBarbeiros ? (
            <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Carregando barbeiros">
              {[0, 1].map((item) => <div key={item} className="h-28 rounded-2xl border border-white/10 bg-[#11151B]" />)}
            </div>
          ) : erroBarbeiros ? (
            <p role="status" className="rounded-xl border border-white/10 bg-[#11151B] p-4 text-sm text-zinc-400">{erroBarbeiros}</p>
          ) : barbeiros.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-zinc-400">Nenhum barbeiro está disponível para agendamento no momento.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {barbeiros.map((barbeiro) => (
                <button key={barbeiro.id} type="button" onClick={() => abrirAgendamento(null, barbeiro.id)} aria-label={`Agendar primeiro com ${barbeiro.nome}`} className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-[#11151B] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#C9A227]/60 hover:bg-[#151a21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0BB35]">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#C9A227]/30 bg-[#C9A227]/10 text-[#E0BB35]">
                    <Icon name="user" className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-white transition group-hover:text-[#E0BB35]">{barbeiro.nome}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{barbeiro.horario_abertura.slice(0, 5)}–{barbeiro.horario_fechamento.slice(0, 5)}</p>
                    <p className="mt-1 text-xs text-zinc-500">Folga: {DIAS_SEMANA[barbeiro.dia_folga] ?? "não informada"}</p>
                  </div>
                  <span className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" aria-label="Disponível para agendamentos" title="Disponível para agendamentos" />
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="mt-12 rounded-2xl border border-[#C9A227]/20 bg-[#C9A227]/5 p-6 text-center">
          <h2 className="text-xl font-bold">Ficou com alguma dúvida?</h2>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Entre em contato diretamente com a barbearia.
          </p>

          {barbearia.telefone && (
            <a
              href={`https://wa.me/${telefoneParaWhatsApp(barbearia.telefone)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex rounded-xl bg-[#C9A227] px-6 py-3 font-bold text-black transition hover:bg-[#E0BB35]"
            >
              Falar pelo WhatsApp
            </a>
          )}
        </div>

        <footer className="mt-12 text-center text-sm text-zinc-600">
          Página gerenciada com Na Régua+
        </footer>
      </section>

      {modalAgendamentoAberto && <AgendamentoModal
        aberto={modalAgendamentoAberto}
        onFechar={fecharAgendamento}
        onAgendamentoCriado={async () => {
          // Mantém o diálogo aberto para exibir a confirmação da reserva.
        }}
        barbeariaId={barbearia.id}
        barbeariaNome={barbearia.nome}
        servicoInicialId={servicoInicialId}
        barbeiroInicialId={barbeiroInicialId}
      />}
    </main>
  );
}
