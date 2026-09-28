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
      <div className="h-10 w-24 animate-pulse rounded-md bg-white/5" />
    );
  }

  return (
    <>
      {logado ? (
        <a
          href="/minha-conta"
          className="rounded-md bg-[#C9A227] px-5 py-2.5 text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-[1px] hover:bg-[#E0BB35]"
        >
          Minha conta
        </a>
      ) : (
        <button
          type="button"
          onClick={abrirLogin}
          className="rounded-md bg-[#C9A227] px-5 py-2.5 text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-[1px] hover:bg-[#E0BB35]"
        >
          Entrar
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