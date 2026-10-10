"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/ui/Icon";

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
  servico_id: number | null;
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
        .select("*")
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
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    if (agendamentosError) {
      console.error(
        "Erro ao carregar agendamentos:",
        agendamentosError
      );

      setAgendamentos([]);
    } else {
      setAgendamentos(
        ((agendamentosData as unknown as Agendamento[]) ?? []).map((agendamento) => ({
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

  const hoje = new Date();

  const anoHoje = hoje.getFullYear();
  const mesHoje = String(hoje.getMonth() + 1).padStart(2, "0");
  const diaHoje = String(hoje.getDate()).padStart(2, "0");

  const dataHoje = `${anoHoje}-${mesHoje}-${diaHoje}`;

  const agendamentosHoje = agendamentos
    .filter((agendamento) => agendamento.data === dataHoje)
    .sort((a, b) => a.horario.localeCompare(b.horario));

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

  const proximosAgendamentos = agendamentosHoje.filter(
    (agendamento) =>
      agendamento.status !== "cancelado" &&
      agendamento.status !== "concluido"
  );

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
      {/* TÍTULO */}

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
          Dashboard
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Olá, {barbearia.nome?.trim() || "sua barbearia"} <Icon name="wave" className="ml-1 inline h-5 w-5 align-[-3px]" />
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Acompanhe o movimento da sua barbearia.
        </p>
      </div>

      {/* MENU MOBILE */}

      <div className="mt-6 flex gap-2 overflow-x-auto lg:hidden">
        <button
          type="button"
          className="whitespace-nowrap rounded-xl bg-[#C9A227] px-4 py-2.5 text-xs font-medium text-black"
        >
          Dashboard
        </button>

        <button
          type="button"
          onClick={() => router.push("/painel/agenda")}
          className="whitespace-nowrap rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-zinc-500"
        >
          Agenda
        </button>

        <button
          type="button"
          className="whitespace-nowrap rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-zinc-500"
        >
          Agendamentos
        </button>

        <button
          type="button"
          className="whitespace-nowrap rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-zinc-500"
        >
          Clientes
        </button>

        <button
          type="button"
          className="whitespace-nowrap rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-zinc-500"
        >
          Serviços
        </button>

        <button
          type="button"
          className="whitespace-nowrap rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-zinc-500"
        >
          Horários
        </button>
      </div>

      {/* ESTATÍSTICAS */}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-[#C9A227]/20 bg-[#C9A227]/[0.04] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Agendamentos
            </p>

            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C9A227]/10 text-[#C9A227]">
              <Icon name="calendar" />
            </span>
          </div>

          <p className="mt-4 text-3xl font-bold">
            {totalAgendamentosHoje}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            horários para hoje
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-500/10 bg-yellow-500/[0.02] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Pendentes
            </p>

            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400">
              <Icon name="hourglass" />
            </span>
          </div>

          <p className="mt-4 text-3xl font-bold">
            {totalPendentesHoje}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            aguardando confirmação
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Concluídos
            </p>

            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              ✓
            </span>
          </div>

          <p className="mt-4 text-3xl font-bold">
            {totalConcluidosHoje}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            serviços realizados
          </p>
        </div>

        <div className="rounded-2xl border border-blue-500/10 bg-blue-500/[0.02] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Faturamento
            </p>

            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              R$
            </span>
          </div>

          <p className="mt-4 text-2xl font-bold">
            {formatarPreco(faturamentoHoje)}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            serviços concluídos hoje
          </p>
        </div>

      </section>

      {/* CONTEÚDO */}

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">

        {/* AGENDA */}

        <div className="rounded-2xl border border-white/10 bg-white/[0.02]">

          <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#C9A227]">
                Agenda
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Horários de hoje
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {formatarDataCompleta(dataHoje)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/painel/agenda")}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-[#C9A227]/30 hover:text-[#C9A227]"
            >
              Ver agenda completa →
            </button>

          </div>

          {agendamentosHoje.length === 0 ? (
            <div className="p-10 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C9A227]/10 text-2xl">
                <Icon name="calendar" />
              </div>

              <h3 className="mt-5 font-semibold">
                Nenhum agendamento hoje
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Quando seus clientes realizarem agendamentos
                para hoje, eles aparecerão aqui.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-white/5">

              {agendamentosHoje.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="p-5 transition hover:bg-white/[0.02]"
                >

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex items-center gap-4">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C9A227]/10 text-[#C9A227]">
                        <Icon name="scissors" />
                      </div>

                      <div>

                        <p className="text-lg font-bold text-[#C9A227]">
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

        <div className="rounded-2xl border border-white/10 bg-white/[0.02]">

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
                pendentes para hoje.
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
                          {agendamento.servico?.duracao
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

      {/* RESUMO */}

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
              Resumo do dia
            </p>

            <p className="mt-2 text-sm text-zinc-400">
              Você tem{" "}
              <span className="font-semibold text-white">
                {totalAgendamentosHoje}
              </span>{" "}
              agendamento
              {totalAgendamentosHoje !== 1 ? "s" : ""} hoje,
              sendo{" "}
              <span className="font-semibold text-yellow-400">
                {totalPendentesHoje}
              </span>{" "}
              pendente
              {totalPendentesHoje !== 1 ? "s" : ""}.
            </p>

          </div>

          <button
            type="button"
            onClick={() => router.push("/painel/agenda")}
            className="shrink-0 rounded-xl bg-[#C9A227] px-5 py-3 text-sm font-semibold text-black transition hover:-translate-y-[1px] hover:bg-[#E0BB35]"
          >
            Abrir agenda
          </button>

        </div>

      </section>
    </div>
  );
}
