"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/neon/client";
import { saveOwnProfile } from "@/lib/neon/profile";
import { useRouter } from "next/navigation";
import AgendamentoModal from "@/features/booking/components/AgendamentoModal";
import BarbeariaPickerModal, { type BarbeariaParaAgendar } from "@/features/booking/components/BarbeariaPickerModal";
import Icon from "@/components/ui/Icon";
import { useDialogFocus } from "@/lib/useDialogFocus";
import { agoraLocalEmMinutos, horarioLocalEmMinutos } from "@/lib/fortaleza-time";

interface Agendamento {
  id: number;
  data: string;
  horario: string;
  status: string;
  servico_id: number | null;
  servico_nome: string | null;
  servico_descricao: string | null;
  servico_preco: number | null;
  servico_duracao: number | null;
  servico: {
    nome: string;
    descricao: string | null;
    preco: number;
    duracao: number;
  } | null;
}

interface BarbeariaFavorita {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
}

export default function MinhaContaPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState("");
  const [mensagemConta, setMensagemConta] = useState("");
  const [agendamentoAberto, setAgendamentoAberto] = useState(false);
  const [cancelando, setCancelando] = useState<number | null>(null);
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState<Agendamento | null>(null);
  const [cancelamentoConfirmado, setCancelamentoConfirmado] = useState(false);
  const [erroCancelamento, setErroCancelamento] = useState("");
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [seletorBarbeariaAberto, setSeletorBarbeariaAberto] = useState(false);
  const [barbeariaSelecionada, setBarbeariaSelecionada] = useState<BarbeariaParaAgendar | null>(null);
  const [barbeariasFavoritas, setBarbeariasFavoritas] = useState<BarbeariaFavorita[]>([]);
  const dialogCancelamentoRef = useDialogFocus<HTMLElement>(Boolean(agendamentoParaCancelar), fecharConfirmacaoCancelamento);

  // =========================
  // CARREGAR DADOS
  // =========================

  async function carregarDados() {
    const neon = createClient();

    const {
      data: { user },
    } = await neon.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    const { data: perfil } = await neon.from("profiles")
      .select("nome, barbearias_favoritas").eq("id", user.id).maybeSingle();
    const nomeUsuario = perfil?.nome || user.user_metadata?.displayName || "";

    setNome(nomeUsuario);
    const favoritasSalvas = perfil?.barbearias_favoritas;
    setBarbeariasFavoritas(
      Array.isArray(favoritasSalvas)
        ? favoritasSalvas.filter(
            (favorita): favorita is BarbeariaFavorita =>
              typeof favorita?.id === "string" &&
              typeof favorita?.nome === "string" &&
              typeof favorita?.slug === "string",
          )
        : [],
    );

    const { data, error } = await neon
      .from("agendamentos")
      .select(
        `
        id,
        data,
        horario,
        status,
        servico_id,
        servico_nome,
        servico_descricao,
        servico_preco,
        servico_duracao,
        servico:servicos (
          nome,
          descricao,
          preco,
          duracao
        )
      `,
      )
      .eq("usuario_id", user.id)
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error("ERRO AO CARREGAR AGENDAMENTOS:", error);
      setErroCarregamento("Não foi possível carregar seus agendamentos. Tente novamente.");
    } else {
      setAgendamentos(((data as unknown as Agendamento[]) ?? []).map((agendamento) => ({
        ...agendamento,
        servico: agendamento.servico ?? (agendamento.servico_nome ? {
          nome: agendamento.servico_nome,
          descricao: agendamento.servico_descricao,
          preco: agendamento.servico_preco ?? 0,
          duracao: agendamento.servico_duracao ?? 30,
        } : null),
      })));
    }

    setCarregando(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void carregarDados(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // =========================
  // RECARREGAR AGENDAMENTOS
  // =========================

  async function recarregarAgendamentos() {
    const neon = createClient();

    const {
      data: { user },
    } = await neon.auth.getUser();

    if (!user) return;

    const { data, error } = await neon
      .from("agendamentos")
      .select(
        `
        id,
        data,
        horario,
        status,
        servico_id,
        servico_nome,
        servico_descricao,
        servico_preco,
        servico_duracao,
        servico:servicos (
          nome,
          descricao,
          preco,
          duracao
        )
      `,
      )
      .eq("usuario_id", user.id)
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error("ERRO AO RECARREGAR AGENDAMENTOS:", error);

      return;
    }

    setAgendamentos(((data as unknown as Agendamento[]) ?? []).map((agendamento) => ({
      ...agendamento,
      servico: agendamento.servico ?? (agendamento.servico_nome ? {
        nome: agendamento.servico_nome,
        descricao: agendamento.servico_descricao,
        preco: agendamento.servico_preco ?? 0,
        duracao: agendamento.servico_duracao ?? 30,
      } : null),
    })));
  }

  async function concluirAgendamento() {
    await recarregarAgendamentos();
    if (!barbeariaSelecionada) return;

    const neon = createClient();
    const { data: { user } } = await neon.auth.getUser();
    if (!user) return;

    const { data: perfil } = await neon.from("profiles")
      .select("barbearias_favoritas").eq("id", user.id).maybeSingle();
    const favoritasSalvas = perfil?.barbearias_favoritas;
    const favoritasAtuais: BarbeariaFavorita[] = Array.isArray(favoritasSalvas)
      ? favoritasSalvas.filter(
          (favorita): favorita is BarbeariaFavorita =>
            typeof favorita?.id === "string" &&
            typeof favorita?.nome === "string" &&
            typeof favorita?.slug === "string",
        )
      : [];
    const novasFavoritas = [
      barbeariaSelecionada,
      ...favoritasAtuais.filter((favorita) => favorita.id !== barbeariaSelecionada.id),
    ];

    const profileSaved = await saveOwnProfile(neon, user.id, {
      barbearias_favoritas: novasFavoritas,
    });
    if (!profileSaved) {
      console.error("Não foi possível salvar a barbearia favorita.");
      return;
    }

    setBarbeariasFavoritas(novasFavoritas);
  }

  // =========================
  // FORMATAR DATA
  // =========================

  function formatarData(data: string) {
    const [ano, mes, dia] = data.split("-").map(Number);

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(ano, mes - 1, dia));
  }

  // =========================
  // FORMATAR DATA COMPLETA
  // =========================

  function formatarDataCompleta(data: string) {
    const [ano, mes, dia] = data.split("-").map(Number);

    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }).format(new Date(ano, mes - 1, dia));
  }

  // =========================
  // FORMATAR HORÁRIO
  // =========================

  function formatarHorario(horario: string) {
    return horario.slice(0, 5);
  }

  // =========================
  // FORMATAR PREÇO
  // =========================

  function formatarPreco(preco: number) {
    return Number(preco).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  // =========================
  // DATA/HORA DO AGENDAMENTO
  // =========================

  function obterDataHoraAgendamento(agendamento: Agendamento) {
    return horarioLocalEmMinutos(agendamento.data, agendamento.horario);
  }

  // =========================
  // PODE CANCELAR?
  // =========================

  function podeCancelar(agendamento: Agendamento) {
    if (agendamento.status !== "confirmado") {
      return false;
    }

    const horarioAgendamento = obterDataHoraAgendamento(agendamento);
    return agoraLocalEmMinutos() < horarioAgendamento - 120;
  }

  // =========================
  // CANCELAR AGENDAMENTO
  // =========================

  function abrirConfirmacaoCancelamento(agendamento: Agendamento) {
    setMensagemConta("");
    setAgendamentoParaCancelar(agendamento);
    setCancelamentoConfirmado(false);
    setErroCancelamento("");
  }

  function fecharConfirmacaoCancelamento() {
    if (cancelando !== null) return;
    setAgendamentoParaCancelar(null);
    setCancelamentoConfirmado(false);
    setErroCancelamento("");
  }

  async function confirmarCancelamento() {
    const agendamento = agendamentoParaCancelar;
    if (!agendamento || !cancelamentoConfirmado || cancelando !== null) {
      return;
    }

    if (!podeCancelar(agendamento)) {
      setErroCancelamento("O prazo para cancelar terminou. O cancelamento só pode ser feito até 2 horas antes do horário.");
      return;
    }

    setCancelando(agendamento.id);

    const neon = createClient();

    const {
      data: { user },
    } = await neon.auth.getUser();

    if (!user) {
      setErroCancelamento("Sua sessão expirou. Entre novamente para cancelar.");
      setCancelando(null);
      return;
    }

    const { data: cancelado, error } = await neon
      .from("agendamentos")
      .update({
        status: "cancelado",
      })
      .eq("id", agendamento.id)
      .eq("usuario_id", user.id)
      .eq("status", "confirmado")
      .select("id")
      .maybeSingle();

    if (error || !cancelado) {
      if (error) console.error("ERRO AO CANCELAR AGENDAMENTO:", error);

      setErroCancelamento(error
        ? "Não foi possível cancelar o agendamento. Tente novamente."
        : "O agendamento mudou ou não está mais disponível para cancelamento. Atualize a página.");

      setCancelando(null);
      return;
    }

    setAgendamentos((atuais) => atuais.map((item) => item.id === agendamento.id ? { ...item, status: "cancelado" } : item));
    await recarregarAgendamentos();

    setCancelando(null);
    setAgendamentoParaCancelar(null);
    setCancelamentoConfirmado(false);
    setMensagemConta("Agendamento cancelado. O horário está disponível novamente.");
  }

  // =========================
  // STATUS
  // =========================

  function statusLabel(status: string) {
    switch (status) {
      case "confirmado":
        return "Confirmado";

      case "concluido":
        return "Concluído";

      case "cancelado":
        return "Cancelado";

      case "pendente":
        return "Pendente";

      default:
        return status;
    }
  }

  function statusClasse(status: string) {
    switch (status) {
      case "confirmado":
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";

      case "concluido":
        return "border-blue-500/20 bg-blue-500/10 text-blue-400";

      case "cancelado":
        return "border-red-500/20 bg-red-500/10 text-red-400";

      case "pendente":
        return "border-yellow-500/20 bg-yellow-500/10 text-yellow-400";

      default:
        return "border-white/10 bg-white/5 text-zinc-400";
    }
  }

  // =========================
  // AGENDAMENTOS
  // =========================

  const agendamentosAtivos = agendamentos.filter(
    (agendamento) =>
      agendamento.status !== "cancelado" && agendamento.status !== "concluido",
  );

  const historico = agendamentos.filter(
    (agendamento) =>
      agendamento.status === "cancelado" || agendamento.status === "concluido",
  );

  // =========================
  // PRÓXIMO AGENDAMENTO
  // =========================

  const agora = agoraLocalEmMinutos();

  const proximosAgendamentos = agendamentosAtivos
    .filter((agendamento) => obterDataHoraAgendamento(agendamento) >= agora)
    .sort(
      (a, b) =>
        obterDataHoraAgendamento(a) - obterDataHoraAgendamento(b),
    );

  const proximoAgendamento = proximosAgendamentos[0] ?? null;

  // =========================
  // ESTATÍSTICAS
  // =========================

  const totalAgendamentos = agendamentos.length;

  const totalConcluidos = agendamentos.filter(
    (agendamento) => agendamento.status === "concluido",
  ).length;

  // =========================
  // LOADING
  // =========================

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#0B0F14] px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 w-64 rounded bg-white/5" />

            <div className="mt-3 h-4 w-80 rounded bg-white/5" />

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="h-28 rounded-2xl bg-white/5" />
              <div className="h-28 rounded-2xl bg-white/5" />
              <div className="h-28 rounded-2xl bg-white/5" />
            </div>

            <div className="mt-8 h-64 rounded-2xl bg-white/5" />

            <div className="mt-8 h-48 rounded-2xl bg-white/5" />
          </div>
        </div>
      </main>
    );
  }

  // =========================
  // PÁGINA
  // =========================

  return (
    <main className="min-h-screen bg-[#0B0F14] px-4 pb-5 pt-16 text-white sm:px-6 sm:pb-6 sm:pt-20 lg:px-8 lg:pb-10 lg:pt-10">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
              RK BARBER
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Olá{nome ? `, ${nome}` : ""} <Icon name="wave" className="ml-1 inline h-5 w-5 align-[-3px]" />
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Acompanhe seus agendamentos e horários.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => setSeletorBarbeariaAberto(true)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-[#C9A227]/50 hover:text-[#C9A227] sm:w-auto"
            >
              <Icon name="search" className="h-4 w-4" />
              Buscar barbearias
            </button>
            <button
              type="button"
              onClick={() => setSeletorBarbeariaAberto(true)}
              className="min-h-11 w-full rounded-xl bg-[#C9A227] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#E0BB35] sm:w-auto"
            >
              + Novo agendamento
            </button>
          </div>
        </header>

        {erroCarregamento && <div role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <p>{erroCarregamento}</p>
          <button type="button" onClick={() => { setCarregando(true); setErroCarregamento(""); void carregarDados(); }} className="mt-2 min-h-11 font-semibold text-[#E0BB35]">Tentar novamente</button>
        </div>}
        {mensagemConta && <p role="status" className="mb-6 rounded-xl border border-[#C9A227]/30 bg-[#C9A227]/10 p-4 text-sm text-[#E0BB35]">{mensagemConta}</p>}

        <button
          type="button"
          onClick={() => router.push("/minha-conta/configuracoes")}
          aria-label="Configurações"
          title="Configurações"
          className="account-settings-toggle fixed right-14 top-3 z-[10000] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#11151b]/90 text-zinc-100 shadow-lg backdrop-blur transition hover:border-[#C9A227]/50 hover:text-[#C9A227] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
        >
          <Icon name="settings" className="h-5 w-5" />
        </button>

        {/* RESUMO */}
        <section className="mb-8 grid gap-2 sm:grid-cols-2 sm:gap-3">
          {/* TOTAL */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Agendamentos</p>
              <p className="mt-0.5 text-xs text-zinc-600">no total</p>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-white">{totalAgendamentos}</p>
          </div>

          {/* CONCLUÍDOS */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Concluídos</p>
              <p className="mt-0.5 text-xs text-zinc-600">serviços realizados</p>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-white">{totalConcluidos}</p>
          </div>
        </section>

        {/* PRÓXIMO AGENDAMENTO */}
        {proximoAgendamento && (
        <section className="mb-10">
          <div className="mb-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#C9A227]">
                Seu horário
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Próximo agendamento
              </h2>
            </div>

          </div>

            <div className="overflow-hidden border border-[#C9A227]/20 bg-white/[0.02]">
              <div className="h-1 w-full bg-[#C9A227]" />

              <div className="p-5 sm:p-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  {/* SERVIÇO */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#C9A227]/10 text-2xl">
                      <Icon name="scissors" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">
                          {proximoAgendamento.servico?.nome ?? "Serviço"}
                        </h3>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasse(
                            proximoAgendamento.status,
                          )}`}
                        >
                          {statusLabel(proximoAgendamento.status)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm capitalize text-zinc-500">
                        {formatarDataCompleta(proximoAgendamento.data)}
                      </p>
                    </div>
                  </div>

                  {/* DATA/HORA */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:min-w-[420px]">
                    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-wider text-zinc-600">
                        Data
                      </p>

                      <p className="mt-1 text-sm font-semibold text-zinc-200">
                        {formatarData(proximoAgendamento.data)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#C9A227]/10 bg-[#C9A227]/[0.04] p-4">
                      <p className="text-[11px] uppercase tracking-wider text-zinc-600">
                        Horário
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#C9A227]">
                        {formatarHorario(proximoAgendamento.horario)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-wider text-zinc-600">
                        Valor
                      </p>

                      <p className="mt-1 text-sm font-semibold text-zinc-200">
                        {proximoAgendamento.servico
                          ? formatarPreco(proximoAgendamento.servico.preco)
                          : "--"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CANCELAMENTO */}
                {proximoAgendamento.status === "confirmado" && (
                  <div className="mt-6 flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    {podeCancelar(proximoAgendamento) ? (
                      <>
                        <p className="text-xs text-zinc-600">
                          Cancelamento disponível até 2 horas antes do horário.
                        </p>

                        <button
                          type="button"
                          disabled={cancelando === proximoAgendamento.id}
                          onClick={() => abrirConfirmacaoCancelamento(proximoAgendamento)}
                          className="w-full rounded-lg border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                          {cancelando === proximoAgendamento.id
                            ? "Cancelando..."
                            : "Cancelar agendamento"}
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-zinc-600">
                        O prazo para cancelamento deste agendamento foi
                        encerrado.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
        </section>
        )}

        {/* AGENDAMENTOS ATIVOS */}
        {agendamentosAtivos.length > 1 && (
          <section className="mb-10">
            <div className="mb-5">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                Agenda
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Outros horários
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Seus próximos agendamentos.
              </p>
            </div>

            <div className="space-y-3">
              {agendamentosAtivos
                .filter(
                  (agendamento) => agendamento.id !== proximoAgendamento?.id,
                )
                .sort(
                  (a, b) =>
                    obterDataHoraAgendamento(a) - obterDataHoraAgendamento(b),
                )
                .map((agendamento) => (
                  <div
                    key={agendamento.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-white/15"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5">
                          <Icon name="scissors" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-white">
                              {agendamento.servico?.nome ?? "Serviço"}
                            </h3>

                            <span
                              className={`rounded-full border px-2 py-1 text-[10px] font-medium ${statusClasse(
                                agendamento.status,
                              )}`}
                            >
                              {statusLabel(agendamento.status)}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-zinc-500">
                            {formatarData(agendamento.data)} •{" "}
                            {formatarHorario(agendamento.horario)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-3 sm:items-end">
                        {agendamento.servico && (
                          <p className="font-semibold text-[#C9A227]">
                            {formatarPreco(agendamento.servico.preco)}
                          </p>
                        )}

                        {agendamento.status === "confirmado" && (
                          podeCancelar(agendamento) ? (
                            <button
                              type="button"
                              disabled={cancelando === agendamento.id}
                              onClick={() => abrirConfirmacaoCancelamento(agendamento)}
                              className="rounded-lg border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {cancelando === agendamento.id
                                ? "Cancelando..."
                                : "Cancelar agendamento"}
                            </button>
                          ) : (
                            <p className="text-xs text-zinc-600">
                              O prazo para cancelamento foi encerrado.
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* HISTÓRICO */}
        {/* HISTÓRICO */}
        <section className="mt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                Histórico
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Agendamentos anteriores
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Seus serviços realizados e cancelados.
              </p>
            </div>

            {historico.length > 0 && (
              <button
                type="button"
                onClick={() => setHistoricoAberto((aberto) => !aberto)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:border-[#C9A227]/30 hover:bg-[#C9A227]/5 hover:text-[#C9A227] sm:w-auto"
              >
                {historicoAberto ? "Ocultar histórico" : "Ver histórico"}

                <span
                  className={`text-xs transition-transform duration-300 ${
                    historicoAberto ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>
            )}
          </div>

          {historico.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
              <p className="text-sm text-zinc-500">
                Seu histórico aparecerá aqui.
              </p>
            </div>
          ) : (
            <div
              className={`grid transition-all duration-300 ease-out ${
                historicoAberto
                  ? "mt-5 grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="space-y-3">
                  {historico.map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.015] p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-zinc-200">
                              {agendamento.servico?.nome ?? "Serviço"}
                            </h3>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasse(
                                agendamento.status,
                              )}`}
                            >
                              {statusLabel(agendamento.status)}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-zinc-500">
                            {formatarData(agendamento.data)} •{" "}
                            {formatarHorario(agendamento.horario)}
                          </p>
                        </div>

                        {agendamento.servico && (
                          <p className="font-semibold text-zinc-400">
                            {formatarPreco(agendamento.servico.preco)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

      </div>

      {agendamentoParaCancelar && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) fecharConfirmacaoCancelamento();
          }}
        >
          <section
            ref={dialogCancelamentoRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-cancelamento-cliente"
            aria-describedby="descricao-confirmar-cancelamento-cliente"
            className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#11151B] p-6 shadow-2xl sm:p-7"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
              <Icon name="calendar" />
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              Cancelar agendamento
            </p>
            <h2 id="titulo-confirmar-cancelamento-cliente" className="mt-2 text-xl font-bold text-white">
              Tem certeza que deseja cancelar?
            </h2>
            <p id="descricao-confirmar-cancelamento-cliente" className="mt-2 text-sm leading-6 text-zinc-400">
              Esta ação vai liberar o horário para outros clientes. O cancelamento só está disponível até 2 horas antes do atendimento.
            </p>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-semibold text-white">
                {agendamentoParaCancelar.servico?.nome ?? "Serviço"}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {formatarData(agendamentoParaCancelar.data)} às {formatarHorario(agendamentoParaCancelar.horario)}
              </p>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg p-1 text-sm leading-5 text-zinc-300">
              <input
                type="checkbox"
                checked={cancelamentoConfirmado}
                onChange={(event) => setCancelamentoConfirmado(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#C9A227]"
              />
              <span>Confirmo que desejo cancelar este agendamento.</span>
            </label>

            {erroCancelamento && (
              <p role="alert" className="mt-3 text-sm text-red-400">{erroCancelamento}</p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={fecharConfirmacaoCancelamento}
                disabled={cancelando === agendamentoParaCancelar.id}
                className="rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmarCancelamento}
                disabled={!cancelamentoConfirmado || cancelando === agendamentoParaCancelar.id}
                className="rounded-lg bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {cancelando === agendamentoParaCancelar.id ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL DE AGENDAMENTO */}
      <BarbeariaPickerModal
        aberto={seletorBarbeariaAberto}
        favoritasIds={barbeariasFavoritas.map((barbearia) => barbearia.id)}
        onFechar={() => setSeletorBarbeariaAberto(false)}
        onSelecionar={(barbearia) => {
          setBarbeariaSelecionada(barbearia);
          setSeletorBarbeariaAberto(false);
          setAgendamentoAberto(true);
        }}
      />
      <AgendamentoModal
        aberto={agendamentoAberto}
        onFechar={() => setAgendamentoAberto(false)}
        onVoltarParaBusca={() => {
          setAgendamentoAberto(false);
          setSeletorBarbeariaAberto(true);
        }}
        onAgendamentoCriado={concluirAgendamento}
        barbeariaId={barbeariaSelecionada?.id}
        barbeariaNome={barbeariaSelecionada?.nome}
      />
    </main>
  );
}
