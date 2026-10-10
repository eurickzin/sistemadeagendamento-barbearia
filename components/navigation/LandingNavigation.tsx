"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

const SECOES = [
  { id: "inicio", label: "Início", desktopLabel: "Início" },
  { id: "funcionalidades", label: "Recursos", desktopLabel: "Funcionalidades" },
  { id: "como-funciona", label: "Como funciona", desktopLabel: "Como funciona" },
  { id: "beneficios", label: "Benefícios", desktopLabel: "Benefícios" },
  { id: "planos", label: "Planos", desktopLabel: "Planos" },
];

export default function LandingNavigation() {
  const [secaoAtiva, setSecaoAtiva] = useState("inicio");
  const navegacaoMobileRef = useRef<HTMLElement | null>(null);
  const navegacaoPendente = useRef(false);
  const timeoutNavegacao = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    const navegacao = navegacaoMobileRef.current;
    const itemAtivo = navegacao?.querySelector<HTMLElement>(
      `[data-secao="${secaoAtiva}"]`,
    );
    if (!navegacao || !itemAtivo) return;

    const reduzirMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const retanguloNav = navegacao.getBoundingClientRect();
    const retanguloItem = itemAtivo.getBoundingClientRect();
    const deslocamento =
      retanguloItem.left -
      retanguloNav.left -
      (navegacao.clientWidth - retanguloItem.width) / 2;
    const novoScrollLeft = Math.max(0, navegacao.scrollLeft + deslocamento);

    if (Math.abs(novoScrollLeft - navegacao.scrollLeft) > 2) {
      navegacao.scrollTo({
        left: novoScrollLeft,
        behavior: reduzirMovimento ? "auto" : "smooth",
      });
    }
  }, [secaoAtiva]);

  useEffect(() => {
    let frame = 0;

    function atualizarSecaoAtiva() {
      if (navegacaoPendente.current) return;
      const header = document.querySelector<HTMLElement>("[data-landing-header]");
      const limite = (header?.getBoundingClientRect().height ?? 0) + 16;
      let secaoAtual = SECOES[0].id;

      for (const secao of SECOES) {
        const elemento = document.getElementById(secao.id);
        if (elemento && elemento.getBoundingClientRect().top <= limite) {
          secaoAtual = secao.id;
        }
      }

      const scrollRoot = document.scrollingElement ?? document.documentElement;
      const chegouAoFim = scrollRoot.scrollTop + window.innerHeight >= scrollRoot.scrollHeight - 2;
      if (chegouAoFim) secaoAtual = SECOES[SECOES.length - 1].id;
      setSecaoAtiva((atual) => atual === secaoAtual ? atual : secaoAtual);
    }

    function agendarAtualizacao() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        atualizarSecaoAtiva();
      });
    }

    function finalizarNavegacao() {
      navegacaoPendente.current = false;
      if (timeoutNavegacao.current) clearTimeout(timeoutNavegacao.current);
      timeoutNavegacao.current = null;
      agendarAtualizacao();
    }

    atualizarSecaoAtiva();
    window.addEventListener("scroll", agendarAtualizacao, { passive: true });
    document.addEventListener("scroll", agendarAtualizacao, true);
    window.addEventListener("scrollend", finalizarNavegacao);
    window.addEventListener("resize", agendarAtualizacao);
    return () => {
      window.removeEventListener("scroll", agendarAtualizacao);
      document.removeEventListener("scroll", agendarAtualizacao, true);
      window.removeEventListener("scrollend", finalizarNavegacao);
      window.removeEventListener("resize", agendarAtualizacao);
      if (frame) window.cancelAnimationFrame(frame);
      if (timeoutNavegacao.current) clearTimeout(timeoutNavegacao.current);
    };
  }, []);

  function navegarParaSecao(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    const destino = document.getElementById(id);
    if (!destino) return;

    const header = document.querySelector<HTMLElement>("[data-landing-header]");
    const scrollRoot = document.scrollingElement ?? document.documentElement;
    const topo = scrollRoot.scrollTop + destino.getBoundingClientRect().top - (header?.getBoundingClientRect().height ?? 0) - 12;
    const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const comportamento: ScrollBehavior = movimentoReduzido ? "auto" : "smooth";
    navegacaoPendente.current = true;
    setSecaoAtiva(id);
    window.history.replaceState(null, "", `#${id}`);
    scrollRoot.scrollTo({ top: Math.max(0, topo), behavior: comportamento });
    if (timeoutNavegacao.current) clearTimeout(timeoutNavegacao.current);
    timeoutNavegacao.current = setTimeout(() => {
      navegacaoPendente.current = false;
      timeoutNavegacao.current = null;
      window.dispatchEvent(new Event("scroll"));
    }, movimentoReduzido ? 0 : 2000);
  }

  return (
    <>
      <nav aria-label="Navegação principal" className="relative z-[60] order-2 hidden items-center gap-8 lg:flex">
        {SECOES.filter((secao) => secao.id !== "inicio").map((secao) => {
          const ativa = secaoAtiva === secao.id;
          return (
            <a
              key={secao.id}
              href={`#${secao.id}`}
              onClick={(event) => navegarParaSecao(event, secao.id)}
              aria-current={ativa ? "location" : undefined}
              className={`group relative cursor-pointer touch-manipulation py-2 text-sm transition-colors ${ativa ? "font-semibold text-[#C9A227]" : "text-zinc-400 hover:text-white"}`}
            >
              {secao.desktopLabel}
              <span
                className={`absolute -bottom-0.5 left-0 h-0.5 bg-[#C9A227] transition-[width] duration-200 ${ativa ? "w-full" : "w-0 group-hover:w-full"}`}
              />
            </a>
          );
        })}
      </nav>

      <nav ref={navegacaoMobileRef} aria-label="Navegação principal" className="mobile-nav relative z-[60] order-3 flex w-full gap-1 overflow-x-auto border-t border-white/10 px-4 py-1 lg:hidden">
        {SECOES.map((secao) => {
          const ativa = secaoAtiva === secao.id;
          return (
            <a
              key={secao.id}
              data-secao={secao.id}
              href={`#${secao.id}`}
              onClick={(event) => navegarParaSecao(event, secao.id)}
              aria-current={ativa ? "location" : undefined}
              className={`relative inline-flex min-h-11 shrink-0 cursor-pointer touch-manipulation items-center whitespace-nowrap px-3 text-sm transition-colors after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-[#C9A227] after:transition-transform ${ativa ? "font-semibold text-[#C9A227] after:scale-x-100" : "text-zinc-300 after:scale-x-0"}`}
            >
              {secao.label}
            </a>
          );
        })}
      </nav>
    </>
  );
}
