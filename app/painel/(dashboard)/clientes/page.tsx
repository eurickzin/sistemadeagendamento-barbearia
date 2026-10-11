"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/ui/Icon";

interface PerfilCliente {
  id: string;
  nome: string | null;
  telefone: string | null;
}

interface ServicoAtual {
  nome: string;
  preco: number;
}

interface Agendamento {
  id: number;
  usuario_id: string;
  data: string;
  horario: string;
  status: string;
  servico_nome: string | null;
  servico_preco: number | null;
  servico: ServicoAtual | ServicoAtual[] | null;
}

interface ClienteComHistorico extends PerfilCliente {
  agendamentos: Agendamento[];
}

function dataLocal(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function formatarTelefone(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");
  const nacional = digitos.startsWith("55") ? digitos.slice(2) : digitos;
  if (nacional.length === 11) {
    return `(${nacional.slice(0, 2)}) ${nacional[2]} ${nacional.slice(3, 7)}-${nacional.slice(7)}`;
  }
  if (nacional.length === 10) {
    return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 6)}-${nacional.slice(6)}`;
  }
  return telefone;
}

function abrirWhatsApp(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");
  if (!digitos) return;
  const numero = digitos.startsWith("55") ? digitos : `55${digitos}`;
  window.open(`https://wa.me/${numero}`, "_blank", "noopener,noreferrer");
}

function nomeServico(agendamento: Agendamento) {
  const relacionado = Array.isArray(agendamento.servico)
    ? agendamento.servico[0]
    : agendamento.servico;
  return relacionado?.nome ?? agendamento.servico_nome ?? "Serviço removido";
}

