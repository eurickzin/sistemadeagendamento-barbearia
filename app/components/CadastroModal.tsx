"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

interface CadastroModalProps {
  aberto: boolean;
  onFechar: () => void;
  onAbrirLogin: () => void;
}

export default function CadastroModal({
  aberto,
  onFechar,
  onAbrirLogin,
}: CadastroModalProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleCadastro(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setSucesso("");

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

setCarregando(true);

console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(
  "SUPABASE KEY:",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome,
        },
      },
    });

    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }

    setSucesso(
      "Cadastro realizado! Verifique seu e-mail para confirmar sua conta."
    );

    setNome("");
    setEmail("");
    setSenha("");
    setConfirmarSenha("");

    setCarregando(false);
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
        {/* Detalhe dourado */}
        <div className="h-1 w-full bg-[#C9A227]" />

        <div className="p-8">
          {/* Fechar */}
          <button
            type="button"
            onClick={fecharModal}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-xl text-zinc-500 transition-all duration-300 hover:border-[#C9A227]/40 hover:bg-white/5 hover:text-[#C9A227]"
            aria-label="Fechar"
          >
            ×
          </button>

          {/* Cabeçalho */}
          <div className="mb-8 pr-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A227]">
              RK BARBER.
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Criar sua conta
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Cadastre-se para agendar seu horário e acompanhar seus
              agendamentos.
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleCadastro} className="space-y-5">
            {/* Nome */}
            <div>
              <label
                htmlFor="cadastro-nome"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Nome
              </label>

              <input
                id="cadastro-nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                required
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600 focus:border-[#C9A227]/70 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#C9A227]/20"
              />
            </div>

            {/* E-mail */}
            <div>
              <label
                htmlFor="cadastro-email"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                E-mail
              </label>

              <input
                id="cadastro-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600 focus:border-[#C9A227]/70 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#C9A227]/20"
              />
            </div>

            {/* Senha */}
            <div>
              <label
                htmlFor="cadastro-senha"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Senha
              </label>

              <input
                id="cadastro-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                required
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600 focus:border-[#C9A227]/70 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#C9A227]/20"
              />
            </div>

            {/* Confirmar senha */}
            <div>
              <label
                htmlFor="cadastro-confirmar"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Confirmar senha
              </label>

              <input
                id="cadastro-confirmar"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Digite a senha novamente"
                required
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600 focus:border-[#C9A227]/70 focus:bg-white/[0.05] focus:ring-1 focus:ring-[#C9A227]/20"
              />
            </div>

            {/* Erro */}
            {erro && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-400">
                {erro}
              </div>
            )}

            {/* Sucesso */}
            {sucesso && (
              <div className="rounded-md border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm leading-5 text-green-400">
                {sucesso}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-md bg-[#C9A227] px-5 py-3.5 text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-[1px] hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregando ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          {/* Rodapé */}
<div className="mt-6 space-y-3 text-center">
  <p className="text-xs leading-5 text-zinc-600">
    Ao criar sua conta, você poderá acompanhar e gerenciar seus
    agendamentos.
  </p>

  <button
    type="button"
    onClick={onAbrirLogin}
    className="text-sm font-medium text-[#C9A227] transition-colors hover:text-[#E0BB35]"
  >
    Já possui uma conta? Entrar
  </button>
</div>
        </div>
      </div>
    </div>
  );
}