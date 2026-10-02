"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AgendamentoModal from "@/app/components/AgendamentoModal";

interface Agendamento {
  id: number;
  data: string;
  horario: string;
  status: string;
  servico_id: number;
  servico: {
    nome: string;
    descricao: string | null;
    preco: number;
    duracao: number;
  } | null;
}

export default function MinhaContaPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [agendamentoAberto, setAgendamentoAberto] = useState(false);
  const [cancelando, setCancelando] = useState<number | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  // =========================
  // CARREGAR DADOS
  // =========================

  async function carregarDados() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    setEmail(user.email ?? "");

    const nomeUsuario =
      user.user_metadata?.nome || user.user_metadata?.name || "";

    setNome(nomeUsuario);

    const { data, error } = await supabase
      .from("agendamentos")
      .select(
        `
        id,
        data,
        horario,
        status,
        servico_id,
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

      setAgendamentos([]);
    } else {
      setAgendamentos((data as unknown as Agendamento[]) ?? []);
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  // =========================
  // RECARREGAR AGENDAMENTOS
  // =========================

  async function recarregarAgendamentos() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("agendamentos")
      .select(
        `
        id,
        data,
        horario,
        status,
        servico_id,
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

    setAgendamentos((data as unknown as Agendamento[]) ?? []);
  }

  // =========================
  // LOGOUT
  // =========================

  async function sair() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.push("/");
    router.refresh();
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
    const [ano, mes, dia] = agendamento.data.split("-").map(Number);

    const [hora, minuto] = agendamento.horario.split(":").map(Number);

    return new Date(ano, mes - 1, dia, hora, minuto);
  }

  // =========================
  // PODE CANCELAR?
  // =========================

  function podeCancelar(agendamento: Agendamento) {
    if (agendamento.status !== "confirmado") {
      return false;
    }

    const agora = new Date();

    const horarioAgendamento = obterDataHoraAgendamento(agendamento);

    const duasHorasAntes = horarioAgendamento.getTime() - 2 * 60 * 60 * 1000;

    return agora.getTime() < duasHorasAntes;
  }

  // =========================
  // CANCELAR AGENDAMENTO
  // =========================

  async function cancelarAgendamento(agendamento: Agendamento) {
    if (!podeCancelar(agendamento)) {
      return;
    }

    const confirmar = window.confirm(
      `Deseja realmente cancelar seu agendamento de ${formatarData(
        agendamento.data,
      )} às ${formatarHorario(agendamento.horario)}?`,
    );

    if (!confirmar) return;

    setCancelando(agendamento.id);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCancelando(null);
      return;
    }

    const { error } = await supabase
      .from("agendamentos")
      .update({
        status: "cancelado",
      })
      .eq("id", agendamento.id)
      .eq("usuario_id", user.id)
      .eq("status", "confirmado");

    if (error) {
      console.error("ERRO AO CANCELAR AGENDAMENTO:", error);

      alert("Não foi possível cancelar o agendamento. Tente novamente.");

      setCancelando(null);
      return;
    }

    await recarregarAgendamentos();

    setCancelando(null);
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

  const agora = new Date();

  const proximosAgendamentos = agendamentosAtivos
    .filter((agendamento) => obterDataHoraAgendamento(agendamento) >= agora)
    .sort(
      (a, b) =>
        obterDataHoraAgendamento(a).getTime() -
        obterDataHoraAgendamento(b).getTime(),
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
    <main className="min-h-screen bg-[#0B0F14] px-4 py-6 text-white sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
              RK BARBER
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Olá{nome ? `, ${nome}` : ""} 👋
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Acompanhe seus agendamentos e horários.
            </p>
          </div>

          <button
            type="button"
            onClick={sair}
            className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400 sm:w-auto"
          >
            Sair da conta
          </button>
        </header>

        {/* RESUMO */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* PRÓXIMO */}
          <div className="rounded-2xl border border-[#C9A227]/20 bg-[#C9A227]/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Próximo
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C9A227]/10 text-[#C9A227]">
                📅
              </div>
            </div>

            {proximoAgendamento ? (
              <>
                <p className="mt-4 text-lg font-bold text-white">
                  {formatarData(proximoAgendamento.data)}
                </p>

                <p className="mt-1 text-sm text-[#C9A227]">
                  às {formatarHorario(proximoAgendamento.horario)}
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">
                Nenhum agendamento próximo
              </p>
            )}
          </div>

          {/* TOTAL */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Agendamentos
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
                ✂
              </div>
            </div>

            <p className="mt-4 text-3xl font-bold text-white">
              {totalAgendamentos}
            </p>

            <p className="mt-1 text-sm text-zinc-500">no total</p>
          </div>

          {/* CONCLUÍDOS */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Concluídos
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                ✓
              </div>
            </div>

            <p className="mt-4 text-3xl font-bold text-white">
              {totalConcluidos}
            </p>

            <p className="mt-1 text-sm text-zinc-500">serviços realizados</p>
          </div>
        </section>

        {/* PRÓXIMO AGENDAMENTO */}
        <section className="mb-10">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#C9A227]">
                Seu horário
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Próximo agendamento
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setAgendamentoAberto(true)}
              className="w-full rounded-xl bg-[#C9A227] px-5 py-3 text-sm font-semibold text-black transition-all hover:bg-[#E0BB35] sm:w-auto"
            >
              + Novo agendamento
            </button>
          </div>

          {proximoAgendamento ? (
            <div className="overflow-hidden rounded-2xl border border-[#C9A227]/20 bg-white/[0.02]">
              <div className="h-1 w-full bg-[#C9A227]" />

              <div className="p-5 sm:p-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  {/* SERVIÇO */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#C9A227]/10 text-2xl">
                      ✂️
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
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[420px]">
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
                          onClick={() =>
                            cancelarAgendamento(proximoAgendamento)
                          }
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
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C9A227]/10 text-2xl">
                📅
              </div>

              <h3 className="mt-5 font-semibold text-white">
                Você não possui nenhum horário marcado
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Escolha um serviço e encontre um horário disponível para fazer
                seu próximo agendamento.
              </p>

              <button
                type="button"
                onClick={() => setAgendamentoAberto(true)}
                className="mt-6 rounded-xl bg-[#C9A227] px-5 py-3 text-sm font-semibold text-black transition-all hover:bg-[#E0BB35]"
              >
                Fazer meu primeiro agendamento
              </button>
            </div>
          )}
        </section>

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
                    obterDataHoraAgendamento(a).getTime() -
                    obterDataHoraAgendamento(b).getTime(),
                )
                .map((agendamento) => (
                  <div
                    key={agendamento.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-white/15"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5">
                          ✂️
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

                      {agendamento.servico && (
                        <p className="font-semibold text-[#C9A227]">
                          {formatarPreco(agendamento.servico.preco)}
                        </p>
                      )}
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

        {/* PERFIL */}
        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#C9A227]/10 text-lg font-bold text-[#C9A227]">
              {(nome || email || "U").charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                Conta
              </p>

              <h2 className="mt-1 truncate font-semibold text-white">
                {nome || "Cliente RK BARBER"}
              </h2>

              <p className="mt-1 truncate text-sm text-zinc-500">{email}</p>
            </div>
          </div>
        </section>
      </div>

      {/* MODAL DE AGENDAMENTO */}
      <AgendamentoModal
        aberto={agendamentoAberto}
        onFechar={() => setAgendamentoAberto(false)}
        onAgendamentoCriado={recarregarAgendamentos}
      />
    </main>
  );
}
