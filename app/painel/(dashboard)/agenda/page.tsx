"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Servico {
  nome: string;
  preco: number;
  duracao: number;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
}

interface Agendamento {
  id: number;
  data: string;
  horario: string;
  status: string;
  usuario_id: string;
  servico_id: number;
  servico: Servico | null;
  cliente: Cliente | null;
}

interface AgendamentoBase {
  id: number;
  data: string;
  horario: string;
  status: string;
  usuario_id: string;
  servico_id: number;
  servico: Servico | Servico[] | null;
}

interface Barbearia {
  id: string;
  nome: string | null;
}

type Filtro =
  | "todos"
  | "pendentes"
  | "confirmados"
  | "concluidos"
  | "cancelados";

// =========================================================
// DATA LOCAL
// =========================================================

function obterDataLocal() {
  const agora = new Date();

  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

// =========================================================
// COMPONENTE
// =========================================================

export default function AgendaPage() {
  const supabase = createClient();

  const [dataSelecionada, setDataSelecionada] = useState(
    obterDataLocal()
  );

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);

  const [barbearia, setBarbearia] = useState<Barbearia | null>(null);

  const [filtro, setFiltro] = useState<Filtro>("todos");

  const [carregando, setCarregando] = useState(true);

  const [erro, setErro] = useState<string | null>(null);

  const [processandoId, setProcessandoId] = useState<number | null>(null);

  // =========================================================
  // CARREGAR AGENDA
  // =========================================================

  async function carregarAgenda() {
    try {
      setCarregando(true);
      setErro(null);

      // -----------------------------------------------------
      // 1. Usuário logado
      // -----------------------------------------------------

      const {
        data: { user },
        error: usuarioError,
      } = await supabase.auth.getUser();

      if (usuarioError) {
        console.error("Erro ao verificar usuário:", usuarioError);

        throw new Error(
          "Não foi possível verificar o usuário."
        );
      }

      if (!user) {
        throw new Error(
          "Usuário não autenticado."
        );
      }

      // -----------------------------------------------------
      // 2. Buscar barbearia
      // -----------------------------------------------------

      const {
        data: barbeariaData,
        error: barbeariaError,
      } = await supabase
        .from("barbearias")
        .select("id, nome")
        .eq("proprietario_id", user.id)
        .maybeSingle();

      if (barbeariaError) {
        console.error(
          "Erro ao buscar barbearia:",
          barbeariaError
        );

        throw new Error(
          "Não foi possível carregar a barbearia."
        );
      }

      if (!barbeariaData) {
        throw new Error(
          "Nenhuma barbearia encontrada para este usuário."
        );
      }

      setBarbearia(barbeariaData);

      // -----------------------------------------------------
      // 3. Buscar TODOS os agendamentos
      // -----------------------------------------------------
      //
      // IMPORTANTE:
      // A consulta não usa mais:
      //
      // .eq("data", dataSelecionada)
      //
      // Portanto, TODOS os filtros terão acesso à agenda
      // completa da barbearia.
      //

      const {
        data: agendamentosData,
        error: agendamentosError,
      } = await supabase
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
          )
        `)
        .eq("barbearia_id", barbeariaData.id)
        .order("data", {
          ascending: true,
        })
        .order("horario", {
          ascending: true,
        });

      if (agendamentosError) {
        console.error(
          "Erro ao buscar agendamentos:",
          agendamentosError
        );

        throw new Error(
          "Não foi possível carregar os agendamentos."
        );
      }

      const agendamentosBase =
        (agendamentosData as unknown as AgendamentoBase[]) ?? [];

      // -----------------------------------------------------
      // 4. Buscar clientes
      // -----------------------------------------------------

      const idsUsuarios = [
        ...new Set(
          agendamentosBase
            .map(
              (agendamento) =>
                agendamento.usuario_id
            )
            .filter(Boolean)
        ),
      ];

      let clientesMap = new Map<string, Cliente>();

      if (idsUsuarios.length > 0) {
        const {
          data: clientesData,
          error: clientesError,
        } = await supabase
          .from("profiles")
          .select("id, nome, telefone")
          .in("id", idsUsuarios);

        if (clientesError) {
          console.error(
            "Erro ao buscar clientes:",
            clientesError
          );
        } else {
          clientesMap = new Map(
            (clientesData ?? []).map(
              (cliente) => [
                cliente.id,
                cliente as Cliente,
              ]
            )
          );
        }
      }

      // -----------------------------------------------------
      // 5. Montar agenda final
      // -----------------------------------------------------

      const agendaFinal: Agendamento[] =
        agendamentosBase.map(
          (agendamento) => {
            const servico = Array.isArray(
              agendamento.servico
            )
              ? agendamento.servico[0] ?? null
              : agendamento.servico ?? null;

            return {
              id: agendamento.id,
              data: agendamento.data,
              horario: agendamento.horario,
              status: agendamento.status,
              usuario_id: agendamento.usuario_id,
              servico_id: agendamento.servico_id,
              servico,
              cliente:
                clientesMap.get(
                  agendamento.usuario_id
                ) ?? null,
            };
          }
        );

      setAgendamentos(agendaFinal);
    } catch (error) {
      console.error(
        "Erro na agenda:",
        error
      );

      setAgendamentos([]);

      if (error instanceof Error) {
        setErro(error.message);
      } else {
        setErro(
          "Ocorreu um erro ao carregar a agenda."
        );
      }
    } finally {
      setCarregando(false);
    }
  }

  // =========================================================
  // CARREGAR AGENDA
  // =========================================================

  useEffect(() => {
    carregarAgenda();
  }, []);

  // =========================================================
  // FORMATADORES
  // =========================================================

  function formatarDataCompleta(
    data: string
  ) {
    const dataObj =
      new Date(`${data}T12:00:00`);

    return dataObj.toLocaleDateString(
      "pt-BR",
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  }

  function formatarDataCurta(
    data: string
  ) {
    const dataObj =
      new Date(`${data}T12:00:00`);

    return dataObj.toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  function formatarDataAgenda(
    data: string
  ) {
    const dataObj =
      new Date(`${data}T12:00:00`);

    return dataObj.toLocaleDateString(
      "pt-BR",
      {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      }
    );
  }

  function formatarHorario(
    horario: string
  ) {
    return horario.slice(0, 5);
  }

  function formatarPreco(
    preco: number | null | undefined
  ) {
    if (
      preco === null ||
      preco === undefined
    ) {
      return "--";
    }

    return preco.toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
  }

  // =========================================================
  // NAVEGAÇÃO DE DATA
  // =========================================================

  function mudarDia(
    dias: number
  ) {
    const data =
      new Date(
        `${dataSelecionada}T12:00:00`
      );

    data.setDate(
      data.getDate() + dias
    );

    const ano =
      data.getFullYear();

    const mes = String(
      data.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
      data.getDate()
    ).padStart(2, "0");

    setDataSelecionada(
      `${ano}-${mes}-${dia}`
    );
  }

  function voltarParaHoje() {
    setDataSelecionada(
      obterDataLocal()
    );
  }

  // =========================================================
  // FILTROS
  // =========================================================

  const agendamentosFiltrados =
    useMemo(() => {
      return agendamentos.filter(
        (agendamento) => {
          const status =
            agendamento.status.toLowerCase();

          // -------------------------------------------------
          // TODOS
          // -------------------------------------------------

          if (filtro === "todos") {
            return true;
          }

          // -------------------------------------------------
          // PENDENTES
          // -------------------------------------------------

          if (
            filtro === "pendentes"
          ) {
            return (
              status === "pendente" ||
              status === "aguardando"
            );
          }

          // -------------------------------------------------
          // CONFIRMADOS
          // -------------------------------------------------

          if (
            filtro === "confirmados"
          ) {
            return (
              status === "confirmado"
            );
          }

          // -------------------------------------------------
          // CONCLUÍDOS
          // -------------------------------------------------

          if (
            filtro === "concluidos"
          ) {
            return (
              status === "concluido" ||
              status === "concluído"
            );
          }

          // -------------------------------------------------
          // CANCELADOS
          // -------------------------------------------------

          if (
            filtro === "cancelados"
          ) {
            return (
              status === "cancelado"
            );
          }

          return true;
        }
      );
    }, [
      agendamentos,
      filtro,
    ]);

  // =========================================================
  // ESTATÍSTICAS
  // =========================================================

  const total =
    agendamentos.length;

  const pendentes =
    agendamentos.filter(
      (agendamento) => {
        const status =
          agendamento.status.toLowerCase();

        return (
          status === "pendente" ||
          status === "aguardando"
        );
      }
    ).length;

  const confirmados =
    agendamentos.filter(
      (agendamento) =>
        agendamento.status.toLowerCase() ===
        "confirmado"
    ).length;

  const concluidos =
    agendamentos.filter(
      (agendamento) => {
        const status =
          agendamento.status.toLowerCase();

        return (
          status === "concluido" ||
          status === "concluído"
        );
      }
    ).length;

  // =========================================================
  // STATUS
  // =========================================================

  function obterStatus(
    status: string
  ) {
    const statusNormalizado =
      status.toLowerCase();

    if (
      statusNormalizado ===
      "confirmado"
    ) {
      return {
        texto: "Confirmado",
        classe:
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      };
    }

    if (
      statusNormalizado ===
        "concluido" ||
      statusNormalizado ===
        "concluído"
    ) {
      return {
        texto: "Concluído",
        classe:
          "bg-blue-500/10 text-blue-400 border-blue-500/20",
      };
    }

    if (
      statusNormalizado ===
      "cancelado"
    ) {
      return {
        texto: "Cancelado",
        classe:
          "bg-red-500/10 text-red-400 border-red-500/20",
      };
    }

    return {
      texto: "Pendente",
      classe:
        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    };
  }

  // =========================================================
  // ATUALIZAR STATUS
  // =========================================================

  async function atualizarStatus(
    id: number,
    novoStatus:
      | "concluido"
      | "cancelado"
  ) {
    try {
      setProcessandoId(id);

      const {
        error,
      } = await supabase
        .from("agendamentos")
        .update({
          status: novoStatus,
        })
        .eq("id", id);

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

      await carregarAgenda();
    } finally {
      setProcessandoId(null);
    }
  }

  // =========================================================
  // WHATSAPP
  // =========================================================

  function abrirWhatsApp(
    telefone: string | null
  ) {
    if (!telefone) {
      return;
    }

    const numero =
      telefone.replace(
        /\D/g,
        ""
      );

    if (!numero) {
      return;
    }

    const numeroBrasil =
      numero.startsWith("55")
        ? numero
        : `55${numero}`;

    window.open(
      `https://wa.me/${numeroBrasil}`,
      "_blank"
    );
  }

  // =========================================================
  // TÍTULO DO FILTRO
  // =========================================================

  function obterTituloFiltro() {
    if (filtro === "todos") {
      return "Todos os agendamentos";
    }

    if (filtro === "pendentes") {
      return "Agendamentos pendentes";
    }

    if (filtro === "confirmados") {
      return "Agendamentos confirmados";
    }

    if (filtro === "concluidos") {
      return "Agendamentos concluídos";
    }

    if (filtro === "cancelados") {
      return "Agendamentos cancelados";
    }

    return "Agendamentos";
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-8">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

        <div>

          <p className="mb-2 text-sm text-zinc-500">
            Agenda
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Sua agenda
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Acompanhe todos os seus agendamentos.
          </p>

        </div>

        <button
          onClick={carregarAgenda}
          disabled={carregando}
          className="flex w-fit items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>↻</span>

          {carregando
            ? "Atualizando..."
            : "Atualizar"}
        </button>

      </div>

      {/* =====================================================
          BARBEARIA
      ===================================================== */}

      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-[#10151C] p-5 md:flex-row md:items-center md:justify-between">

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A227]/10 text-xl text-[#C9A227]">
            ✂
          </div>

          <div>

            <p className="text-sm text-zinc-500">
              Barbearia
            </p>

            <p className="font-medium text-white">
              {barbearia?.nome ??
                "Na Régua+"}
            </p>

          </div>

        </div>

        <div className="flex items-center gap-2 text-sm text-zinc-400">

          <span>📅</span>

          <span className="capitalize">
            {formatarDataCompleta(
              dataSelecionada
            )}
          </span>

        </div>

      </div>

      {/* =====================================================
          NAVEGAÇÃO DE DATA
      ===================================================== */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-2">

          <button
            onClick={() =>
              mudarDia(-1)
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            ←
          </button>

          <button
            onClick={
              voltarParaHoje
            }
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            Hoje
          </button>

          <button
            onClick={() =>
              mudarDia(1)
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            →
          </button>

        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400">
          Data selecionada:{" "}
          {formatarDataCurta(
            dataSelecionada
          )}
        </div>

      </div>

      {/* =====================================================
          RESUMO
      ===================================================== */}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        {/* TOTAL */}

        <div className="rounded-2xl border border-zinc-800 bg-[#10151C] p-5">

          <p className="text-sm text-zinc-500">
            Total
          </p>

          <p className="mt-2 text-3xl font-semibold text-white">
            {total}
          </p>

        </div>

        {/* PENDENTES */}

        <div className="rounded-2xl border border-zinc-800 bg-[#10151C] p-5">

          <p className="text-sm text-zinc-500">
            Pendentes
          </p>

          <p className="mt-2 text-3xl font-semibold text-yellow-400">
            {pendentes}
          </p>

        </div>

        {/* CONFIRMADOS */}

        <div className="rounded-2xl border border-zinc-800 bg-[#10151C] p-5">

          <p className="text-sm text-zinc-500">
            Confirmados
          </p>

          <p className="mt-2 text-3xl font-semibold text-emerald-400">
            {confirmados}
          </p>

        </div>

        {/* CONCLUÍDOS */}

        <div className="rounded-2xl border border-zinc-800 bg-[#10151C] p-5">

          <p className="text-sm text-zinc-500">
            Concluídos
          </p>

          <p className="mt-2 text-3xl font-semibold text-blue-400">
            {concluidos}
          </p>

        </div>

      </div>

      {/* =====================================================
          FILTROS
      ===================================================== */}

      <div className="flex gap-2 overflow-x-auto border-b border-zinc-800 pb-3">

        {[
          ["todos", "Todos"],
          ["pendentes", "Pendentes"],
          ["confirmados", "Confirmados"],
          ["concluidos", "Concluídos"],
          ["cancelados", "Cancelados"],
        ].map(
          ([valor, texto]) => (

            <button
              key={valor}
              onClick={() =>
                setFiltro(
                  valor as Filtro
                )
              }
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm transition ${
                filtro === valor
                  ? "bg-[#C9A227] text-black"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              {texto}
            </button>

          )
        )}

      </div>

      {/* =====================================================
          ERRO
      ===================================================== */}

      {erro && (

        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">

          <p className="font-medium text-red-400">
            Não foi possível carregar a agenda
          </p>

          <p className="mt-1 text-sm text-red-400/80">
            {erro}
          </p>

        </div>

      )}

      {/* =====================================================
          LISTA
      ===================================================== */}

      <div>

        <div className="mb-4 flex items-center justify-between">

          <div>

            <h2 className="text-lg font-semibold">
              {obterTituloFiltro()}
            </h2>

            <p className="mt-1 text-sm text-zinc-500">

              {agendamentosFiltrados.length}{" "}

              {agendamentosFiltrados.length ===
              1
                ? "agendamento"
                : "agendamentos"}

            </p>

          </div>

        </div>

        {/* ===================================================
            CARREGANDO
        =================================================== */}

        {carregando && (

          <div className="rounded-2xl border border-zinc-800 bg-[#10151C] p-10 text-center">

            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[#C9A227]" />

            <p className="text-sm text-zinc-400">
              Carregando agenda...
            </p>

          </div>

        )}

        {/* ===================================================
            VAZIO
        =================================================== */}

        {!carregando &&
          !erro &&
          agendamentosFiltrados.length ===
            0 && (

            <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#10151C] px-6 py-16 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-2xl">
                📅
              </div>

              <h3 className="mt-5 text-lg font-medium text-white">
                Nenhum agendamento encontrado
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Não existem agendamentos
                com este filtro.
              </p>

            </div>

          )}

        {/* ===================================================
            LISTA DE AGENDAMENTOS
        =================================================== */}

        {!carregando &&
          agendamentosFiltrados.length >
            0 && (

            <div className="space-y-4">

              {agendamentosFiltrados.map(
                (agendamento) => {

                  const status =
                    obterStatus(
                      agendamento.status
                    );

                  const estaProcessando =
                    processandoId ===
                    agendamento.id;

                  return (

                    <div
                      key={
                        agendamento.id
                      }
                      className="rounded-2xl border border-zinc-800 bg-[#10151C] p-5 transition hover:border-zinc-700"
                    >

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                        {/* =================================================
                            DATA + HORÁRIO + CLIENTE
                        ================================================= */}

                        <div className="flex items-center gap-4">

                          {/* HORÁRIO */}

                          <div className="flex h-16 w-20 flex-col items-center justify-center rounded-xl bg-zinc-900">

                            <span className="text-xl font-semibold text-white">
                              {formatarHorario(
                                agendamento.horario
                              )}
                            </span>

                            <span className="text-[11px] text-zinc-500">
                              horário
                            </span>

                          </div>

                          {/* CLIENTE */}

                          <div>

                            {/* DATA */}

                            <p className="mb-1 text-xs font-medium capitalize text-[#C9A227]">
                              {formatarDataAgenda(
                                agendamento.data
                              )}
                            </p>

                            {/* STATUS */}

                            <div className="flex flex-wrap items-center gap-2">

                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${status.classe}`}
                              >
                                {status.texto}
                              </span>

                            </div>

                            {/* NOME */}

                            <h3 className="mt-2 text-base font-medium text-white">
                              {agendamento.cliente?.nome ??
                                "Cliente"}
                            </h3>

                            {/* SERVIÇO */}

                            <p className="mt-1 text-sm text-zinc-500">
                              {agendamento.servico?.nome ??
                                "Serviço não informado"}
                            </p>

                          </div>

                        </div>

                        {/* =================================================
                            INFORMAÇÕES
                        ================================================= */}

                        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:min-w-[500px]">

                          {/* SERVIÇO */}

                          <div>

                            <p className="text-xs text-zinc-600">
                              Serviço
                            </p>

                            <p className="mt-1 text-sm text-zinc-300">
                              {agendamento.servico?.nome ??
                                "--"}
                            </p>

                          </div>

                          {/* DURAÇÃO */}

                          <div>

                            <p className="text-xs text-zinc-600">
                              Duração
                            </p>

                            <p className="mt-1 text-sm text-zinc-300">
                              {agendamento.servico?.duracao
                                ? `${agendamento.servico.duracao} min`
                                : "--"}
                            </p>

                          </div>

                          {/* WHATSAPP */}

                          <div>

                            <p className="text-xs text-zinc-600">
                              WhatsApp
                            </p>

                            {agendamento.cliente?.telefone ? (

                              <button
                                onClick={() =>
                                  abrirWhatsApp(
                                    agendamento
                                      .cliente
                                      ?.telefone ??
                                      null
                                  )
                                }
                                className="mt-1 text-sm text-[#C9A227] transition hover:text-[#E0BB35]"
                              >
                                {
                                  agendamento
                                    .cliente
                                    .telefone
                                }
                              </button>

                            ) : (

                              <p className="mt-1 text-sm text-zinc-500">
                                Não informado
                              </p>

                            )}

                          </div>

                          {/* VALOR */}

                          <div>

                            <p className="text-xs text-zinc-600">
                              Valor
                            </p>

                            <p className="mt-1 text-sm font-medium text-white">
                              {formatarPreco(
                                agendamento
                                  .servico
                                  ?.preco
                              )}
                            </p>

                          </div>

                        </div>

                        {/* =================================================
                            AÇÕES
                        ================================================= */}

                        <div className="flex gap-2 lg:flex-col">

                          {/* CONCLUIR */}

                          {agendamento.status.toLowerCase() ===
                            "confirmado" && (

                            <button
                              onClick={() =>
                                atualizarStatus(
                                  agendamento.id,
                                  "concluido"
                                )
                              }
                              disabled={
                                estaProcessando
                              }
                              className="rounded-xl bg-[#C9A227] px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {estaProcessando
                                ? "..."
                                : "Concluir"}
                            </button>

                          )}

                          {/* CANCELAR */}

                          {agendamento.status.toLowerCase() ===
                            "confirmado" && (

                            <button
                              onClick={() =>
                                atualizarStatus(
                                  agendamento.id,
                                  "cancelado"
                                )
                              }
                              disabled={
                                estaProcessando
                              }
                              className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Cancelar
                            </button>

                          )}

                        </div>

                      </div>

                    </div>

                  );
                }
              )}

            </div>

          )}

      </div>

    </div>
  );
}