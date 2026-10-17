"use client";

import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/neon/client";
import { saveOwnProfile } from "@/lib/neon/profile";
import { useDialogFocus } from "@/lib/useDialogFocus";

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
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const dialogRef = useDialogFocus<HTMLDivElement>(aberto, fecharModal);

  async function handleCadastro(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setSucesso("");

    if (!nome || !telefone || !email || !senha || !confirmarSenha) {
      setErro("Preencha todos os campos.");
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setCarregando(true);

    const neon = createClient();

    const { data, error } = await neon.auth.signUp({
      email,
      password: senha,
      options: {
        data: { displayName: nome.trim(), phone: telefone.trim() },
      },
    });

    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }

    // With email confirmation enabled, signUp returns a user without an
    // authenticated session. Defer the RLS-protected profile write until login.
    if (data.user && data.session) {
      const profileSaved = await saveOwnProfile(neon, data.user.id, {
        nome: nome.trim(),
        telefone: telefone.trim(),
      });
      if (!profileSaved) {
        setErro("Conta criada, mas não foi possível salvar o perfil. Entre e complete seus dados nas configurações.");
        setCarregando(false);
        return;
      }
    }

    setSucesso(
      "Cadastro realizado! Verifique seu e-mail para confirmar sua conta."
    );

    setNome("");
    setTelefone("");
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
        aria-labelledby="titulo-cadastro-cliente"
        className={`relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#0B0F14] shadow-2xl shadow-black/50 transition-all duration-300 ease-out ${
          aberto
            ? "translate-y-0 scale-100"
            : "translate-y-3 scale-95"
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

            <h2 id="titulo-cadastro-cliente" className="mt-3 text-3xl font-bold tracking-tight text-white">
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

            {/* WhatsApp */}
            <div>
              <label
                htmlFor="cadastro-telefone"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                WhatsApp
              </label>

              <input
                id="cadastro-telefone"
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(84) 99999-9999"
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
