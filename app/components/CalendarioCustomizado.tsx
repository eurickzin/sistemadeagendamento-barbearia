"use client";

import { useEffect, useState } from "react";

interface CalendarioCustomizadoProps {
  value: string;
  onChange: (data: string) => void;
  diaFolga: number | null;
}

const nomesMeses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const nomesDias = [
  "SEG",
  "TER",
  "QUA",
  "QUI",
  "SEX",
  "SÁB",
  "DOM",
];

function formatarData(data: Date) {
  const ano = data.getFullYear();

  const mes = String(
    data.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    data.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function removerHora(data: Date) {
  const novaData = new Date(data);

  novaData.setHours(0, 0, 0, 0);

  return novaData;
}

function obterHoje() {
  return removerHora(new Date());
}

export default function CalendarioCustomizado({
  value,
  onChange,
  diaFolga,
}: CalendarioCustomizadoProps) {
  const [hoje, setHoje] = useState(() =>
    obterHoje()
  );

  const [mesAtual, setMesAtual] = useState(() => {
    if (value) {
      const [ano, mes] = value
        .split("-")
        .map(Number);

      return new Date(
        ano,
        mes - 1,
        1
      );
    }

    const dataHoje = obterHoje();

    return new Date(
      dataHoje.getFullYear(),
      dataHoje.getMonth(),
      1
    );
  });

  // =========================================================
  // ATUALIZAR DATA ATUAL
  // =========================================================

  useEffect(() => {
    const atualizarHoje = () => {
      setHoje(obterHoje());
    };

    const intervalo = setInterval(
      atualizarHoje,
      60 * 1000
    );

    return () => {
      clearInterval(intervalo);
    };
  }, []);

  // =========================================================
  // SINCRONIZAR COM A DATA SELECIONADA
  // =========================================================

  useEffect(() => {
    if (!value) return;

    const [ano, mes] = value
      .split("-")
      .map(Number);

    if (
      Number.isNaN(ano) ||
      Number.isNaN(mes)
    ) {
      return;
    }

    setMesAtual(
      new Date(
        ano,
        mes - 1,
        1
      )
    );
  }, [value]);

  // =========================================================
  // PRIMEIRO DIA DO MÊS
  // =========================================================

  const primeiroDiaDoMes =
    new Date(
      mesAtual.getFullYear(),
      mesAtual.getMonth(),
      1
    );

  // =========================================================
  // AJUSTAR CALENDÁRIO PARA COMEÇAR NA SEGUNDA
  // =========================================================

  const diaSemana =
    primeiroDiaDoMes.getDay();

  const deslocamento =
    diaSemana === 0
      ? 6
      : diaSemana - 1;

  const primeiroDiaDaGrade =
    new Date(
      primeiroDiaDoMes
    );

  primeiroDiaDaGrade.setDate(
    primeiroDiaDaGrade.getDate() -
      deslocamento
  );

  // =========================================================
  // GERAR 42 DIAS
  // =========================================================

  const dias = Array.from(
    { length: 42 },
    (_, index) => {
      const data =
        new Date(
          primeiroDiaDaGrade
        );

      data.setDate(
        primeiroDiaDaGrade.getDate() +
          index
      );

      return data;
    }
  );

  // =========================================================
  // MUDAR MÊS
  // =========================================================

  function mudarMes(
    direcao: number
  ) {
    setMesAtual(
      new Date(
        mesAtual.getFullYear(),
        mesAtual.getMonth() +
          direcao,
        1
      )
    );
  }

  // =========================================================
  // VOLTAR PARA HOJE
  // =========================================================

  function voltarParaHoje() {
    const dataHoje =
      obterHoje();

    setHoje(dataHoje);

    setMesAtual(
      new Date(
        dataHoje.getFullYear(),
        dataHoje.getMonth(),
        1
      )
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="w-full">

      {/* CABEÇALHO */}

      <div className="mb-5 flex items-center justify-between">

        <button
          type="button"
          onClick={() =>
            mudarMes(-1)
          }
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition-all hover:border-[#C9A227]/40 hover:bg-[#C9A227]/10 hover:text-[#C9A227]"
          aria-label="Mês anterior"
        >
          ‹
        </button>

        <div className="text-center">

          <h3 className="text-lg font-semibold text-white">
            {
              nomesMeses[
                mesAtual.getMonth()
              ]
            }
          </h3>

          <p className="text-sm text-zinc-500">
            {mesAtual.getFullYear()}
          </p>

        </div>

        <button
          type="button"
          onClick={() =>
            mudarMes(1)
          }
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition-all hover:border-[#C9A227]/40 hover:bg-[#C9A227]/10 hover:text-[#C9A227]"
          aria-label="Próximo mês"
        >
          ›
        </button>

      </div>

      {/* VOLTAR PARA HOJE */}

      <div className="mb-4 flex justify-center">

        <button
          type="button"
          onClick={
            voltarParaHoje
          }
          className="text-xs font-medium text-[#C9A227] transition-colors hover:text-[#E0BB35]"
        >
          Voltar para hoje
        </button>

      </div>

      {/* DIAS DA SEMANA */}

      <div className="mb-2 grid grid-cols-7">

        {nomesDias.map(
          (dia) => (
            <div
              key={dia}
              className="flex h-9 items-center justify-center text-[11px] font-semibold text-zinc-500"
            >
              {dia}
            </div>
          )
        )}

      </div>

      {/* DIAS */}

      <div className="grid grid-cols-7 gap-1">

        {dias.map((data) => {

          const dataFormatada =
            formatarData(data);

          const dataSemHora =
            removerHora(data);

          // =================================================
          // DIA JÁ PASSOU
          // =================================================

          const passado =
            dataSemHora.getTime() <
            hoje.getTime();

          // =================================================
          // DIA DA SEMANA
          //
          // Domingo = 0
          // Segunda = 1
          // Terça = 2
          // Quarta = 3
          // Quinta = 4
          // Sexta = 5
          // Sábado = 6
          // =================================================

          const diaDaSemana =
            dataSemHora.getDay();

          // =================================================
          // HOJE
          // =================================================

          const hojeAtual =
            dataFormatada ===
            formatarData(hoje);

          // =================================================
          // DIA DE FOLGA
          //
          // Agora vem do Supabase.
          //
          // Exemplo:
          // diaFolga = 1 → Segunda
          // diaFolga = 2 → Terça
          // diaFolga = 6 → Sábado
          //
          // null = nenhum dia configurado
          // =================================================

          const diaFechado =
            diaFolga !== null &&
            diaDaSemana ===
              diaFolga;

          // =================================================
          // PERTENCE AO MÊS ATUAL
          // =================================================

          const pertenceAoMes =
            data.getMonth() ===
              mesAtual.getMonth() &&
            data.getFullYear() ===
              mesAtual.getFullYear();

          // =================================================
          // DATA SELECIONADA
          // =================================================

          const selecionada =
            value ===
            dataFormatada;

          // =================================================
          // DESABILITADO
          //
          // Importante:
          //
          // Hoje NÃO é considerado passado.
          //
          // O horário de hoje é tratado
          // pelo AgendamentoModal.
          // =================================================

          const desabilitado =
            passado ||
            diaFechado;

          return (
            <button
              key={dataFormatada}
              type="button"
              disabled={
                desabilitado
              }
              onClick={() => {

                if (
                  !desabilitado
                ) {
                  onChange(
                    dataFormatada
                  );
                }

              }}
              className={`
                relative flex aspect-square items-center justify-center
                rounded-lg text-sm font-medium
                transition-all duration-200

                ${
                  selecionada
                    ? "bg-[#C9A227] font-bold text-black shadow-lg shadow-[#C9A227]/20"
                    : ""
                }

                ${
                  !selecionada &&
                  !passado &&
                  !diaFechado &&
                  pertenceAoMes
                    ? "text-zinc-200 hover:-translate-y-[1px] hover:bg-[#C9A227]/10 hover:text-[#C9A227]"
                    : ""
                }

                ${
                  !pertenceAoMes
                    ? "text-zinc-800"
                    : ""
                }

                ${
                  passado
                    ? "cursor-not-allowed text-zinc-700"
                    : ""
                }

                ${
                  diaFechado
                    ? "cursor-not-allowed text-zinc-700 opacity-40"
                    : ""
                }

                ${
                  hojeAtual &&
                  !selecionada &&
                  !passado &&
                  !diaFechado
                    ? "ring-1 ring-[#C9A227]/30"
                    : ""
                }
              `}
            >

              {data.getDate()}

              {/* INDICADOR DE HOJE */}

              {hojeAtual &&
                !selecionada &&
                !passado &&
                !diaFechado && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#C9A227]" />
                )}

            </button>
          );
        })}

      </div>

    </div>
  );
}
