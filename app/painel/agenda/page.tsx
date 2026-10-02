"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Barbearia {
  id: string;
  nome: string;
  slug: string;
  telefone: string | null;
  descricao: string | null;
  logo_url: string | null;
  ativa: boolean;
}

interface Agendamento {
  id: number;
  data: string;
  horario: string;
  status: string;
  usuario_id: string;
  servico_id: number;

  servico: {
    nome: string;
    preco: number;
    duracao: number;
  } | null;

  cliente: {
    id: string;
    nome: string;
    telefone: string | null;
  } | null;
}

type Filtro =
  | "todos"
  | "pendente"
  | "confirmado"
  | "concluido"
  | "cancelado";

export default function AgendaPage() {
  const supabase = createClient();
  const router = useRouter();

  const [barbearia, setBarbearia] = useState<Barbearia | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizandoId, setAtualizandoId] = useState<number | null>(null);

  const [dataSelecionada, setDataSelecionada] = useState(() => {
    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  });

  const [filtro, setFiltro] = useState<Filtro>("todos");

  async function carregarAgenda() {
    setCarregando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/painel/login");
      return;
    }

    const { data: barbeariaData, error: barbeariaError } =
      await supabase
        .from("barbearias")
        .select("*")
        .eq("proprietario_id", user.id)
        .maybeSingle();

    if (barbeariaError) {
      console.error(
        "ERRO AO CARREGAR BARBEARIA:",
        barbeariaError
      );

      setCarregando(false);
      return;
    }

    if (!barbeariaData) {
      setCarregando(false);
      return;
    }

    setBarbearia(barbeariaData);

    const { data, error } = await supabase
      .from("agendamentos")
      .select(`
        id,
        data,
        horario,
        status,
        usuario_id,
        servico_id,
        servico:servicos (
          nome,
          preco,
          duracao
        ),
        cliente:profiles (
          id,
          nome,
          telefone
        )
      `)
      .eq("barbearia_id", barbeariaData.id)
      .eq("data", dataSelecionada)
      .order("horario", { ascending: true });

    if (error) {
      console.error(
        "ERRO AO CARREGAR AGENDAMENTOS:",
        error
      );

      setAgendamentos([]);
    } else {
      setAgendamentos(
        (data as unknown as Agendamento[]) ?? []
      );
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregarAgenda();
  }, [dataSelecionada]);

  async function sair() {
    await supabase.auth.signOut();

    router.push("/painel/login");
    router.refresh();
  }

  function formatarHorario(horario: string) {
    return horario.slice(0, 5);
  }

  function formatarPreco(preco: number) {
    return Number(preco).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(data: string) {
    const [ano, mes, dia] = data.split("-").map(Number);

    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }).format(new Date(ano, mes - 1, dia));
  }

  function formatarDataCurta(data: string) {
    const [ano, mes, dia] = data.split("-").map(Number);

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(ano, mes - 1, dia));
  }

  function alterarDia(dias: number) {
    const [ano, mes, dia] = dataSelecionada
      .split("-")
      .map(Number);

    const data = new Date(ano, mes - 1, dia);

    data.setDate(data.getDate() + dias);

    const novoAno = data.getFullYear();
    const novoMes = String(data.getMonth() + 1).padStart(2, "0");
    const novoDia = String(data.getDate()).padStart(2, "0");

    setDataSelecionada(
      `${novoAno}-${novoMes}-${novoDia}`
    );
  }

  function irParaHoje() {
    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    setDataSelecionada(`${ano}-${mes}-${dia}`);
  }

  async function atualizarStatus(
    agendamentoId: number,
    novoStatus: "confirmado" | "concluido" | "cancelado"
  ) {
    try {
      setAtualizandoId(agendamentoId);

      const { error } = await supabase
        .from("agendamentos")
        .update({
          status: novoStatus,
        })
        .eq("id", agendamentoId);

      if (error) {
        console.error(
          "Erro ao atualizar status:",
          error
        );

        alert(
          "Não foi possível atualizar o agendamento."
        );

        return;
      }

      setAgendamentos((anteriores) =>
        anteriores.map((agendamento) =>
          agendamento.id === agendamentoId
            ? {
                ...agendamento,
                status: novoStatus,
              }
            : agendamento
        )
      );
    } catch (error) {
      console.error("Erro inesperado:", error);

      alert(
        "Ocorreu um erro ao atualizar o agendamento."
      );
    } finally {
      setAtualizandoId(null);
    }
  }

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

  const agendamentosFiltrados = useMemo(() => {
    if (filtro === "todos") {
      return agendamentos;
    }

    return agendamentos.filter(
      (agendamento) =>
        agendamento.status === filtro
    );
  }, [agendamentos, filtro]);

  const totalDia = agendamentos.length;

  const pendentes = agendamentos.filter(
    (agendamento) =>
      agendamento.status === "pendente"
  ).length;

  const confirmados = agendamentos.filter(
    (agendamento) =>
      agendamento.status === "confirmado"
  ).length;

  const concluidos = agendamentos.filter(
    (agendamento) =>
      agendamento.status === "concluido"
  ).length;

  if (carregando && !barbearia) {
    return (
      <main className="min-h-screen bg-[#0B0F14] px-4 py-8 text-white">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-10 w-64 rounded bg-white/5" />

          <div className="mt-8 h-40 rounded-2xl bg-white/5" />

          <div className="mt-6 h-96 rounded-2xl bg-white/5" />
        </div>
      </main>
    );
  }

  if (!barbearia) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-6 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            Nenhuma barbearia encontrada
          </h1>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-[#C9A227] px-5 py-3 text-sm font-semibold text-black"
          >
            Voltar para o início
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#090D12] lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-6">
            <p className="text-lg font-black tracking-tight">
              NA RÉGUA
              <span className="text-[#C9A227]">+</span>
            </p>

            <p className="mt-1 truncate text-xs text-zinc-600">
              {barbearia.nome}
            </p>
          </div>

          <nav className="flex-1 px-3 py-5">
            <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-700">
              Gestão
            </p>

            <button
              type="button"
              onClick={() => router.push("/painel")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-500 transition hover:bg-white/5 hover:text-white"
            >
              <span className="text-base">▦</span>
              Dashboard
            </button>

            <button
              type="button"
              className="mt-1 flex w-full items-center gap-3 rounded-xl bg-[#C9A227]/10 px-3 py-3 text-sm font-medium text-[#C9A227]"
            >
              <span className="text-base">◷</span>
              Agenda
            </button>

            <button
              type="button"
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-500 transition hover:bg-white/5 hover:text-white"
            >
              <span className="text-base">▤</span>
              Agendamentos
            </button>

            <button
              type="button"
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-500 transition hover:bg-white/5 hover:text-white"
            >
              <span className="text-base">♙</span>
              Clientes
            </button>

            <button
              type="button"
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-500 transition hover:bg-white/5 hover:text-white"
            >
              <span className="text-base">✂</span>
              Serviços
            </button>

            <button
              type="button"
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-500 transition hover:bg-white/5 hover:text-white"
            >
              <span className="text-base">◫</span>
              Horários
            </button>

            <div className="my-5 border-t border-white/5" />

            <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-700">
              Conta
            </p>

            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-500 transition hover:bg-white/5 hover:text-white"
            >
              <span>⚙</span>
              Configurações
            </button>

            <button
              type="button"
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-500 transition hover:bg-white/5 hover:text-white"
            >
              <span>↗</span>
              Minha página
            </button>
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              type="button"
              onClick={sair}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-500 transition hover:bg-red-500/5 hover:text-red-400"
            >
              <span>↪</span>
              Sair
            </button>
          </div>
        </aside>

        {/* CONTEÚDO */}
        <div className="min-w-0 flex-1">

          {/* HEADER */}
          <header className="border-b border-white/10 bg-[#0B0F14]/80 px-4 py-5 backdrop-blur sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
                  Agenda
                </p>

                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Sua agenda
                </h1>

                <p className="mt-1 text-sm text-zinc-500">
                  Acompanhe e organize seus horários.
                </p>
              </div>

              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-white">
                  {barbearia.nome}
                </p>

                <p className="mt-1 text-xs capitalize text-zinc-600">
                  {formatarDataCurta(dataSelecionada)}
                </p>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

            {/* MENU MOBILE */}
            <div className="mb-6 flex gap-2 overflow-x-auto lg:hidden">
              {[
                "Dashboard",
                "Agenda",
                "Agendamentos",
                "Clientes",
                "Serviços",
                "Horários",
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    if (item === "Dashboard") {
                      router.push("/painel");
                    }

                    if (item === "Agenda") {
                      router.push("/painel/agenda");
                    }
                  }}
                  className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-medium ${
                    item === "Agenda"
                      ? "bg-[#C9A227] text-black"
                      : "border border-white/10 text-zinc-500"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* CONTROLES DA DATA */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#C9A227]">
                    Dia selecionado
                  </p>

                  <h2 className="mt-2 text-xl font-bold capitalize">
                    {formatarData(dataSelecionada)}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => alterarDia(-1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-zinc-400 transition hover:border-white/20 hover:text-white"
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    onClick={irParaHoje}
                    className="rounded-xl border border-[#C9A227]/20 bg-[#C9A227]/5 px-4 py-2.5 text-xs font-semibold text-[#C9A227] transition hover:bg-[#C9A227]/10"
                  >
                    Hoje
                  </button>

                  <button
                    type="button"
                    onClick={() => alterarDia(1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-zinc-400 transition hover:border-white/20 hover:text-white"
                  >
                    →
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      console.log("Novo agendamento");
                    }}
                    className="ml-1 rounded-xl bg-[#C9A227] px-4 py-2.5 text-xs font-semibold text-black transition hover:-translate-y-[1px] hover:bg-[#E0BB35]"
                  >
                    + Novo agendamento
                  </button>
                </div>
              </div>
            </section>

            {/* RESUMO */}
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-xs uppercase tracking-wider text-zinc-600">
                  Total
                </p>

                <p className="mt-3 text-3xl font-bold">
                  {totalDia}
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  agendamentos
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-500/10 bg-yellow-500/[0.02] p-5">
                <p className="text-xs uppercase tracking-wider text-zinc-600">
                  Pendentes
                </p>

                <p className="mt-3 text-3xl font-bold text-yellow-400">
                  {pendentes}
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  aguardando confirmação
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] p-5">
                <p className="text-xs uppercase tracking-wider text-zinc-600">
                  Confirmados
                </p>

                <p className="mt-3 text-3xl font-bold text-emerald-400">
                  {confirmados}
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  na agenda
                </p>
              </div>

              <div className="rounded-2xl border border-blue-500/10 bg-blue-500/[0.02] p-5">
                <p className="text-xs uppercase tracking-wider text-zinc-600">
                  Concluídos
                </p>

                <p className="mt-3 text-3xl font-bold text-blue-400">
                  {concluidos}
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  atendimentos realizados
                </p>
              </div>
            </section>

            {/* FILTROS */}
            <section className="mt-6 flex gap-2 overflow-x-auto">
              {[
                ["todos", "Todos"],
                ["pendente", "Pendentes"],
                ["confirmado", "Confirmados"],
                ["concluido", "Concluídos"],
                ["cancelado", "Cancelados"],
              ].map(([valor, label]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() =>
                    setFiltro(valor as Filtro)
                  }
                  className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-medium transition ${
                    filtro === valor
                      ? "bg-[#C9A227] text-black"
                      : "border border-white/10 bg-white/[0.02] text-zinc-500 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </section>

            {/* LISTA */}
            <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#C9A227]">
                  Horários
                </p>

                <h2 className="mt-1 text-lg font-bold">
                  Agendamentos do dia
                </h2>
              </div>

              {carregando ? (
                <div className="divide-y divide-white/5">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse p-5"
                    >
                      <div className="h-5 w-32 rounded bg-white/5" />

                      <div className="mt-3 h-4 w-48 rounded bg-white/5" />
                    </div>
                  ))}
                </div>
              ) : agendamentosFiltrados.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C9A227]/10 text-2xl">
                    📅
                  </div>

                  <h3 className="mt-5 text-lg font-semibold">
                    Nenhum agendamento
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                    Não existem agendamentos para este dia
                    com o filtro selecionado.
                  </p>

                  <button
                    type="button"
                    onClick={() => setFiltro("todos")}
                    className="mt-5 text-sm font-medium text-[#C9A227] hover:underline"
                  >
                    Limpar filtro
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {agendamentosFiltrados.map(
                    (agendamento) => (
                      <article
                        key={agendamento.id}
                        className="p-5 transition hover:bg-white/[0.02]"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                          <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#C9A227]/10 text-xl text-[#C9A227]">
                              ✂
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <p className="text-lg font-bold text-[#C9A227]">
                                  {formatarHorario(
                                    agendamento.horario
                                  )}
                                </p>

                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasse(
                                    agendamento.status
                                  )}`}
                                >
                                  {statusLabel(
                                    agendamento.status
                                  )}
                                </span>
                              </div>

                              <h3 className="mt-2 font-semibold text-white">
                                {agendamento.cliente?.nome ||
                                  "Cliente"}
                              </h3>

                              <p className="mt-1 text-sm text-zinc-400">
                                {agendamento.servico?.nome ||
                                  "Serviço"}
                              </p>

                              <p className="mt-1 text-sm text-zinc-600">
                                {agendamento.servico?.duracao
                                  ? `${agendamento.servico.duracao} minutos`
                                  : "Duração não informada"}
                              </p>

                              {agendamento.cliente
                                ?.telefone && (
                                <p className="mt-2 text-xs text-zinc-500">
                                  WhatsApp:{" "}
                                  <span className="text-zinc-400">
                                    {
                                      agendamento
                                        .cliente.telefone
                                    }
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-4 lg:items-end">
                            <div className="flex items-center justify-between gap-6">
                              <div>
                                <p className="text-xs text-zinc-600">
                                  Valor
                                </p>

                                <p className="mt-1 font-semibold text-zinc-300">
                                  {agendamento.servico
                                    ? formatarPreco(
                                        agendamento.servico
                                          .preco
                                      )
                                    : "--"}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {agendamento.status ===
                                "pendente" && (
                                <button
                                  type="button"
                                  disabled={
                                    atualizandoId ===
                                    agendamento.id
                                  }
                                  onClick={() =>
                                    atualizarStatus(
                                      agendamento.id,
                                      "confirmado"
                                    )
                                  }
                                  className="rounded-lg bg-[#C9A227] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {atualizandoId ===
                                  agendamento.id
                                    ? "Salvando..."
                                    : "Confirmar"}
                                </button>
                              )}

                              {agendamento.status ===
                                "confirmado" && (
                                <button
                                  type="button"
                                  disabled={
                                    atualizandoId ===
                                    agendamento.id
                                  }
                                  onClick={() =>
                                    atualizarStatus(
                                      agendamento.id,
                                      "concluido"
                                    )
                                  }
                                  className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {atualizandoId ===
                                  agendamento.id
                                    ? "Salvando..."
                                    : "Concluir"}
                                </button>
                              )}

                              {(agendamento.status ===
                                "pendente" ||
                                agendamento.status ===
                                  "confirmado") && (
                                <button
                                  type="button"
                                  disabled={
                                    atualizandoId ===
                                    agendamento.id
                                  }
                                  onClick={() =>
                                    atualizarStatus(
                                      agendamento.id,
                                      "cancelado"
                                    )
                                  }
                                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}