
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/ui/Icon";

interface Barbearia {
  id: string;
  nome: string | null;
}

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  agendamento_id: number | null;
  lida_em: string | null;
  created_at: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [barbearia, setBarbearia] = useState<Barbearia | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [erroNotificacoes, setErroNotificacoes] = useState("");

  useEffect(() => {
    async function carregarBarbearia() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/painel/login");
        return;
      }

      const { data, error } = await supabase
        .from("barbearias")
        .select("id, nome")
        .eq("proprietario_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar barbearia:", error);
      }

      if (data) {
        setBarbearia(data);
      }

      setCarregando(false);
    }

    carregarBarbearia();
  }, [router, supabase]);

  useEffect(() => {
    const barbeariaId = barbearia?.id;
    if (!barbeariaId) return;

    let ativo = true;

    async function carregarNotificacoes() {
      const [lista, contagem] = await Promise.all([
        supabase
          .from("notificacoes_barbeiro")
          .select("id, titulo, mensagem, agendamento_id, lida_em, created_at")
          .eq("barbearia_id", barbeariaId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("notificacoes_barbeiro")
          .select("id", { count: "exact", head: true })
          .eq("barbearia_id", barbeariaId)
          .is("lida_em", null),
      ]);

      if (!ativo) return;
      const erroBanco = lista.error ?? contagem.error;
      if (erroBanco) {
        console.error("Erro ao carregar notificações:", JSON.stringify({
          code: erroBanco.code,
          message: erroBanco.message,
          details: erroBanco.details,
          hint: erroBanco.hint,
        }));

        const mensagemErro = erroBanco.message?.toLowerCase() ?? "";
        if (erroBanco.code === "PGRST205" || erroBanco.code === "42P01" || mensagemErro.includes("notificacoes_barbeiro")) {
          setErroNotificacoes("A tabela de notificações ainda não está disponível. Execute supabase/notificacoes-barbeiro.sql no SQL Editor do Supabase.");
        } else if (erroBanco.code === "42501") {
          setErroNotificacoes("O Supabase bloqueou o acesso às notificações. Execute novamente supabase/notificacoes-barbeiro.sql para aplicar as permissões.");
        } else {
          setErroNotificacoes("Não foi possível carregar as notificações. Confira a configuração do Supabase.");
        }
        return;
      }

      setErroNotificacoes("");
      setNotificacoes((lista.data ?? []) as Notificacao[]);
      setTotalNaoLidas(contagem.count ?? 0);
    }

    void carregarNotificacoes();

    const canal = supabase
      .channel(`notificacoes-barbearia-${barbeariaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes_barbeiro",
          filter: `barbearia_id=eq.${barbeariaId}`,
        },
        () => void carregarNotificacoes(),
      )
      .subscribe();

    return () => {
      ativo = false;
      void supabase.removeChannel(canal);
    };
  }, [barbearia?.id, supabase]);

  async function marcarNotificacaoComoLida(notificacao: Notificacao) {
    if (!notificacao.lida_em) {
      const lidaEm = new Date().toISOString();
      const { error } = await supabase
        .from("notificacoes_barbeiro")
        .update({ lida_em: lidaEm })
        .eq("id", notificacao.id)
        .is("lida_em", null);

      if (error) {
        console.error("Erro ao marcar notificação como lida:", error);
        return;
      }

      setNotificacoes((atuais) => atuais.map((item) =>
        item.id === notificacao.id ? { ...item, lida_em: lidaEm } : item,
      ));
      setTotalNaoLidas((atual) => Math.max(0, atual - 1));
    }

    setNotificacoesAbertas(false);
    router.push("/painel/agenda");
  }

  async function marcarTodasComoLidas() {
    if (!barbearia || totalNaoLidas === 0) return;

    const lidaEm = new Date().toISOString();
    const { error } = await supabase
      .from("notificacoes_barbeiro")
      .update({ lida_em: lidaEm })
      .eq("barbearia_id", barbearia.id)
      .is("lida_em", null);

    if (error) {
      console.error("Erro ao marcar notificações como lidas:", error);
      return;
    }

    setNotificacoes((atuais) => atuais.map((item) => ({ ...item, lida_em: item.lida_em ?? lidaEm })));
    setTotalNaoLidas(0);
  }

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/painel/login");
  }

  const estaNaAgenda = pathname === "/painel/agenda";
  const estaNasConfiguracoes = pathname === "/painel/configuracoes";
  const estaNosServicos = pathname === "/painel/servicos";
  const estaNoDashboard = pathname === "/painel";

  const tituloPagina = estaNosServicos
    ? "Meus serviços"
    : estaNaAgenda
      ? "Agenda"
      : estaNasConfiguracoes
        ? "Configurações"
        : <>Olá, barbeiro <Icon name="wave" className="inline h-4 w-4 align-[-2px]" /></>;

  const secaoAtual = estaNosServicos
    ? "Serviços"
    : estaNaAgenda
      ? "Agenda"
      : estaNasConfiguracoes
        ? "Configurações"
        : "Dashboard";

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[#C9A227]" />
      </main>
    );
  }

  const classeLink = (ativo: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
      ativo
        ? "bg-[#C9A227]/10 text-[#C9A227]"
        : "text-zinc-500 hover:bg-white/5 hover:text-white"
    }`;

  const classeLinkMobile = (ativo: boolean) =>
    `whitespace-nowrap px-3 py-2.5 text-sm font-medium transition ${
      ativo
        ? "bg-[#C9A227]/10 text-[#C9A227]"
        : "text-zinc-500 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      <div className="flex min-h-screen">
        {/* SIDEBAR DESKTOP */}
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#090D12] lg:flex lg:flex-col">
          {/* LOGO */}
          <div className="border-b border-white/10 px-6 py-6">
            <div className="text-xl font-black tracking-tight">
              NA RÉGUA<span className="text-[#C9A227]">+</span>
            </div>

            <p className="mt-1 text-xs text-zinc-500">Gestão</p>

            {barbearia?.nome && (
              <p className="mt-3 truncate text-sm font-medium text-zinc-300">
                {barbearia.nome}
              </p>
            )}
          </div>

          {/* MENU */}
          <nav className="flex-1 px-3 py-5">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
              Gestão
            </p>

            <div className="space-y-1">
              <Link href="/painel" className={classeLink(estaNoDashboard)}>
                <span className="text-lg">▦</span>
                Dashboard
              </Link>

              <Link
                href="/painel/agenda"
                className={classeLink(estaNaAgenda)}
              >
                <span className="text-lg">◷</span>
                Agenda
              </Link>

              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-zinc-600"
              >
                <span className="text-lg">▤</span>
                Agendamentos
              </button>

              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-zinc-600"
              >
                <Icon name="user" className="h-5 w-5" />
                Clientes
              </button>

              <Link
                href="/painel/servicos"
                className={classeLink(estaNosServicos)}
              >
                <Icon name="scissors" className="h-5 w-5" />
                Serviços
              </Link>

              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-zinc-600"
              >
                <span className="text-lg">◫</span>
                Horários
              </button>
            </div>

            {/* CONTA */}
            <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
              Conta
            </p>

            <div className="space-y-1">
              <Link
                href="/painel/configuracoes"
                className={classeLink(estaNasConfiguracoes)}
              >
                <Icon name="settings" className="h-5 w-5" />
                Configurações
              </Link>

              <Link
                href="/"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-500 transition hover:bg-white/5 hover:text-white"
              >
                <Icon name="externalLink" className="h-5 w-5" />
                Minha página
              </Link>
            </div>
          </nav>

          {/* SAIR */}
          <div className="border-t border-white/10 p-3">
            <button
              onClick={sair}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <Icon name="logout" className="h-5 w-5" />
              Sair
            </button>
          </div>
        </aside>

        {/* CONTEÚDO */}
        <div className="min-w-0 flex-1">
          {/* HEADER */}
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0B0F14]/90 backdrop-blur-sm sm:backdrop-blur-xl">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-2 sm:h-20 sm:px-6 lg:px-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A227]">
                  {secaoAtual}
                </p>

                <h1 className="mt-1 text-lg font-bold sm:text-xl">{tituloPagina}</h1>
              </div>

              <div className="flex shrink-0 items-center gap-3 sm:gap-5">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-white">
                    {barbearia?.nome || "Na Régua+"}
                  </p>

                  <p className="text-xs text-zinc-500">
                    {new Date().toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    aria-label={totalNaoLidas > 0 ? `Notificações, ${totalNaoLidas} não lidas` : "Notificações"}
                    aria-expanded={notificacoesAbertas}
                    aria-controls="painel-notificacoes"
                    onClick={() => setNotificacoesAbertas((abertas) => !abertas)}
                    className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
                  >
                    <Icon name="bell" className="h-5 w-5" />
                    {totalNaoLidas > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C9A227] px-1 text-[10px] font-bold text-black">
                        {totalNaoLidas > 99 ? "99+" : totalNaoLidas}
                      </span>
                    )}
                  </button>

                  {notificacoesAbertas && (
                    <section
                      id="painel-notificacoes"
                      aria-label="Notificações de agendamentos"
                      className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-800 bg-[#10151C] shadow-2xl"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                        <div>
                          <h2 className="font-semibold">Notificações</h2>
                          <p className="text-xs text-zinc-500">
                            {totalNaoLidas} não {totalNaoLidas === 1 ? "lida" : "lidas"}
                          </p>
                        </div>
                        {totalNaoLidas > 0 && (
                          <button
                            type="button"
                            onClick={marcarTodasComoLidas}
                            className="text-xs font-medium text-[#C9A227] hover:underline"
                          >
                            Marcar todas como lidas
                          </button>
                        )}
                      </div>

                      {erroNotificacoes ? (
                        <p role="alert" className="px-4 py-5 text-sm leading-6 text-amber-300">
                          {erroNotificacoes}
                        </p>
                      ) : notificacoes.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-zinc-500">
                          Nenhum agendamento novo por enquanto.
                        </p>
                      ) : (
                        <ul className="max-h-96 divide-y divide-white/5 overflow-y-auto">
                          {notificacoes.map((notificacao) => (
                            <li key={notificacao.id}>
                              <button
                                type="button"
                                onClick={() => void marcarNotificacaoComoLida(notificacao)}
                                className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-white/5 ${notificacao.lida_em ? "opacity-75" : "bg-[#C9A227]/5"}`}
                              >
                                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notificacao.lida_em ? "bg-zinc-600" : "bg-[#C9A227]"}`} aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold">{notificacao.titulo}</span>
                                  <span className="mt-1 block text-sm text-zinc-400">{notificacao.mensagem}</span>
                                  <span className="mt-1 block text-xs text-zinc-500">
                                    {new Date(notificacao.created_at).toLocaleString("pt-BR", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* MENU MOBILE */}
          <nav aria-label="Navegação do painel" className="mobile-nav border-b border-white/10 px-4 py-2 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              <Link
                href="/painel"
                className={classeLinkMobile(estaNoDashboard)}
                aria-current={estaNoDashboard ? "page" : undefined}
              >
                Dashboard
              </Link>

              <Link
                href="/painel/agenda"
                className={classeLinkMobile(estaNaAgenda)}
                aria-current={estaNaAgenda ? "page" : undefined}
              >
                Agenda
              </Link>

              <Link
                href="/painel/servicos"
                className={classeLinkMobile(estaNosServicos)}
                aria-current={estaNosServicos ? "page" : undefined}
              >
                Serviços
              </Link>

              <Link
                href="/painel/configuracoes"
                className={classeLinkMobile(estaNasConfiguracoes)}
                aria-current={estaNasConfiguracoes ? "page" : undefined}
              >
                Configurações
              </Link>

              <button
                type="button"
                onClick={sair}
                className="whitespace-nowrap border border-red-500/20 px-3 py-2.5 text-sm font-medium text-red-400"
              >
                Sair
              </button>
            </div>
          </nav>

          {/* PÁGINA */}
          <div className="min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
