"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AgendamentoModal from "../../components/AgendamentoModal";
import Icon from "@/app/components/Icon";


interface Barbearia {
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

interface Servico {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  duracao: number;
  ativo: boolean;
}

const supabase = createClient();

export default function PaginaPublicaBarbearia() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [barbearia, setBarbearia] = useState<Barbearia | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoServicos, setCarregandoServicos] = useState(true);
  const [erro, setErro] = useState("");
  const [modalAgendamentoAberto, setModalAgendamentoAberto] =
    useState(false);
  const [servicoInicialId, setServicoInicialId] =
    useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregarPagina() {
      setCarregando(true);
      setErro("");
      setBarbearia(null);
      setServicos([]);
      setCarregandoServicos(true);

      let { data: dadosBarbearia, error: erroBarbearia } =
        await supabase
          .from("barbearias")
          .select(
            "id, nome, slug, telefone, descricao, logo_url, capa_url, instagram, endereco, horario_abertura, horario_fechamento, ativa"
          )
          .eq("slug", slug)
          .eq("ativa", true)
          .maybeSingle();

      if (erroBarbearia) {
        const resultadoBasico = await supabase
          .from("barbearias")
          .select("id, nome, slug, telefone, descricao, logo_url, ativa")
          .eq("slug", slug)
          .eq("ativa", true)
          .maybeSingle();
        dadosBarbearia = resultadoBasico.data ? {
          ...resultadoBasico.data,
          capa_url: null,
          instagram: null,
          endereco: null,
          horario_abertura: "08:00",
          horario_fechamento: "21:00",
        } : null;
        erroBarbearia = resultadoBasico.error;
      }

      if (cancelado) return;

      if (erroBarbearia) {
        console.error(erroBarbearia);
        setErro("Não foi possível carregar a barbearia.");
        setCarregando(false);
        return;
      }

      if (!dadosBarbearia) {
        setErro("Esta barbearia não existe ou está indisponível.");
        setCarregando(false);
        return;
      }

      const dados = dadosBarbearia as Barbearia;
      setBarbearia(dados);
      setCarregando(false);

      const { data: dadosServicos, error: erroServicos } =
        await supabase
          .from("servicos")
          .select("id, nome, descricao, preco, duracao, ativo")
          .eq("barbearia_id", dados.id)
          .eq("ativo", true)
          .order("nome", { ascending: true });

      if (cancelado) return;

      if (erroServicos) {
        console.error(erroServicos);
        setErro("Não foi possível carregar os serviços.");
      } else {
        setServicos((dadosServicos ?? []) as Servico[]);
      }

      setCarregandoServicos(false);
    }

    if (slug) carregarPagina();

    return () => {
      cancelado = true;
    };
  }, [slug]);

  function formatarPreco(preco: number) {
    return Number(preco).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function abrirAgendamento(servicoId: number | null = null) {
    setServicoInicialId(servicoId);
    setModalAgendamentoAberto(true);
  }

  function fecharAgendamento() {
    setModalAgendamentoAberto(false);
    setServicoInicialId(null);
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] text-white">
        <p className="animate-pulse text-zinc-400">
          Carregando barbearia...
        </p>
      </main>
    );
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

      <section className="mx-auto max-w-5xl px-4 pb-12 pt-8 sm:px-5 sm:pb-16 sm:pt-12 md:pt-20">
        <div className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-[#171A20] to-[#0B0F14] p-4 sm:p-6 md:p-10">
          {barbearia.capa_url && <img src={barbearia.capa_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            {barbearia.logo_url ? (
              <img
                src={barbearia.logo_url}
                alt={`Logo da ${barbearia.nome}`}
                className="h-24 w-24 border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center bg-[#C9A227] text-4xl font-black text-[#0B0F14]">
                {barbearia.nome.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
                Sua próxima transformação começa aqui
              </p>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl md:text-5xl">
                {barbearia.nome}
              </h1>

              <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
                {barbearia.descricao ||
                  "Confira nossos serviços e escolha o que combina com você."}
              </p>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-400">
                {barbearia.endereco && <span>{barbearia.endereco}</span>}
                <span>Atendimento: {barbearia.horario_abertura?.slice(0, 5) ?? "08:00"}–{barbearia.horario_fechamento?.slice(0, 5) ?? "21:00"}</span>
                {barbearia.instagram && <a href={`https://instagram.com/${barbearia.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="text-[#C9A227]">Instagram {barbearia.instagram}</a>}
                {barbearia.telefone && <a href={`https://wa.me/${barbearia.telefone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-[#C9A227]">WhatsApp</a>}
              </div>

              <button
                type="button"
                onClick={() => abrirAgendamento()}
                className="mt-6 rounded-xl bg-[#C9A227] px-6 py-3 font-bold text-[#0B0F14] transition hover:bg-[#E0BB35]"
              >
                Agendar horário
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="mb-6">
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

          {carregandoServicos ? (
            <p className="rounded-xl border border-white/10 bg-[#11151B] p-5 text-zinc-400">
              Carregando serviços...
            </p>
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
        </div>

        <div className="mt-12 rounded-2xl border border-[#C9A227]/20 bg-[#C9A227]/5 p-6 text-center">
          <h2 className="text-xl font-bold">Ficou com alguma dúvida?</h2>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Entre em contato diretamente com a barbearia.
          </p>

          {barbearia.telefone && (
            <a
              href={`https://wa.me/${barbearia.telefone.replace(/\D/g, "")}`}
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

      <AgendamentoModal
        aberto={modalAgendamentoAberto}
        onFechar={fecharAgendamento}
        onAgendamentoCriado={async () => {
          // Mantém o diálogo aberto para exibir a confirmação da reserva.
        }}
        barbeariaId={barbearia.id}
        barbeariaNome={barbearia.nome}
        servicoInicialId={servicoInicialId}
      />
    </main>
  );
}
