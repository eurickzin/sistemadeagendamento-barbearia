"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AgendamentoModal from "../components/AgendamentoModal";

interface Agendamento {
  id: number;
  servico_id: number;
  data: string;
  horario: string;
  status: string;
}

interface Servico {
  id: number;
  nome: string;
  preco: number;
  duracao: number;
}

export default function MinhaContaPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregandoAgendamentos, setCarregandoAgendamentos] = useState(true);
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [agendamentoAberto, setAgendamentoAberto] = useState(false);

useEffect(() => {
  async function carregarUsuario() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCarregando(false);
      setCarregandoAgendamentos(false);
      return;
    }

    setEmail(user.email ?? "");

    const { data, error } = await supabase
      .from("agendamentos")
      .select("id, servico_id, data, horario, status")
      .eq("usuario_id", user.id)
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    if (error) {
      console.error("ERRO AO BUSCAR AGENDAMENTOS:", error);
    }

    setAgendamentos(data ?? []);
    setCarregandoAgendamentos(false);
    setCarregando(false);
  }

  carregarUsuario();
}, []);

  async function sair() {
    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  async function cancelarAgendamento(id: number) {
    const confirmar = window.confirm(
      "Tem certeza que deseja cancelar este agendamento?",
    );

    if (!confirmar) {
      return;
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("agendamentos")
      .update({ status: "cancelado" })
      .eq("id", id);

    if (error) {
      console.error("ERRO AO CANCELAR:", error);
      alert("Não foi possível cancelar o agendamento.");
      return;
    }

    setAgendamentos((atual) =>
      atual.map((agendamento) =>
        agendamento.id === id
          ? { ...agendamento, status: "cancelado" }
          : agendamento,
      ),
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] px-6 py-32 text-white">
      <div className="mx-auto max-w-5xl">
        {carregando ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <p className="text-zinc-400">Carregando...</p>
          </div>

          
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#C9A227]">
              RK BARBER.
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Minha conta
            </h1>

            <p className="mt-3 text-zinc-400">
              Gerencie sua conta e seus agendamentos.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-sm text-zinc-500">E-mail</p>

                <p className="mt-2 font-medium text-white">{email}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-sm text-zinc-500">Status</p>

                <p className="mt-2 font-medium text-green-400">Conta ativa</p>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Meus agendamentos</h2>

                  <p className="mt-2 text-sm text-zinc-500">
                    Seus próximos horários aparecerão aqui.
                  </p>
                </div>

                {carregandoAgendamentos ? (
                  <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-6">
                    <p className="text-sm text-zinc-500">
                      Carregando agendamentos...
                    </p>
                  </div>
                ) : agendamentos.length === 0 ? (
                  <div className="mt-6 rounded-lg border border-dashed border-white/10 p-8 text-center">
                    <p className="text-zinc-400">
                      Você ainda não possui agendamentos.
                    </p>

                    <p className="mt-2 text-sm text-zinc-600">
                      Clique em "Novo agendamento" para escolher seu horário.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {agendamentos.map((agendamento) => (
                      <div
                        key={agendamento.id}
                        className="rounded-lg border border-white/10 bg-white/[0.02] p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-zinc-500">Agendamento</p>

                            <p className="mt-1 font-semibold text-white">
                              {new Date(
                                `${agendamento.data}T12:00:00`,
                              ).toLocaleDateString("pt-BR")}
                            </p>

                            <p className="mt-1 text-sm text-zinc-400">
                              Horário: {agendamento.horario.slice(0, 5)}
                            </p>
                          </div>

                          <div className="flex flex-col items-start gap-3 sm:items-end">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                agendamento.status === "confirmado"
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              {agendamento.status === "confirmado"
                                ? "Confirmado"
                                : "Cancelado"}
                            </span>

                            {agendamento.status === "confirmado" && (
                              <button
                                type="button"
                                onClick={() =>
                                  cancelarAgendamento(agendamento.id)
                                }
                                className="text-sm font-medium text-red-400 transition hover:text-red-300"
                              >
                                Cancelar agendamento
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setAgendamentoAberto(true)}
                  className="rounded-md bg-[#C9A227] px-5 py-3 text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-[1px] hover:bg-[#E0BB35]"
                >
                  Novo agendamento
                </button>
              </div>

              {carregandoAgendamentos ? (
  <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-6">
    <p className="text-sm text-zinc-500">
      Carregando agendamentos...
    </p>
  </div>
) : agendamentos.length === 0 ? (
  <div className="mt-6 rounded-lg border border-dashed border-white/10 p-8 text-center">
    <p className="text-zinc-400">
      Você ainda não possui agendamentos.
    </p>

    <p className="mt-2 text-sm text-zinc-600">
      Clique em "Novo agendamento" para escolher seu horário.
    </p>
  </div>
) : (
  <div className="mt-6 space-y-4">
    {agendamentos.map((agendamento) => (
      <div
        key={agendamento.id}
        className="rounded-lg border border-white/10 bg-white/[0.02] p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-zinc-500">
              Agendamento
            </p>

            <p className="mt-1 font-semibold text-white">
              {new Date(
                `${agendamento.data}T12:00:00`,
              ).toLocaleDateString("pt-BR")}
            </p>

            <p className="mt-1 text-sm text-zinc-400">
              Horário: {agendamento.horario.slice(0, 5)}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                agendamento.status === "confirmado"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {agendamento.status === "confirmado"
                ? "Confirmado"
                : "Cancelado"}
            </span>

            {agendamento.status === "confirmado" && (
              <button
                type="button"
                onClick={() =>
                  cancelarAgendamento(agendamento.id)
                }
                className="text-sm font-medium text-red-400 transition hover:text-red-300"
              >
                Cancelar agendamento
              </button>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
)}
            </div>

            <button
              type="button"
              onClick={sair}
              className="mt-8 rounded-md border border-red-500/20 px-5 py-3 text-sm font-semibold text-red-400 transition-all duration-300 hover:bg-red-500/10"
            >
              Sair da conta
            </button>
          </>
        )}
      </div>

      <AgendamentoModal
        aberto={agendamentoAberto}
        onFechar={() => setAgendamentoAberto(false)}
      />
    </main>
  );
}
