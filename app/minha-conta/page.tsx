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

  const [agendamentos, setAgendamentos] = useState<
    Agendamento[]
  >([]);

  const [carregando, setCarregando] = useState(true);

  const [agendamentoAberto, setAgendamentoAberto] =
    useState(false);

  const [cancelando, setCancelando] =
    useState<number | null>(null);

  // =========================
  // CARREGAR DADOS
  // =========================

  async function carregarDados() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setEmail(user.email ?? "");

    const nomeUsuario =
      user.user_metadata?.nome ||
      user.user_metadata?.name ||
      "";

    setNome(nomeUsuario);

    const { data, error } = await supabase
      .from("agendamentos")
      .select(`
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
      `)
      .eq("usuario_id", user.id)
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error(
        "ERRO AO CARREGAR AGENDAMENTOS:",
        error,
      );

      setAgendamentos([]);
    } else {
      setAgendamentos(
        (data as unknown as Agendamento[]) ?? [],
      );
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
      .select(`
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
      `)
      .eq("usuario_id", user.id)
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error(
        "ERRO AO RECARREGAR AGENDAMENTOS:",
        error,
      );

      return;
    }

    setAgendamentos(
      (data as unknown as Agendamento[]) ?? [],
    );
  }

  // =========================
  // LOGOUT
  // =========================

  async function sair() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  // =========================
  // FORMATAR DATA
  // =========================

  function formatarData(data: string) {
    const [ano, mes, dia] = data
      .split("-")
      .map(Number);

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(
      new Date(ano, mes - 1, dia),
    );
  }

  // =========================
  // FORMATAR DATA COMPLETA
  // =========================

  function formatarDataCompleta(data: string) {
    const [ano, mes, dia] = data
      .split("-")
      .map(Number);

    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }).format(
      new Date(ano, mes - 1, dia),
    );
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
    return Number(preco).toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      },
    );
  }

  // =========================
  // DATA/HORA DO AGENDAMENTO
  // =========================

  function obterDataHoraAgendamento(
    agendamento: Agendamento,
  ) {
    const [ano, mes, dia] = agendamento.data
      .split("-")
      .map(Number);

    const [hora, minuto] = agendamento.horario
      .split(":")
      .map(Number);

    return new Date(
      ano,
      mes - 1,
      dia,
      hora,
      minuto,
    );
  }

  // =========================
  // PODE CANCELAR?
  // =========================

  function podeCancelar(
    agendamento: Agendamento,
  ) {
    if (agendamento.status !== "confirmado") {
      return false;
    }

    const agora = new Date();

    const horarioAgendamento =
      obterDataHoraAgendamento(agendamento);

    const duasHorasAntes =
      horarioAgendamento.getTime() -
      2 * 60 * 60 * 1000;

    return agora.getTime() < duasHorasAntes;
  }

  // =========================
  // CANCELAR AGENDAMENTO
  // =========================

  async function cancelarAgendamento(
    agendamento: Agendamento,
  ) {
    if (!podeCancelar(agendamento)) {
      return;
    }

    const confirmar = window.confirm(
      `Deseja realmente cancelar seu agendamento de ${formatarData(
        agendamento.data,
      )} às ${formatarHorario(
        agendamento.horario,
      )}?`,
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
      console.error(
        "ERRO AO CANCELAR AGENDAMENTO:",
        error,
      );

      alert(
        "Não foi possível cancelar o agendamento. Tente novamente.",
      );

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

  const agendamentosAtivos =
    agendamentos.filter(
      (agendamento) =>
        agendamento.status !== "cancelado" &&
        agendamento.status !== "concluido",
    );

  const historico = agendamentos.filter(
    (agendamento) =>
      agendamento.status === "cancelado" ||
      agendamento.status === "concluido",
  );

  // =========================
  // LOADING
  // =========================

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#0B0F14] px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="animate-pulse">
            <div className="h-8 w-48 rounded bg-white/5" />

            <div className="mt-3 h-4 w-72 rounded bg-white/5" />

            <div className="mt-8 h-32 rounded-2xl bg-white/5" />

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
    <main className="min-h-screen bg-[#0B0F14] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#C9A227]">
              RK BARBER
            </p>

            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Minha conta
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Gerencie seus agendamentos.
            </p>
          </div>

          <button
            type="button"
            onClick={sair}
            className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400 sm:w-auto"
          >
            Sair da conta
          </button>
        </div>

        {/* PERFIL */}

        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#C9A227]/10 text-xl font-bold text-[#C9A227]">
              {(
                nome ||
                email ||
                "U"
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Cliente
              </p>

              <h2 className="mt-1 truncate text-lg font-semibold text-white">
                {nome || "Cliente RK BARBER"}
              </h2>

              <p className="mt-1 truncate text-sm text-zinc-500">
                {email}
              </p>
            </div>
          </div>
        </section>

        {/* AGENDA */}

        <section>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#C9A227]">
                Agenda
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Meus agendamentos
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Confira seus horários reservados.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setAgendamentoAberto(true)
              }
              className="w-full rounded-xl bg-[#C9A227] px-5 py-3 text-sm font-semibold text-black transition-all hover:bg-[#E0BB35] sm:w-auto"
            >
              + Fazer agendamento
            </button>
          </div>

          {agendamentosAtivos.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#C9A227]/10 text-xl text-[#C9A227]">
                📅
              </div>

              <h3 className="mt-4 font-semibold text-white">
                Nenhum agendamento
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                Você ainda não possui agendamentos
                ativos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {agendamentosAtivos.map(
                (agendamento) => (
                  <div
                    key={agendamento.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-[#C9A227]/20 sm:p-6"
                  >
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-white">
                              {agendamento.servico
                                ?.nome ??
                                "Serviço"}
                            </h3>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasse(
                                agendamento.status,
                              )}`}
                            >
                              {statusLabel(
                                agendamento.status,
                              )}
                            </span>
                          </div>

                          <p className="mt-2 text-sm capitalize text-zinc-500">
                            {formatarDataCompleta(
                              agendamento.data,
                            )}
                          </p>
                        </div>

                        {agendamento.servico && (
                          <div className="text-left sm:text-right">
                            <p className="text-xs text-zinc-500">
                              Valor
                            </p>

                            <p className="mt-1 text-lg font-bold text-[#C9A227]">
                              {formatarPreco(
                                agendamento
                                  .servico
                                  .preco,
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                          <p className="text-xs text-zinc-600">
                            Data
                          </p>

                          <p className="mt-1 text-sm font-medium text-zinc-300">
                            {formatarData(
                              agendamento.data,
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                          <p className="text-xs text-zinc-600">
                            Horário
                          </p>

                          <p className="mt-1 text-sm font-medium text-[#C9A227]">
                            {formatarHorario(
                              agendamento.horario,
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                          <p className="text-xs text-zinc-600">
                            Duração
                          </p>

                          <p className="mt-1 text-sm font-medium text-zinc-300">
                            {agendamento.servico
                              ?.duracao ?? "--"}{" "}
                            min
                          </p>
                        </div>
                      </div>

                      {/* CANCELAR */}

                      {agendamento.status ===
                        "confirmado" && (
                        <div className="flex flex-col gap-2 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
                          {podeCancelar(
                            agendamento,
                          ) ? (
                            <>
                              <p className="text-xs text-zinc-600">
                                Cancelamento disponível
                                até 2 horas antes do
                                horário.
                              </p>

                              <button
                                type="button"
                                disabled={
                                  cancelando ===
                                  agendamento.id
                                }
                                onClick={() =>
                                  cancelarAgendamento(
                                    agendamento,
                                  )
                                }
                                className="w-full rounded-lg border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                              >
                                {cancelando ===
                                agendamento.id
                                  ? "Cancelando..."
                                  : "Cancelar agendamento"}
                              </button>
                            </>
                          ) : (
                            <p className="text-xs text-zinc-600">
                              O prazo para cancelamento
                              deste agendamento foi
                              encerrado.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        {/* HISTÓRICO */}

        <section className="mt-12">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
              Histórico
            </p>

            <h2 className="mt-1 text-xl font-bold text-white">
              Agendamentos anteriores
            </h2>
          </div>

          {historico.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
              <p className="text-sm text-zinc-500">
                Seu histórico aparecerá aqui.
              </p>
            </div>
          ) : (
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
                          {agendamento.servico
                            ?.nome ??
                            "Serviço"}
                        </h3>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasse(
                            agendamento.status,
                          )}`}
                        >
                          {statusLabel(
                            agendamento.status,
                          )}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-zinc-500">
                        {formatarData(
                          agendamento.data,
                        )}{" "}
                        •{" "}
                        {formatarHorario(
                          agendamento.horario,
                        )}
                      </p>
                    </div>

                    {agendamento.servico && (
                      <p className="font-semibold text-zinc-400">
                        {formatarPreco(
                          agendamento.servico
                            .preco,
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* MODAL DE AGENDAMENTO */}

      <AgendamentoModal
        aberto={agendamentoAberto}
        onFechar={() =>
          setAgendamentoAberto(false)
        }
        onAgendamentoCriado={
          recarregarAgendamentos
        }
      />
    </main>
  );
}