
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

interface Servico {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  duracao: number;
  ativo: boolean;
  barbearia_id: string | null;
}

const supabase = createClient();

export default function ServicosPage() {
  const [barbeariaId, setBarbeariaId] = useState<string | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [duracao, setDuracao] = useState("30");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const carregarServicos = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("servicos")
      .select("id, nome, descricao, preco, duracao, ativo, barbearia_id")
      .eq("barbearia_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      setErro("Não foi possível carregar os serviços.");
      return;
    }

    setServicos((data ?? []) as Servico[]);
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

  if (carregando) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[#C9A227]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">
          Gestão da barbearia
        </p>
        <h2 className="mt-2 text-3xl font-black">Meus serviços</h2>
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
        className="space-y-5 rounded-2xl border border-white/10 bg-[#090D12] p-5 sm:p-7"
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
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}