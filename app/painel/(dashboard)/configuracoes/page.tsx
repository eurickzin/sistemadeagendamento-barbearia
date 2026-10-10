"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/app/components/Icon";
import { uploadProfileImage } from "@/lib/profile-images";

interface Barbearia {
  id: string;
  nome: string | null;
  slug: string;
  telefone: string | null;
  descricao: string | null;
  logo_url: string | null;
  capa_url: string | null;
  instagram: string | null;
  endereco: string | null;
  horario_abertura: string;
  horario_fechamento: string;
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
  const [proprietarioId, setProprietarioId] = useState("");
  const [camposAvancadosDisponiveis, setCamposAvancadosDisponiveis] = useState(true);

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

        let { data, error } = await supabase
          .from("barbearias")
          .select("id, nome, slug, telefone, descricao, logo_url, capa_url, instagram, endereco, horario_abertura, horario_fechamento, dia_folga")
          .eq("proprietario_id", user.id)
          .maybeSingle();

        if (error) {
          // Permite abrir a tela mesmo quando as colunas extras ainda não foram criadas no Supabase.
          const resultadoBasico = await supabase
            .from("barbearias")
            .select("id, nome, slug, telefone, descricao, logo_url, dia_folga")
            .eq("proprietario_id", user.id)
            .maybeSingle();

          if (resultadoBasico.error) {
            console.error("Erro ao buscar configurações:", resultadoBasico.error.message, resultadoBasico.error.code);
            throw new Error(`Não foi possível carregar a barbearia: ${resultadoBasico.error.message}`);
          }
          data = resultadoBasico.data ? {
            ...resultadoBasico.data,
            capa_url: null,
            instagram: null,
            endereco: null,
            horario_abertura: "08:00",
            horario_fechamento: "21:00",
          } : null;
          setCamposAvancadosDisponiveis(false);
        }

        if (!data) {
          throw new Error(
            "Nenhuma barbearia encontrada para este usuário."
          );
        }

        setBarbearia(data);
        setDiaFolga(data.dia_folga);
        setProprietarioId(user.id);
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
    if (!barbearia.nome?.trim() || !barbearia.slug?.trim()) {
      setErro("Informe o nome da barbearia e o link público.");
      return;
    }
    if (camposAvancadosDisponiveis && barbearia.horario_abertura >= barbearia.horario_fechamento) {
      setErro("O horário de fechamento precisa ser depois do horário de abertura.");
      return;
    }

