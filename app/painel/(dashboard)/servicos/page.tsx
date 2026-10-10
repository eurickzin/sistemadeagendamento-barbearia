
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/ui/Icon";

interface Servico {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  duracao: number;
  ativo: boolean;
  barbearia_id: string | null;
  excluido_em: string | null;
}

const supabase = createClient();

export default function ServicosPage() {
  const [barbeariaId, setBarbeariaId] = useState<string | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicosArquivados, setServicosArquivados] = useState<Servico[]>([]);
  const [lixeiraAberta, setLixeiraAberta] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [duracao, setDuracao] = useState("30");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [servicoParaExcluir, setServicoParaExcluir] = useState<Servico | null>(null);
  const [confirmacaoExclusaoMarcada, setConfirmacaoExclusaoMarcada] = useState(false);
  const [excluindoServico, setExcluindoServico] = useState(false);
  const [erroExclusao, setErroExclusao] = useState("");
  const [confirmarEsvaziarLixeira, setConfirmarEsvaziarLixeira] = useState(false);
  const [esvaziandoLixeira, setEsvaziandoLixeira] = useState(false);
  const [confirmacaoLixeiraMarcada, setConfirmacaoLixeiraMarcada] = useState(false);

  const carregarServicos = useCallback(async (id: string) => {
    const [ativos, arquivados] = await Promise.all([
      supabase
        .from("servicos")
        .select("id, nome, descricao, preco, duracao, ativo, barbearia_id, excluido_em")
        .eq("barbearia_id", id)
        .is("excluido_em", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("servicos")
        .select("id, nome, descricao, preco, duracao, ativo, barbearia_id, excluido_em")
        .eq("barbearia_id", id)
        .not("excluido_em", "is", null)
        .order("excluido_em", { ascending: false }),
    ]);

    if (ativos.error || arquivados.error) {
      setErro("Não foi possível carregar os serviços.");
      return;
    }

    setServicos((ativos.data ?? []) as Servico[]);
    setServicosArquivados((arquivados.data ?? []) as Servico[]);
  }, []);

  useEffect(() => {
    async function iniciar() {
      const {
        data: { user },
        error: erroAuth,
      } = await supabase.auth.getUser();

      if (erroAuth || !user) {
        window.location.replace("/painel/login");
        return;
      }

      const { data: barbearia, error: erroBarbearia } = await supabase
        .from("barbearias")
        .select("id")
        .eq("proprietario_id", user.id)
        .maybeSingle();

      if (erroBarbearia || !barbearia) {
        setErro("Não foi possível localizar sua barbearia.");
        setCarregando(false);
        return;
      }

      setBarbeariaId(barbearia.id);
      await carregarServicos(barbearia.id);
      setCarregando(false);
    }

    iniciar();
  }, [carregarServicos]);

  function limparFormulario() {
    setNome("");
    setDescricao("");
    setPreco("");
    setDuracao("30");
    setEditandoId(null);
    setMensagem("");
    setErro("");
  }

  function editarServico(servico: Servico) {
    setEditandoId(servico.id);
    setNome(servico.nome);
    setDescricao(servico.descricao ?? "");
    setPreco(String(servico.preco));
    setDuracao(String(servico.duracao));
    setMensagem("");
    setErro("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarServico(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setMensagem("");

    if (!barbeariaId) {
      setErro("Sua barbearia não foi encontrada.");
      return;
    }

    const precoNumerico = Number(preco);
    const duracaoNumerica = Number(duracao);

    if (!nome.trim()) {
      setErro("Informe o nome do serviço.");
      return;
    }

    if (!Number.isFinite(precoNumerico) || precoNumerico <= 0) {
      setErro("Informe um preço válido maior que zero.");
      return;
    }

    if (!Number.isInteger(duracaoNumerica) || duracaoNumerica <= 0) {
      setErro("Informe uma duração válida em minutos.");
      return;
    }

    setSalvando(true);

    const dados = {
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      preco: precoNumerico,
      duracao: duracaoNumerica,
    };

    const resultado = editandoId !== null
      ? await supabase
          .from("servicos")
          .update(dados)
          .eq("id", editandoId)
          .eq("barbearia_id", barbeariaId)
      : await supabase
          .from("servicos")
          .insert({
            ...dados,
            ativo: true,
            barbearia_id: barbeariaId,
          });

    if (resultado.error) {
      console.error("Erro ao salvar serviço:", resultado.error);
      setErro(
        "Não foi possível salvar o serviço. Confira sua conexão e as permissões do banco."
      );
      setSalvando(false);
      return;
    }

    limparFormulario();
    await carregarServicos(barbeariaId);
    setMensagem(
      editandoId !== null
        ? "Serviço atualizado com sucesso!"
        : "Serviço cadastrado com sucesso!"
    );
    setSalvando(false);
  }

  async function alternarAtivo(servico: Servico) {
    if (!barbeariaId) return;

    setErro("");
    setMensagem("");

    const { error } = await supabase
      .from("servicos")
      .update({ ativo: !servico.ativo })
      .eq("id", servico.id)
      .eq("barbearia_id", barbeariaId);

    if (error) {
      console.error("Erro ao alterar serviço:", error);
      setErro("Não foi possível alterar o status do serviço.");
      return;
    }

    await carregarServicos(barbeariaId);
    setMensagem(
      servico.ativo
        ? "Serviço desativado. Ele não deverá aparecer para os clientes."
        : "Serviço ativado com sucesso!"
    );
  }

  function abrirConfirmacaoExclusao(servico: Servico) {
    setServicoParaExcluir(servico);
    setConfirmacaoExclusaoMarcada(false);
    setErroExclusao("");
  }

  async function excluirServico() {
    if (!barbeariaId || !servicoParaExcluir || !confirmacaoExclusaoMarcada) return;

    setExcluindoServico(true);
    setErroExclusao("");

    const { data: servicoExcluido, error } = await supabase
      .from("servicos")
      .update({ ativo: false, excluido_em: new Date().toISOString() })
      .eq("id", servicoParaExcluir.id)
      .eq("barbearia_id", barbeariaId)
      .select("id")
      .maybeSingle();

    if (error || !servicoExcluido) {
      console.error("Erro ao arquivar serviço:", JSON.stringify({
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      }));
      setErroExclusao(
        error
          ? "Não foi possível remover o serviço. Confira as permissões do banco e tente novamente."
          : "O banco não confirmou a remoção. Execute supabase/servicos-permissoes.sql no SQL Editor do Supabase e tente novamente."
      );
      setExcluindoServico(false);
      return;
    }

    const nomeExcluido = servicoParaExcluir.nome;
    setServicos((atuais) => atuais.filter((servico) => servico.id !== servicoParaExcluir.id));
    if (editandoId === servicoParaExcluir.id) limparFormulario();
    setServicoParaExcluir(null);
    setConfirmacaoExclusaoMarcada(false);
    setMensagem(`Serviço "${nomeExcluido}" removido dos serviços disponíveis. Os agendamentos anteriores foram preservados.`);
    setExcluindoServico(false);
  }

  function fecharConfirmacaoExclusao() {
    if (excluindoServico) return;
    setServicoParaExcluir(null);
    setConfirmacaoExclusaoMarcada(false);
    setErroExclusao("");
  }

  async function restaurarServico(servico: Servico) {
    if (!barbeariaId) return;
    const { data, error } = await supabase
      .from("servicos")
      .update({ excluido_em: null, ativo: false })
      .eq("id", servico.id)
      .eq("barbearia_id", barbeariaId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      setErro("Não foi possível restaurar o serviço. Confira as permissões do Supabase.");
      return;
    }
    await carregarServicos(barbeariaId);
    setMensagem(`Serviço "${servico.nome}" restaurado como inativo. Ative-o quando quiser disponibilizá-lo.`);
  }

  async function esvaziarLixeira() {
    if (!barbeariaId || !confirmacaoLixeiraMarcada || !servicosArquivados.length) return;
    setEsvaziandoLixeira(true);
    setErro("");
    const { data, error } = await supabase
      .from("servicos")
      .delete()
      .eq("barbearia_id", barbeariaId)
      .not("excluido_em", "is", null)
      .select("id");

    if (error) {
      console.error("Erro ao esvaziar lixeira:", error.message, error.code);
      setErro("Não foi possível esvaziar a lixeira. Execute a versão atualizada de supabase/servicos-permissoes.sql no Supabase.");
      setEsvaziandoLixeira(false);
      return;
    }

    if ((data?.length ?? 0) !== servicosArquivados.length) {
      await carregarServicos(barbeariaId);
      setErro("Nem todos os serviços foram removidos. Confira as permissões e tente novamente.");
      setEsvaziandoLixeira(false);
      return;
    }

    setServicosArquivados([]);
    setConfirmarEsvaziarLixeira(false);
    setConfirmacaoLixeiraMarcada(false);
    setMensagem(`${data?.length ?? 0} serviço(s) removido(s) permanentemente. Os dados dos agendamentos anteriores foram preservados.`);
    setEsvaziandoLixeira(false);
  }

  if (carregando) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[#C9A227]" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6 sm:space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">
          Gestão da barbearia
        </p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">Meus serviços</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Cadastre os serviços que seus clientes poderão agendar.
        </p>
      </div>

      {erro && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {erro}
        </div>
      )}

      {mensagem && (
        <div
          role="status"
          className="rounded-xl border border-[#C9A227]/30 bg-[#C9A227]/10 p-4 text-sm text-[#E0BB35]"
        >
          {mensagem}
        </div>
      )}

      <form
        onSubmit={salvarServico}
        className="space-y-5 border border-white/10 bg-[#090D12] p-4 sm:p-7"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold">
            {editandoId !== null ? "Editar serviço" : "Cadastrar serviço"}
          </h3>

          {editandoId !== null && (
            <button
              type="button"
              onClick={limparFormulario}
              className="text-sm text-zinc-400 hover:text-white"
            >
              Cancelar edição
            </button>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 text-sm sm:col-span-2">
            <span className="text-zinc-300">Nome do serviço *</span>
            <input
              required
              maxLength={100}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Corte masculino"
              className="w-full rounded-xl border border-white/10 bg-[#0B0F14] px-4 py-3 text-white outline-none focus:border-[#C9A227]"
            />
          </label>

          <label className="space-y-2 text-sm sm:col-span-2">
            <span className="text-zinc-300">Descrição</span>
            <textarea
              rows={3}
              maxLength={500}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o serviço (opcional)"
              className="w-full resize-y rounded-xl border border-white/10 bg-[#0B0F14] px-4 py-3 text-white outline-none focus:border-[#C9A227]"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-zinc-300">Preço (R$) *</span>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              placeholder="35,00"
              className="w-full rounded-xl border border-white/10 bg-[#0B0F14] px-4 py-3 text-white outline-none focus:border-[#C9A227]"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-zinc-300">Duração (minutos) *</span>
            <input
              required
              type="number"
              min="1"
              step="1"
              value={duracao}
              onChange={(e) => setDuracao(e.target.value)}
              placeholder="40"
              className="w-full rounded-xl border border-white/10 bg-[#0B0F14] px-4 py-3 text-white outline-none focus:border-[#C9A227]"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={salvando || !barbeariaId}
          className="w-full rounded-xl bg-[#C9A227] px-5 py-3 font-bold text-[#0B0F14] transition hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {salvando
            ? "Salvando..."
            : editandoId !== null
              ? "Salvar alterações"
              : "Cadastrar serviço"}
        </button>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Serviços cadastrados</h3>
          <span className="text-sm text-zinc-500">
            {servicos.length} {servicos.length === 1 ? "serviço" : "serviços"}
          </span>
        </div>

        {servicos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
            <p className="font-semibold">Nenhum serviço cadastrado ainda</p>
            <p className="mt-2 text-sm text-zinc-400">
              Use o formulário acima para adicionar seu primeiro serviço.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {servicos.map((servico) => (
              <article
                key={servico.id}
                className="rounded-2xl border border-white/10 bg-[#090D12] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="break-words font-bold">{servico.nome}</h4>
                    <p className="mt-2 text-2xl font-black text-[#C9A227]">
                      {Number(servico.preco).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      servico.ativo
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-zinc-700/40 text-zinc-400"
                    }`}
                  >
                    {servico.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>

                {servico.descricao && (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm text-zinc-400">
                    {servico.descricao}
                  </p>
                )}

                <p className="mt-3 text-sm text-zinc-400">
                  Duração: {servico.duracao} minutos
                </p>

                <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => editarServico(servico)}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold hover:border-[#C9A227] hover:text-[#C9A227]"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => alternarAtivo(servico)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      servico.ativo
                        ? "border border-red-500/30 text-red-300 hover:bg-red-500/10"
                        : "border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                    }`}
                  >
                    {servico.ativo ? "Desativar" : "Ativar"}
                  </button>

                  <button
                    type="button"
                    onClick={() => abrirConfirmacaoExclusao(servico)}
                    className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#10151C] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button type="button" onClick={() => setLixeiraAberta((aberta) => !aberta)} className="flex items-center gap-2 text-left text-lg font-bold text-white">
              <Icon name="alert" className="h-5 w-5 text-zinc-400" />
              Lixeira
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-zinc-300">{servicosArquivados.length}</span>
              <span className="text-sm text-zinc-500">{lixeiraAberta ? "Recolher" : "Abrir"}</span>
            </button>
            <p className="mt-1 text-sm text-zinc-400">Serviços removidos ficam aqui até serem restaurados ou apagados permanentemente.</p>
          </div>
          {servicosArquivados.length > 0 && <button type="button" onClick={() => { setConfirmacaoLixeiraMarcada(false); setConfirmarEsvaziarLixeira(true); }} className="border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10">Esvaziar lixeira</button>}
        </div>

        {lixeiraAberta && <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
          {servicosArquivados.length === 0 ? <p className="text-sm text-zinc-500">A lixeira está vazia.</p> : servicosArquivados.map((servico) => <article key={servico.id} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-black/20 p-4">
            <div>
              <p className="font-semibold text-white">{servico.nome}</p>
              <p className="mt-1 text-sm text-zinc-400">{Number(servico.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · {servico.duracao} min{servico.excluido_em ? ` · Arquivado em ${new Date(servico.excluido_em).toLocaleDateString("pt-BR")}` : ""}</p>
            </div>
            <button type="button" onClick={() => void restaurarServico(servico)} className="border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/5">Restaurar</button>
          </article>)}
        </div>}
      </section>

      {servicoParaExcluir && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={fecharConfirmacaoExclusao}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-exclusao-servico"
            aria-describedby="descricao-confirmar-exclusao-servico"
            className="my-auto w-full max-w-md border border-red-500/30 bg-[#0B0F14] p-5 text-white shadow-2xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start gap-4 border-b border-white/10 pb-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-red-500/30 bg-red-500/10 text-red-300">
                <Icon name="alert" className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A227]">
                  Serviços da barbearia
                </p>
                <h2 id="titulo-confirmar-exclusao-servico" className="mt-1 text-xl font-bold">
                  Tem certeza que deseja excluir este serviço?
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fechar confirmação de exclusão"
                disabled={excluindoServico}
                onClick={fecharConfirmacaoExclusao}
                className="min-h-11 min-w-11 border border-white/10 text-xl text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <p id="descricao-confirmar-exclusao-servico" className="text-sm leading-6 text-zinc-400">
              O serviço deixará de aparecer para novos agendamentos. Os agendamentos anteriores e seus dados serão preservados.
            </p>

            <div className="mt-5 border border-white/10 bg-white/[0.03] p-4">
              <p className="font-semibold text-white">{servicoParaExcluir.nome}</p>
              <p className="mt-1 text-sm text-zinc-400">
                {Number(servicoParaExcluir.preco).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })} · {servicoParaExcluir.duracao} minutos
              </p>
            </div>

            {erroExclusao && (
              <p role="alert" className="mt-4 border border-red-500/20 bg-red-500/10 p-3 text-sm leading-5 text-red-300">
                {erroExclusao}
              </p>
            )}

            <label className="mt-5 flex cursor-pointer items-start gap-3 border border-white/10 p-4 text-sm leading-5 text-zinc-200">
              <input
                type="checkbox"
                checked={confirmacaoExclusaoMarcada}
                disabled={excluindoServico}
                onChange={(event) => setConfirmacaoExclusaoMarcada(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#C9A227]"
              />
              <span>Confirmo que quero excluir este serviço.</span>
            </label>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={excluindoServico}
                onClick={fecharConfirmacaoExclusao}
                className="min-h-12 border border-white/15 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={!confirmacaoExclusaoMarcada || excluindoServico}
                onClick={() => void excluirServico()}
                className="min-h-12 bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {excluindoServico ? "Excluindo..." : "Excluir serviço"}
              </button>
            </div>
          </section>
        </div>
      )}

      {confirmarEsvaziarLixeira && <div className="fixed inset-0 z-[110] flex items-end justify-center overflow-y-auto bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !esvaziandoLixeira && setConfirmarEsvaziarLixeira(false)}>
        <section role="alertdialog" aria-modal="true" aria-labelledby="titulo-esvaziar-lixeira" className="my-auto w-full max-w-md border border-red-500/30 bg-[#0B0F14] p-5 text-white shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()}>
          <h2 id="titulo-esvaziar-lixeira" className="text-xl font-bold">Esvaziar a lixeira?</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Os serviços arquivados serão apagados permanentemente. Os dados dos agendamentos anteriores continuarão salvos.</p>
          <label className="mt-5 flex cursor-pointer items-start gap-3 border border-white/10 p-4 text-sm leading-5 text-zinc-200">
            <input type="checkbox" checked={confirmacaoLixeiraMarcada} disabled={esvaziandoLixeira} onChange={(event) => setConfirmacaoLixeiraMarcada(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#C9A227]" />
            <span>Confirmo que quero apagar permanentemente os serviços da lixeira.</span>
          </label>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" disabled={esvaziandoLixeira} onClick={() => setConfirmarEsvaziarLixeira(false)} className="min-h-12 border border-white/15 px-4 py-3 text-sm font-semibold text-zinc-300 disabled:opacity-50">Cancelar</button>
            <button type="button" disabled={!confirmacaoLixeiraMarcada || esvaziandoLixeira} onClick={() => void esvaziarLixeira()} className="min-h-12 bg-red-500 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{esvaziandoLixeira ? "Esvaziando..." : "Esvaziar lixeira"}</button>
          </div>
        </section>
      </div>}
    </div>
  );
}
