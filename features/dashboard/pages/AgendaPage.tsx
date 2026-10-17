"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/neon/client";
import Icon from "@/components/ui/Icon";
import { useDialogFocus } from "@/lib/useDialogFocus";
import { agoraEmFortaleza } from "@/lib/fortaleza-time";

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
  servico_id: number | null;
  servico_nome: string | null;
  servico_preco: number | null;
  servico_duracao: number | null;
  servico: Servico | null;
  cliente: Cliente | null;
}

interface AgendamentoBase {
  id: number;
  data: string;
  horario: string;
  status: string;
  usuario_id: string;
  servico_id: number | null;
  servico_nome: string | null;
  servico_preco: number | null;
  servico_duracao: number | null;
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
  return agoraEmFortaleza().data;
}

// =========================================================
// COMPONENTE
// =========================================================

export default function AgendaPage() {
  const neon = createClient();

  const [dataSelecionada, setDataSelecionada] = useState(
    obterDataLocal()
  );

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);

  const [barbearia, setBarbearia] = useState<Barbearia | null>(null);

  const [filtro, setFiltro] = useState<Filtro>("todos");

  const [carregando, setCarregando] = useState(true);

  const [erro, setErro] = useState<string | null>(null);

  const [processandoId, setProcessandoId] = useState<number | null>(null);
  const [cancelamentoSelecionado, setCancelamentoSelecionado] =
    useState<Agendamento | null>(null);
  const [confirmacaoCancelamentoMarcada, setConfirmacaoCancelamentoMarcada] =
    useState(false);
  const [erroCancelamento, setErroCancelamento] = useState("");
  const [mensagemAgenda, setMensagemAgenda] = useState("");
  const dialogCancelamentoRef = useDialogFocus<HTMLElement>(Boolean(cancelamentoSelecionado), () => {
    if (processandoId === null) {
      setCancelamentoSelecionado(null);
      setConfirmacaoCancelamentoMarcada(false);
      setErroCancelamento("");
    }
  });

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
      } = await neon.auth.getUser();

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
      } = await neon
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
      } = await neon
        .from("agendamentos")
        .select(`
          id,
          data,
          horario,
          status,
          usuario_id,
          servico_id,
          servico_nome,
          servico_preco,
          servico_duracao,
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
        } = await neon
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
              (cliente: Cliente) => [
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
            const servicoRelacionado = Array.isArray(
              agendamento.servico
            )
              ? agendamento.servico[0] ?? null
              : agendamento.servico ?? null;
            const servico = servicoRelacionado ?? (agendamento.servico_nome ? {
              nome: agendamento.servico_nome,
              preco: agendamento.servico_preco ?? 0,
              duracao: agendamento.servico_duracao ?? 30,
            } : null);

            return {
              id: agendamento.id,
              data: agendamento.data,
              horario: agendamento.horario,
              status: agendamento.status,
              usuario_id: agendamento.usuario_id,
              servico_id: agendamento.servico_id,
              servico_nome: agendamento.servico_nome,
              servico_preco: agendamento.servico_preco,
              servico_duracao: agendamento.servico_duracao,
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
    const timer = window.setTimeout(() => { void carregarAgenda(); }, 0);
    return () => window.clearTimeout(timer);
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
  ): Promise<boolean> {
    if (!barbearia || processandoId !== null) return false;
    try {
      setProcessandoId(id);

      const {
        data: atualizado,
        error,
      } = await neon
        .from("agendamentos")
        .update({
          status: novoStatus,
        })
        .eq("id", id)
        .eq("barbearia_id", barbearia.id)
        .in("status", ["confirmado", "pendente", "aguardando"])
        .select("id")
        .maybeSingle();

      if (error || !atualizado) {
        if (error) console.error("Erro ao atualizar status:", error);

        setErroCancelamento(error
          ? "Não foi possível atualizar o agendamento. Tente novamente."
          : "O agendamento mudou ou não está mais disponível. Atualize a agenda.");

        return false;
      }

      setAgendamentos((atuais) => atuais.map((agendamento) =>
        agendamento.id === id ? { ...agendamento, status: novoStatus } : agendamento
      ));
      setMensagemAgenda(novoStatus === "cancelado"
        ? "Agendamento cancelado. O horário voltou a ficar disponível."
        : "Agendamento marcado como concluído.");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      setErroCancelamento("Não foi possível atualizar o agendamento. Tente novamente.");
      return false;
    } finally {
      setProcessandoId(null);
    }
  }

  async function confirmarCancelamento() {
    if (!cancelamentoSelecionado || !confirmacaoCancelamentoMarcada) return;
    setErroCancelamento("");

    const cancelado = await atualizarStatus(
      cancelamentoSelecionado.id,
      "cancelado",
    );

    if (cancelado) {
      setCancelamentoSelecionado(null);
      setConfirmacaoCancelamentoMarcada(false);
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
    <div className="agenda-page min-w-0 space-y-4 sm:space-y-8">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex items-center justify-between gap-3 md:items-end">

        <div>

          <p className="mb-1 text-xs text-zinc-500 sm:mb-2 sm:text-sm">
            Agenda
          </p>

          <h1 className="text-xl font-semibold tracking-tight sm:text-3xl">
            Sua agenda
          </h1>

          <p className="mt-1 hidden text-sm text-zinc-400 sm:block">
            Acompanhe todos os seus agendamentos.
          </p>

        </div>

        <button
          onClick={carregarAgenda}
          disabled={carregando}
          aria-label="Atualizar agenda"
          className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 sm:h-auto sm:w-auto sm:px-4 sm:py-2.5"
        >
          <span aria-hidden="true">↻</span>

          <span className="hidden sm:inline">{carregando ? "Atualizando..." : "Atualizar"}</span>
        </button>

      </div>
      {mensagemAgenda && <p role="status" className="border border-[#C9A227]/30 bg-[#C9A227]/10 p-3 text-sm text-[#E0BB35]">{mensagemAgenda}</p>}

      {/* =====================================================
          BARBEARIA
      ===================================================== */}

      <div className="hidden flex-col gap-4 rounded-2xl border border-zinc-800 bg-[#10151C] p-5 md:flex md:flex-row md:items-center md:justify-between">

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A227]/10 text-xl text-[#C9A227]">
            <Icon name="scissors" />
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

          <Icon name="calendar" />

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

      <div className="flex items-center justify-between gap-2">

        <div className="flex items-center gap-2">

          <button
            onClick={() =>
              mudarDia(-1)
            }
            aria-label="Dia anterior"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            ←
          </button>

          <button
            onClick={
              voltarParaHoje
            }
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            Hoje
          </button>

          <button
            onClick={() =>
              mudarDia(1)
            }
            aria-label="Próximo dia"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            →
          </button>

        </div>

        <div className="min-w-0 flex-1 text-right text-sm font-medium capitalize text-white sm:text-base">
          {formatarDataAgenda(dataSelecionada)}
        </div>

      </div>

      {/* =====================================================
          RESUMO
      ===================================================== */}

      <div className="hidden grid-cols-2 gap-4 lg:grid">

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

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:border-b sm:border-zinc-800 sm:pb-3">

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
              className={`min-h-10 whitespace-nowrap rounded-full px-3 py-2 text-xs transition sm:rounded-lg sm:px-4 sm:text-sm ${
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
          <button type="button" onClick={() => void carregarAgenda()} className="mt-3 min-h-11 font-semibold text-[#E0BB35]">Tentar novamente</button>

        </div>

      )}

      {/* =====================================================
          LISTA
      ===================================================== */}

      <div>

        <div className="mb-3 flex items-center justify-between sm:mb-4">

          <div>

            <h2 className="text-base font-semibold sm:text-lg">
              {obterTituloFiltro()}
            </h2>

            <p className="mt-0.5 text-xs text-zinc-500 sm:mt-1 sm:text-sm">

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
                <Icon name="calendar" />
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

            <div className="space-y-2.5 sm:space-y-4">

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
                      className="rounded-2xl border border-zinc-800 bg-[#10151C] p-3.5 transition hover:border-zinc-700 sm:p-5"
                    >

                      <div className="flex flex-col gap-3 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">

                        {/* =================================================
                            DATA + HORÁRIO + CLIENTE
                        ================================================= */}

                        <div className="flex min-w-0 items-center gap-3 sm:gap-4">

                          {/* HORÁRIO */}

                          <div className="flex h-14 w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-900 sm:h-16 sm:w-20">

                            <span className="text-lg font-semibold text-white sm:text-xl">
                              {formatarHorario(
                                agendamento.horario
                              )}
                            </span>

                            <span className="hidden text-[11px] text-zinc-500 sm:inline">horário</span>

                          </div>

                          {/* CLIENTE */}

                          <div className="min-w-0">

                            {/* DATA */}

                            <p className="mb-1 text-[11px] font-medium capitalize text-[#C9A227] sm:text-xs">
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

                            <h3 className="mt-1 break-words text-sm font-semibold text-white sm:mt-2 sm:text-base">
                              {agendamento.cliente?.nome ??
                                "Cliente"}
                            </h3>

                            {/* SERVIÇO */}

                            <p className="mt-0.5 break-words text-xs text-zinc-400 sm:mt-1 sm:text-sm sm:text-zinc-500">
                              {agendamento.servico?.nome ?? "Serviço não informado"}
                              {agendamento.servico?.preco != null && (
                                <span className="text-zinc-500"> · {formatarPreco(agendamento.servico.preco)}</span>
                              )}
                            </p>

                            {agendamento.cliente?.telefone && (
                              <button
                                onClick={() => abrirWhatsApp(agendamento.cliente?.telefone ?? null)}
                                className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-300 sm:hidden"
                              >
                                <Icon name="whatsapp" className="h-4 w-4" />
                                WhatsApp
                              </button>
                            )}

                          </div>

                        </div>

                        {/* =================================================
                            INFORMAÇÕES
                        ================================================= */}

                        <div className="hidden grid-cols-2 gap-5 sm:grid sm:grid-cols-4 lg:min-w-[500px]">

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

                        <div className="flex w-full gap-2 sm:w-auto lg:flex-col">

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
                              className="min-h-10 flex-1 rounded-xl bg-[#C9A227] px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-4 sm:py-2.5 sm:text-sm"
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
                              onClick={() => {
                                setCancelamentoSelecionado(agendamento);
                                setConfirmacaoCancelamentoMarcada(false);
                              }}
                              disabled={
                                estaProcessando
                              }
                              className="min-h-10 flex-1 rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-4 sm:py-2.5 sm:text-sm"
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

      {cancelamentoSelecionado && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => {
            if (processandoId === null) {
              setCancelamentoSelecionado(null);
              setConfirmacaoCancelamentoMarcada(false);
            }
          }}
        >
          <section
            ref={dialogCancelamentoRef}
            tabIndex={-1}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-cancelamento"
            aria-describedby="descricao-confirmar-cancelamento"
            className="my-auto max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain border border-red-500/30 bg-[#0B0F14] p-5 text-white shadow-2xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start gap-4 border-b border-white/10 pb-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-red-500/30 bg-red-500/10 text-red-300">
                <Icon name="alert" className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A227]">
                  {barbearia?.nome || "Na Régua+"}
                </p>
                <h2 id="titulo-confirmar-cancelamento" className="mt-1 text-xl font-bold">
                  Confirmar cancelamento?
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fechar confirmação"
                disabled={processandoId !== null}
                onClick={() => {
                  setCancelamentoSelecionado(null);
                  setConfirmacaoCancelamentoMarcada(false);
                }}
                className="min-h-11 min-w-11 border border-white/10 text-xl text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <p id="descricao-confirmar-cancelamento" className="text-sm leading-6 text-zinc-400">
              Este horário será marcado como cancelado e deixará de aparecer entre os agendamentos confirmados.
            </p>

            <div className="mt-5 border border-white/10 bg-white/[0.03] p-4">
              <p className="font-semibold text-white">
                {cancelamentoSelecionado.servico?.nome || "Serviço"}
              </p>
              <p className="mt-2 text-sm capitalize text-zinc-400">
                {formatarDataAgenda(cancelamentoSelecionado.data)} · {formatarHorario(cancelamentoSelecionado.horario)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Cliente: {cancelamentoSelecionado.cliente?.nome || "Não informado"}
              </p>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 border border-white/10 p-4 text-sm leading-5 text-zinc-200">
              <input
                type="checkbox"
                checked={confirmacaoCancelamentoMarcada}
                onChange={(event) => setConfirmacaoCancelamentoMarcada(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#C9A227]"
              />
              <span>Confirmo que quero cancelar este agendamento.</span>
            </label>
            {erroCancelamento && <p role="alert" className="mt-3 text-sm text-red-300">{erroCancelamento}</p>}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={processandoId !== null}
                onClick={() => {
                  setCancelamentoSelecionado(null);
                  setConfirmacaoCancelamentoMarcada(false);
                }}
                className="min-h-12 border border-white/15 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={!confirmacaoCancelamentoMarcada || processandoId !== null}
                onClick={confirmarCancelamento}
                className="min-h-12 bg-red-500 px-4 py-3 text-sm font-bold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {processandoId === cancelamentoSelecionado.id
                  ? "Cancelando..."
                  : "Confirmar cancelamento"}
              </button>
            </div>
          </section>
        </div>
      )}

    </div>
  );
}
