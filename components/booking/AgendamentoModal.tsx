
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/neon/client";
import Icon from "@/components/ui/Icon";
import OAuthButtons from "@/components/auth/OAuthButtons";
import { useDialogFocus } from "@/lib/useDialogFocus";

interface Servico {
  id: number;
  nome: string;
  preco: number;
  duracao: number;
  barbearia_id: string;
}

interface Barbeiro {
  id: string;
  nome: string;
  horario_abertura: string;
  horario_fechamento: string;
  dia_folga: number;
}
type HorarioFuncionamento = { aberto: boolean; abertura: string; fechamento: string };

interface Agendamento {
  horario: string;
  servico_duracao: number;
  barbeiro_id: string | null;
}

interface AgendamentoModalProps {
  aberto: boolean;
  onFechar: () => void;
  onVoltarParaBusca?: () => void;
  onAgendamentoCriado: () => Promise<void>;
  barbeariaId?: string;
  barbeariaNome?: string;
  servicoInicialId?: number | null;
  barbeiroInicialId?: string | null;
}

const neon = createClient();

const NOMES_MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function dataLocal(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function minutosDoHorario(horario: string): number {
  const [horas, minutos] = horario.split(":").map(Number);
  return horas * 60 + minutos;
}

function formatarPreco(preco: number): string {
  return Number(preco).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string): string {
  if (!data) return "Selecione uma data";

  return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function AgendamentoModal({
  aberto,
  onFechar,
  onVoltarParaBusca,
  onAgendamentoCriado,
  barbeariaId,
  barbeariaNome,
  servicoInicialId = null,
  barbeiroInicialId = null,
}: AgendamentoModalProps) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState<string | null>(null);
  const [servicoSelecionadoId, setServicoSelecionadoId] =
    useState<number | null>(null);

  const [dataSelecionada, setDataSelecionada] = useState(dataLocal());

  const [mesVisivel, setMesVisivel] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });

  const [horarioSelecionado, setHorarioSelecionado] = useState("");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [diaFolga, setDiaFolga] = useState<string | null>(null);
  const [horarioAbertura, setHorarioAbertura] = useState("08:00");
  const [horarioFechamento, setHorarioFechamento] = useState("21:00");
  const [horariosFuncionamento, setHorariosFuncionamento] = useState<HorarioFuncionamento[] | null>(null);

  const [carregandoServicos, setCarregandoServicos] = useState(false);
  const [falhaServicos, setFalhaServicos] = useState(false);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [erroHorarios, setErroHorarios] = useState(false);
  const [tentativaHorarios, setTentativaHorarios] = useState(0);
  const [tentativaServicos, setTentativaServicos] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [emailLogin, setEmailLogin] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [carregandoLogin, setCarregandoLogin] = useState(false);

  const [mostrarCadastro, setMostrarCadastro] = useState(false);
