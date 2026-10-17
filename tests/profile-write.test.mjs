import assert from "node:assert/strict";
import { test } from "node:test";

import { saveOwnProfile } from "../lib/neon/profile.ts";

function profileClient(results) {
  const calls = [];
  const client = {
    from(table) {
      assert.equal(table, "profiles");
      const query = {
        update(values) {
          calls.push({ operation: "update", values });
          return query;
        },
        insert(values) {
          calls.push({ operation: "insert", values });
          return query;
        },
        eq(column, value) {
          calls.at(-1).filter = { column, value };
          return query;
        },
        select(column) {
          assert.equal(column, "id");
          return query;
        },
        async maybeSingle() {
          return results.shift();
        },
      };
      return query;
    },
  };
  return { client, calls };
}

test("cria perfil ausente sem tentar atualizar o ID", async () => {
  const { client, calls } = profileClient([
    { data: null, error: null },
    { data: { id: "own-id" }, error: null },
  ]);
  assert.equal(await saveOwnProfile(client, "own-id", { nome: "Teste" }), true);
  assert.deepEqual(calls, [
    { operation: "update", values: { nome: "Teste" }, filter: { column: "id", value: "own-id" } },
    { operation: "insert", values: { id: "own-id", nome: "Teste" } },
  ]);
});

test("atualiza perfil existente sem inserir outra linha", async () => {
  const { client, calls } = profileClient([{ data: { id: "own-id" }, error: null }]);
  assert.equal(await saveOwnProfile(client, "own-id", { telefone: "000000000" }), true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].values, { telefone: "000000000" });
});
