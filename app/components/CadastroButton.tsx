"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import CadastroModal from "./CadastroModal";
import LoginModal from "./LoginModal";

export default function CadastroButton() {
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [loginAberto, setLoginAberto] = useState(false);
  const [logado, setLogado] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function verificarSessao() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setLogado(!!session);
      setCarregando(false);
    }

    verificarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLogado(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  function abrirCadastro() {
    setLoginAberto(false);
    setCadastroAberto(true);
  }

  function abrirLogin() {
    setCadastroAberto(false);
    setLoginAberto(true);
  }

  if (carregando) {
    return (
      <div className="h-11 w-20 animate-pulse bg-white/5 sm:w-32" />
    );
  }

  return (
    <>
      {logado ? (
        <a
          href="/minha-conta"
          className="inline-flex min-h-11 items-center justify-center bg-[#C9A227] px-3 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#E0BB35] sm:px-6 sm:py-3 sm:text-base"
        >
          <span className="sm:hidden">Conta</span>
          <span className="hidden sm:inline">Minha conta</span>
        </a>
      ) : (
        <button
          type="button"
          onClick={abrirLogin}
          className="inline-flex min-h-11 items-center justify-center whitespace-nowrap bg-[#C9A227] px-3 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#E0BB35] sm:px-7 sm:py-3 sm:text-base"
        >
          <span className="sm:hidden">Agendar</span>
          <span className="hidden sm:inline">Agendar agora</span>
        </button>
      )}

      <CadastroModal
        aberto={cadastroAberto}
        onFechar={() => setCadastroAberto(false)}
        onAbrirLogin={abrirLogin}
      />

      <LoginModal
        aberto={loginAberto}
        onFechar={() => setLoginAberto(false)}
        onAbrirCadastro={abrirCadastro}
      />
    </>
  );
}