const [nomeCadastro, setNomeCadastro] = useState("");
const [telefoneCadastro, setTelefoneCadastro] = useState("");
const [emailCadastro, setEmailCadastro] = useState("");
const [senhaCadastro, setSenhaCadastro] = useState("");
const [erroCadastro, setErroCadastro] = useState("");
const [sucessoCadastro, setSucessoCadastro] = useState(false);
const [carregandoCadastro, setCarregandoCadastro] = useState(false);
  const dialogRef = useDialogFocus<HTMLElement>(aberto, fecharSePossivel);

  function fecharSePossivel() {
    if (!salvandoRef.current) onFechar();
  }

  const servicoSelecionado = servicos.find(
    (servico) => servico.id === servicoSelecionadoId
  );
  const barbeiroSelecionado = barbeiros.find(
    (barbeiro) => barbeiro.id === barbeiroSelecionadoId,
  );
  const diaSelecionadoSemana = dataSelecionada ? new Date(`${dataSelecionada}T12:00:00`).getDay() : 0;
  const horarioDiaSelecionado = horariosFuncionamento?.[diaSelecionadoSemana];
  const aberturaBarbearia = horarioDiaSelecionado?.abertura ?? horarioAbertura;
  const fechamentoBarbearia = horarioDiaSelecionado?.fechamento ?? horarioFechamento;
  const aberturaDisponivel = barbeiroSelecionado
    ? (aberturaBarbearia >= barbeiroSelecionado.horario_abertura.slice(0, 5) ? aberturaBarbearia : barbeiroSelecionado.horario_abertura.slice(0, 5))
    : aberturaBarbearia;
  const fechamentoDisponivel = barbeiroSelecionado
    ? (fechamentoBarbearia <= barbeiroSelecionado.horario_fechamento.slice(0, 5) ? fechamentoBarbearia : barbeiroSelecionado.horario_fechamento.slice(0, 5))
    : fechamentoBarbearia;
  const fluxoBarbeiroPrimeiro = Boolean(barbeiroInicialId);

  const anoCalendario = mesVisivel.getFullYear();
  const mesCalendario = mesVisivel.getMonth();

  const primeiroDiaSemana = new Date(
    anoCalendario,
    mesCalendario,
    1
  ).getDay();

  const quantidadeDias = new Date(
    anoCalendario,
    mesCalendario + 1,
    0
  ).getDate();

  const diasCalendario: (number | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: quantidadeDias }, (_, i) => i + 1),
  ];

  const hoje = new Date();
  const primeiroMesPermitido = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    1
  );

  const podeVoltarMes =
    mesVisivel.getTime() > primeiroMesPermitido.getTime();

  function voltarMes() {
    if (!podeVoltarMes) return;

    setMesVisivel(
      new Date(anoCalendario, mesCalendario - 1, 1)
    );
  }

  function avancarMes() {
    setMesVisivel(
      new Date(anoCalendario, mesCalendario + 1, 1)
    );
  }

  function formatarDataCalendario(dia: number): string {
    const mes = String(mesCalendario + 1).padStart(2, "0");
    const diaFormatado = String(dia).padStart(2, "0");

    return `${anoCalendario}-${mes}-${diaFormatado}`;
  }

  useEffect(() => {
    if (!aberto || !barbeariaId) return;

    let cancelado = false;

    async function carregarDados() {
      setCarregandoServicos(true);
      setFalhaServicos(false);
      setErro("");
      setErroLogin("");
      setSucesso(false);
      setMostrarLogin(false);
      setHorarioSelecionado("");
      setBarbeiros([]);
      setBarbeiroSelecionadoId(null);
      setDataSelecionada(dataLocal());

      const hojeAtual = new Date();

      setMesVisivel(
        new Date(hojeAtual.getFullYear(), hojeAtual.getMonth(), 1)
      );

      const {
        data: dadosServicos,
        error: erroServicos,
      } = await neon
        .from("servicos")
        .select("id, nome, preco, duracao, barbearia_id")
        .eq("barbearia_id", barbeariaId!)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (cancelado) return;

      if (erroServicos) {
        console.error(erroServicos);
        setFalhaServicos(true);
        setServicos([]);
        setCarregandoServicos(false);
        return;
      }

      const lista = (dadosServicos ?? []) as Servico[];

      setServicos(lista);

      const servicoInicialExiste = lista.some(
        (servico) => servico.id === servicoInicialId
      );

      setServicoSelecionadoId(
        servicoInicialExiste ? servicoInicialId! : null
      );

      let { data: dadosBarbearia, error: erroBarbearia } = await neon
        .from("barbearias")
        .select("dia_folga, horario_abertura, horario_fechamento, horarios_funcionamento")
        .eq("id", barbeariaId!)
        .maybeSingle();

      if (erroBarbearia) {
        const resultadoBasico = await neon
          .from("barbearias")
          .select("dia_folga")
          .eq("id", barbeariaId!)
          .maybeSingle();
        dadosBarbearia = resultadoBasico.data
          ? { ...resultadoBasico.data, horario_abertura: "08:00", horario_fechamento: "21:00", horarios_funcionamento: null }
          : null;
        erroBarbearia = resultadoBasico.error;
      }

      if (cancelado) return;

      if (erroBarbearia) {
        console.error(erroBarbearia);
      }

      setDiaFolga(
        dadosBarbearia?.dia_folga == null
          ? null
          : String(dadosBarbearia.dia_folga)
      );
      setHorarioAbertura(dadosBarbearia?.horario_abertura?.slice(0, 5) ?? "08:00");
      setHorarioFechamento(dadosBarbearia?.horario_fechamento?.slice(0, 5) ?? "21:00");
      setHorariosFuncionamento(Array.isArray(dadosBarbearia?.horarios_funcionamento) ? dadosBarbearia.horarios_funcionamento as HorarioFuncionamento[] : null);

      const { data: equipe, error: erroEquipe } = await neon
        .from("barbeiros")
        .select("id, nome, horario_abertura, horario_fechamento, dia_folga")
        .eq("barbearia_id", barbeariaId!)
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (cancelado) return;

      if (erroEquipe) {
        // Mantém o fluxo legado até que a migração de barbeiros seja aplicada.
        console.error("Não foi possível carregar a equipe:", erroEquipe);
        setBarbeiros([]);
        setBarbeiroSelecionadoId(null);
      } else {
        const equipeAtiva = (equipe ?? []) as Barbeiro[];
        setBarbeiros(equipeAtiva);
        const barbeiroInicialExiste = equipeAtiva.some((barbeiro) => barbeiro.id === barbeiroInicialId);
        setBarbeiroSelecionadoId(
          barbeiroInicialExiste ? barbeiroInicialId : equipeAtiva.length === 1 ? equipeAtiva[0].id : null,
        );
      }

      setCarregandoServicos(false);
    }

    carregarDados();

    return () => {
      cancelado = true;
    };
  }, [aberto, barbeariaId, servicoInicialId, barbeiroInicialId, tentativaServicos]);

  useEffect(() => {
    if (!aberto || !barbeariaId || !dataSelecionada) return;

    let cancelado = false;

    async function carregarAgendamentos() {
      setCarregandoHorarios(true);
      setErroHorarios(false);
      setErro("");

      const { data, error } = await neon.rpc("naregua_ocupacao", {
        p_barbearia_id: barbeariaId!, p_data: dataSelecionada,
      });

      if (cancelado) return;

      if (error) {
        console.error(error);
        setAgendamentos([]);
        setErroHorarios(true);
      } else {
        setAgendamentos((data ?? []) as unknown as Agendamento[]);
      }

      setCarregandoHorarios(false);
    }

    carregarAgendamentos();

    return () => {
      cancelado = true;
    };
  }, [aberto, barbeariaId, dataSelecionada, barbeiroSelecionadoId, tentativaHorarios]);

  function selecionarServico(id: number) {
    setServicoSelecionadoId(id);
    setHorarioSelecionado("");
    setErro("");
  }

  function selecionarData(data: string) {
    setDataSelecionada(data);
    setHorarioSelecionado("");
    setErro("");
  }

  function diaEstaDeFolga(): boolean {
    if (!dataSelecionada) return false;

    const data = new Date(`${dataSelecionada}T12:00:00`);
    const diaSemana = data.getDay();
    if (horariosFuncionamento && !horariosFuncionamento[diaSemana]?.aberto) return true;

    const diasSemana: Record<string, number> = {
      domingo: 0,
      dom: 0,
      segunda: 1,
      "segunda-feira": 1,
      seg: 1,
      terça: 2,
      terca: 2,
      "terça-feira": 2,
      "terca-feira": 2,
      ter: 2,
      quarta: 3,
      "quarta-feira": 3,
      qua: 3,
      quinta: 4,
      qui: 4,
      sexta: 5,
      sex: 5,
      sábado: 6,
      sabado: 6,
      sab: 6,
    };

    const folgas = [horariosFuncionamento ? null : diaFolga, barbeiroSelecionado?.dia_folga]
      .filter((folga): folga is string | number => folga !== null && folga !== undefined)
      .map((folga) => String(folga).trim().toLowerCase());

    return folgas.some((folga) => {
      const numeroFolga = Number(folga);
      if (folga !== "" && Number.isInteger(numeroFolga)) {
        return numeroFolga === diaSemana;
      }
      return diasSemana[folga] === diaSemana;
    });
  }

  function horarioEstaDisponivel(horario: string): boolean {
    if (!servicoSelecionado) return false;

    const inicioNovo = minutosDoHorario(horario);
    const fimNovo = inicioNovo + servicoSelecionado.duracao;

    const agora = new Date();
    const hojeAtual = dataLocal();

    if (dataSelecionada < hojeAtual) return false;

    if (dataSelecionada === hojeAtual) {
      const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

      if (inicioNovo <= minutosAgora) return false;
    }

    if (fimNovo > minutosDoHorario(fechamentoDisponivel)) return false;

    return !agendamentos.some((agendamento) => {
      if (
        barbeiroSelecionadoId &&
        agendamento.barbeiro_id &&
        agendamento.barbeiro_id !== barbeiroSelecionadoId
      ) return false;

      const inicioExistente = minutosDoHorario(agendamento.horario);

      const fimExistente = inicioExistente + agendamento.servico_duracao;

      return (
        inicioNovo < fimExistente &&
        fimNovo > inicioExistente
      );
    });
  }

  const horarios: string[] = [];

  for (let minutos = minutosDoHorario(aberturaDisponivel); minutos < minutosDoHorario(fechamentoDisponivel); minutos += 30) {
    const horas = String(Math.floor(minutos / 60)).padStart(2, "0");
    const mins = String(minutos % 60).padStart(2, "0");

    horarios.push(`${horas}:${mins}`);
  }

  async function entrarParaAgendar(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErroLogin("");
    setCarregandoLogin(true);

    try {
      const { error } = await neon.auth.signInWithPassword({
        email: emailLogin,
        password: senhaLogin,
      });

      if (error) {
        setErroLogin(
          "Não foi possível entrar. Confira seu e-mail e sua senha."
        );
        return;
      }

      setMostrarLogin(false);
      setEmailLogin("");
      setSenhaLogin("");
      setErro("");

      // O serviço, a data e o horário continuam selecionados.
      // O cliente pode confirmar a reserva sem sair do modal.
    } catch {
      setErroLogin("Ocorreu um erro ao tentar entrar.");
    } finally {
      setCarregandoLogin(false);
    }
  }

  async function cadastrarParaAgendar(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErroCadastro("");
    setSucessoCadastro(false);
    setCarregandoCadastro(true);

    try {
      const parametros = new URLSearchParams();

      if (servicoSelecionadoId !== null) {
        parametros.set("servico", String(servicoSelecionadoId));
      }

      if (dataSelecionada) {
        parametros.set("data", dataSelecionada);
      }

      if (horarioSelecionado) {
        parametros.set("horario", horarioSelecionado);
      }

      const caminho = window.location.pathname;
      const query = parametros.toString();
      const destino = query ? `${caminho}?${query}` : caminho;

      const { data, error } = await neon.auth.signUp({
        email: emailCadastro.trim(),
        password: senhaCadastro,
        options: {
          data: { displayName: nomeCadastro.trim(), phone: telefoneCadastro.trim() },
          emailRedirectTo: `${window.location.origin}${destino}`,
        },
      });

      if (error) {
        setErroCadastro(
          error.message.includes("already registered")
            ? "Este e-mail já possui cadastro. Entre na sua conta."
            : "Não foi possível criar a conta. Confira os dados e tente novamente."
        );
        return;
      }

      if (data.user && data.session) {
        const { error: profileError } = await neon.from("profiles").upsert({
          id: data.user.id,
          nome: nomeCadastro.trim(),
          telefone: telefoneCadastro.trim(),
        }, { onConflict: "id" });
        if (profileError) {
          setErroCadastro("Conta criada, mas não foi possível salvar seu perfil. Entre e complete seus dados nas configurações.");
          return;
        }
      }

      // Com a confirmação de e-mail habilitada, não criamos
      // o agendamento nesta etapa.
      setSucessoCadastro(true);
    } catch (error) {
      console.error(error);
      setErroCadastro("Ocorreu um erro ao criar sua conta.");
    } finally {
      setCarregandoCadastro(false);
    }
  }

  async function confirmarAgendamento() {
    if (salvandoRef.current || erroHorarios || carregandoHorarios) return;
    setErro("");

    if (!barbeariaId) {
      setErro("Não foi possível identificar a barbearia.");
      return;
    }

    if (!servicoSelecionado) {
      setErro("Selecione um serviço.");
      return;
    }

    if (barbeiros.length > 1 && !barbeiroSelecionadoId) {
      setErro("Selecione o barbeiro que fará o atendimento.");
      return;
    }

    if (!dataSelecionada || !horarioSelecionado) {
      setErro("Selecione a data e o horário.");
      return;
    }

    if (diaEstaDeFolga()) {
      setErro("A barbearia não atende nesse dia.");
      return;
    }

    if (!horarioEstaDisponivel(horarioSelecionado)) {
      setErro("Esse horário não está mais disponível. Escolha outro.");
      return;
    }

    salvandoRef.current = true;
    setSalvando(true);

    try {
      const {
        data: { user },
        error: erroUsuario,
      } = await neon.auth.getUser();

      if (erroUsuario || !user) {
        setMostrarLogin(true);
        setMostrarCadastro(false);
        return;
      }

      if (!user.email_confirmed_at) {
        setMostrarLogin(true);
        setMostrarCadastro(false);
        setErroLogin(
          "Confirme seu e-mail antes de realizar um agendamento. Verifique sua caixa de entrada."
        );
        return;
      }

      // Consulta novamente os agendamentos antes de salvar.
      const { data: conflitos, error: erroConflitos } = await neon.rpc("naregua_ocupacao", {
        p_barbearia_id: barbeariaId, p_data: dataSelecionada,
      });

      if (erroConflitos) {
        throw new Error(
          "Não foi possível verificar a disponibilidade."
        );
      }

      const listaConflitos = (conflitos ?? []) as unknown as Agendamento[];
      setAgendamentos(listaConflitos);

      const inicioNovo = minutosDoHorario(horarioSelecionado);
      const fimNovo = inicioNovo + servicoSelecionado.duracao;

      const existeConflito = listaConflitos.some((agendamento) => {
        if (
          barbeiroSelecionadoId &&
          agendamento.barbeiro_id &&
          agendamento.barbeiro_id !== barbeiroSelecionadoId
        ) return false;

        const inicioExistente = minutosDoHorario(agendamento.horario);
        const fimExistente = inicioExistente + agendamento.servico_duracao;

        return (
          inicioNovo < fimExistente &&
          fimNovo > inicioExistente
        );
      });

      if (existeConflito) {
        setErro("Esse horário acabou de ser ocupado. Escolha outro.");
        setHorarioSelecionado("");
        return;
      }

      const { error: erroInsercao } = await neon
        .from("agendamentos")
        .insert({
          usuario_id: user.id,
          servico_id: servicoSelecionado.id,
          barbearia_id: barbeariaId,
          ...(barbeiroSelecionadoId ? { barbeiro_id: barbeiroSelecionadoId } : {}),
          data: dataSelecionada,
          horario: horarioSelecionado,
          status: "confirmado",
        });

      if (erroInsercao) {
        console.error("Erro ao confirmar agendamento:", erroInsercao.code);

        if (erroInsercao.code === "23505" || erroInsercao.code === "23P01") {
          setErro("Esse intervalo acabou de ser reservado. Escolha outro horário ou profissional.");
          setHorarioSelecionado("");
          return;
        }

        if (erroInsercao.code === "23503" || erroInsercao.code === "23514") {
          setErro("A opção selecionada não está mais disponível. Confira serviço, profissional, data e horário.");
          return;
        }
        if (erroInsercao.code === "42501") {
          setErro("Sua sessão não permite confirmar esta reserva. Entre novamente.");
          return;
        }

        throw new Error("Não foi possível confirmar o agendamento. Tente novamente.");
      }

      setSucesso(true);
      try {
        await onAgendamentoCriado();
      } catch (refreshError) {
        console.error("Reserva criada, mas a lista não foi atualizada:", refreshError);
      }
    } catch (error) {
      console.error(error);

      setErro(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao realizar o agendamento."
      );
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  }

  const seletorBarbeiro = barbeiros.length > 0 ? (
    <div className="mt-7">
      <h3 className="mb-3 font-semibold">
        <span className="mr-2 text-[#C9A227]">{fluxoBarbeiroPrimeiro ? "01." : "02."}</span>
        {barbeiros.length === 1 ? "Profissional do atendimento" : "Escolha o barbeiro"}
      </h3>

      {barbeiros.length === 1 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#C9A227]/30 bg-[#C9A227]/5 p-4">
          <div>
            <p className="font-semibold text-white">{barbeiros[0].nome}</p>
            <p className="mt-1 text-xs text-zinc-400">Esta barbearia tem um único profissional disponível.</p>
          </div>
          <Icon name="user" className="h-5 w-5 text-[#C9A227]" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {barbeiros.map((barbeiro) => {
            const selecionado = barbeiroSelecionadoId === barbeiro.id;
            return (
              <button
                key={barbeiro.id}
                type="button"
                aria-pressed={selecionado}
                onClick={() => {
                  setBarbeiroSelecionadoId(barbeiro.id);
                  setHorarioSelecionado("");
                  setErro("");
                }}
                className={`flex min-h-14 items-center justify-between rounded-xl border p-4 text-left transition ${selecionado ? "border-[#C9A227] bg-[#C9A227]/10 text-[#E0BB35]" : "border-white/10 bg-[#11151B] text-zinc-300 hover:border-white/30"}`}
              >
                <span className="font-semibold">{barbeiro.nome}</span>
                {selecionado && <Icon name="check" className="h-5 w-5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  ) : null;

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[10002] flex h-dvh items-stretch justify-center overflow-y-auto bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={fecharSePossivel}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-agendamento"
        className="my-auto min-h-dvh w-full max-w-xl overflow-y-auto overscroll-contain border border-[#C9A227]/20 bg-[#0B0F14] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-white sm:min-h-0 sm:max-h-[90dvh] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">
              Na Régua+
            </p>

            <h2
              id="titulo-agendamento"
              className="text-2xl font-bold"
            >
              {sucesso
                ? "Agendamento confirmado!"
                : sucessoCadastro
                  ? "Confira seu e-mail"
                  : mostrarCadastro
                    ? "Criar sua conta"
                    : mostrarLogin
                      ? "Entre na sua conta"
                      : "Agendar horário"}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {onVoltarParaBusca && !sucesso && (
              <button
                type="button"
                onClick={onVoltarParaBusca}
                disabled={salvando}
                className="inline-flex min-h-11 items-center gap-2 border border-white/10 px-3 text-sm font-medium text-zinc-300 transition hover:border-[#C9A227]/40 hover:text-white disabled:opacity-50"
              >
                <span aria-hidden="true">←</span>
                Busca
              </button>
            )}
            <button
              type="button"
              onClick={fecharSePossivel}
              disabled={salvando}
              aria-label="Fechar modal"
              className="rounded-lg px-3 py-2 text-xl text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>

        {sucesso ? (
          <div className="relative overflow-hidden border border-[#C9A227]/30 bg-gradient-to-b from-[#C9A227]/10 via-[#11151B] to-[#0B0F14] px-4 py-7 text-center sm:px-8 sm:py-9">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#C9A227]" />

            <div className="mx-auto flex h-16 w-16 items-center justify-center border border-[#C9A227]/50 bg-[#C9A227]/15 text-[#E0BB35] shadow-[0_0_36px_rgba(201,162,39,0.16)]">
              <Icon name="check" className="h-9 w-9" />
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-[#E0BB35]">
              Na Régua+ · Reserva confirmada
            </p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Seu horário está reservado.
            </h3>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">
              {barbeariaNome
                ? `${barbeariaNome} já recebeu seu agendamento.`
                : "Seu agendamento foi confirmado com sucesso."}
            </p>

            <div className={`mt-7 grid border border-white/10 bg-[#090D12] text-left ${barbeiroSelecionado ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
              <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Serviço</p>
                <p className="mt-2 break-words font-semibold text-white">{servicoSelecionado?.nome ?? "Agendamento"}</p>
              </div>
              <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Data</p>
                <p className="mt-2 capitalize font-semibold text-white">{formatarData(dataSelecionada)}</p>
              </div>
              {barbeiroSelecionado && (
                <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Barbeiro</p>
                  <p className="mt-2 font-semibold text-white">{barbeiroSelecionado.nome}</p>
                </div>
              )}
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Horário</p>
                <p className="mt-2 text-xl font-bold text-[#E0BB35]">{horarioSelecionado}</p>
              </div>
            </div>

            <p className="mt-5 text-xs leading-5 text-zinc-500">
              Consulte ou gerencie seu horário na área do cliente.
            </p>
            <button
              type="button"
              onClick={fecharSePossivel}
              className="mt-6 min-h-12 w-full bg-[#C9A227] px-6 py-3 font-bold text-[#0B0F14] transition hover:bg-[#E0BB35]"
            >
              Concluir
            </button>
          </div>
        ) : sucessoCadastro ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-[#C9A227]/20 bg-[#C9A227]/5 p-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#C9A227]/30 bg-[#C9A227]/10 text-3xl text-[#C9A227]">
                <Icon name="mail" className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-center text-lg font-semibold">
                Conta criada!
              </h3>

              <p className="mt-3 text-center text-sm leading-6 text-zinc-300">
                Enviamos um link de confirmação para{" "}
                <strong className="break-all text-[#E0BB35]">
                  {emailCadastro}
                </strong>.
                Abra o e-mail e clique no link para confirmar seu endereço.
              </p>

              <p className="mt-3 text-center text-sm leading-6 text-zinc-400">
                Seu horário ainda não está reservado. Depois de confirmar
                o e-mail, volte à barbearia, entre na sua conta e finalize
                o agendamento.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSucessoCadastro(false);
                setMostrarCadastro(false);
                setMostrarLogin(true);
                setEmailLogin(emailCadastro);
                setErroLogin("");
              }}
              className="w-full rounded-xl bg-[#C9A227] px-6 py-3 font-bold text-black transition hover:bg-[#E0BB35]"
            >
              Voltar para entrar
            </button>

            <button
              type="button"
              onClick={() => {
                setSucessoCadastro(false);
                setMostrarCadastro(false);
                setErroCadastro("");
              }}
              className="w-full rounded-xl border border-white/10 px-6 py-3 text-sm text-zinc-300 transition hover:border-[#C9A227] hover:text-white"
            >
              Voltar ao agendamento
            </button>
          </div>
        ) : mostrarCadastro ? (
          <form onSubmit={cadastrarParaAgendar} className="space-y-5">
            <div className="rounded-xl border border-[#C9A227]/20 bg-[#C9A227]/5 p-4">
              <p className="text-sm leading-6 text-zinc-300">
                Crie sua conta para continuar. Você precisará confirmar
                seu e-mail antes de reservar o horário.
              </p>

              {servicoSelecionado && (
                <p className="mt-3 text-sm font-semibold text-[#C9A227]">
                  {servicoSelecionado.nome} · {dataSelecionada} ·{" "}
                  {horarioSelecionado || "--:--"}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="cadastro-nome" className="mb-2 block text-sm font-medium text-zinc-300">
                Nome completo
              </label>
              <input
                id="cadastro-nome"
                type="text"
                autoComplete="name"
                required
                maxLength={100}
                value={nomeCadastro}
                onChange={(event) => setNomeCadastro(event.target.value)}
                placeholder="Seu nome"
                className="w-full rounded-xl border border-white/10 bg-[#11151B] p-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#C9A227]"
              />
            </div>

            <div>
              <label htmlFor="cadastro-telefone" className="mb-2 block text-sm font-medium text-zinc-300">
                Telefone
              </label>
              <input
                id="cadastro-telefone"
                type="tel"
                autoComplete="tel"
                required
                maxLength={20}
                value={telefoneCadastro}
                onChange={(event) => setTelefoneCadastro(event.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full rounded-xl border border-white/10 bg-[#11151B] p-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#C9A227]"
              />
            </div>

            <div>
              <label htmlFor="cadastro-email" className="mb-2 block text-sm font-medium text-zinc-300">
                E-mail
              </label>
              <input
                id="cadastro-email"
                type="email"
                autoComplete="email"
                required
                value={emailCadastro}
                onChange={(event) => setEmailCadastro(event.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-xl border border-white/10 bg-[#11151B] p-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#C9A227]"
              />
            </div>

            <div>
              <label htmlFor="cadastro-senha" className="mb-2 block text-sm font-medium text-zinc-300">
                Senha
              </label>
              <input
                id="cadastro-senha"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={senhaCadastro}
                onChange={(event) => setSenhaCadastro(event.target.value)}
                placeholder="Mínimo de 6 caracteres"
                className="w-full rounded-xl border border-white/10 bg-[#11151B] p-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#C9A227]"
              />
            </div>

            {erroCadastro && (
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {erroCadastro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregandoCadastro}
              className="w-full rounded-xl bg-[#C9A227] px-6 py-3 font-bold text-black transition hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregandoCadastro ? "Criando conta..." : "Criar conta e confirmar e-mail"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMostrarCadastro(false);
                setErroCadastro("");
                setMostrarLogin(true);
              }}
              className="w-full rounded-xl border border-white/10 px-6 py-3 text-sm text-zinc-300 transition hover:border-[#C9A227] hover:text-white"
            >
              Já tenho conta — entrar
            </button>

            <button
              type="button"
              onClick={() => {
                setMostrarCadastro(false);
                setErroCadastro("");
              }}
              className="w-full text-sm text-zinc-500 transition hover:text-white"
            >
              Voltar ao agendamento
            </button>
          </form>
        ) : mostrarLogin ? (
          <form onSubmit={entrarParaAgendar} className="space-y-5">
            <div className="rounded-xl border border-[#C9A227]/20 bg-[#C9A227]/5 p-4">
              <p className="text-sm leading-6 text-zinc-300">
                Entre na sua conta para continuar. Seu serviço, sua data
                e seu horário ficarão selecionados.
              </p>

              {servicoSelecionado && (
                <p className="mt-3 text-sm font-semibold text-[#C9A227]">
                  {servicoSelecionado.nome} · {dataSelecionada} ·{" "}
                  {horarioSelecionado}
                </p>
              )}
            </div>

            <OAuthButtons redirectPath={typeof window !== "undefined" ? window.location.pathname : "/"} disabled={carregandoLogin} />

            <div>
              <label
                htmlFor="agendamento-email"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                E-mail
              </label>

              <input
                id="agendamento-email"
                type="email"
                autoComplete="email"
                required
                value={emailLogin}
                onChange={(event) => setEmailLogin(event.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-xl border border-white/10 bg-[#11151B] p-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#C9A227]"
              />
            </div>

            <div>
              <label
                htmlFor="agendamento-senha"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Senha
              </label>

              <input
                id="agendamento-senha"
                type="password"
                autoComplete="current-password"
                required
                value={senhaLogin}
                onChange={(event) => setSenhaLogin(event.target.value)}
                placeholder="Sua senha"
                className="w-full rounded-xl border border-white/10 bg-[#11151B] p-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#C9A227]"
              />
            </div>

            {erroLogin && (
              <p
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
              >
                {erroLogin}
              </p>
            )}

            <button
              type="submit"
              disabled={carregandoLogin}
              className="w-full rounded-xl bg-[#C9A227] px-6 py-3 font-bold text-black transition hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregandoLogin ? "Entrando..." : "Entrar e continuar"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMostrarLogin(false);
                setErroLogin("");
              }}
              className="w-full rounded-xl border border-white/10 px-6 py-3 text-sm text-zinc-300 transition hover:border-[#C9A227] hover:text-white"
            >
              Voltar ao agendamento
            </button>

            <button
              type="button"
              onClick={() => {
                setMostrarLogin(false);
                setMostrarCadastro(true);
                setErroCadastro("");
                setEmailCadastro(emailLogin);
              }}
              className="w-full rounded-xl border border-[#C9A227]/30 px-6 py-3 text-sm text-[#E0BB35] transition hover:bg-[#C9A227]/10"
            >
              Ainda não tenho conta — cadastrar
            </button>
          </form>
        ) : carregandoServicos ? (
          <p className="py-8 text-center text-zinc-400">
            Carregando serviços...
          </p>
        ) : servicos.length === 0 ? (
          <div className="py-8 text-center text-zinc-400">
            <p>{falhaServicos ? "Não foi possível carregar os serviços." : "Não há serviços disponíveis nesta barbearia."}</p>
            {falhaServicos && <button type="button" onClick={() => setTentativaServicos((valor) => valor + 1)} className="mt-4 min-h-11 px-4 font-semibold text-[#E0BB35]">Tentar novamente</button>}
          </div>
        ) : (
          <>
            {fluxoBarbeiroPrimeiro && seletorBarbeiro}

            <div>
              <h3 className="mb-3 font-semibold">
                <span className="mr-2 text-[#C9A227]">{fluxoBarbeiroPrimeiro ? "02." : "01."}</span>
                Escolha o serviço
              </h3>

              <div className="grid gap-3">
                {servicos.map((servico) => {
                  const selecionado =
                    servicoSelecionadoId === servico.id;

                  return (
                    <button
                      key={servico.id}
                      type="button"
                      aria-pressed={selecionado}
                      onClick={() => selecionarServico(servico.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selecionado
                          ? "border-[#C9A227] bg-[#C9A227]/10"
                          : "border-white/10 bg-[#11151B] hover:border-white/30"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                        <span className="min-w-0 break-words font-semibold">
                          {servico.nome}
                        </span>

                        <span className="shrink-0 font-bold text-[#C9A227]">
                          {formatarPreco(servico.preco)}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-zinc-400">
                        {servico.duracao} minutos
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {!fluxoBarbeiroPrimeiro && seletorBarbeiro}

            <div className="mt-7">
              <h3 className="mb-3 font-semibold">
                <span className="mr-2 text-[#C9A227]">{barbeiros.length > 0 ? "03." : "02."}</span>
                Escolha a data
              </h3>

              <div className="rounded-2xl border border-white/10 bg-[#11151B] p-3 sm:p-4">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={voltarMes}
                    disabled={!podeVoltarMes}
                    aria-label="Mês anterior"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-2xl text-white transition hover:border-[#C9A227] hover:text-[#C9A227] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ‹
                  </button>

                  <h4 className="text-center font-semibold capitalize text-white">
                    {NOMES_MESES[mesCalendario]} {anoCalendario}
                  </h4>

                  <button
                    type="button"
                    onClick={avancarMes}
                    aria-label="Próximo mês"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-2xl text-white transition hover:border-[#C9A227] hover:text-[#C9A227]"
                  >
                    ›
                  </button>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-500">
                  {DIAS_SEMANA.map((dia, indice) => (
                    <div key={`${dia}-${indice}`} className="py-2">
                      {dia}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {diasCalendario.map((dia, indice) => {
                    if (dia === null) {
                      return <div key={`vazio-${indice}`} />;
                    }

                    const data = formatarDataCalendario(dia);
                    const hojeData = dataLocal();
                    const passado = data < hojeData;
                    const selecionado = dataSelecionada === data;
                    const dataAtual = data === hojeData;

                    return (
                      <button
                        key={data}
                        type="button"
                        disabled={passado}
                        aria-pressed={selecionado}
                        aria-label={formatarData(data)}
                        onClick={() => selecionarData(data)}
                        className={`relative flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition ${
                          selecionado
                            ? "bg-[#C9A227] text-black shadow-lg shadow-[#C9A227]/10"
                            : passado
                              ? "cursor-not-allowed text-zinc-700"
                              : "text-zinc-300 hover:bg-[#C9A227]/15 hover:text-[#E0BB35]"
                        }`}
                      >
                        {dia}

                        {dataAtual && !selecionado && (
                          <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#C9A227]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-xl border border-[#C9A227]/20 bg-[#C9A227]/5 p-3">
                  <p className="text-xs text-zinc-500">
                    Data selecionada
                  </p>
                  <p aria-live="polite" className="mt-1 text-sm font-semibold capitalize text-[#E0BB35]">
                    {formatarData(dataSelecionada)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7">
              <h3 className="mb-3 font-semibold">
                <span className="mr-2 text-[#C9A227]">{barbeiros.length > 0 ? "04." : "03."}</span>
                Escolha o horário
              </h3>

              {diaEstaDeFolga() ? (
                <p className="rounded-xl border border-white/10 bg-[#11151B] p-4 text-sm text-zinc-400">
                  {barbeiroSelecionado && barbeiroSelecionado.dia_folga !== Number(diaFolga)
                    ? `${barbeiroSelecionado.nome} não atende nesse dia. Escolha outra data.`
                    : "A barbearia não atende nesse dia. Escolha outra data."}
                </p>
              ) : carregandoHorarios ? (
                <p className="py-3 text-sm text-zinc-400">
                  Consultando horários...
                </p>
              ) : erroHorarios ? (
                <div className="text-sm text-red-300" role="alert">
                  <p>Não foi possível consultar os horários disponíveis.</p>
                  <button type="button" onClick={() => setTentativaHorarios((valor) => valor + 1)} className="mt-2 min-h-11 font-semibold text-[#E0BB35]">Tentar novamente</button>
                </div>
              ) : barbeiros.length > 1 && !barbeiroSelecionado ? (
                <p className="text-sm text-zinc-400">Escolha um barbeiro para consultar os horários disponíveis.</p>
              ) : !servicoSelecionado ? (
                <p className="text-sm text-zinc-400">
                  Selecione um serviço primeiro.
                </p>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded border border-white/20 bg-[#11151B]" />
                      Disponível
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-[#C9A227]" />
                      Selecionado
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-white/10" />
                      Indisponível
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {horarios.map((horario) => {
                      const disponivel =
                        horarioEstaDisponivel(horario);
                      const selecionado =
                        horarioSelecionado === horario;

                      return (
                        <button
                          key={horario}
                          type="button"
                          disabled={!disponivel}
                          aria-pressed={selecionado}
                          onClick={() => {
                            setHorarioSelecionado(horario);
                            setErro("");
                          }}
                          className={`rounded-lg border px-3 py-3 text-sm font-semibold transition ${
                            selecionado
                              ? "border-[#C9A227] bg-[#C9A227] text-black"
                              : disponivel
                                ? "border-white/10 bg-[#11151B] text-zinc-300 hover:border-[#C9A227] hover:text-[#E0BB35]"
                                : "cursor-not-allowed border-white/5 bg-white/[0.03] text-zinc-600 line-through"
                          }`}
                        >
                          {horario}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {servicoSelecionado && (
              <div className="mt-7 rounded-xl border border-[#C9A227]/20 bg-[#11151B] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Resumo do agendamento
                </p>

                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 break-words">
                    <p className="font-semibold">
                      {servicoSelecionado.nome}
                    </p>
                    <p className="mt-1 text-sm capitalize text-zinc-400">
                      {formatarData(dataSelecionada)}
                    </p>
                    {barbeiroSelecionado && (
                      <p className="mt-1 text-sm text-zinc-400">
                        Barbeiro: {barbeiroSelecionado.nome}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-zinc-400">
                      Horário: {horarioSelecionado || "--:--"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Duração: {servicoSelecionado.duracao} minutos
                    </p>
                  </div>

                  <p className="whitespace-nowrap font-bold text-[#C9A227]">
                    {formatarPreco(servicoSelecionado.preco)}
                  </p>
                </div>
              </div>
            )}

            {erro && (
              <p
                role="alert"
                className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
              >
                {erro}
              </p>
            )}

            <button
              type="button"
              onClick={confirmarAgendamento}
              disabled={
                salvando ||
                carregandoHorarios ||
                erroHorarios ||
                (barbeiros.length > 1 && !barbeiroSelecionadoId) ||
                !servicoSelecionado ||
                !horarioSelecionado ||
                diaEstaDeFolga()
              }
              className="mt-6 w-full rounded-xl bg-[#C9A227] px-6 py-3.5 font-bold text-black transition hover:bg-[#E0BB35] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? "Confirmando..." : "Confirmar agendamento"}
            </button>

            <p aria-live="polite" className="mt-3 text-center text-xs leading-5 text-zinc-500">
              {!servicoSelecionado
                ? "Escolha um serviço para continuar."
                : barbeiros.length > 1 && !barbeiroSelecionadoId
                  ? "Escolha um profissional para consultar os horários."
                  : !horarioSelecionado && !erroHorarios
                    ? "Escolha um horário disponível para confirmar."
                    : "A confirmação depende da disponibilidade do horário."}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
