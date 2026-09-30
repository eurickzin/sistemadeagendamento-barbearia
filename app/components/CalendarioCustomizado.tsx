"use client";

import { useEffect, useMemo, useState } from "react";

interface CalendarioCustomizadoProps {
  value: string;
  onChange: (data: string) => void;
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
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function removerHora(data: Date) {
  const novaData = new Date(data);

  novaData.setHours(0, 0, 0, 0);

  return novaData;
}

export default function CalendarioCustomizado({
  value,
  onChange,
}: CalendarioCustomizadoProps) {
  const hoje = useMemo(() => removerHora(new Date()), []);

  const [mesAtual, setMesAtual] = useState(() => {
    if (value) {
      const [ano, mes] = value.split("-").map(Number);

      return new Date(ano, mes - 1, 1);
    }

    return new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      1,
    );
  });

  useEffect(() => {
    if (!value) return;

    const [ano, mes] = value.split("-").map(Number);

    setMesAtual(new Date(ano, mes - 1, 1));
  }, [value]);

  const primeiroDiaDoMes = new Date(
    mesAtual.getFullYear(),
    mesAtual.getMonth(),
    1,
  );

  const ultimoDiaDoMesAtual = new Date(
    mesAtual.getFullYear(),
    mesAtual.getMonth() + 1,
    0,
  );

  const primeiroDiaDoProximoMes = new Date(
    mesAtual.getFullYear(),
    mesAtual.getMonth() + 1,
    1,
  );

  const ultimoDiaDoProximoMes = new Date(
    mesAtual.getFullYear(),
    mesAtual.getMonth() + 2,
    0,
  );

  const primeiroDiaDaGrade = new Date(
    primeiroDiaDoMes,
  );

  // JavaScript:
  // Domingo = 0
  // Segunda = 1
  // Terça = 2
  // ...
  //
  // Como nosso calendário começa na segunda,
  // ajustamos o deslocamento.

  const diaSemana = primeiroDiaDoMes.getDay();

  const deslocamento =
    diaSemana === 0 ? 6 : diaSemana - 1;

  primeiroDiaDaGrade.setDate(
    primeiroDiaDaGrade.getDate() - deslocamento,
  );

  const dias = Array.from(
    { length: 42 },
    (_, index) => {
      const data = new Date(primeiroDiaDaGrade);

      data.setDate(
        primeiroDiaDaGrade.getDate() + index,
      );

      return data;
    },
  );

  function mudarMes(direcao: number) {
    setMesAtual(
      new Date(
        mesAtual.getFullYear(),
        mesAtual.getMonth() + direcao,
        1,
      ),
    );
  }

  function voltarParaHoje() {
    setMesAtual(
      new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        1,
      ),
    );
  }

  return (
    <div className="w-full">
      {/* CABEÇALHO DO CALENDÁRIO */}

      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => mudarMes(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition-all hover:border-[#C9A227]/40 hover:bg-[#C9A227]/10 hover:text-[#C9A227]"
          aria-label="Mês anterior"
        >
          ‹
        </button>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-white">
            {nomesMeses[mesAtual.getMonth()]}
          </h3>

          <p className="text-sm text-zinc-500">
            {mesAtual.getFullYear()}
          </p>
        </div>

        <button
          type="button"
          onClick={() => mudarMes(1)}
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
          onClick={voltarParaHoje}
          className="text-xs font-medium text-[#C9A227] transition-colors hover:text-[#E0BB35]"
        >
          Voltar para hoje
        </button>
      </div>

      {/* DIAS DA SEMANA */}

      <div className="mb-2 grid grid-cols-7">
        {nomesDias.map((dia) => (
          <div
            key={dia}
            className="flex h-9 items-center justify-center text-[11px] font-semibold text-zinc-500"
          >
            {dia}
          </div>
        ))}
      </div>

      {/* DIAS */}

      <div className="grid grid-cols-7 gap-1">
        {dias.map((data) => {
          const dataFormatada = formatarData(data);

          const dataSemHora = removerHora(data);

          const passado = dataSemHora < hoje;

          // JavaScript:
          // Segunda = 1
          const diaDaSemana = dataSemHora.getDay();

          // Segunda-feira está fechada
          const diaFechado = diaDaSemana === 1;

          const pertenceAoMes =
            data.getMonth() === mesAtual.getMonth() &&
            data.getFullYear() ===
              mesAtual.getFullYear();

          const pertenceAoMesAtualOuProximo =
            (data >= primeiroDiaDoMes &&
              data <= ultimoDiaDoMesAtual) ||
            (data >= primeiroDiaDoProximoMes &&
              data <= ultimoDiaDoProximoMes);

          const selecionada =
            value === dataFormatada;

          const hojeAtual =
            dataFormatada === formatarData(hoje);

          const desabilitado =
            passado || diaFechado;

          return (
            <button
              key={dataFormatada}
              type="button"
              disabled={desabilitado}
              onClick={() => {
                if (!desabilitado) {
                  onChange(dataFormatada);
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
                  pertenceAoMesAtualOuProximo
                    ? "text-zinc-200 hover:-translate-y-[1px] hover:bg-[#C9A227]/10 hover:text-[#C9A227]"
                    : ""
                }

                ${
                  !pertenceAoMesAtualOuProximo
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