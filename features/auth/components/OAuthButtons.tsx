"use client";

import { useState } from "react";
import { createClient } from "@/lib/neon/client";

type Provider = "google";

export default function OAuthButtons({
  redirectPath,
  disabled = false,
}: {
  redirectPath: string;
  disabled?: boolean;
}) {
  const [carregando, setCarregando] = useState<Provider | null>(null);
  const [erro, setErro] = useState("");

  async function entrar(provider: Provider) {
    setErro("");
    setCarregando(provider);

    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectPath },
    });

    if (error) {
      setErro(
        error.message.includes("provider is not enabled")
          ? `O login com ${provider === "google" ? "Google" : "Apple"} ainda não está habilitado no neon.`
          : "Não foi possível iniciar o login com Google. Tente novamente.",
      );
      setCarregando(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => void entrar("google")}
          disabled={disabled || carregando !== null}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.09] disabled:cursor-wait disabled:opacity-50"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.6-4.12H3.05v2.6A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.4 13.96a6 6 0 0 1 0-3.92v-2.6H3.05a10 10 0 0 0 0 9.12l3.35-2.6Z" />
            <path fill="#EA4335" d="M12 5.92c1.47 0 2.8.5 3.84 1.5l2.88-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.95 5.44l3.35 2.6C7.2 7.68 9.4 5.92 12 5.92Z" />
          </svg>
          {carregando === "google" ? "Abrindo..." : "Google"}
        </button>
        <button
          type="button"
          disabled
          title="Login com Apple temporariamente indisponível"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-zinc-500 opacity-50"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M17.05 12.54c.02 2.35 2.06 3.13 2.08 3.14-.02.06-.33 1.13-1.08 2.24-.65.96-1.33 1.91-2.4 1.93-1.05.02-1.39-.62-2.6-.62-1.2 0-1.58.6-2.57.64-1.03.04-1.82-1.04-2.47-2-.13-.2-2.23-3.22-.08-6.53.74-1.16 2.07-1.9 3.5-1.92 1.02-.02 1.98.69 2.6.69.61 0 1.77-.85 2.98-.72.5.02 1.92.2 2.83 1.54-.08.05-1.69.99-1.67 2.61ZM15.1 7.9c.54-.65.9-1.55.8-2.45-.77.03-1.7.52-2.26 1.17-.5.57-.94 1.49-.82 2.37.86.07 1.74-.44 2.28-1.09Z" />
          </svg>
          Apple (em breve)
        </button>
      </div>
      {erro && <p role="alert" className="text-xs leading-5 text-red-400">{erro}</p>}
    </div>
  );
}
