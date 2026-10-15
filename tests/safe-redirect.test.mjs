import test from "node:test";
import assert from "node:assert/strict";
import { safeAuthDestination } from "../lib/auth/safe-redirect.ts";

const origin = "https://naregua.example";

test("callback aceita destinos internos usados pelo produto", () => {
  for (const path of ["/minha-conta", "/painel/login?oauth=1", "/barbearia/centro?servico=1"]) {
    assert.equal(safeAuthDestination(path, origin), path);
  }
});

test("callback rejeita destinos externos e separadores ambíguos", () => {
  for (const path of [
    null, "", "https://evil.example", "//evil.example", "/\\evil.example",
    "/%5cevil.example", "/%2fevil.example", "/minha-conta\n@evil.example",
    "javascript:alert(1)", "  /minha-conta",
  ]) {
    assert.equal(safeAuthDestination(path, origin), "/minha-conta", String(path));
  }
});
