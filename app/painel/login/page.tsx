
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/app/components/Icon";

export default function LoginBarbeiroPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setCarregando(true);

    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        console.error("ERRO LOGIN BARBEIRO:", error);
        setErro("E-mail ou senha incorretos.");
        return;
      }

      if (!data.user) {
        setErro("Não foi possível identificar sua conta.");
        return;
      }

      const { data: barbearia, error: barbeariaError } = await supabase
        .from("barbearias")
        .select("id, nome, ativa")
        .eq("proprietario_id", data.user.id)
        .maybeSingle();

      if (barbeariaError) {
        console.error("ERRO AO VERIFICAR BARBEARIA:", barbeariaError);
        setErro("Não foi possível verificar sua barbearia.");
        return;
      }

      // Se ainda não possui barbearia, mantém a sessão
      // e encaminha o usuário para a tela de cadastro.
      if (!barbearia) {
        router.replace("/painel/cadastrar-barbearia");
        return;
      }

      // Impede o acesso ao painel se a barbearia estiver desativada.
      if (!barbearia.ativa) {
        await supabase.auth.signOut();
        setErro("Sua barbearia está desativada no momento.");
        return;
      }

      router.replace("/painel");
      router.refresh();
    } catch (error) {
      console.error("ERRO INESPERADO NO LOGIN:", error);
      setErro("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      <div className="flex min-h-screen">
        {/* LADO ESQUERDO */}
        <div className="hidden flex-1 items-center justify-center border-r border-white/10 bg-[#090D12] lg:flex">
          <div className="max-w-lg px-12">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#C9A227]">
              NA RÉGUA+
            </p>

            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Sua barbearia.
              <br />
              <span className="text-[#C9A227]">Sob seu controle.</span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-zinc-500">
              Gerencie seus agendamentos, clientes, serviços e horários em um
              único lugar.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-3">
              <div className="border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                <p className="text-[#C9A227]"><Icon name="calendar" className="h-7 w-7" /></p>
                <p className="mt-4 text-sm font-semibold">
                  Agenda organizada
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-600">
                  Tenha seus horários sempre à mão.
                </p>
              </div>

              <div className="border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                <p className="text-[#C9A227]"><Icon name="scissors" className="h-7 w-7" /></p>
                <p className="mt-4 text-sm font-semibold">Gestão simples</p>
                <p className="mt-1 text-xs leading-5 text-zinc-600">
                  Controle sua operação sem complicação.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* LADO DIREITO */}
        <div className="flex w-full items-center justify-center px-6 py-12 lg:w-[520px] lg:px-12">
          <div className="w-full max-w-md">
            {/* LOGO */}
            <div className="mb-10 lg:hidden">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#C9A227]">
                NA RÉGUA+
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="mb-8 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:border-[#C9A227]/30 hover:bg-[#C9A227]/5 hover:text-white"
            >
              <span className="text-base">←</span>
              Voltar
            </button>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
                Área do barbeiro
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                Entrar no painel
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Acesse sua conta para gerenciar sua barbearia.
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="barbeiro-email"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  E-mail
                </label>

                <input
                  id="barbeiro-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                  disabled={carregando}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-[#C9A227]/70 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#C9A227]/20"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="barbeiro-senha"
                    className="block text-sm font-medium text-zinc-300"
                  >
                    Senha
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setErro(
                        "Para recuperar sua senha, entre em contato com o suporte."
                      )
                    }
                    className="text-xs text-zinc-600 transition hover:text-[#C9A227]"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <input
                  id="barbeiro-senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  required
                  disabled={carregando}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-[#C9A227]/70 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#C9A227]/20"
                />
              </div>

              {erro && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-400"
                >
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="w-full rounded-xl bg-[#C9A227] px-5 py-3.5 text-sm font-semibold text-black transition hover:-translate-y-[1px] hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {carregando ? "Entrando..." : "Entrar no painel"}
              </button>
            </form>

            <div className="mt-8 border-t border-white/10 pt-6 text-center">
              <p className="text-xs leading-5 text-zinc-600">
                Este acesso é exclusivo para proprietários de barbearias
                cadastradas no Na Régua+.
              </p>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-4 text-sm font-medium text-zinc-500 transition hover:text-[#C9A227]"
              >
                Voltar para o site
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