function precoServico(agendamento: Agendamento) {
  const relacionado = Array.isArray(agendamento.servico)
    ? agendamento.servico[0]
    : agendamento.servico;
  const preco = relacionado?.preco ?? agendamento.servico_preco;
  return preco == null ? null : Number(preco).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function classeStatus(status: string) {
  switch (status.toLowerCase()) {
    case "concluido":
    case "concluído":
      return "border-blue-500/20 bg-blue-500/10 text-blue-300";
    case "cancelado":
      return "border-red-500/20 bg-red-500/10 text-red-300";
    case "confirmado":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    default:
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }
}

function textoStatus(status: string) {
  const normalizado = status.toLowerCase();
  if (normalizado === "concluido" || normalizado === "concluído") return "Concluído";
  if (normalizado === "cancelado") return "Cancelado";
  if (normalizado === "confirmado") return "Confirmado";
  if (normalizado === "pendente" || normalizado === "aguardando") return "Pendente";
  return status;
}

export default function ClientesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [clientes, setClientes] = useState<ClienteComHistorico[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarClientes() {
      setCarregando(true);
      setErro(null);

      const { data: { user }, error: erroUsuario } = await supabase.auth.getUser();
      if (erroUsuario || !user) {
        if (ativo) {
          setErro("Não foi possível identificar sua conta. Entre novamente no painel.");
          setCarregando(false);
        }
        return;
      }

      const { data: barbearia, error: erroBarbearia } = await supabase
        .from("barbearias")
        .select("id")
        .eq("proprietario_id", user.id)
        .maybeSingle();

      if (erroBarbearia || !barbearia) {
        if (ativo) {
          setErro("Não foi possível carregar a barbearia.");
          setCarregando(false);
        }
        return;
      }

      const { data: dadosAgendamentos, error: erroAgendamentos } = await supabase
        .from("agendamentos")
        .select(`
          id,
          usuario_id,
          data,
          horario,
          status,
          servico_nome,
          servico_preco,
          servico:servicos ( nome, preco )
        `)
        .eq("barbearia_id", barbearia.id)
        .order("data", { ascending: false })
        .order("horario", { ascending: false });

      if (erroAgendamentos) {
        console.error("Erro ao carregar histórico de clientes:", erroAgendamentos);
        if (ativo) {
          setErro("Não foi possível carregar o histórico de clientes.");
          setCarregando(false);
        }
        return;
      }

      const historico = (dadosAgendamentos ?? []) as unknown as Agendamento[];
      const ids = [...new Set(historico.map((item) => item.usuario_id).filter(Boolean))];
      let mapaPerfis = new Map<string, PerfilCliente>();

      if (ids.length > 0) {
        const { data: perfis, error: erroPerfis } = await supabase
          .from("profiles")
          .select("id, nome, telefone")
          .in("id", ids);

        if (erroPerfis) {
          console.error("Erro ao carregar dados dos clientes:", erroPerfis);
        } else {
          mapaPerfis = new Map((perfis ?? []).map((perfil) => [perfil.id, perfil as PerfilCliente]));
        }
      }

      const grupos = new Map<string, Agendamento[]>();
      for (const agendamento of historico) {
        if (!agendamento.usuario_id) continue;
        const lista = grupos.get(agendamento.usuario_id) ?? [];
        lista.push(agendamento);
        grupos.set(agendamento.usuario_id, lista);
      }

      const resultado = [...grupos.entries()].map(([id, agendamentos]) => ({
        ...(mapaPerfis.get(id) ?? { id, nome: null, telefone: null }),
        agendamentos,
      })).sort((a, b) => {
        const nomeA = a.nome?.trim() || "Cliente";
        const nomeB = b.nome?.trim() || "Cliente";
        return nomeA.localeCompare(nomeB, "pt-BR");
      });

      if (ativo) {
        setClientes(resultado);
        setCarregando(false);
      }
    }

    void carregarClientes();
    return () => { ativo = false; };
  }, [supabase]);

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return clientes;
    return clientes.filter((cliente) =>
      `${cliente.nome ?? ""} ${cliente.telefone ?? ""}`.toLocaleLowerCase("pt-BR").includes(termo),
    );
  }, [busca, clientes]);

  return (
    <div className="clients-page min-w-0 space-y-5 sm:space-y-7">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500 sm:text-sm">Relacionamento</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-3xl">Clientes</h2>
          <p className="mt-1 hidden text-sm text-zinc-400 sm:block">
            Contatos e histórico de atendimentos da sua barbearia.
          </p>
        </div>
        <span className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-400 sm:text-sm">
          {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
        </span>
      </header>

      <label className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#10151C] px-3 text-zinc-500 focus-within:border-[#C9A227]/50">
        <Icon name="search" className="h-5 w-5 shrink-0" />
        <input
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar por nome ou telefone"
          aria-label="Buscar clientes por nome ou telefone"
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
        />
      </label>

      {erro && (
        <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl bg-white/5" />)}
        </div>
      ) : !erro && clientesFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#10151C] px-5 py-12 text-center">
          <Icon name="user" className="mx-auto h-8 w-8 text-zinc-600" />
          <h3 className="mt-3 font-semibold text-white">
            {clientes.length === 0 ? "Seus clientes aparecerão aqui" : "Nenhum cliente encontrado"}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            {clientes.length === 0
              ? "Quando alguém agendar na barbearia, o contato e o histórico ficarão disponíveis nesta tela."
              : "Tente buscar por outro nome ou telefone."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {clientesFiltrados.map((cliente) => {
            const concluidos = cliente.agendamentos.filter((item) => {
              const status = item.status.toLowerCase();
              return status === "concluido" || status === "concluído";
            }).length;
            const cancelados = cliente.agendamentos.filter((item) => item.status.toLowerCase() === "cancelado").length;
            const inicial = cliente.nome?.trim().charAt(0).toLocaleUpperCase("pt-BR") || "C";

            return (
              <article key={cliente.id} className="min-w-0 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#121922] to-[#0F141B] p-3.5 shadow-sm shadow-black/10 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C9A227]/15 bg-[#C9A227]/[0.08] text-base font-semibold text-[#D9B84D]">
                    {inicial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-white">{cliente.nome?.trim() || "Cliente"}</h3>
                    <p className="mt-1 truncate text-sm text-zinc-400">
                      {cliente.telefone ? formatarTelefone(cliente.telefone) : "Telefone não informado"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 divide-x divide-white/[0.08] rounded-xl bg-white/[0.025] py-2 text-center">
                  <div>
                    <p className="text-base font-semibold leading-5 text-white">{cliente.agendamentos.length}</p>
                    <p className="mt-0.5 text-[9px] text-zinc-500 sm:text-[10px]">Total</p>
                  </div>
                  <div>
                    <p className="text-base font-semibold leading-5 text-blue-300">{concluidos}</p>
                    <p className="mt-0.5 text-[9px] text-zinc-500 sm:text-[10px]">Concluídos</p>
                  </div>
                  <div>
                    <p className="text-base font-semibold leading-5 text-red-300">{cancelados}</p>
                    <p className="mt-0.5 text-[9px] text-zinc-500 sm:text-[10px]">Cancelados</p>
                  </div>
                </div>

                {cliente.telefone ? (
                  <button
                    type="button"
                    onClick={() => abrirWhatsApp(cliente.telefone!)}
                    className="mt-2.5 inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 text-[11px] font-semibold text-emerald-300 transition hover:border-emerald-400/40 hover:bg-emerald-500/15 sm:text-xs"
                  >
                    <Icon name="whatsapp" className="h-4 w-4" />
                    Chamar no WhatsApp
                  </button>
                ) : (
                  <div className="mt-2.5 inline-flex min-h-8 items-center rounded-lg border border-white/[0.08] px-2.5 text-[11px] text-zinc-500">
                    Sem telefone para contato
                  </div>
                )}

                <details className="group mt-2.5 border-t border-white/[0.08] pt-2">
                  <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium text-zinc-400 transition hover:text-white marker:hidden">
                    <span>Ver histórico completo</span>
                    <span className="text-zinc-500 transition group-open:rotate-180" aria-hidden="true">⌄</span>
                  </summary>
                  <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                    {cliente.agendamentos.map((agendamento) => (
                      <li key={agendamento.id} className="rounded-xl border border-white/5 bg-black/10 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">{nomeServico(agendamento)}</p>
                            <p className="mt-1 text-xs capitalize text-zinc-500">
                              {dataLocal(agendamento.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                              {" · "}{agendamento.horario.slice(0, 5)}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium ${classeStatus(agendamento.status)}`}>
                            {textoStatus(agendamento.status)}
                          </span>
                        </div>
                        {precoServico(agendamento) && <p className="mt-2 text-xs text-zinc-400">{precoServico(agendamento)}</p>}
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
