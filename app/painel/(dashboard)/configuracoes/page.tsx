"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const [barbearia, setBarbearia] = useState<Barbearia | null>(null);
  const [diaFolga, setDiaFolga] = useState<number | null>(null);
  const [diaFolgaSalvo, setDiaFolgaSalvo] = useState<number | null>(null);
  const [confirmarAlteracaoFolga, setConfirmarAlteracaoFolga] = useState(false);
  const [proprietarioId, setProprietarioId] = useState("");
  const [camposAvancadosDisponiveis, setCamposAvancadosDisponiveis] = useState(true);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [imagemParaRemover, setImagemParaRemover] = useState<"logo_url" | "capa_url" | null>(null);
  const [modalConfiguracao, setModalConfiguracao] = useState<"perfil" | "equipe" | "folga" | null>(null);

  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [carregandoBarbeiros, setCarregandoBarbeiros] = useState(true);
  const [nomeNovoBarbeiro, setNomeNovoBarbeiro] = useState("");
  const [salvandoBarbeiro, setSalvandoBarbeiro] = useState<string | null>(null);
  const [mensagemEquipe, setMensagemEquipe] = useState("");
  const [erroEquipe, setErroEquipe] = useState("");
  const [barbeiroParaRemover, setBarbeiroParaRemover] = useState<Barbeiro | null>(null);
  const [confirmacaoRemocaoBarbeiroMarcada, setConfirmacaoRemocaoBarbeiroMarcada] = useState(false);
  const [removendoBarbeiro, setRemovendoBarbeiro] = useState(false);
  const [erroRemocaoBarbeiro, setErroRemocaoBarbeiro] = useState("");

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
        setDiaFolgaSalvo(data.dia_folga);
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
          const hoje = new Date();
          const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
          const { data: agendamentosEmAberto, error: erroAgendamentosEquipe } = await supabase
            .from("agendamentos")
            .select("barbeiro_id")
            .eq("barbearia_id", data.id)
            .gte("data", dataHoje)
            .in("status", ["pendente", "aguardando", "confirmado"]);

          if (erroAgendamentosEquipe) {
            console.error("Erro ao verificar agendamentos futuros da equipe:", erroAgendamentosEquipe);
            setBarbeiros((equipe ?? []) as Barbeiro[]);
          } else {
            const barbeirosComAgendamento = new Set(
              (agendamentosEmAberto ?? []).map((agendamento) => agendamento.barbeiro_id).filter(Boolean),
            );
            setBarbeiros(((equipe ?? []) as Barbeiro[]).filter((barbeiro) =>
              barbeiro.ativo || barbeirosComAgendamento.has(barbeiro.id),
            ));
          }
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

  useEffect(() => {
    if (modalConfiguracao !== "equipe" || !barbearia) return;
    let ativo = true;
    const barbeariaIdEquipe = barbearia.id;

    async function atualizarBarbeirosSemAgenda() {
      const hoje = new Date();
      const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
      const { data: agendamentosEmAberto, error } = await supabase
        .from("agendamentos")
        .select("barbeiro_id")
        .eq("barbearia_id", barbeariaIdEquipe)
        .gte("data", dataHoje)
        .in("status", ["pendente", "aguardando", "confirmado"]);

      if (!ativo || error) return;
      const barbeirosComAgendamento = new Set(
        (agendamentosEmAberto ?? []).map((agendamento) => agendamento.barbeiro_id).filter(Boolean),
      );
      setBarbeiros((atuais) => atuais.filter((barbeiro) =>
        barbeiro.ativo || barbeirosComAgendamento.has(barbeiro.id),
      ));
    }

    void atualizarBarbeirosSemAgenda();
    const intervalo = window.setInterval(() => void atualizarBarbeirosSemAgenda(), 30_000);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, [modalConfiguracao, barbearia?.id, supabase]);

  async function salvarConfiguracoes(salvarDiaFolga = false): Promise<boolean> {
    if (!barbearia || (salvarDiaFolga && diaFolga === null)) {
      return false;
    }
    if (!barbearia.nome?.trim() || !barbearia.slug?.trim()) {
      setErro("Informe o nome da barbearia e o link público.");
      return false;
    }
    if (camposAvancadosDisponiveis && barbearia.horario_abertura >= barbearia.horario_fechamento) {
      setErro("O horário de fechamento precisa ser depois do horário de abertura.");
      return false;
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
  ...(salvarDiaFolga ? { dia_folga: diaFolga } : {}),
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
          "Erro ao salvar configurações:",
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
              ...(salvarDiaFolga && diaFolga !== null ? { dia_folga: diaFolga } : {}),
            }
          : atual
      );

      if (salvarDiaFolga && diaFolga !== null) {
        setDiaFolgaSalvo(diaFolga);
        setMensagem("Dia de folga da barbearia atualizado com sucesso.");
      } else {
        setMensagem(
          camposAvancadosDisponiveis
            ? "Configurações salvas com sucesso."
            : "Dados básicos salvos. Execute o SQL de personalização no Supabase para habilitar capa, Instagram, endereço e horários."
        );
      }
      return true;
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
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarSalvarDiaFolga() {
    const salvo = await salvarConfiguracoes(true);
    if (salvo) setConfirmarAlteracaoFolga(false);
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

  async function removerBarbeiro() {
    if (!barbearia || !barbeiroParaRemover || !confirmacaoRemocaoBarbeiroMarcada) return;

    const barbeiro = barbeiroParaRemover;
    const ativosRestantes = barbeiros.filter((item) => item.ativo && item.id !== barbeiro.id).length;
    if (barbeiro.ativo && ativosRestantes === 0) {
      setErroRemocaoBarbeiro("Adicione ou ative outro barbeiro antes de remover o último profissional disponível.");
      return;
    }

    setRemovendoBarbeiro(true);
    setErroRemocaoBarbeiro("");
    setErroEquipe("");
    setMensagemEquipe("");

    const { count, error: erroHistorico } = await supabase
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("barbearia_id", barbearia.id)
      .eq("barbeiro_id", barbeiro.id);

    if (erroHistorico) {
      console.error("Erro ao consultar histórico do barbeiro:", erroHistorico);
      setErroRemocaoBarbeiro("Não foi possível verificar os agendamentos deste barbeiro. Tente novamente.");
      setRemovendoBarbeiro(false);
      return;
    }

    if ((count ?? 0) > 0) {
      if (barbeiro.ativo) {
        const { data: barbeiroAtualizado, error } = await supabase
          .from("barbeiros")
          .update({ ativo: false })
          .eq("id", barbeiro.id)
          .eq("barbearia_id", barbearia.id)
          .select("id")
          .maybeSingle();

        if (error || !barbeiroAtualizado) {
          console.error("Erro ao desativar barbeiro com histórico:", error);
          setErroRemocaoBarbeiro("Não foi possível remover este barbeiro. Confira as permissões do Supabase.");
          setRemovendoBarbeiro(false);
          return;
        }

        setBarbeiros((atuais) => atuais.map((item) => item.id === barbeiro.id ? { ...item, ativo: false } : item));
      }
      setMensagemEquipe(`${barbeiro.nome} foi removido da equipe ativa. O histórico de ${count} ${count === 1 ? "agendamento foi preservado" : "agendamentos foi preservado"}.`);
    } else {
      const { data, error } = await supabase
        .from("barbeiros")
        .delete()
        .eq("id", barbeiro.id)
        .eq("barbearia_id", barbearia.id)
        .select("id")
        .maybeSingle();

      if (error || !data) {
        console.error("Erro ao excluir barbeiro:", error);
        setErroRemocaoBarbeiro("Não foi possível excluir o barbeiro. Confira as permissões do Supabase.");
        setRemovendoBarbeiro(false);
        return;
      }

      setBarbeiros((atuais) => atuais.filter((item) => item.id !== barbeiro.id));
      setMensagemEquipe(`${barbeiro.nome} foi removido da equipe.`);
    }

    setBarbeiroParaRemover(null);
    setConfirmacaoRemocaoBarbeiroMarcada(false);
    setRemovendoBarbeiro(false);
  }

  const nomeDiaFolga =
    diaFolga !== null
      ? DIAS_DA_SEMANA.find(
          (dia) => dia.valor === diaFolga
        )?.nome
      : null;

  async function sair() {
    setSaindo(true);
    const { error: erroSaida } = await supabase.auth.signOut();
    if (erroSaida) {
      setErro("Não foi possível sair da conta. Tente novamente.");
      setSaindo(false);
      return;
    }
    router.replace("/painel/login");
  }

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

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setModalConfiguracao("perfil")}
          className="group flex min-h-20 items-center gap-3 rounded-2xl border border-zinc-800 bg-[#10151C] p-3.5 text-left transition hover:border-[#C9A227]/40 hover:bg-white/[0.03] sm:p-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C9A227]/10 text-[#C9A227]"><Icon name="scissors" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">Perfil público</span>
            <span className="mt-0.5 block truncate text-xs text-zinc-500">Nome, contato, endereço e imagens</span>
          </span>
          <span className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-[#C9A227]" aria-hidden="true">›</span>
        </button>
        <button
          type="button"
          onClick={() => setModalConfiguracao("equipe")}
          className="group flex min-h-20 items-center gap-3 rounded-2xl border border-zinc-800 bg-[#10151C] p-3.5 text-left transition hover:border-[#C9A227]/40 hover:bg-white/[0.03] sm:p-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C9A227]/10 text-[#C9A227]"><Icon name="barber" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">Equipe de barbeiros</span>
            <span className="mt-0.5 block truncate text-xs text-zinc-500">{barbeiros.length} {barbeiros.length === 1 ? "profissional cadastrado" : "profissionais cadastrados"}</span>
          </span>
          <span className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-[#C9A227]" aria-hidden="true">›</span>
        </button>
        <button
          type="button"
          onClick={() => setModalConfiguracao("folga")}
          className="group flex min-h-20 items-center gap-3 rounded-2xl border border-zinc-800 bg-[#10151C] p-3.5 text-left transition hover:border-[#C9A227]/40 hover:bg-white/[0.03] sm:p-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C9A227]/10 text-[#C9A227]"><Icon name="calendar" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">Dia de folga</span>
            <span className="mt-0.5 block truncate text-xs text-zinc-500">{nomeDiaFolga ? `Fechado ${nomeDiaFolga}` : "Defina o dia sem atendimento"}</span>
          </span>
          <span className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-[#C9A227]" aria-hidden="true">›</span>
        </button>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-white">Sessão</h2>
          <p className="mt-1 text-xs text-zinc-500">Encerre o acesso ao painel desta barbearia.</p>
        </div>
        <button
          type="button"
          onClick={() => void sair()}
          disabled={saindo}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50 sm:self-auto"
        >
          <Icon name="logout" className="h-4 w-4" />
          {saindo ? "Saindo..." : "Sair da conta"}
        </button>
      </section>

      {modalConfiguracao === "perfil" && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalConfiguracao(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-modal-perfil" className="settings-page max-h-[92dvh] w-full max-w-4xl space-y-5 overflow-y-auto rounded-t-2xl border border-zinc-800 bg-[#10151C] p-4 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A227]/10 text-xl text-[#C9A227]">
            <Icon name="scissors" />
          </div>

          <div>
            <p className="text-sm text-zinc-500">
              Barbearia
            </p>

            <p id="titulo-modal-perfil" className="mt-1 font-medium text-white">Perfil público da barbearia</p>
          </div>
          </div>
          <button type="button" aria-label="Fechar configurações do perfil" onClick={() => setModalConfiguracao(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-xl text-zinc-400 hover:bg-white/5 hover:text-white">×</button>
        </div>
        {erro && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{erro}</p>}
        {mensagem && <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">{mensagem}</p>}
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
          <div className="flex justify-end border-t border-zinc-800 pt-4">
            <button type="button" onClick={() => void salvarConfiguracoes()} disabled={salvando} className="min-h-10 rounded-xl bg-[#C9A227] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#E0BB35] disabled:opacity-50">
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </>}
      </section>
      </div>}

      {imagemParaRemover && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !salvando) setImagemParaRemover(null); }}>
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
      {modalConfiguracao === "equipe" && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalConfiguracao(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-modal-equipe" className="settings-page max-h-[92dvh] w-full max-w-4xl space-y-5 overflow-y-auto rounded-t-2xl border border-zinc-800 bg-[#10151C] p-4 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
          <h2 id="titulo-modal-equipe" className="text-lg font-semibold text-white">Barbeiros</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Cadastre a equipe e configure o expediente de cada profissional. Os horários reservados para um barbeiro não bloqueiam a agenda dos outros.
          </p>
          </div>
          <button type="button" aria-label="Fechar configurações da equipe" onClick={() => setModalConfiguracao(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-xl text-zinc-400 hover:bg-white/5 hover:text-white">×</button>
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
                {!barbeiro.ativo && (
                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-200">
                    Barbeiro desativado para novos agendamentos. Ele ficará nesta lista enquanto houver agendamentos futuros vinculados; quando não houver mais nenhum, sairá daqui. O histórico continuará salvo.
                  </p>
                )}
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

                <div className="flex justify-between gap-2 border-t border-zinc-800 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBarbeiroParaRemover(barbeiro);
                      setConfirmacaoRemocaoBarbeiroMarcada(false);
                      setErroRemocaoBarbeiro("");
                    }}
                    disabled={salvandoBarbeiro !== null || removendoBarbeiro}
                    className="min-h-9 rounded-lg border border-red-500/25 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Remover barbeiro
                  </button>
                  <button
                    type="button"
                    onClick={() => salvarBarbeiro(barbeiro)}
                    disabled={salvandoBarbeiro !== null || !barbeiro.nome.trim()}
                    className="min-h-9 rounded-lg border border-[#C9A227]/40 px-3 py-1.5 text-xs font-semibold text-[#E0BB35] transition hover:bg-[#C9A227]/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvandoBarbeiro === barbeiro.id ? "Salvando..." : "Salvar barbeiro"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      </div>}

      {/* DIA DE FOLGA */}
      {modalConfiguracao === "folga" && <div className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalConfiguracao(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-modal-folga" className="settings-page max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-zinc-800 bg-[#10151C] p-4 shadow-2xl sm:rounded-2xl sm:p-6">

        <div className="flex items-start justify-between gap-3">
          <div>
          <h2 id="titulo-modal-folga" className="text-lg font-semibold text-white">
            Dia de folga
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Escolha o dia da semana em que a barbearia
            normalmente não realiza atendimentos.
          </p>
          </div>
          <button type="button" aria-label="Fechar configuração do dia de folga" onClick={() => setModalConfiguracao(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-xl text-zinc-400 hover:bg-white/5 hover:text-white">×</button>
        </div>

        {erro && <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{erro}</p>}
        {mensagem && <p role="status" className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">{mensagem}</p>}

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
            onClick={() => setConfirmarAlteracaoFolga(true)}
            disabled={
              salvando || diaFolga === null || diaFolga === diaFolgaSalvo
            }
            className="rounded-xl bg-[#C9A227] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar dia de folga
          </button>
        </div>

      </section>
      </div>}

      {confirmarAlteracaoFolga && diaFolga !== null && <div className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !salvando) setConfirmarAlteracaoFolga(false); }}>
        <section role="alertdialog" aria-modal="true" aria-labelledby="titulo-confirmar-folga" aria-describedby="descricao-confirmar-folga" className="my-auto w-full max-w-md rounded-t-2xl border border-[#C9A227]/30 bg-[#10151C] p-5 text-white shadow-2xl sm:rounded-2xl sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C9A227]/10 text-[#C9A227]"><Icon name="calendar" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C9A227]">Confirmação</p>
              <h2 id="titulo-confirmar-folga" className="mt-1 text-lg font-bold">Alterar dia de folga?</h2>
            </div>
          </div>
          <p id="descricao-confirmar-folga" className="mt-4 text-sm leading-6 text-zinc-300">
            Confirma o dia de folga da barbearia para <strong className="text-white">{nomeDiaFolga}</strong>? A partir da alteração, nenhum cliente poderá agendar serviços nesse dia da semana.
          </p>
          {erro && <p role="alert" className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-5 text-red-300">{erro}</p>}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" disabled={salvando} onClick={() => setConfirmarAlteracaoFolga(false)} className="min-h-11 rounded-xl border border-white/10 px-3 text-sm font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-50">Voltar</button>
            <button type="button" disabled={salvando} onClick={() => void confirmarSalvarDiaFolga()} className="min-h-11 rounded-xl bg-[#C9A227] px-3 text-sm font-semibold text-black hover:bg-[#E0BB35] disabled:cursor-wait disabled:opacity-60">{salvando ? "Salvando..." : "Confirmar alteração"}</button>
          </div>
        </section>
      </div>}

      {barbeiroParaRemover && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !removendoBarbeiro) { setBarbeiroParaRemover(null); setConfirmacaoRemocaoBarbeiroMarcada(false); } }}>
        <section role="alertdialog" aria-modal="true" aria-labelledby="titulo-remover-barbeiro" aria-describedby="descricao-remover-barbeiro" className="my-auto w-full max-w-md rounded-t-2xl border border-red-500/25 bg-[#10151C] p-5 text-white shadow-2xl sm:rounded-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-300">Equipe</p>
              <h2 id="titulo-remover-barbeiro" className="mt-1 text-lg font-bold">Remover {barbeiroParaRemover.nome}?</h2>
            </div>
            <button type="button" aria-label="Fechar confirmação" disabled={removendoBarbeiro} onClick={() => { setBarbeiroParaRemover(null); setConfirmacaoRemocaoBarbeiroMarcada(false); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-lg text-zinc-400 hover:bg-white/5 disabled:opacity-50">×</button>
          </div>
          <p id="descricao-remover-barbeiro" className="mt-3 text-sm leading-6 text-zinc-400">
            Se houver agendamentos vinculados, o profissional será desativado e o histórico será preservado. Sem agendamentos, ele será excluído.
          </p>
          {erroRemocaoBarbeiro && <p role="alert" className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs leading-5 text-red-300">{erroRemocaoBarbeiro}</p>}
          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 p-3 text-xs leading-5 text-zinc-300">
            <input type="checkbox" checked={confirmacaoRemocaoBarbeiroMarcada} disabled={removendoBarbeiro} onChange={(event) => setConfirmacaoRemocaoBarbeiroMarcada(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#C9A227]" />
            <span>Confirmo que quero remover este barbeiro da equipe.</span>
          </label>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" disabled={removendoBarbeiro} onClick={() => { setBarbeiroParaRemover(null); setConfirmacaoRemocaoBarbeiroMarcada(false); }} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-50">Manter barbeiro</button>
            <button type="button" disabled={!confirmacaoRemocaoBarbeiroMarcada || removendoBarbeiro} onClick={() => void removerBarbeiro()} className="min-h-10 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40">{removendoBarbeiro ? "Removendo..." : "Confirmar remoção"}</button>
          </div>
        </section>
      </div>}
    </div>
  );
}
