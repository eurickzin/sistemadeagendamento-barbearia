const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Fortaleza",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function agoraEmFortaleza(instant: Date = new Date()) {
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map(({ type, value }) => [type, value]),
  );
  return {
    data: `${parts.year}-${parts.month}-${parts.day}`,
    minutos: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function horarioLocalEmMinutos(data: string, horario: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  const [hora, minuto] = horario.split(":").map(Number);
  return Date.UTC(ano, mes - 1, dia, hora, minuto) / 60_000;
}

export function agoraLocalEmMinutos(instant: Date = new Date()) {
  const { data, minutos } = agoraEmFortaleza(instant);
  const [ano, mes, dia] = data.split("-").map(Number);
  return Date.UTC(ano, mes - 1, dia) / 60_000 + minutos;
}