    try {
      setSalvando(true);
      setErro(null);
      setMensagem(null);

const dadosAtualizacao = {
  nome: barbearia.nome,
  slug: barbearia.slug,
  telefone: barbearia.telefone,
  descricao: barbearia.descricao,
  logo_url: barbearia.logo_url,
  dia_folga: diaFolga,
  ...(camposAvancadosDisponiveis ? {
    capa_url: barbearia.capa_url,
    instagram: barbearia.instagram,
    endereco: barbearia.endereco,
    horario_abertura: barbearia.horario_abertura,
    horario_fechamento: barbearia.horario_fechamento,
  } : {}),
};

const { error } = await supabase
  .from("barbearias")
  .update(dadosAtualizacao)
  .eq("id", barbearia.id);

      if (error) {
        console.error(
          "Erro ao salvar dia de folga:",
          error
        );

        throw new Error(
          error.code === "23505"
            ? "Este link já está sendo usado por outra barbearia."
            : "Não foi possível salvar as configurações."
        );
      }

      setBarbearia((atual) =>
        atual
          ? {
              ...atual,
              nome: (barbearia.nome ?? "").trim(),
              slug: barbearia.slug.trim(),
              dia_folga: diaFolga,
            }
          : atual
      );

      setMensagem(
        camposAvancadosDisponiveis
          ? "Configurações salvas com sucesso."
          : "Dados básicos salvos. Execute o SQL de personalização no Supabase para habilitar capa, Instagram, endereço e horários."
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

  function atualizar(campo: keyof Barbearia, valor: string) {
    setBarbearia((atual) => atual ? { ...atual, [campo]: valor } : atual);
    setMensagem(null);
  }

  async function enviarImagem(event: ChangeEvent<HTMLInputElement>, campo: "logo_url" | "capa_url") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !proprietarioId) return;
    try {
      setSalvando(true);
      setErro(null);
      setMensagem(null);
      const url = await uploadProfileImage(file, proprietarioId, campo === "logo_url" ? "barbershop-logo" : "barbershop-cover");
      const { error: salvarImagemError } = await supabase
        .from("barbearias")
        .update({ [campo]: url })
        .eq("proprietario_id", proprietarioId);
      if (salvarImagemError) {
        throw new Error(`A imagem foi enviada, mas não foi possível vinculá-la à barbearia: ${salvarImagemError.message}`);
      }
      atualizar(campo, url);
      setMensagem(campo === "logo_url" ? "Logo enviada e salva na barbearia." : "Capa enviada e salva na barbearia.");
    } catch (uploadError) {
      setErro(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar a imagem.");
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
    <div className="mx-auto min-w-0 max-w-4xl space-y-6 sm:space-y-8">

      {/* HEADER */}
      <div>
        <p className="mb-2 text-sm text-zinc-500">
          Configurações
        </p>

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Configurações da barbearia
        </h1>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Personalize a página pública e os horários da sua barbearia.
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

      <section className="space-y-5 border border-zinc-800 bg-[#10151C] p-4 sm:p-6">
        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A227]/10 text-xl text-[#C9A227]">
            <Icon name="scissors" />
          </div>

          <div>
            <p className="text-sm text-zinc-500">
              Barbearia
            </p>

            <p className="mt-1 font-medium text-white">Perfil público da barbearia</p>
          </div>
        </div>
        {!camposAvancadosDisponiveis && <p className="border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">Os campos avançados ainda não existem no banco. Execute <strong>supabase/profile-customization.sql</strong> no SQL Editor do Supabase para habilitar capa, Instagram, endereço e horários personalizados.</p>}
        {barbearia && <>
          {barbearia.capa_url && <img src={barbearia.capa_url} alt="Capa da barbearia" className="h-36 w-full object-cover sm:h-48" />}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-zinc-400">Nome da barbearia<input value={barbearia.nome ?? ""} onChange={(e) => atualizar("nome", e.target.value)} className="mt-2 w-full border border-zinc-700 bg-[#0B0F14] px-3 py-3 text-white" /></label>
            <label className="text-sm text-zinc-400">Link (slug)<input value={barbearia.slug ?? ""} onChange={(e) => atualizar("slug", e.target.value.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-"))} className="mt-2 w-full border border-zinc-700 bg-[#0B0F14] px-3 py-3 text-white" /><span className="mt-1 block text-xs text-zinc-600">/barbearia/{barbearia.slug}</span></label>
            <label className="text-sm text-zinc-400">WhatsApp / telefone<input value={barbearia.telefone ?? ""} onChange={(e) => atualizar("telefone", e.target.value)} className="mt-2 w-full border border-zinc-700 bg-[#0B0F14] px-3 py-3 text-white" /></label>
            <label className="text-sm text-zinc-400">Instagram<input disabled={!camposAvancadosDisponiveis} value={barbearia.instagram ?? ""} onChange={(e) => atualizar("instagram", e.target.value)} placeholder="@sua_barbearia" className="mt-2 w-full border border-zinc-700 bg-[#0B0F14] px-3 py-3 text-white disabled:opacity-40" /></label>
            <label className="text-sm text-zinc-400 sm:col-span-2">Endereço<input disabled={!camposAvancadosDisponiveis} value={barbearia.endereco ?? ""} onChange={(e) => atualizar("endereco", e.target.value)} className="mt-2 w-full border border-zinc-700 bg-[#0B0F14] px-3 py-3 text-white disabled:opacity-40" /></label>
            <label className="text-sm text-zinc-400 sm:col-span-2">Descrição<textarea value={barbearia.descricao ?? ""} onChange={(e) => atualizar("descricao", e.target.value)} rows={3} className="mt-2 w-full border border-zinc-700 bg-[#0B0F14] px-3 py-3 text-white" /></label>
            <label className="text-sm text-zinc-400">Abre às<input disabled={!camposAvancadosDisponiveis} type="time" value={(barbearia.horario_abertura ?? "08:00").slice(0, 5)} onChange={(e) => atualizar("horario_abertura", e.target.value)} className="mt-2 w-full border border-zinc-700 bg-[#0B0F14] px-3 py-3 text-white disabled:opacity-40" /></label>
            <label className="text-sm text-zinc-400">Fecha às<input disabled={!camposAvancadosDisponiveis} type="time" value={(barbearia.horario_fechamento ?? "21:00").slice(0, 5)} onChange={(e) => atualizar("horario_fechamento", e.target.value)} className="mt-2 w-full border border-zinc-700 bg-[#0B0F14] px-3 py-3 text-white disabled:opacity-40" /></label>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="cursor-pointer border border-zinc-700 px-4 py-3 text-sm text-white">{barbearia.logo_url ? "Trocar logo" : "Adicionar logo"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => enviarImagem(e, "logo_url")} className="sr-only" /></label>
            <label aria-disabled={!camposAvancadosDisponiveis} className={`border border-zinc-700 px-4 py-3 text-sm text-white ${camposAvancadosDisponiveis ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}>{barbearia.capa_url ? "Trocar capa" : "Adicionar capa"}<input disabled={!camposAvancadosDisponiveis} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => enviarImagem(e, "capa_url")} className="sr-only" /></label>
            {barbearia.logo_url && <img src={barbearia.logo_url} alt="Prévia do logo" className="h-12 w-12 object-cover" />}
          </div>
        </>}
      </section>

      {/* DIA DE FOLGA */}
      <section className="border border-zinc-800 bg-[#10151C] p-4 sm:p-6">

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
