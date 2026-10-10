"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/ui/Icon";

interface Barbearia {
  id: string;
  nome: string | null;
}

interface Agendamento {
  id: number;
  data: string;
  horario: string;
  status: string;
  servico_nome: string | null;
  servico_preco: number | null;
  servico_duracao: number | null;
  servico: {
    nome: string;
    preco: number;
    duracao: number;
  } | null;
}

export default function PainelPage() {
  const router = useRouter();

  const [barbearia, setBarbearia] = useState<Barbearia | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);

  const hoje = new Date();
  const anoHoje = hoje.getFullYear();
  const mesHoje = String(hoje.getMonth() + 1).padStart(2, "0");
  const diaHoje = String(hoje.getDate()).padStart(2, "0");
  const dataHoje = `${anoHoje}-${mesHoje}-${diaHoje}`;

  async function carregarPainel() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/painel/login");
      return;
    }

    const { data: barbeariaData, error: barbeariaError } =
      await supabase
        .from("barbearias")
        .select("id, nome")
        .eq("proprietario_id", user.id)
        .maybeSingle();

    if (barbeariaError || !barbeariaData) {
      console.error(
        "Erro ao carregar barbearia:",
        barbeariaError
      );

      setCarregando(false);
      return;
    }

    setBarbearia(barbeariaData);

    const camposAgendamento = `
        id,
        data,
        horario,
        status,
        servico_nome,
        servico_preco,
        servico_duracao,
        servico:servicos (
          nome,
          preco,
          duracao
        )
      `;

    const [resultadoHoje, resultadoFuturos] = await Promise.all([
      supabase
        .from("agendamentos")
        .select(camposAgendamento)
        .eq("barbearia_id", barbeariaData.id)
        .eq("data", dataHoje)
        .order("horario", { ascending: true }),
      supabase
        .from("agendamentos")
        .select(camposAgendamento)
        .eq("barbearia_id", barbeariaData.id)
        .gt("data", dataHoje)
        .in("status", ["pendente", "confirmado"])
        .order("data", { ascending: true })
        .order("horario", { ascending: true })
        .limit(5),
    ]);

    const erroAgendamentos = resultadoHoje.error ?? resultadoFuturos.error;
    if (erroAgendamentos) {
      console.error(
        "Erro ao carregar agendamentos:",
        erroAgendamentos
      );

      setAgendamentos([]);
    } else {
      const agendamentosData = [
        ...(resultadoHoje.data ?? []),
        ...(resultadoFuturos.data ?? []),
      ] as unknown as Agendamento[];
      setAgendamentos(
        agendamentosData.map((agendamento) => ({
          ...agendamento,
          servico: agendamento.servico ?? (agendamento.servico_nome ? {
            nome: agendamento.servico_nome,
            preco: agendamento.servico_preco ?? 0,
            duracao: agendamento.servico_duracao ?? 30,
          } : null),
        }))
      );
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregarPainel();
  }, []);

  const agendamentosHoje = agendamentos
    .filter((agendamento) => agendamento.data === dataHoje)
    .sort((a, b) => a.horario.localeCompare(b.horario));

  const proximosAgendamentos = agendamentos
    .filter(
      (agendamento) =>
        agendamento.data >= dataHoje &&
        (agendamento.status === "pendente" || agendamento.status === "confirmado"),
    )
    .sort((a, b) =>
      a.data === b.data
        ? a.horario.localeCompare(b.horario)
        : a.data.localeCompare(b.data),
    );

  const totalAgendamentosHoje = agendamentosHoje.length;

  const totalConcluidosHoje = agendamentosHoje.filter(
    (agendamento) => agendamento.status === "concluido"
  ).length;

  const totalCanceladosHoje = agendamentosHoje.filter(
    (agendamento) => agendamento.status === "cancelado"
  ).length;

  const totalPendentesHoje = agendamentosHoje.filter(
    (agendamento) => agendamento.status === "pendente"
  ).length;

  const faturamentoHoje = agendamentosHoje
    .filter((agendamento) => agendamento.status === "concluido")
    .reduce((total, agendamento) => {
      return total + Number(agendamento.servico?.preco ?? 0);
    }, 0);

  function formatarHorario(horario: string) {
    return horario.slice(0, 5);
  }

  function formatarPreco(preco: number) {
    return Number(preco).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarDataCompleta(data: string) {
    const [ano, mes, dia] = data.split("-").map(Number);

    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(ano, mes - 1, dia));
  }

  function rotuloDataAgendamento(data: string) {
    if (data === dataHoje) return "Hoje";

    const [ano, mes, dia] = data.split("-").map(Number);
    const dataLocal = new Date(ano, mes - 1, dia);
    const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
    const dataAmanha = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, "0")}-${String(amanha.getDate()).padStart(2, "0")}`;

    if (data === dataAmanha) return "Amanhã";

    const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }).format(dataLocal);

    return dataFormatada.charAt(0).toLocaleUpperCase("pt-BR") + dataFormatada.slice(1);
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

  if (carregando) {
    return (
      <div className="animate-pulse">
        <div className="h-10 w-64 rounded bg-white/5" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="h-32 rounded-2xl bg-white/5" />
          <div className="h-32 rounded-2xl bg-white/5" />
          <div className="h-32 rounded-2xl bg-white/5" />
          <div className="h-32 rounded-2xl bg-white/5" />
        </div>

        <div className="mt-8 h-96 rounded-2xl bg-white/5" />
      </div>
    );
  }

if (!barbearia) {
  router.replace("/painel/cadastrar-barbearia");

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[#C9A227]" />

        <p className="mt-4 text-sm text-zinc-500">
          Redirecionando...
        </p>
      </div>
    </div>
  );
}

  return (
    <div>
      {/* ESTATÍSTICAS */}

      <section className="mt-4 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-4 xl:grid-cols-4">

        <div className="rounded-xl border border-[#C9A227]/20 bg-[#C9A227]/[0.04] p-3 sm:rounded-2xl sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs sm:tracking-wider">
              Agendamentos
            </p>

            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C9A227]/10 text-[#C9A227] sm:h-9 sm:w-9 sm:rounded-xl">
              <Icon name="calendar" className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold sm:mt-4 sm:text-3xl">
            {totalAgendamentosHoje}
          </p>

          <p className="mt-0.5 text-[10px] text-zinc-600 sm:mt-1 sm:text-xs">
            horários para hoje
          </p>
        </div>

        <div className="rounded-xl border border-yellow-500/10 bg-yellow-500/[0.02] p-3 sm:rounded-2xl sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs sm:tracking-wider">
              Pendentes
            </p>

            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-400 sm:h-9 sm:w-9 sm:rounded-xl">
              <Icon name="hourglass" className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold sm:mt-4 sm:text-3xl">
            {totalPendentesHoje}
          </p>

          <p className="mt-0.5 text-[10px] text-zinc-600 sm:mt-1 sm:text-xs">
            aguardando confirmação
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] p-3 sm:rounded-2xl sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs sm:tracking-wider">
              Concluídos
            </p>

            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 sm:h-9 sm:w-9 sm:rounded-xl">
              ✓
            </span>
          </div>

          <p className="mt-2 text-2xl font-bold sm:mt-4 sm:text-3xl">
            {totalConcluidosHoje}
          </p>

          <p className="mt-0.5 text-[10px] text-zinc-600 sm:mt-1 sm:text-xs">
            serviços realizados
          </p>
        </div>

        <div className="rounded-xl border border-blue-500/10 bg-blue-500/[0.02] p-3 sm:rounded-2xl sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs sm:tracking-wider">
              Faturamento
            </p>

            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 sm:h-9 sm:w-9 sm:rounded-xl">
              R$
            </span>
          </div>

          <p className="mt-2 text-xl font-bold sm:mt-4 sm:text-2xl">
            {formatarPreco(faturamentoHoje)}
          </p>

          <p className="mt-0.5 text-[10px] text-zinc-600 sm:mt-1 sm:text-xs">
            serviços concluídos hoje
          </p>
        </div>

      </section>

      {/* CONTEÚDO */}

      <section className="mt-4 grid gap-4 sm:mt-8 sm:gap-6 xl:grid-cols-[1fr_360px]">

        {/* AGENDA */}

        <div className="rounded-2xl border border-white/10 bg-white/[0.02]">

          <div className="flex flex-col gap-3 border-b border-white/10 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#C9A227]">
                Agenda
              </p>

              <h2 className="mt-1 text-lg font-bold sm:text-xl">
                Próximos agendamentos
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {formatarDataCompleta(dataHoje)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/painel/agenda")}
              className="hidden rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:border-[#C9A227]/30 hover:text-[#C9A227] sm:inline-flex sm:self-auto sm:rounded-xl sm:px-4 sm:py-2.5"
            >Ver agenda completa →</button>

          </div>

          {proximosAgendamentos.length === 0 ? (
            <div className="p-5 text-center sm:p-10">

              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#C9A227]/10 text-lg sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl">
                <Icon name="calendar" />
              </div>

              <h3 className="mt-3 font-semibold sm:mt-5">
                Nenhum próximo agendamento
              </h3>

              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-zinc-500 sm:mt-2 sm:text-sm sm:leading-6">
                Seus próximos agendamentos pendentes ou confirmados aparecerão aqui.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-white/5">

              {proximosAgendamentos.slice(0, 5).map((agendamento, index) => (
                <div
                  key={agendamento.id}
                  className={`p-3 transition hover:bg-white/[0.02] sm:p-5 ${index >= 3 ? "hidden sm:block" : ""}`}
                >

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex items-center gap-3 sm:gap-4">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#C9A227]/10 text-[#C9A227] sm:h-11 sm:w-11 sm:rounded-xl">
                        <Icon name="scissors" className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>

                      <div>

                        <p className="text-xs font-semibold text-zinc-400">
                          {rotuloDataAgendamento(agendamento.data)}
                        </p>

                        <p className="mt-0.5 text-base font-bold text-[#C9A227] sm:text-lg">
                          {formatarHorario(
                            agendamento.horario
                          )}
                        </p>

                        <p className="mt-1 font-semibold text-white">
                          {agendamento.servico?.nome ??
                            "Serviço"}
                        </p>

                        {agendamento.servico?.duracao && (
                          <p className="mt-1 text-xs text-zinc-600">
                            {agendamento.servico.duracao} min
                          </p>
                        )}

                      </div>

                    </div>

                    <div className="flex items-center gap-3 sm:justify-end">

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasse(
                          agendamento.status
                        )}`}
                      >
                        {statusLabel(agendamento.status)}
                      </span>

                      <p className="font-semibold text-zinc-300">
                        {agendamento.servico
                          ? formatarPreco(
                              agendamento.servico.preco
                            )
                          : "--"}
                      </p>

                    </div>

                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

        {/* PRÓXIMOS CLIENTES */}

        <div className="hidden rounded-2xl border border-white/10 bg-white/[0.02] xl:block">

          <div className="border-b border-white/10 p-5">

            <p className="text-xs font-medium uppercase tracking-wider text-[#C9A227]">
              Próximos
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Próximos clientes
            </h2>

          </div>

          {proximosAgendamentos.length === 0 ? (
            <div className="p-8 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-xl">
                ✓
              </div>

              <p className="mt-4 text-sm font-medium">
                Tudo em dia
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-600">
                Não existem próximos agendamentos
                pendentes para os próximos dias.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-white/5">

              {proximosAgendamentos
                .slice(0, 5)
                .map((agendamento) => (
                  <div
                    key={agendamento.id}
                    className="p-5"
                  >

                    <div className="flex items-center justify-between gap-3">

                      <div className="min-w-0">

                        <p className="text-sm font-semibold text-white">
                          {agendamento.servico?.nome ??
                            "Serviço"}
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          {rotuloDataAgendamento(agendamento.data)} · {agendamento.servico?.duracao
                            ? `${agendamento.servico.duracao} min`
                            : "Horário agendado"}
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="font-bold text-[#C9A227]">
                          {formatarHorario(
                            agendamento.horario
                          )}
                        </p>

                        <span
                          className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] ${statusClasse(
                            agendamento.status
                          )}`}
                        >
                          {statusLabel(agendamento.status)}
                        </span>

                      </div>

                    </div>

                  </div>
                ))}

            </div>
          )}

        </div>

      </section>

    </div>
  );
}
