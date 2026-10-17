"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/neon/client";
import OAuthButtons from "@/features/auth/components/OAuthButtons";
import { useDialogFocus } from "@/lib/useDialogFocus";

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
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const dialogRef = useDialogFocus<HTMLDivElement>(aberto, fecharModal);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setSucesso("");
    setCarregando(true);

    const neon = createClient();

    const { error } = await neon.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro(
        "Confira seu e-mail e sua senha. Se você ainda não tem uma conta no Neon, crie uma pelo formulário de cadastro."
      );
      setCarregando(false);
      return;
    }

    setSucesso("Login realizado com sucesso!");

    setEmail("");
    setSenha("");
    setCarregando(false);

    setTimeout(() => {
      onFechar();
      router.push("/minha-conta");
      router.refresh();
    }, 500);
  }

  function fecharModal() {
    setErro("");
    setSucesso("");
    onFechar();
  }

  return (
    <div
      inert={!aberto}
      className={`fixed inset-0 z-[9999] flex h-dvh w-screen items-center justify-center overflow-y-auto bg-black/80 px-4 py-4 backdrop-blur-md transition-all duration-300 ease-out sm:py-8 ${
        aberto
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      }`}
      onClick={fecharModal}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal={aberto}
        aria-labelledby="titulo-login-cliente"
        className={`relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#0B0F14] shadow-2xl shadow-black/50 transition-all duration-300 ease-out ${
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

            <h2 id="titulo-login-cliente" className="mt-3 text-3xl font-bold tracking-tight text-white">
              Entrar na sua conta
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Entre para acessar seus agendamentos.
            </p>
          </div>

          <div className="mb-5">
            <OAuthButtons redirectPath="/minha-conta" disabled={carregando} />
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
