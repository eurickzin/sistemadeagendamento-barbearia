"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AgendamentoModal from "@/components/booking/AgendamentoModal";
import BarbeariaPickerModal, { type BarbeariaParaAgendar } from "@/components/booking/BarbeariaPickerModal";
import Icon from "@/components/ui/Icon";
import { uploadProfileImage } from "@/lib/profile-images";

interface Agendamento {
  id: number;
  data: string;
  horario: string;
  status: string;
  servico_id: number;
  servico: {
    nome: string;
    descricao: string | null;
    preco: number;
    duracao: number;
  } | null;
}

interface BarbeariaFavorita {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
}

export default function MinhaContaPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [perfilSalvando, setPerfilSalvando] = useState(false);
  const [perfilMensagem, setPerfilMensagem] = useState("");
  const [perfilErro, setPerfilErro] = useState("");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [agendamentoAberto, setAgendamentoAberto] = useState(false);
  const [cancelando, setCancelando] = useState<number | null>(null);
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState<Agendamento | null>(null);
  const [cancelamentoConfirmado, setCancelamentoConfirmado] = useState(false);
  const [erroCancelamento, setErroCancelamento] = useState("");
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [campoPerfilEditando, setCampoPerfilEditando] = useState<"nome" | "telefone" | null>(null);
  const [valorOriginalEdicao, setValorOriginalEdicao] = useState("");
  const [seletorBarbeariaAberto, setSeletorBarbeariaAberto] = useState(false);
  const [barbeariaSelecionada, setBarbeariaSelecionada] = useState<BarbeariaParaAgendar | null>(null);
  const [barbeariasFavoritas, setBarbeariasFavoritas] = useState<BarbeariaFavorita[]>([]);

  // =========================
  // CARREGAR DADOS
  // =========================

  async function carregarDados() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/");
      return;
    }

    setEmail(user.email ?? "");

    const nomeUsuario =
      user.user_metadata?.nome || user.user_metadata?.name || "";

    setNome(nomeUsuario);
    setTelefone(user.user_metadata?.telefone ?? "");
    setAvatarUrl(user.user_metadata?.avatar_url ?? "");
    const favoritasSalvas = user.user_metadata?.barbearias_favoritas;
    setBarbeariasFavoritas(
      Array.isArray(favoritasSalvas)
        ? favoritasSalvas.filter(
            (favorita): favorita is BarbeariaFavorita =>
              typeof favorita?.id === "string" &&
              typeof favorita?.nome === "string" &&
              typeof favorita?.slug === "string",
          )
        : [],
    );

    const { data, error } = await supabase
      .from("agendamentos")
      .select(
        `
        id,
        data,
        horario,
        status,
        servico_id,
        servico:servicos (
          nome,
          descricao,
          preco,
          duracao
        )
      `,
      )
      .eq("usuario_id", user.id)
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error("ERRO AO CARREGAR AGENDAMENTOS:", error);

      setAgendamentos([]);
    } else {
      setAgendamentos((data as unknown as Agendamento[]) ?? []);
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function salvarPerfil() {
    const supabase = createClient();
    setPerfilSalvando(true);
    setPerfilErro("");
    setPerfilMensagem("");
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Faça login novamente para editar seu perfil.");
      const { error: profileError } = await supabase.from("profiles").upsert(
        { id: user.id, nome: nome.trim(), telefone: telefone.trim() },
        { onConflict: "id" },
      );
      if (profileError) throw new Error("Não foi possível atualizar seu perfil. Confira as permissões do Supabase.");
      const { error } = await supabase.auth.updateUser({
        data: {
          nome: nome.trim(),
          telefone: telefone.trim(),
          avatar_url: avatarUrl,
          barbearias_favoritas: barbeariasFavoritas,
        },
      });
      if (error) throw new Error("Não foi possível salvar os dados da conta.");
      setPerfilMensagem("Perfil atualizado com sucesso.");
      setCampoPerfilEditando(null);
    } catch (saveError) {
      setPerfilErro(saveError instanceof Error ? saveError.message : "Erro ao salvar perfil.");
    } finally {
      setPerfilSalvando(false);
    }
  }

  function iniciarEdicaoPerfil(campo: "nome" | "telefone") {
    setPerfilErro("");
    setPerfilMensagem("");
    setValorOriginalEdicao(campo === "nome" ? nome : telefone);
    setCampoPerfilEditando(campo);
  }

  function cancelarEdicaoPerfil() {
    if (campoPerfilEditando === "nome") setNome(valorOriginalEdicao);
    if (campoPerfilEditando === "telefone") setTelefone(valorOriginalEdicao);
    setCampoPerfilEditando(null);
  }

  async function enviarAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPerfilErro("");
    try {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) throw new Error("Faça login novamente para enviar sua foto.");
      setAvatarUrl(await uploadProfileImage(file, user.id, "avatar"));
    } catch (uploadError) {
      setPerfilErro(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar a foto.");
    }
  }

  // =========================
  // RECARREGAR AGENDAMENTOS
  // =========================

  async function recarregarAgendamentos() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("agendamentos")
      .select(
        `
        id,
        data,
        horario,
        status,
        servico_id,
        servico:servicos (
          nome,
          descricao,
          preco,
          duracao
        )
      `,
      )
      .eq("usuario_id", user.id)
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error("ERRO AO RECARREGAR AGENDAMENTOS:", error);

      return;
    }

    setAgendamentos((data as unknown as Agendamento[]) ?? []);
  }

  async function concluirAgendamento() {
    await recarregarAgendamentos();
    if (!barbeariaSelecionada) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const favoritasSalvas = user.user_metadata?.barbearias_favoritas;
    const favoritasAtuais: BarbeariaFavorita[] = Array.isArray(favoritasSalvas)
      ? favoritasSalvas.filter(
          (favorita): favorita is BarbeariaFavorita =>
            typeof favorita?.id === "string" &&
            typeof favorita?.nome === "string" &&
            typeof favorita?.slug === "string",
        )
      : [];
    const novasFavoritas = [
      barbeariaSelecionada,
      ...favoritasAtuais.filter((favorita) => favorita.id !== barbeariaSelecionada.id),
    ];

    const { error } = await supabase.auth.updateUser({
      data: { barbearias_favoritas: novasFavoritas },
    });
    if (error) {
      console.error("Não foi possível salvar a barbearia favorita:", error);
      setPerfilErro("Agendamento confirmado, mas não foi possível salvar a barbearia favorita.");
      return;
    }

    setBarbeariasFavoritas(novasFavoritas);
  }

  // =========================
  // LOGOUT
  // =========================

  async function sair() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.push("/");
    router.refresh();
  }

  // =========================
  // FORMATAR DATA
  // =========================

  function formatarData(data: string) {
    const [ano, mes, dia] = data.split("-").map(Number);

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(ano, mes - 1, dia));
  }

  // =========================
  // FORMATAR DATA COMPLETA
  // =========================

  function formatarDataCompleta(data: string) {
    const [ano, mes, dia] = data.split("-").map(Number);

    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }).format(new Date(ano, mes - 1, dia));
  }

  // =========================
  // FORMATAR HORÁRIO
  // =========================

  function formatarHorario(horario: string) {
    return horario.slice(0, 5);
  }

  // =========================
  // FORMATAR PREÇO
  // =========================

  function formatarPreco(preco: number) {
    return Number(preco).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  // =========================
  // DATA/HORA DO AGENDAMENTO
  // =========================

  function obterDataHoraAgendamento(agendamento: Agendamento) {
    const [ano, mes, dia] = agendamento.data.split("-").map(Number);

    const [hora, minuto] = agendamento.horario.split(":").map(Number);

    return new Date(ano, mes - 1, dia, hora, minuto);
  }

  // =========================
  // PODE CANCELAR?
  // =========================

  function podeCancelar(agendamento: Agendamento) {
    if (agendamento.status !== "confirmado") {
      return false;
    }

    const agora = new Date();

    const horarioAgendamento = obterDataHoraAgendamento(agendamento);

    const duasHorasAntes = horarioAgendamento.getTime() - 2 * 60 * 60 * 1000;

    return agora.getTime() < duasHorasAntes;
  }

  // =========================
  // CANCELAR AGENDAMENTO
  // =========================

  function abrirConfirmacaoCancelamento(agendamento: Agendamento) {
    setAgendamentoParaCancelar(agendamento);
    setCancelamentoConfirmado(false);
    setErroCancelamento("");
  }

  function fecharConfirmacaoCancelamento() {
    if (cancelando !== null) return;
    setAgendamentoParaCancelar(null);
    setCancelamentoConfirmado(false);
    setErroCancelamento("");
  }

  async function confirmarCancelamento() {
    const agendamento = agendamentoParaCancelar;
    if (!agendamento || !cancelamentoConfirmado || cancelando !== null) {
      return;
    }

    if (!podeCancelar(agendamento)) {
      setErroCancelamento("O prazo para cancelar terminou. O cancelamento só pode ser feito até 2 horas antes do horário.");
      return;
    }

    setCancelando(agendamento.id);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCancelando(null);
      return;
    }

    const { error } = await supabase
      .from("agendamentos")
      .update({
        status: "cancelado",
      })
      .eq("id", agendamento.id)
      .eq("usuario_id", user.id)
      .eq("status", "confirmado");

    if (error) {
      console.error("ERRO AO CANCELAR AGENDAMENTO:", error);

      alert("Não foi possível cancelar o agendamento. Tente novamente.");

      setCancelando(null);
      return;
    }

    await recarregarAgendamentos();

    setCancelando(null);
    setAgendamentoParaCancelar(null);
    setCancelamentoConfirmado(false);
  }

  // =========================
  // STATUS
  // =========================

  function statusLabel(status: string) {
    switch (status) {
      case "confirmado":
        return "Confirmado";

      case "concluido":
        return "Concluído";

      case "cancelado":
        return "Cancelado";

      case "pendente":
        return "Pendente";

      default:
        return status;
    }
  }

  function statusClasse(status: string) {
    switch (status) {
      case "confirmado":
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";

      case "concluido":
        return "border-blue-500/20 bg-blue-500/10 text-blue-400";

      case "cancelado":
        return "border-red-500/20 bg-red-500/10 text-red-400";

      case "pendente":
        return "border-yellow-500/20 bg-yellow-500/10 text-yellow-400";

      default:
        return "border-white/10 bg-white/5 text-zinc-400";
    }
  }

  // =========================
  // AGENDAMENTOS
  // =========================

  const agendamentosAtivos = agendamentos.filter(
    (agendamento) =>
      agendamento.status !== "cancelado" && agendamento.status !== "concluido",
  );

  const historico = agendamentos.filter(
    (agendamento) =>
      agendamento.status === "cancelado" || agendamento.status === "concluido",
  );

  // =========================
  // PRÓXIMO AGENDAMENTO
  // =========================

  const agora = new Date();

  const proximosAgendamentos = agendamentosAtivos
    .filter((agendamento) => obterDataHoraAgendamento(agendamento) >= agora)
    .sort(
      (a, b) =>
        obterDataHoraAgendamento(a).getTime() -
        obterDataHoraAgendamento(b).getTime(),
    );

  const proximoAgendamento = proximosAgendamentos[0] ?? null;

  // =========================
  // ESTATÍSTICAS
  // =========================

  const totalAgendamentos = agendamentos.length;

  const totalConcluidos = agendamentos.filter(
    (agendamento) => agendamento.status === "concluido",
  ).length;

  // =========================
  // LOADING
  // =========================

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#0B0F14] px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 w-64 rounded bg-white/5" />

            <div className="mt-3 h-4 w-80 rounded bg-white/5" />

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="h-28 rounded-2xl bg-white/5" />
              <div className="h-28 rounded-2xl bg-white/5" />
              <div className="h-28 rounded-2xl bg-white/5" />
            </div>

            <div className="mt-8 h-64 rounded-2xl bg-white/5" />

            <div className="mt-8 h-48 rounded-2xl bg-white/5" />
          </div>
        </div>
      </main>
    );
  }

  // =========================
  // PÁGINA
  // =========================

  return (
    <main className="min-h-screen bg-[#0B0F14] px-4 py-5 text-white sm:px-6 sm:py-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
              RK BARBER
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Olá{nome ? `, ${nome}` : ""} <Icon name="wave" className="ml-1 inline h-5 w-5 align-[-3px]" />
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Acompanhe seus agendamentos e horários.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => {
                if (perfilAberto) cancelarEdicaoPerfil();
                setPerfilAberto((aberto) => !aberto);
                setPerfilErro("");
                setPerfilMensagem("");
              }}
              aria-expanded={perfilAberto}
              aria-controls="painel-perfil-cliente"
              className="flex min-h-11 w-full items-center justify-center gap-2 border border-[#C9A227]/40 px-4 py-2.5 text-sm font-semibold text-[#C9A227] transition hover:bg-[#C9A227]/10 sm:w-auto"
            >
              <Icon name="user" className="h-4 w-4" />
              Perfil
            </button>
            <button
              type="button"
              onClick={sair}
              className="min-h-11 w-full border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400 sm:w-auto"
            >
              Sair da conta
            </button>
          </div>
        </header>

        <section
          id="painel-perfil-cliente"
          aria-labelledby="titulo-perfil-cliente"
          hidden={!perfilAberto}
          className="mb-8 border border-white/10 bg-white/[0.02] p-5 sm:p-6"
        >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden bg-[#C9A227]/10 text-xl font-bold text-[#C9A227]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto do perfil" className="h-full w-full object-cover" />
                ) : (
                  (nome || email || "U").charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-[#C9A227]">Sua conta</p>
                    <h2 id="titulo-perfil-cliente" className="mt-1 text-xl font-bold text-white">Perfil</h2>
                  </div>
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-white/15 px-4 py-2 text-sm text-zinc-200 transition hover:border-[#C9A227]/40 hover:text-[#C9A227]">
                    <Icon name="edit" className="h-4 w-4" />
                    Alterar foto
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={enviarAvatar} className="sr-only" />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="block text-sm text-zinc-400">Nome</span>
                    <div className="mt-1 flex min-h-11 items-center gap-2 border-b border-white/10">
                      {campoPerfilEditando === "nome" ? (
                        <input
                          value={nome}
                          onChange={(event) => setNome(event.target.value)}
                          autoComplete="name"
                          autoFocus
                          aria-label="Nome"
                          className="min-w-0 flex-1 bg-transparent py-2 text-white outline-none"
                        />
                      ) : (
                        <p className="min-w-0 flex-1 truncate py-2 text-white">{nome || "Adicionar nome"}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => campoPerfilEditando === "nome" ? cancelarEdicaoPerfil() : iniciarEdicaoPerfil("nome")}
                        disabled={Boolean(campoPerfilEditando && campoPerfilEditando !== "nome")}
                        aria-label={campoPerfilEditando === "nome" ? "Cancelar edição do nome" : "Editar nome"}
                        className="flex h-11 w-11 shrink-0 items-center justify-center text-zinc-400 transition hover:text-[#C9A227] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {campoPerfilEditando === "nome" ? <span aria-hidden="true">×</span> : <Icon name="edit" className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block text-sm text-zinc-400">Telefone</span>
                    <div className="mt-1 flex min-h-11 items-center gap-2 border-b border-white/10">
                      {campoPerfilEditando === "telefone" ? (
                        <input
                          value={telefone}
                          onChange={(event) => setTelefone(event.target.value)}
                          autoComplete="tel"
                          inputMode="tel"
                          aria-label="Telefone"
                          className="min-w-0 flex-1 bg-transparent py-2 text-white outline-none"
                        />
                      ) : (
                        <p className="min-w-0 flex-1 truncate py-2 text-white">{telefone || "Adicionar telefone"}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => campoPerfilEditando === "telefone" ? cancelarEdicaoPerfil() : iniciarEdicaoPerfil("telefone")}
                        disabled={Boolean(campoPerfilEditando && campoPerfilEditando !== "telefone")}
                        aria-label={campoPerfilEditando === "telefone" ? "Cancelar edição do telefone" : "Editar telefone"}
                        className="flex h-11 w-11 shrink-0 items-center justify-center text-zinc-400 transition hover:text-[#C9A227] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {campoPerfilEditando === "telefone" ? <span aria-hidden="true">×</span> : <Icon name="edit" className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="block text-sm text-zinc-400">E-mail</span>
                    <p className="mt-2 break-all text-white">{email || "—"}</p>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <h3 className="text-sm font-semibold text-white">Barbearias favoritas</h3>
                  {barbeariasFavoritas.length ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {barbeariasFavoritas.map((barbearia) => (
                        <li key={barbearia.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setBarbeariaSelecionada(barbearia);
                              setPerfilAberto(false);
                              setAgendamentoAberto(true);
                            }}
                            className="inline-flex min-h-11 items-center gap-2 border border-[#C9A227]/25 px-3 py-2 text-sm text-zinc-200 transition hover:border-[#C9A227]/60 hover:text-[#C9A227]"
                          >
                            <span className="truncate">{barbearia.nome}</span>
                            <span className="text-[#C9A227]" aria-hidden="true">★</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">A barbearia ficará salva aqui depois do seu primeiro agendamento.</p>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={salvarPerfil}
                    disabled={perfilSalvando}
                    className="min-h-11 bg-[#C9A227] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#E0BB35] disabled:opacity-50"
                  >
                    {perfilSalvando ? "Salvando..." : "Salvar alterações"}
                  </button>
                  {perfilErro && <p role="alert" className="text-sm text-red-400">{perfilErro}</p>}
                  {perfilMensagem && <p role="status" className="text-sm text-emerald-400">{perfilMensagem}</p>}
                </div>
              </div>
            </div>
        </section>

        {/* RESUMO */}
        <section className="mb-8 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {/* PRÓXIMO */}
          <div className="rounded-2xl border border-[#C9A227]/20 bg-[#C9A227]/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Próximo
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C9A227]/10 text-[#C9A227]">
                <Icon name="calendar" />
              </div>
            </div>

            {proximoAgendamento ? (
              <>
                <p className="mt-4 text-lg font-bold text-white">
                  {formatarData(proximoAgendamento.data)}
                </p>

                <p className="mt-1 text-sm text-[#C9A227]">
                  às {formatarHorario(proximoAgendamento.horario)}
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">
                Nenhum agendamento próximo
              </p>
            )}
          </div>

          {/* TOTAL */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Agendamentos
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
                <Icon name="scissors" />
              </div>
            </div>

            <p className="mt-4 text-3xl font-bold text-white">
              {totalAgendamentos}
            </p>

            <p className="mt-1 text-sm text-zinc-500">no total</p>
          </div>

          {/* CONCLUÍDOS */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Concluídos
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                ✓
              </div>
            </div>

            <p className="mt-4 text-3xl font-bold text-white">
              {totalConcluidos}
            </p>

            <p className="mt-1 text-sm text-zinc-500">serviços realizados</p>
          </div>
        </section>

        {/* PRÓXIMO AGENDAMENTO */}
        <section className="mb-10">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#C9A227]">
                Seu horário
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Próximo agendamento
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setSeletorBarbeariaAberto(true)}
              className="w-full rounded-xl bg-[#C9A227] px-5 py-3 text-sm font-semibold text-black transition-all hover:bg-[#E0BB35] sm:w-auto"
            >
              + Novo agendamento
            </button>
          </div>

          {proximoAgendamento ? (
            <div className="overflow-hidden border border-[#C9A227]/20 bg-white/[0.02]">
              <div className="h-1 w-full bg-[#C9A227]" />

              <div className="p-5 sm:p-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  {/* SERVIÇO */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#C9A227]/10 text-2xl">
                      <Icon name="scissors" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">
                          {proximoAgendamento.servico?.nome ?? "Serviço"}
                        </h3>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasse(
                            proximoAgendamento.status,
                          )}`}
                        >
                          {statusLabel(proximoAgendamento.status)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm capitalize text-zinc-500">
                        {formatarDataCompleta(proximoAgendamento.data)}
                      </p>
                    </div>
                  </div>

                  {/* DATA/HORA */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:min-w-[420px]">
                    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-wider text-zinc-600">
                        Data
                      </p>

                      <p className="mt-1 text-sm font-semibold text-zinc-200">
                        {formatarData(proximoAgendamento.data)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#C9A227]/10 bg-[#C9A227]/[0.04] p-4">
                      <p className="text-[11px] uppercase tracking-wider text-zinc-600">
                        Horário
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#C9A227]">
                        {formatarHorario(proximoAgendamento.horario)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-wider text-zinc-600">
                        Valor
                      </p>

                      <p className="mt-1 text-sm font-semibold text-zinc-200">
                        {proximoAgendamento.servico
                          ? formatarPreco(proximoAgendamento.servico.preco)
                          : "--"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CANCELAMENTO */}
                {proximoAgendamento.status === "confirmado" && (
                  <div className="mt-6 flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    {podeCancelar(proximoAgendamento) ? (
                      <>
                        <p className="text-xs text-zinc-600">
                          Cancelamento disponível até 2 horas antes do horário.
                        </p>

                        <button
                          type="button"
                          disabled={cancelando === proximoAgendamento.id}
                          onClick={() => abrirConfirmacaoCancelamento(proximoAgendamento)}
                          className="w-full rounded-lg border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                          {cancelando === proximoAgendamento.id
                            ? "Cancelando..."
                            : "Cancelar agendamento"}
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-zinc-600">
                        O prazo para cancelamento deste agendamento foi
                        encerrado.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C9A227]/10 text-2xl">
                <Icon name="calendar" />
              </div>

              <h3 className="mt-5 font-semibold text-white">
                Você não possui nenhum horário marcado
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Escolha um serviço e encontre um horário disponível para fazer
                seu próximo agendamento.
              </p>

              <button
                type="button"
                onClick={() => setSeletorBarbeariaAberto(true)}
                className="mt-6 rounded-xl bg-[#C9A227] px-5 py-3 text-sm font-semibold text-black transition-all hover:bg-[#E0BB35]"
              >
                Fazer meu primeiro agendamento
              </button>
            </div>
          )}
        </section>

        {/* AGENDAMENTOS ATIVOS */}
        {agendamentosAtivos.length > 1 && (
          <section className="mb-10">
            <div className="mb-5">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                Agenda
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Outros horários
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Seus próximos agendamentos.
              </p>
            </div>

            <div className="space-y-3">
              {agendamentosAtivos
                .filter(
                  (agendamento) => agendamento.id !== proximoAgendamento?.id,
                )
                .sort(
                  (a, b) =>
                    obterDataHoraAgendamento(a).getTime() -
                    obterDataHoraAgendamento(b).getTime(),
                )
                .map((agendamento) => (
                  <div
                    key={agendamento.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-white/15"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5">
                          <Icon name="scissors" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-white">
                              {agendamento.servico?.nome ?? "Serviço"}
                            </h3>

                            <span
                              className={`rounded-full border px-2 py-1 text-[10px] font-medium ${statusClasse(
                                agendamento.status,
                              )}`}
                            >
                              {statusLabel(agendamento.status)}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-zinc-500">
                            {formatarData(agendamento.data)} •{" "}
                            {formatarHorario(agendamento.horario)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-3 sm:items-end">
                        {agendamento.servico && (
                          <p className="font-semibold text-[#C9A227]">
                            {formatarPreco(agendamento.servico.preco)}
                          </p>
                        )}

                        {agendamento.status === "confirmado" && (
                          podeCancelar(agendamento) ? (
                            <button
                              type="button"
                              disabled={cancelando === agendamento.id}
                              onClick={() => abrirConfirmacaoCancelamento(agendamento)}
                              className="rounded-lg border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {cancelando === agendamento.id
                                ? "Cancelando..."
                                : "Cancelar agendamento"}
                            </button>
                          ) : (
                            <p className="text-xs text-zinc-600">
                              O prazo para cancelamento foi encerrado.
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* HISTÓRICO */}
        {/* HISTÓRICO */}
        <section className="mt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                Histórico
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Agendamentos anteriores
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Seus serviços realizados e cancelados.
              </p>
            </div>

            {historico.length > 0 && (
              <button
                type="button"
                onClick={() => setHistoricoAberto((aberto) => !aberto)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:border-[#C9A227]/30 hover:bg-[#C9A227]/5 hover:text-[#C9A227] sm:w-auto"
              >
                {historicoAberto ? "Ocultar histórico" : "Ver histórico"}

                <span
                  className={`text-xs transition-transform duration-300 ${
                    historicoAberto ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>
            )}
          </div>

          {historico.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
              <p className="text-sm text-zinc-500">
                Seu histórico aparecerá aqui.
              </p>
            </div>
          ) : (
            <div
              className={`grid transition-all duration-300 ease-out ${
                historicoAberto
                  ? "mt-5 grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="space-y-3">
                  {historico.map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.015] p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-zinc-200">
                              {agendamento.servico?.nome ?? "Serviço"}
                            </h3>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasse(
                                agendamento.status,
                              )}`}
                            >
                              {statusLabel(agendamento.status)}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-zinc-500">
                            {formatarData(agendamento.data)} •{" "}
                            {formatarHorario(agendamento.horario)}
                          </p>
                        </div>

                        {agendamento.servico && (
                          <p className="font-semibold text-zinc-400">
                            {formatarPreco(agendamento.servico.preco)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

      </div>

      {agendamentoParaCancelar && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) fecharConfirmacaoCancelamento();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-cancelamento-cliente"
            aria-describedby="descricao-confirmar-cancelamento-cliente"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11151B] p-6 shadow-2xl sm:p-7"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
              <Icon name="calendar" />
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              Cancelar agendamento
            </p>
            <h2 id="titulo-confirmar-cancelamento-cliente" className="mt-2 text-xl font-bold text-white">
              Tem certeza que deseja cancelar?
            </h2>
            <p id="descricao-confirmar-cancelamento-cliente" className="mt-2 text-sm leading-6 text-zinc-400">
              Esta ação vai liberar o horário para outros clientes. O cancelamento só está disponível até 2 horas antes do atendimento.
            </p>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-semibold text-white">
                {agendamentoParaCancelar.servico?.nome ?? "Serviço"}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {formatarData(agendamentoParaCancelar.data)} às {formatarHorario(agendamentoParaCancelar.horario)}
              </p>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg p-1 text-sm leading-5 text-zinc-300">
              <input
                type="checkbox"
                checked={cancelamentoConfirmado}
                onChange={(event) => setCancelamentoConfirmado(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#C9A227]"
              />
              <span>Confirmo que desejo cancelar este agendamento.</span>
            </label>

            {erroCancelamento && (
              <p role="alert" className="mt-3 text-sm text-red-400">{erroCancelamento}</p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={fecharConfirmacaoCancelamento}
                disabled={cancelando === agendamentoParaCancelar.id}
                className="rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmarCancelamento}
                disabled={!cancelamentoConfirmado || cancelando === agendamentoParaCancelar.id}
                className="rounded-lg bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {cancelando === agendamentoParaCancelar.id ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL DE AGENDAMENTO */}
      <BarbeariaPickerModal
        aberto={seletorBarbeariaAberto}
        favoritasIds={barbeariasFavoritas.map((barbearia) => barbearia.id)}
        onFechar={() => setSeletorBarbeariaAberto(false)}
        onSelecionar={(barbearia) => {
          setBarbeariaSelecionada(barbearia);
          setSeletorBarbeariaAberto(false);
          setAgendamentoAberto(true);
        }}
      />
      <AgendamentoModal
        aberto={agendamentoAberto}
        onFechar={() => setAgendamentoAberto(false)}
        onAgendamentoCriado={concluirAgendamento}
        barbeariaId={barbeariaSelecionada?.id}
        barbeariaNome={barbeariaSelecionada?.nome}
      />
    </main>
  );
}
