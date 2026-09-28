"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

interface LoginModalProps {
  aberto: boolean;
  onFechar: () => void;
  onAbrirCadastro: () => void;
}

export default function LoginModal({
  aberto,
  onFechar,
  onAbrirCadastro,
}: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setSucesso("");
    setCarregando(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro("E-mail ou senha incorretos.");
      setCarregando(false);
      return;
    }

    setSucesso("Login realizado com sucesso!");

    setEmail("");
    setSenha("");

    setCarregando(false);

    setTimeout(() => {
      onFechar();
    }, 800);
  }

  function fecharModal() {
    setErro("");
    setSucesso("");
    onFechar();
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-md transition-all duration-300 ease-out ${
        aberto
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      }`}
      onClick={fecharModal}
    >
      <div
        className={`relative my-auto w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#0B0F14] shadow-2xl shadow-black/50 transition-all duration-300 ease-out ${
          aberto ? "translate-y-0 scale-100" : "translate-y-3 scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-[#C9A227]" />

        <div className="p-8">
          <button
            type="button"
            onClick={fecharModal}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-xl text-zinc-500 transition-all duration-300 hover:border-[#C9A227]/40 hover:bg-white/5 hover:text-[#C9A227]"
            aria-label="Fechar"
          >
            ×
          </button>

          <div className="mb-8 pr-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A227]">
              RK BARBER.
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Entrar na sua conta
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Entre para acessar seus agendamentos.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                E-mail
              </label>

              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600 focus:border-[#C9A227]/70 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#C9A227]/20"
              />
            </div>

            <div>
              <label
                htmlFor="login-senha"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Senha
              </label>

              <input
                id="login-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
                required
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600 focus:border-[#C9A227]/70 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#C9A227]/20"
              />
            </div>

            {erro && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-400">
                {erro}
              </div>
            )}

            {sucesso && (
              <div className="rounded-md border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm leading-5 text-green-400">
                {sucesso}
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-md bg-[#C9A227] px-5 py-3.5 text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-[1px] hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <p className="text-xs leading-5 text-zinc-600">
              Acesse sua conta para gerenciar seus agendamentos.
            </p>

            <button
              type="button"
              onClick={onAbrirCadastro}
              className="text-sm font-medium text-[#C9A227] transition-colors hover:text-[#E0BB35]"
            >
              Ainda não possui uma conta? Criar conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
