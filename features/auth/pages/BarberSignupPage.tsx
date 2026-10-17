"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@neondatabase/auth";
import { createClient } from "@/lib/neon/client";

export default function BarberSignupPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function cadastrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    if (nome.trim().length < 2) {
      setErro("Informe seu nome com pelo menos 2 caracteres.");
      return;
    }
    if (senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    try {
      // The direct Neon Auth API reports a successful signup even when email
      // verification has not created a session yet.
      const auth = createAuthClient(`${window.location.origin}/api/auth`);
      const { error } = await auth.signUp.email({
        name: nome.trim(),
        email: email.trim(),
        password: senha,
        callbackURL: `${window.location.origin}/painel/login`,
      });

      if (error) {
        setErro("Não foi possível criar a conta. Confira os dados ou entre se já tiver cadastro.");
        return;
      }

      let user = null;
      try {
        const result = await createClient().auth.getUser();
        user = result.data.user;
      } catch {
        // Account creation succeeded. The owner can still sign in after verification.
      }
      if (user?.email?.toLowerCase() === email.trim().toLowerCase()) {
        router.replace("/painel/cadastrar-barbearia");
        router.refresh();
        return;
      }

      setSucesso(true);
      setSenha("");
      setConfirmarSenha("");
    } catch {
      setErro("Não foi possível criar a conta agora. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-4 py-10 text-white sm:px-6">
      <div className="w-full max-w-lg">
        <Link href="/painel/login" className="mb-8 inline-flex min-h-11 items-center text-sm text-zinc-400 transition hover:text-[#C9A227]">
          ← Voltar para o login
        </Link>

        <div className="border border-white/10 bg-white/[0.02] p-6 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">Na Régua+ · Área do proprietário</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Crie sua conta</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Depois de criar a conta, você poderá cadastrar sua barbearia e configurar o painel.
          </p>

          {sucesso ? (
            <div role="status" className="mt-8 rounded-xl border border-[#C9A227]/30 bg-[#C9A227]/10 p-5 text-sm leading-6 text-zinc-200">
              Conta criada. Se receber um e-mail de confirmação, siga o link. Depois, entre no painel para cadastrar sua barbearia.
              <Link href="/painel/login" className="mt-4 block font-semibold text-[#E0BB35] underline underline-offset-4">
                Ir para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={cadastrar} className="mt-8 space-y-5">
              <div>
                <label htmlFor="proprietario-nome" className="mb-2 block text-sm font-medium text-zinc-300">Seu nome</label>
                <input id="proprietario-nome" type="text" value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="name" minLength={2} maxLength={120} required disabled={carregando} className="w-full rounded-xl border border-white/10 bg-[#090D12] px-4 py-3 text-white outline-none focus:border-[#C9A227]" />
              </div>
              <div>
                <label htmlFor="proprietario-email" className="mb-2 block text-sm font-medium text-zinc-300">E-mail</label>
                <input id="proprietario-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required disabled={carregando} className="w-full rounded-xl border border-white/10 bg-[#090D12] px-4 py-3 text-white outline-none focus:border-[#C9A227]" />
              </div>
              <div>
                <label htmlFor="proprietario-senha" className="mb-2 block text-sm font-medium text-zinc-300">Senha</label>
                <input id="proprietario-senha" type="password" value={senha} onChange={(event) => setSenha(event.target.value)} autoComplete="new-password" minLength={8} required disabled={carregando} className="w-full rounded-xl border border-white/10 bg-[#090D12] px-4 py-3 text-white outline-none focus:border-[#C9A227]" />
                <p className="mt-1 text-xs text-zinc-500">Pelo menos 8 caracteres.</p>
              </div>
              <div>
                <label htmlFor="proprietario-confirmar-senha" className="mb-2 block text-sm font-medium text-zinc-300">Confirme a senha</label>
                <input id="proprietario-confirmar-senha" type="password" value={confirmarSenha} onChange={(event) => setConfirmarSenha(event.target.value)} autoComplete="new-password" required disabled={carregando} className="w-full rounded-xl border border-white/10 bg-[#090D12] px-4 py-3 text-white outline-none focus:border-[#C9A227]" />
              </div>

              {erro && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{erro}</p>}

              <button type="submit" disabled={carregando} className="min-h-11 w-full rounded-xl bg-[#C9A227] px-5 py-3 font-semibold text-black transition hover:bg-[#E0BB35] disabled:cursor-wait disabled:opacity-50">
                {carregando ? "Criando conta..." : "Criar conta de proprietário"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Já tem conta? <Link href="/painel/login" className="font-semibold text-[#E0BB35] underline underline-offset-4">Entre no painel</Link>
        </p>
      </div>
    </main>
  );
}
