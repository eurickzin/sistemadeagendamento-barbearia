"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Servico {
  id: number;
  nome: string;
  descricao: string | null;
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
}

export default function AgendamentoModal({
  aberto,
  onFechar,
}: AgendamentoModalProps) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(
    null,
  );
  const [dataSelecionada, setDataSelecionada] = useState("");
  const [horarios, setHorarios] = useState<string[]>([]);
  const [horarioSelecionado, setHorarioSelecionado] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    if (!aberto) return;

    async function carregarServicos() {
      setCarregando(true);
      setErro("");

      const supabase = createClient();

      const { data, error } = await supabase
        .from("servicos")
        .select("*")
        .eq("ativo", true)
        .order("id");

      console.log("SERVIÇOS:", data);
      console.log("ERRO:", error);

      if (error) {
        setErro("Não foi possível carregar os serviços.");
        setCarregando(false);
        return;
      }

      setServicos(data ?? []);
      setCarregando(false);
    }

    carregarServicos();
  }, [aberto]);

  useEffect(() => {
    if (!dataSelecionada || !servicoSelecionado) {
      setHorarios([]);
      setHorarioSelecionado("");
      return;
    }

    carregarHorariosDisponiveis();
  }, [dataSelecionada, servicoSelecionado]);

  async function carregarHorariosDisponiveis() {
    if (!dataSelecionada || !servicoSelecionado) {
      setHorarios([]);
      setHorarioSelecionado("");
      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("agendamentos")
      .select("id, horario, servico_id, data")
      .eq("data", dataSelecionada)
      .neq("status", "cancelado");

    if (error) {
      console.error("ERRO AO BUSCAR AGENDAMENTOS:", error);
      return;
    }

    const agendamentos = (data ?? []) as Agendamento[];

    const horariosGerados: string[] = [];

    const inicio = 8 * 60;
    const fim = 18 * 60;
    const intervalo = 30;

    for (let minutos = inicio; minutos < fim; minutos += intervalo) {
      const hora = Math.floor(minutos / 60)
        .toString()
        .padStart(2, "0");

      const minuto = (minutos % 60).toString().padStart(2, "0");

      horariosGerados.push(`${hora}:${minuto}`);
    }

    const horariosDisponiveis = horariosGerados.filter((horario) => {
      const [hora, minuto] = horario.split(":").map(Number);
      const inicioHorario = hora * 60 + minuto;

      const fimHorario = inicioHorario + servicoSelecionado.duracao;

      return !agendamentos.some((agendamento) => {
        const [horaAgendamento, minutoAgendamento] = agendamento.horario
          .split(":")
          .map(Number);

        const inicioAgendamento = horaAgendamento * 60 + minutoAgendamento;

        const servicoAgendado = servicos.find(
          (servico) => servico.id === agendamento.servico_id,
        );

        if (!servicoAgendado) {
          return false;
        }

        const fimAgendamento = inicioAgendamento + servicoAgendado.duracao;

        return inicioHorario < fimAgendamento && fimHorario > inicioAgendamento;
      });
    });

    setHorarios(horariosDisponiveis);
    setHorarioSelecionado("");
  }

async function confirmarAgendamento() {
  console.log("1. INICIANDO CONFIRMAÇÃO");

  if (
    !servicoSelecionado ||
    !dataSelecionada ||
    !horarioSelecionado
  ) {
    console.log("2. DADOS INCOMPLETOS");
    return;
  }

  setConfirmando(true);
  setErro("");
  setSucesso("");

  console.log("3. CRIANDO CLIENTE SUPABASE");

  const supabase = createClient();

  console.log("4. BUSCANDO USUÁRIO");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("5. USUÁRIO:", user);
  console.log("6. ERRO USUÁRIO:", userError);

  if (!user) {
    setErro("Você precisa estar logado para realizar um agendamento.");
    setConfirmando(false);
    return;
  }

  console.log("7. FAZENDO INSERT");

  const { data, error } = await supabase
    .from("agendamentos")
    .insert({
      usuario_id: user.id,
      servico_id: servicoSelecionado.id,
      data: dataSelecionada,
      horario: horarioSelecionado,
      status: "confirmado",
    })
    .select();

  console.log("8. RESULTADO INSERT:", data);
  console.log("9. ERRO INSERT:", error);

  if (error) {
    console.error("ERRO AO CRIAR AGENDAMENTO:", error);
    setErro(error.message);
    setConfirmando(false);
    return;
  }

  console.log("10. AGENDAMENTO CRIADO!");

  setSucesso("Agendamento confirmado com sucesso!");
  setConfirmando(false);
}

  if (!aberto) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-md"
      onClick={onFechar}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-[#0B0F14] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-[#C9A227]" />

        <div className="p-8">
          <button
            type="button"
            onClick={onFechar}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-xl text-zinc-500 transition-all duration-300 hover:border-[#C9A227]/40 hover:bg-white/5 hover:text-[#C9A227]"
            aria-label="Fechar"
          >
            ×
          </button>

          <div className="mb-8 pr-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A227]">
              RK BARBER.
            </p>

            <h2 className="mt-3 text-3xl font-bold text-white">
              Novo agendamento
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Escolha o serviço que deseja realizar.
            </p>
          </div>

          {carregando && (
            <div className="py-10 text-center text-zinc-400">
              Carregando serviços...
            </div>
          )}

          {erro && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {erro}
            </div>
          )}

          {!carregando &&
            !erro &&
            !servicoSelecionado &&
            servicos.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {servicos.map((servico) => (
                  <button
                    key={servico.id}
                    type="button"
                    onClick={() => setServicoSelecionado(servico)}
                    className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A227]/50 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-semibold text-white">
                        {servico.nome}
                      </h3>

                      <span className="whitespace-nowrap text-sm font-semibold text-[#C9A227]">
                        R$ {Number(servico.preco).toFixed(2).replace(".", ",")}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-5 text-zinc-500">
                      {servico.descricao}
                    </p>

                    <p className="mt-4 text-xs font-medium text-zinc-400">
                      {servico.duracao} minutos
                    </p>
                  </button>
                ))}
              </div>
            )}

          {!carregando && !erro && servicoSelecionado && (
            <div>
              <div className="rounded-xl border border-[#C9A227]/30 bg-[#C9A227]/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
                  Serviço selecionado
                </p>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {servicoSelecionado.nome}
                    </h3>

                    <p className="mt-2 text-sm text-zinc-500">
                      {servicoSelecionado.duracao} minutos
                    </p>
                  </div>

                  <span className="text-lg font-semibold text-[#C9A227]">
                    R${" "}
                    {Number(servicoSelecionado.preco)
                      .toFixed(2)
                      .replace(".", ",")}
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
                  Etapa 2
                </p>

                <h3 className="mt-2 text-2xl font-bold text-white">
                  Escolha a data
                </h3>

                <p className="mt-2 text-sm text-zinc-400">
                  Selecione o dia em que deseja realizar o serviço.
                </p>

                <div className="mt-6">
                  <input
                    type="date"
                    value={dataSelecionada}
                    onChange={(e) => setDataSelecionada(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-[#C9A227]"
                  />

                  {dataSelecionada && (
                    <div className="mt-6">
                      <p className="text-sm text-zinc-400">Data escolhida:</p>

                      {dataSelecionada && horarios.length > 0 && (
                        <div className="mt-8">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
                            Etapa 3
                          </p>

                          <h3 className="mt-2 text-2xl font-bold text-white">
                            Escolha o horário
                          </h3>

                          <p className="mt-2 text-sm text-zinc-400">
                            Selecione um horário disponível para o seu
                            atendimento.
                          </p>

                          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {horarios.map((horario) => (
                              <button
                                key={horario}
                                type="button"
                                onClick={() => setHorarioSelecionado(horario)}
                                className={`rounded-md border px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                                  horarioSelecionado === horario
                                    ? "border-[#C9A227] bg-[#C9A227] text-black"
                                    : "border-white/10 bg-white/[0.03] text-white hover:border-[#C9A227]/50 hover:bg-white/[0.05]"
                                }`}
                              >
                                {horario}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {servicoSelecionado &&
                        dataSelecionada &&
                        horarioSelecionado && (
                          <div className="mt-8 rounded-xl border border-[#C9A227]/30 bg-[#C9A227]/5 p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
                              Resumo
                            </p>

                            <h3 className="mt-2 text-2xl font-bold text-white">
                              Confirmar agendamento
                            </h3>

                            <div className="mt-6 space-y-4">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-zinc-500">
                                  Serviço
                                </span>

                                <span className="text-sm font-semibold text-white">
                                  {servicoSelecionado.nome}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-zinc-500">
                                  Data
                                </span>

                                <span className="text-sm font-semibold text-white">
                                  {new Date(
                                    `${dataSelecionada}T12:00:00`,
                                  ).toLocaleDateString("pt-BR")}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-zinc-500">
                                  Horário
                                </span>

                                <span className="text-sm font-semibold text-white">
                                  {horarioSelecionado}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-zinc-500">
                                  Duração
                                </span>

                                <span className="text-sm font-semibold text-white">
                                  {servicoSelecionado.duracao} minutos
                                </span>
                              </div>

                              <div className="border-t border-white/10 pt-4">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="font-semibold text-white">
                                    Total
                                  </span>

                                  <span className="text-xl font-bold text-[#C9A227]">
                                    R${" "}
                                    {Number(servicoSelecionado.preco)
                                      .toFixed(2)
                                      .replace(".", ",")}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {erro && (
  <div className="mt-6 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
    {erro}
  </div>
)}

{sucesso && (
  <div className="mt-6 rounded-md border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
    {sucesso}
  </div>
)}

<button
  type="button"
  onClick={confirmarAgendamento}
  disabled={confirmando || !!sucesso}
  className="mt-6 w-full rounded-md bg-[#C9A227] px-5 py-3 font-semibold text-black transition-all duration-300 hover:-translate-y-[1px] hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-50"
>
  {confirmando
    ? "Confirmando..."
    : sucesso
      ? "Agendamento confirmado"
      : "Confirmar agendamento"}
</button>
                          </div>
                        )}

                      <p className="mt-1 font-semibold text-[#C9A227]">
                        {new Date(
                          `${dataSelecionada}T12:00:00`,
                        ).toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setServicoSelecionado(null)}
                  className="mt-4 text-sm text-zinc-500 transition hover:text-[#C9A227]"
                >
                  ← Escolher outro serviço
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
