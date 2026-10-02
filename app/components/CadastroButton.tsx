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
      <div className="h-12 w-32 animate-pulse rounded-lg bg-white/5" />
    );
  }

  return (
    <>
      {logado ? (
        <a
          href="/minha-conta"
          className="inline-flex items-center justify-center rounded-lg bg-[#C9A227] px-6 py-3 text-base font-bold text-black shadow-[0_0_20px_rgba(201,162,39,0.18)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#E0BB35] hover:shadow-[0_0_30px_rgba(201,162,39,0.35)]"
        >
          Minha conta
        </a>
      ) : (
        <button
          type="button"
          onClick={abrirLogin}
          className="inline-flex items-center justify-center rounded-lg bg-[#C9A227] px-7 py-3 text-base font-bold text-black shadow-[0_0_20px_rgba(201,162,39,0.18)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#E0BB35] hover:shadow-[0_0_30px_rgba(201,162,39,0.35)]"
        >
          Agendar agora
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