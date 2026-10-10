"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/ui/Icon";
import { getProfileImageStoragePath, uploadProfileImage } from "@/lib/profile-images";

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

interface Barbeiro {
  id: string;
  nome: string;
  ativo: boolean;
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
  const [imagemParaRemover, setImagemParaRemover] = useState<"logo_url" | "capa_url" | null>(null);

  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [carregandoBarbeiros, setCarregandoBarbeiros] = useState(true);
  const [nomeNovoBarbeiro, setNomeNovoBarbeiro] = useState("");
  const [salvandoBarbeiro, setSalvandoBarbeiro] = useState<string | null>(null);
  const [mensagemEquipe, setMensagemEquipe] = useState("");
  const [erroEquipe, setErroEquipe] = useState("");

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

        const { data: equipe, error: erroEquipeBanco } = await supabase
          .from("barbeiros")
          .select("id, nome, ativo, horario_abertura, horario_fechamento, dia_folga")
          .eq("barbearia_id", data.id)
          .order("nome", { ascending: true });

        if (erroEquipeBanco) {
          console.error("Erro ao carregar barbeiros:", erroEquipeBanco);
          setErroEquipe("Não foi possível carregar a equipe. Confira se supabase/barbeiros.sql já foi executado no Supabase.");
        } else {
          setBarbeiros((equipe ?? []) as Barbeiro[]);
        }
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
        setCarregandoBarbeiros(false);
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

