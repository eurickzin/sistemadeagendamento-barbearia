import test from "node:test";
import assert from "node:assert/strict";
import { agoraEmFortaleza, agoraLocalEmMinutos, horarioLocalEmMinutos } from "../lib/fortaleza-time.ts";

test("data e hora seguem Fortaleza quando a data UTC já mudou", () => {
  const instant = new Date("2026-10-16T02:30:00Z");
  assert.deepEqual(agoraEmFortaleza(instant), { data: "2026-10-15", minutos: 23 * 60 + 30 });
  assert.equal(agoraLocalEmMinutos(instant), horarioLocalEmMinutos("2026-10-15", "23:30"));
});

test("limite de cancelamento de duas horas usa a hora da barbearia", () => {
  const instant = new Date("2026-10-16T02:30:00Z");
  const agendamento = horarioLocalEmMinutos("2026-10-16", "01:30");
  assert.equal(agoraLocalEmMinutos(instant) < agendamento - 120, false);
});
