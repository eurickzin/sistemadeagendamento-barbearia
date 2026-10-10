"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CadastrarBarbearia() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [telefone, setTelefone] = useState("");
  const [descricao, setDescricao] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  function gerarSlug(valor: string) {
    return valor
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function alterarNome(valor: string) {
    setNome(valor);
    setSlug(gerarSlug(valor));
  }

  async function cadastrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErro("");

    if (!nome.trim()) {
      setErro("Digite o nome da sua barbearia.");
      return;
    }

    if (!slug.trim()) {
      setErro("Digite um nome válido para a barbearia.");
      return;
    }

    setCarregando(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/painel/login");
        return;
      }

      const { data: barbeariaExistente, error: consultaError } =
        await supabase
          .from("barbearias")
          .select("id")
          .eq("proprietario_id", user.id)
          .maybeSingle();

      if (consultaError) {
        console.error(consultaError);
        setErro("Não foi possível verificar sua conta.");
        return;
      }

      if (barbeariaExistente) {
        router.replace("/painel");
        return;
      }

      const { error } = await supabase.from("barbearias").insert({
        nome: nome.trim(),
        slug: slug.trim(),
        telefone: telefone.trim() || null,
        descricao: descricao.trim() || null,
        logo_url: null,
        ativa: true,
        proprietario_id: user.id,
      });

      if (error) {
       console.error("Erro ao cadastrar barbearia:", {
  message: error.message,
  code: error.code,
  details: error.details,
  hint: error.hint,
});

        if (error.code === "23505") {
          setErro(
            "Esse endereço da barbearia já está sendo utilizado. Escolha outro nome."
          );
        } else {
          setErro(
            "Não foi possível cadastrar sua barbearia. Tente novamente."
          );
        }

        return;
      }

      router.replace("/painel");
    } catch (error) {
      console.error(error);
      setErro("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center">
        <div className="w-full">

          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C9A227]/10 text-3xl">
              💈
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
              Na Régua+
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Cadastre sua barbearia
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
              Configure sua barbearia para começar a receber e gerenciar
              agendamentos.
            </p>
          </div>

          <form
            onSubmit={cadastrar}
            className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-2xl sm:p-8"
          >
            <div className="space-y-5">

              {/* NOME */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Nome da barbearia
                </label>

                <input
                  type="text"
                  value={nome}
                  onChange={(event) => alterarNome(event.target.value)}
                  placeholder="Ex: Na Régua Barbearia"
                  disabled={carregando}
                  className="w-full rounded-xl border border-white/10 bg-[#090D12] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-[#C9A227]/50"
                />
              </div>

              {/* SLUG */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Endereço da página
                </label>

                <div className="flex items-center rounded-xl border border-white/10 bg-[#090D12] focus-within:border-[#C9A227]/50">
                  <span className="pl-4 text-sm text-zinc-600">
                    naregua.com/
                  </span>

                  <input
                    type="text"
                    value={slug}
                    onChange={(event) =>
                      setSlug(gerarSlug(event.target.value))
                    }
                    disabled={carregando}
                    className="min-w-0 flex-1 bg-transparent px-1 py-3.5 pr-4 text-sm text-white outline-none"
                  />
                </div>

                <p className="mt-2 text-xs text-zinc-600">
                  Esse endereço será usado futuramente para sua página pública.
                </p>
              </div>

              {/* TELEFONE */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  WhatsApp / Telefone
                </label>

                <input
                  type="tel"
                  value={telefone}
                  onChange={(event) => setTelefone(event.target.value)}
                  placeholder="(84) 99999-9999"
                  disabled={carregando}
                  className="w-full rounded-xl border border-white/10 bg-[#090D12] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-[#C9A227]/50"
                />
              </div>

              {/* DESCRIÇÃO */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Descrição
                  <span className="ml-2 text-xs font-normal text-zinc-600">
                    opcional
                  </span>
                </label>

                <textarea
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                  placeholder="Conte um pouco sobre sua barbearia..."
                  rows={4}
                  disabled={carregando}
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#090D12] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-[#C9A227]/50"
                />
              </div>

              {/* ERRO */}
              {erro && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {erro}
                </div>
              )}

              {/* BOTÃO */}
              <button
                type="submit"
                disabled={carregando}
                className="w-full rounded-xl bg-[#C9A227] px-5 py-3.5 text-sm font-bold text-black transition hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {carregando
                  ? "Criando sua barbearia..."
                  : "Criar minha barbearia"}
              </button>

            </div>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-700">
            Você poderá alterar essas informações depois nas configurações.
          </p>

        </div>
      </div>
    </main>
  );
}