  function atualizar(campo: keyof Barbearia, valor: string | null) {
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

  async function removerImagem() {
    if (!barbearia || !proprietarioId || !imagemParaRemover) return;

    const campo = imagemParaRemover;
    const url = barbearia[campo];
    if (!url) {
      setImagemParaRemover(null);
      return;
    }

    setSalvando(true);
    setErro(null);
    setMensagem(null);
    try {
      const { data: imagemAtualizada, error: atualizarError } = await supabase
        .from("barbearias")
        .update({ [campo]: null })
        .eq("id", barbearia.id)
        .eq("proprietario_id", proprietarioId)
        .select("id")
        .maybeSingle();

      if (atualizarError || !imagemAtualizada) {
        throw new Error(atualizarError
          ? `Não foi possível remover a imagem do perfil: ${atualizarError.message}`
          : "Não foi possível confirmar a remoção da imagem no perfil.");
      }

      atualizar(campo, null);
      setImagemParaRemover(null);

      const path = getProfileImageStoragePath(url);
      const nomeArquivoEsperado = campo === "logo_url" ? "barbershop-logo-" : "barbershop-cover-";
      if (path?.startsWith(`${proprietarioId}/${nomeArquivoEsperado}`)) {
        const { error: removerArquivoError } = await supabase.storage
          .from("profile-images")
          .remove([path]);
        if (removerArquivoError) {
          setMensagem(campo === "logo_url"
            ? "Foto removida do perfil. O arquivo antigo não pôde ser apagado do armazenamento."
            : "Capa removida do perfil. O arquivo antigo não pôde ser apagado do armazenamento.");
          return;
        }
      }

      setMensagem(campo === "logo_url" ? "Foto do perfil removida com sucesso." : "Capa removida com sucesso.");
    } catch (remocaoError) {
      setErro(remocaoError instanceof Error ? remocaoError.message : "Não foi possível remover a imagem.");
    } finally {
      setSalvando(false);
    }
  }

  function atualizarHorarioBarbeiro(id: string, campo: keyof Barbeiro, valor: string | boolean | number) {
    setBarbeiros((atuais) => atuais.map((barbeiro) =>
      barbeiro.id === id ? { ...barbeiro, [campo]: valor } : barbeiro,
    ));
    setMensagemEquipe("");
    setErroEquipe("");
  }

  async function cadastrarBarbeiro() {
    if (!barbearia || !nomeNovoBarbeiro.trim()) {
      setErroEquipe("Informe o nome do barbeiro.");
      return;
    }

    setSalvandoBarbeiro("novo");
    setErroEquipe("");
    setMensagemEquipe("");
    const { data, error } = await supabase
      .from("barbeiros")
      .insert({
        barbearia_id: barbearia.id,
        nome: nomeNovoBarbeiro.trim(),
        horario_abertura: barbearia.horario_abertura || "08:00",
        horario_fechamento: barbearia.horario_fechamento || "21:00",
        dia_folga: diaFolga ?? 0,
      })
      .select("id, nome, ativo, horario_abertura, horario_fechamento, dia_folga")
      .single();

    if (error) {
      console.error("Erro ao cadastrar barbeiro:", error);
      setErroEquipe("Não foi possível cadastrar o barbeiro. Confira as permissões e a migração supabase/barbeiros.sql.");
    } else {
      setBarbeiros((atuais) => [...atuais, data as Barbeiro].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNomeNovoBarbeiro("");
      setMensagemEquipe("Barbeiro cadastrado. Ajuste os horários individuais e salve.");
    }
    setSalvandoBarbeiro(null);
  }

  async function salvarBarbeiro(barbeiro: Barbeiro) {
    if (!barbearia) return;
    if (barbeiro.horario_abertura >= barbeiro.horario_fechamento) {
      setErroEquipe(`O horário de fechamento de ${barbeiro.nome} precisa ser depois da abertura.`);
      return;
    }

    setSalvandoBarbeiro(barbeiro.id);
    setErroEquipe("");
    setMensagemEquipe("");
    const { error } = await supabase
      .from("barbeiros")
      .update({
        nome: barbeiro.nome.trim(),
        ativo: barbeiro.ativo,
        horario_abertura: barbeiro.horario_abertura,
        horario_fechamento: barbeiro.horario_fechamento,
        dia_folga: barbeiro.dia_folga,
      })
      .eq("id", barbeiro.id)
      .eq("barbearia_id", barbearia.id);

    if (error) {
      console.error("Erro ao atualizar barbeiro:", error);
      setErroEquipe(`Não foi possível salvar ${barbeiro.nome}.`);
    } else {
      setMensagemEquipe(`Dados de ${barbeiro.nome} salvos.`);
    }
    setSalvandoBarbeiro(null);
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
    <div className="settings-page mx-auto min-w-0 max-w-4xl space-y-6 sm:space-y-8">

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
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer border border-zinc-700 px-4 py-3 text-sm text-white">{barbearia.logo_url ? "Trocar logo" : "Adicionar logo"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => enviarImagem(e, "logo_url")} className="sr-only" /></label>
            <label aria-disabled={!camposAvancadosDisponiveis} className={`border border-zinc-700 px-4 py-3 text-sm text-white ${camposAvancadosDisponiveis ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}>{barbearia.capa_url ? "Trocar capa" : "Adicionar capa"}<input disabled={!camposAvancadosDisponiveis} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => enviarImagem(e, "capa_url")} className="sr-only" /></label>
            {barbearia.logo_url && <img src={barbearia.logo_url} alt="Prévia do logo" className="h-12 w-12 object-cover" />}
            {barbearia.logo_url && <button type="button" onClick={() => setImagemParaRemover("logo_url")} disabled={salvando} className="border border-red-500/40 px-4 py-3 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50">Remover foto</button>}
            {barbearia.capa_url && camposAvancadosDisponiveis && <button type="button" onClick={() => setImagemParaRemover("capa_url")} disabled={salvando} className="border border-red-500/40 px-4 py-3 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50">Remover capa</button>}
          </div>
        </>}
      </section>

      {imagemParaRemover && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !salvando) setImagemParaRemover(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="remover-imagem-titulo" className="w-full max-w-md border border-zinc-700 bg-[#10151C] p-6 shadow-2xl">
          <h2 id="remover-imagem-titulo" className="text-lg font-semibold text-white">Remover {imagemParaRemover === "logo_url" ? "foto do perfil" : "capa"}?</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Essa imagem deixará de aparecer no perfil público da barbearia.</p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" disabled={salvando} onClick={() => setImagemParaRemover(null)} className="border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 disabled:opacity-50">Cancelar</button>
            <button type="button" disabled={salvando} onClick={removerImagem} className="bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50">{salvando ? "Removendo..." : "Remover imagem"}</button>
          </div>
        </section>
      </div>}

      {/* EQUIPE */}
      <section className="space-y-5 border border-zinc-800 bg-[#10151C] p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Barbeiros</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Cadastre a equipe e configure o expediente de cada profissional. Os horários reservados para um barbeiro não bloqueiam a agenda dos outros.
          </p>
        </div>

        {erroEquipe && <p role="alert" className="border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{erroEquipe}</p>}
        {mensagemEquipe && <p role="status" className="border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">{mensagemEquipe}</p>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1 text-sm text-zinc-400">
            Nome do novo barbeiro
            <input
              value={nomeNovoBarbeiro}
              onChange={(event) => setNomeNovoBarbeiro(event.target.value)}
              maxLength={100}
              placeholder="Ex.: João Silva"
              className="mt-2 w-full border border-zinc-700 bg-[#0B0F14] px-3 py-3 text-white placeholder:text-zinc-600"
            />
          </label>
          <button
            type="button"
            onClick={cadastrarBarbeiro}
            disabled={salvandoBarbeiro !== null || !nomeNovoBarbeiro.trim()}
            className="self-end bg-[#C9A227] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvandoBarbeiro === "novo" ? "Cadastrando..." : "Adicionar barbeiro"}
          </button>
        </div>

        {carregandoBarbeiros ? (
          <p className="text-sm text-zinc-500">Carregando equipe...</p>
        ) : barbeiros.length === 0 ? (
          <p className="border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
            Ainda não há barbeiros cadastrados. Depois de executar a migração, será possível adicionar a equipe aqui.
          </p>
        ) : (
          <div className="space-y-4">
            {barbeiros.map((barbeiro) => (
              <article key={barbeiro.id} className="space-y-4 border border-zinc-800 bg-[#0B0F14]/60 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="min-w-0 flex-1 text-sm text-zinc-400">
                    Nome
                    <input
                      value={barbeiro.nome}
                      onChange={(event) => atualizarHorarioBarbeiro(barbeiro.id, "nome", event.target.value)}
                      maxLength={100}
                      className="mt-2 w-full border border-zinc-700 bg-[#10151C] px-3 py-3 text-white"
                    />
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={barbeiro.ativo}
                      disabled={barbeiro.ativo && barbeiros.filter((item) => item.ativo).length <= 1}
                      onChange={(event) => atualizarHorarioBarbeiro(barbeiro.id, "ativo", event.target.checked)}
                      className="h-4 w-4 accent-[#C9A227]"
                    />
                    Atende clientes
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-sm text-zinc-400">
                    Abre às
                    <input
                      type="time"
                      value={barbeiro.horario_abertura.slice(0, 5)}
                      onChange={(event) => atualizarHorarioBarbeiro(barbeiro.id, "horario_abertura", event.target.value)}
                      className="mt-2 w-full border border-zinc-700 bg-[#10151C] px-3 py-3 text-white"
                    />
                  </label>
                  <label className="text-sm text-zinc-400">
                    Fecha às
                    <input
                      type="time"
                      value={barbeiro.horario_fechamento.slice(0, 5)}
                      onChange={(event) => atualizarHorarioBarbeiro(barbeiro.id, "horario_fechamento", event.target.value)}
                      className="mt-2 w-full border border-zinc-700 bg-[#10151C] px-3 py-3 text-white"
                    />
                  </label>
                  <label className="text-sm text-zinc-400">
                    Dia de folga
                    <select
                      value={barbeiro.dia_folga}
                      onChange={(event) => atualizarHorarioBarbeiro(barbeiro.id, "dia_folga", Number(event.target.value))}
                      className="mt-2 w-full border border-zinc-700 bg-[#10151C] px-3 py-3 text-white"
                    >
                      {DIAS_DA_SEMANA.map((dia) => <option key={dia.valor} value={dia.valor}>{dia.nome}</option>)}
                    </select>
                  </label>
                </div>

                <div className="flex justify-end border-t border-zinc-800 pt-4">
                  <button
                    type="button"
                    onClick={() => salvarBarbeiro(barbeiro)}
                    disabled={salvandoBarbeiro !== null || !barbeiro.nome.trim()}
                    className="border border-[#C9A227]/40 px-4 py-2.5 text-sm font-semibold text-[#E0BB35] transition hover:bg-[#C9A227]/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvandoBarbeiro === barbeiro.id ? "Salvando..." : "Salvar barbeiro"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
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
