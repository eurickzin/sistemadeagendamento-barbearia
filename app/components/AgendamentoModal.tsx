"use client";

import { useEffect, useState } from "react";
import CalendarioCustomizado from "./CalendarioCustomizado";
import { createClient } from "@/lib/supabase/client";

interface Servico {
  id: number;
  nome: string;
  preco: number;
  duracao: number;
}

interface Agendamento {
  id: number;
  horario: string;
  servico_id: number;
  data: string;
}

interface AgendamentoModalProps {
  aberto: boolean;
  onFechar: () => void;
  onAgendamentoCriado: () => Promise<void>;
}

export default function AgendamentoModal({
  aberto,
  onFechar,
  onAgendamentoCriado,
}: AgendamentoModalProps) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoSelecionado, setServicoSelecionado] =
    useState<Servico | null>(null);

  const [dataSelecionada, setDataSelecionada] = useState("");
  const [horarioSelecionado, setHorarioSelecionado] = useState("");

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);

  const [carregandoServicos, setCarregandoServicos] =
    useState(false);

  const [carregandoHorarios, setCarregandoHorarios] =
    useState(false);

  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState("");

  const [sucesso, setSucesso] = useState(false);

  // =========================
  // CONFIGURAÇÕES DA BARBEARIA
  // =========================

  const HORA_ABERTURA = 8 * 60;
  const HORA_FECHAMENTO = 21 * 60;
  const INTERVALO = 30;

  // Terça até domingo
  // 0 = Domingo
  // 1 = Segunda
  // 2 = Terça
  // 3 = Quarta
  // 4 = Quinta
  // 5 = Sexta
  // 6 = Sábado

  // =========================
  // RESET DO MODAL
  // =========================

  function resetarModal() {
    setServicoSelecionado(null);
    setDataSelecionada("");
    setHorarioSelecionado("");
    setAgendamentos([]);
    setErro("");
    setSucesso(false);
    setSalvando(false);
  }

  function fecharModal() {
    resetarModal();
    onFechar();
  }

  // =========================
  // CARREGAR SERVIÇOS
  // =========================

  useEffect(() => {
    if (!aberto) return;

    async function carregarServicos() {
      setCarregandoServicos(true);
      setErro("");

      const supabase = createClient();

      const { data, error } = await supabase
        .from("servicos")
        .select("id, nome, preco, duracao")
        .eq("ativo", true)
        .order("id", { ascending: true });

      if (error) {
        console.error("ERRO AO CARREGAR SERVIÇOS:", error);
        setErro("Não foi possível carregar os serviços.");
      } else {
        setServicos(data ?? []);
      }

      setCarregandoServicos(false);
    }

    carregarServicos();
  }, [aberto]);

  // =========================
  // BUSCAR AGENDAMENTOS DA DATA
  // =========================

  useEffect(() => {
    if (!dataSelecionada) {
      setAgendamentos([]);
      return;
    }

    async function carregarAgendamentos() {
      setCarregandoHorarios(true);
      setErro("");

      const supabase = createClient();

      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, horario, servico_id, data")
        .eq("data", dataSelecionada)
        .neq("status", "cancelado");

      if (error) {
        console.error(
          "ERRO AO CARREGAR AGENDAMENTOS:",
          error,
        );

        setErro(
          "Não foi possível carregar os horários disponíveis.",
        );

        setAgendamentos([]);
      } else {
        setAgendamentos(data ?? []);
      }

      setHorarioSelecionado("");
      setCarregandoHorarios(false);
    }

    carregarAgendamentos();
  }, [dataSelecionada]);

  // =========================
  // GERAR HORÁRIOS
  // =========================

  function gerarHorariosDisponiveis() {
    if (!servicoSelecionado || !dataSelecionada) {
      return [];
    }

    const horarios: string[] = [];

    for (
      let inicioHorario = HORA_ABERTURA;
      inicioHorario < HORA_FECHAMENTO;
      inicioHorario += INTERVALO
    ) {
      const fimHorario =
        inicioHorario + servicoSelecionado.duracao;

      // Não permite que o serviço ultrapasse 21:00
      if (fimHorario > HORA_FECHAMENTO) {
        continue;
      }

      // Verifica conflito com outros agendamentos
      const ocupado = agendamentos.some(
        (agendamento) => {
          const [
            horaAgendamento,
            minutoAgendamento,
          ] = agendamento.horario
            .split(":")
            .map(Number);

          const inicioAgendamento =
            horaAgendamento * 60 +
            minutoAgendamento;

          const servicoAgendado = servicos.find(
            (servico) =>
              servico.id ===
              agendamento.servico_id,
          );

          if (!servicoAgendado) {
            return false;
          }

          const fimAgendamento =
            inicioAgendamento +
            servicoAgendado.duracao;

          return (
            inicioHorario < fimAgendamento &&
            fimHorario > inicioAgendamento
          );
        },
      );

      if (!ocupado) {
        const horas = Math.floor(
          inicioHorario / 60,
        );

        const minutos = inicioHorario % 60;

        horarios.push(
          `${String(horas).padStart(2, "0")}:${String(
            minutos,
          ).padStart(2, "0")}`,
        );
      }
    }

    return horarios;
  }

  const horariosDisponiveis =
    gerarHorariosDisponiveis();

  // =========================
  // CONFIRMAR AGENDAMENTO
  // =========================

  async function confirmarAgendamento() {
    if (!servicoSelecionado) {
      setErro("Selecione um serviço.");
      return;
    }

    if (!dataSelecionada) {
      setErro("Selecione uma data.");
      return;
    }

    if (!horarioSelecionado) {
      setErro("Selecione um horário.");
      return;
    }

    // Segurança extra:
    // impede agendamento na segunda-feira
    const data = new Date(
      `${dataSelecionada}T12:00:00`,
    );

    if (data.getDay() === 1) {
      setErro(
        "A barbearia não funciona às segundas-feiras.",
      );
      return;
    }

    // Segurança extra:
    // verifica se o horário escolhido realmente
    // termina até às 21:00
    const [hora, minuto] =
      horarioSelecionado.split(":").map(Number);

    const inicio =
      hora * 60 + minuto;

    const fim =
      inicio + servicoSelecionado.duracao;

    if (fim > HORA_FECHAMENTO) {
      setErro(
        "Esse horário ultrapassa o horário de funcionamento da barbearia.",
      );
      return;
    }

    setSalvando(true);
    setErro("");

    const supabase = createClient();

    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser();

    if (!user) {
      setErro(
        "Você precisa estar logado para agendar.",
      );

      setSalvando(false);
      return;
    }

const { error } = await supabase
  .from("agendamentos")
  .insert({
    usuario_id: user.id,
    servico_id: servicoSelecionado.id,
    data: dataSelecionada,
    horario: horarioSelecionado,
    status: "confirmado",
  });

if (error) {
  console.error(
    "ERRO AO CRIAR AGENDAMENTO:",
    error,
  );

  if (error.code === "23505") {
    setErro(
      "Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário.",
    );
  } else {
    setErro(
      "Não foi possível realizar o agendamento. Tente novamente.",
    );
  }

  setSalvando(false);
  return;
}

    // Atualiza a lista da conta imediatamente
    await onAgendamentoCriado();

    setSalvando(false);
    setSucesso(true);
  }

  // =========================
  // MODAL FECHADO
  // =========================

  if (!aberto) {
    return null;
  }

  // =========================
  // TELA DE SUCESSO
  // =========================

  if (sucesso) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0F14] p-6 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <span className="text-3xl text-emerald-400">
                ✓
              </span>
            </div>

            <h2 className="text-xl font-bold text-white">
              Agendamento confirmado!
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Seu horário foi reservado com sucesso.
            </p>

            <div className="mt-6 w-full space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left">
              <div>
                <p className="text-xs text-zinc-500">
                  Serviço
                </p>

                <p className="mt-1 font-medium text-white">
                  {servicoSelecionado?.nome}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Data
                </p>

                <p className="mt-1 font-medium text-white">
                  {dataSelecionada}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Horário
                </p>

                <p className="mt-1 font-medium text-[#C9A227]">
                  {horarioSelecionado}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fecharModal}
              className="mt-6 w-full rounded-xl bg-[#C9A227] px-4 py-3 font-semibold text-black transition-all hover:bg-[#E0BB35]"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // MODAL PRINCIPAL
  // =========================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F14] shadow-2xl">
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-white">
              Agendar horário
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Escolha o serviço, data e horário
            </p>
          </div>

          <button
            type="button"
            onClick={fecharModal}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-xl text-zinc-400 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* CONTEÚDO */}

        <div className="scrollbar-rk overflow-y-auto px-6 py-6">
          {/* SERVIÇOS */}

          <div>
            <label className="mb-3 block text-sm font-medium text-zinc-300">
              1. Escolha o serviço
            </label>

            {carregandoServicos ? (
              <p className="text-sm text-zinc-500">
                Carregando serviços...
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {servicos.map((servico) => {
                  const selecionado =
                    servicoSelecionado?.id ===
                    servico.id;

                  return (
                    <button
                      key={servico.id}
                      type="button"
                      onClick={() => {
                        setServicoSelecionado(
                          servico,
                        );

                        setHorarioSelecionado("");
                        setErro("");
                      }}
                      className={`
                        rounded-xl border p-4 text-left transition-all
                        ${
                          selecionado
                            ? "border-[#C9A227] bg-[#C9A227]/10"
                            : "border-white/10 bg-white/[0.02] hover:border-[#C9A227]/40 hover:bg-[#C9A227]/5"
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            {servico.nome}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {servico.duracao} minutos
                          </p>
                        </div>

                        <span className="whitespace-nowrap text-sm font-semibold text-[#C9A227]">
                          R${" "}
                          {Number(
                            servico.preco,
                          ).toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* DATA */}

          {servicoSelecionado && (
            <div className="mt-7">
              <label className="mb-3 block text-sm font-medium text-zinc-300">
                2. Escolha a data
              </label>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <CalendarioCustomizado
                  value={dataSelecionada}
                  onChange={(data) => {
                    setDataSelecionada(data);
                    setHorarioSelecionado("");
                    setErro("");
                  }}
                />
              </div>

              {dataSelecionada && (
                <div className="mt-3 rounded-lg border border-[#C9A227]/20 bg-[#C9A227]/5 px-4 py-3">
                  <p className="text-sm text-zinc-400">
                    Data escolhida
                  </p>

                  <p className="mt-1 font-semibold text-[#C9A227]">
                    {dataSelecionada}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* HORÁRIOS */}

          {servicoSelecionado &&
            dataSelecionada && (
              <div className="mt-7">
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-medium text-zinc-300">
                    3. Escolha o horário
                  </label>

                  <span className="text-xs text-zinc-500">
                    08:00 às 21:00
                  </span>
                </div>

                {carregandoHorarios ? (
                  <p className="text-sm text-zinc-500">
                    Verificando horários...
                  </p>
                ) : horariosDisponiveis.length ===
                  0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center">
                    <p className="text-sm text-zinc-400">
                      Nenhum horário disponível
                      para esta data.
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Escolha outra data para
                      verificar disponibilidade.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {horariosDisponiveis.map(
                      (horario) => {
                        const selecionado =
                          horarioSelecionado ===
                          horario;

                        return (
                          <button
                            key={horario}
                            type="button"
                            onClick={() => {
                              setHorarioSelecionado(
                                horario,
                              );

                              setErro("");
                            }}
                            className={`
                              rounded-lg border px-3 py-3 text-sm font-medium transition-all
                              ${
                                selecionado
                                  ? "border-[#C9A227] bg-[#C9A227] text-black"
                                  : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-[#C9A227]/50 hover:bg-[#C9A227]/10 hover:text-[#C9A227]"
                              }
                            `}
                          >
                            {horario}
                          </button>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            )}

          {/* ERRO */}

          {erro && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <p className="text-sm text-red-400">
                {erro}
              </p>
            </div>
          )}
        </div>

        {/* FOOTER */}

        <div className="border-t border-white/10 px-6 py-5">
          <button
            type="button"
            onClick={confirmarAgendamento}
            disabled={
              salvando ||
              !servicoSelecionado ||
              !dataSelecionada ||
              !horarioSelecionado
            }
            className="w-full rounded-xl bg-[#C9A227] px-4 py-3 font-semibold text-black transition-all hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {salvando
              ? "Confirmando..."
              : "Confirmar agendamento"}
          </button>
        </div>
      </div>
    </div>
  );
}