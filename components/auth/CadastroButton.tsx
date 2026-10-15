"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/neon/client";

const CadastroModal = dynamic(() => import("./CadastroModal"), {
  loading: () => null,
});
const LoginModal = dynamic(() => import("./LoginModal"), {
  loading: () => null,
});

export default function CadastroButton() {
  const router = useRouter();
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [loginAberto, setLoginAberto] = useState(false);
  const [logado, setLogado] = useState(false);
  const [sessaoVerificada, setSessaoVerificada] = useState(false);

  useEffect(() => {
    const neon = createClient();
    let ativo = true;

    async function verificarSessao() {
      try {
        const {
          data: { session },
        } = await neon.auth.getSession();
        if (ativo) {
          setLogado(!!session);
          if (session) setLoginAberto(false);
        }
      } catch {
        // O CTA continua disponível mesmo se a consulta de sessão falhar.
      } finally {
        if (ativo) setSessaoVerificada(true);
      }
    }

    const {
      data: { subscription },
    } = neon.auth.onAuthStateChange((_event: string, session: unknown | null) => {
      setLogado(!!session);
      setSessaoVerificada(true);
      if (session) setLoginAberto(false);
    });

    void verificarSessao();
    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  function prepararModal() {
    void import("./LoginModal");
  }

  function abrirAgendamento() {
    if (sessaoVerificada && logado) {
      router.push("/minha-conta");
      return;
    }
    setLoginAberto(true);
  }

  function abrirCadastro() {
    setLoginAberto(false);
    setCadastroAberto(true);
  }

  function abrirLogin() {
    setCadastroAberto(false);
    setLoginAberto(true);
  }

  return (
    <>
      {sessaoVerificada && logado ? (
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
          onClick={abrirAgendamento}
          onPointerEnter={prepararModal}
          onFocus={prepararModal}
          onTouchStart={prepararModal}
          className="inline-flex min-h-11 items-center justify-center whitespace-nowrap bg-[#C9A227] px-3 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#E0BB35] sm:px-7 sm:py-3 sm:text-base"
        >
          <span className="sm:hidden">Agendar</span>
          <span className="hidden sm:inline">Agendar agora</span>
        </button>
      )}

      {cadastroAberto && <CadastroModal
        aberto={cadastroAberto}
        onFechar={() => setCadastroAberto(false)}
        onAbrirLogin={abrirLogin}
      />}

      {loginAberto && <LoginModal
        aberto={loginAberto}
        onFechar={() => setLoginAberto(false)}
        onAbrirCadastro={abrirCadastro}
      />}
    </>
  );
}
