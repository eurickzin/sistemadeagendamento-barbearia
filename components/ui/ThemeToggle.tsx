"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "dark" | "light";

export default function ThemeToggle({ variant = "floating" }: { variant?: "floating" | "inline" }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("na-regua-theme");
    const nextTheme: Theme = savedTheme === "light" ? "light" : "dark";
    const timer = window.setTimeout(() => setTheme(nextTheme), 0);
    document.documentElement.dataset.theme = nextTheme;

    function sincronizarTema(event: Event) {
      const tema = (event as CustomEvent<Theme>).detail;
      if (tema === "light" || tema === "dark") setTheme(tema);
    }

    window.addEventListener("na-regua-theme-change", sincronizarTema);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("na-regua-theme-change", sincronizarTema);
    };
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("na-regua-theme", nextTheme);
    window.dispatchEvent(new CustomEvent("na-regua-theme-change", { detail: nextTheme }));
  }

  const paginasPainel = ["/painel", "/painel/agenda", "/painel/clientes", "/painel/servicos", "/painel/configuracoes"];
  if (variant === "floating" && paginasPainel.includes(pathname)) return null;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Ativar modo ${theme === "dark" ? "claro" : "escuro"}`}
      title={`Ativar modo ${theme === "dark" ? "claro" : "escuro"}`}
      className={variant === "inline"
        ? "theme-toggle-inline inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition hover:scale-105 focus-visible:outline-none sm:h-10 sm:w-10"
        : "theme-toggle z-[10000] inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-all hover:scale-105 focus-visible:outline-none"}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        {theme === "dark" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </>
        ) : (
          <path d="M20.8 13.2A8.5 8.5 0 0 1 10.8 3.2 8.5 8.5 0 1 0 20.8 13.2Z" />
        )}
      </svg>
    </button>
  );
}
