"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Barbearia {
  id: string;
  nome: string | null;
  dia_folga: number;
}

const DIAS_DA_SEMANA = [
  { valor: 0, nome: "Domingo" },
  { valor: 1, nome: "Segunda-feira" },
  { valor: 2, nome: "Terça-feira" },
  { valor: 3, nome: "Quarta-feira" },
  { valor: 4, nome: "Quinta-feira" },
  { valor: 5, nome: "Sexta-feira" },
  { valor: 6, nome: "Sábado" },
];

export default function ConfiguracoesPage() {
  const supabase = createClient();

  const [barbearia, setBarbearia] = useState<Barbearia | null>(null);
  const [diaFolga, setDiaFolga] = useState<number | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarConfiguracoes() {
      try {
        setCarregando(true);
        setErro(null);

        const {
          data: { user },
          error: usuarioError,
        } = await supabase.auth.getUser();

        if (usuarioError || !user) {
          throw new Error("Usuário não autenticado.");
        }

        const { data, error } = await supabase
          .from("barbearias")
          .select("id, nome, dia_folga")
          .eq("proprietario_id", user.id)
          .maybeSingle();

        if (error) {
          console.error(
            "Erro ao buscar configurações:",
            error
          );

          throw new Error(
            "Não foi possível carregar as configurações da barbearia."
          );
        }

        if (!data) {
          throw new Error(
            "Nenhuma barbearia encontrada para este usuário."
          );
        }

        setBarbearia(data);
        setDiaFolga(data.dia_folga);
      } catch (error) {
        console.error(
          "Erro ao carregar configurações:",
          error
        );

        if (error instanceof Error) {
          setErro(error.message);
        } else {
          setErro(
            "Ocorreu um erro ao carregar as configurações."
          );
        }
      } finally {
        setCarregando(false);
      }
    }

    carregarConfiguracoes();
  }, [supabase]);

  async function salvarConfiguracoes() {
    if (!barbearia || diaFolga === null) {
      return;
    }

    try {
      setSalvando(true);
      setErro(null);
      setMensagem(null);

const { data, error } = await supabase
  .from("barbearias")
  .update({
    dia_folga: diaFolga,
  })
  .eq("id", barbearia.id)
  .select("id, nome, dia_folga");

console.log("RESULTADO AO SALVAR:", {
  diaFolga,
  barbeariaId: barbearia.id,
  data,
  error,
});

      if (error) {
        console.error(
          "Erro ao salvar dia de folga:",
          error
        );

        throw new Error(
          "Não foi possível salvar o dia de folga."
        );
      }

      setBarbearia((atual) =>
        atual
          ? {
              ...atual,
              dia_folga: diaFolga,
            }
          : atual
      );

      setMensagem(
        "Configurações salvas com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao salvar configurações:",
        error
      );

      if (error instanceof Error) {
        setErro(error.message);
      } else {
        setErro(
          "Ocorreu um erro ao salvar as configurações."
        );
      }
    } finally {
      setSalvando(false);
    }
  }

  const nomeDiaFolga =
    diaFolga !== null
      ? DIAS_DA_SEMANA.find(
          (dia) => dia.valor === diaFolga
        )?.nome
      : null;

  if (carregando) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[#C9A227]" />

          <p className="mt-4 text-sm text-zinc-500">
            Carregando configurações...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">

      {/* HEADER */}
      <div>
        <p className="mb-2 text-sm text-zinc-500">
          Configurações
        </p>

        <h1 className="text-3xl font-semibold tracking-tight">
          Configurações da barbearia
        </h1>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Configure os dias em que sua barbearia não
          realiza atendimentos.
        </p>
      </div>

      {/* ERRO */}
      {erro && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
          <p className="font-medium text-red-400">
            Não foi possível concluir a operação
          </p>

          <p className="mt-1 text-sm text-red-400/80">
            {erro}
          </p>
        </div>
      )}

      {/* SUCESSO */}
      {mensagem && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="font-medium text-emerald-400">
            {mensagem}
          </p>
        </div>
      )}

      {/* BARBEARIA */}
      <section className="rounded-2xl border border-zinc-800 bg-[#10151C] p-6">
        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A227]/10 text-xl text-[#C9A227]">
            ✂
          </div>

          <div>
            <p className="text-sm text-zinc-500">
              Barbearia
            </p>

            <p className="mt-1 font-medium text-white">
              {barbearia?.nome ?? "Na Régua+"}
            </p>
          </div>

        </div>
      </section>

      {/* DIA DE FOLGA */}
      <section className="rounded-2xl border border-zinc-800 bg-[#10151C] p-6">

        <div>
          <h2 className="text-lg font-semibold text-white">
            Dia de folga
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Escolha o dia da semana em que a barbearia
            normalmente não realiza atendimentos.
          </p>
        </div>

        {/* DIAS */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DIAS_DA_SEMANA.map((dia) => {
            const selecionado =
              diaFolga === dia.valor;

            return (
              <button
                key={dia.valor}
                type="button"
                onClick={() => {
                  setDiaFolga(dia.valor);
                  setMensagem(null);
                  setErro(null);
                }}
                className={`flex items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
                  selecionado
                    ? "border-[#C9A227] bg-[#C9A227]/10 text-[#C9A227]"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <span className="text-sm font-medium">
                  {dia.nome}
                </span>

                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    selecionado
                      ? "border-[#C9A227] bg-[#C9A227] text-black"
                      : "border-zinc-700"
                  }`}
                >
                  {selecionado && (
                    <span className="text-xs font-bold">
                      ✓
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* RESUMO */}
        {nomeDiaFolga && (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-sm text-zinc-500">
              Dia de folga configurado
            </p>

            <p className="mt-1 font-medium text-white">
              {nomeDiaFolga}
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              Os clientes não poderão realizar
              agendamentos nesse dia.
            </p>
          </div>
        )}

        {/* SALVAR */}
        <div className="mt-6 flex justify-end border-t border-zinc-800 pt-6">
          <button
            type="button"
            onClick={salvarConfiguracoes}
            disabled={
              salvando || diaFolga === null
            }
            className="rounded-xl bg-[#C9A227] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando
              ? "Salvando..."
              : "Salvar alterações"}
          </button>
        </div>

      </section>
    </div>
  );
}