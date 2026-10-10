"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("na-regua-theme");
    const nextTheme: Theme = savedTheme === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("na-regua-theme", nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Ativar modo ${theme === "dark" ? "claro" : "escuro"}`}
      title={`Ativar modo ${theme === "dark" ? "claro" : "escuro"}`}
      className="theme-toggle z-[10000] inline-flex min-h-11 items-center gap-2 border px-4 py-2 text-sm font-semibold shadow-lg transition-colors"
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
      <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
    </button>
  );
}
