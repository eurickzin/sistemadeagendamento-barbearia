// Run only against an isolated Supabase TEST project after both migrations.
// service_role creates/removes fixtures; every authorization assertion uses
// separate anon or authenticated clients, never the admin client.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey || process.env.SECURITY_TEST_ENV !== "isolated") {
  console.error("BLOCKED: isolated TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, TEST_SUPABASE_SERVICE_ROLE_KEY and SECURITY_TEST_ENV=isolated are required.");
  process.exit(77);
}
const localEnvPath = new URL("../.env.local", import.meta.url);
const localEnv = existsSync(localEnvPath) ? readFileSync(localEnvPath, "utf8") : "";
const configuredUrl = localEnv.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1]?.replace(/^['"]|['"]$/g, "");
if (configuredUrl && new URL(configuredUrl).origin === new URL(url).origin) {
  console.error("BLOCKED: test project matches the application's configured Supabase project.");
  process.exit(77);
}

const client = (key = anonKey) => createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const admin = client(serviceKey);
const anon = client();
const accounts = [];
const shops = [];
const storagePaths = [];
const results = [];
const suffix = randomUUID().slice(0, 8);
const tomorrow = new Date(Date.now() + 14 * 86400000);
const dateForDay = (day) => {
  const date = new Date(tomorrow);
  while (date.getUTCDay() !== day) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};
const workDate = dateForDay(2);
const closedDate = dateForDay(0);

async function check(name, expected, fn) {
  try {
    const observed = await fn();
    results.push({ name, expected, observed: observed ?? "assertions passed", status: "passou" });
  } catch (error) {
    results.push({ name, expected, observed: error.message, status: "falhou" });
  }
}
function noError(result) { assert.equal(result.error, null, result.error?.message); return result.data; }
function denied(result) { assert.ok(result.error || !result.data || (Array.isArray(result.data) && result.data.length === 0), "unauthorized operation returned data"); }
async function user(label) {
  const email = `naregua-${suffix}-${label}@example.invalid`;
  const password = `Naregua-test-${randomUUID()}`;
  const created = noError(await admin.auth.admin.createUser({ email, password, email_confirm: true }));
  accounts.push(created.user.id);
  // The test project may have a schema-only copy without the production
  // auth.users trigger. Seed a known profile so deny checks are not vacuous.
  noError(await admin.from("profiles").upsert({
    id: created.user.id, nome: `Teste ${label}`, telefone: "00000000000",
  }).select("id").single());
  const session = client();
  noError(await session.auth.signInWithPassword({ email, password }));
  return { id: created.user.id, session };
}
async function insertOne(db, table, value) {
  return noError(await db.from(table).insert(value).select().single());
}
const booking = (who, shop, service, barber, time, extra = {}) => ({
  usuario_id: who.id, barbearia_id: shop.id, servico_id: service.id,
  barbeiro_id: barber?.id ?? null, data: workDate, horario: time, status: "confirmado", ...extra,
});

try {
  const [ownerA, ownerB, clientA, clientB] = await Promise.all([
    user("owner-a"), user("owner-b"), user("client-a"), user("client-b"),
  ]);
  await check("perfis: controle positivo e isolamento", "client A reads self and cannot read client B", async () => {
    assert.equal(noError(await clientA.session.from("profiles").select("id").eq("id", clientA.id)).length, 1);
    assert.equal(noError(await clientA.session.from("profiles").select("id").eq("id", clientB.id)).length, 0);
  });
  const shopA = await insertOne(ownerA.session, "barbearias", {
    nome: `Test A ${suffix}`, slug: `security-test-a-${suffix}`, ativa: true,
    proprietario_id: ownerA.id,
  });
  const shopB = await insertOne(ownerB.session, "barbearias", {
    nome: `Test B ${suffix}`, slug: `security-test-b-${suffix}`, ativa: true,
    proprietario_id: ownerB.id,
  });
  shops.push(shopA.id, shopB.id);
  const schedule = Array.from({ length: 7 }, (_, day) => ({
    aberto: day !== 0, abertura: "08:00", fechamento: "21:00",
  }));
  noError(await ownerA.session.from("barbearias").update({ horarios_funcionamento: schedule }).eq("id", shopA.id));
  noError(await ownerB.session.from("barbearias").update({ horarios_funcionamento: schedule }).eq("id", shopB.id));
  const serviceA = await insertOne(ownerA.session, "servicos", { nome: "Corte A", preco: 50, duracao: 60, ativo: true, barbearia_id: shopA.id });
  const serviceB = await insertOne(ownerB.session, "servicos", { nome: "Corte B", preco: 60, duracao: 60, ativo: true, barbearia_id: shopB.id });
  const privateB = await insertOne(ownerB.session, "servicos", { nome: "Privado B", preco: 70, duracao: 60, ativo: false, barbearia_id: shopB.id });
  const barberA1 = await insertOne(ownerA.session, "barbeiros", { nome: "A1", ativo: true, barbearia_id: shopA.id, horario_abertura: "08:00", horario_fechamento: "21:00", dia_folga: 0 });
  const barberA2 = await insertOne(ownerA.session, "barbeiros", { nome: "A2", ativo: true, barbearia_id: shopA.id, horario_abertura: "08:00", horario_fechamento: "21:00", dia_folga: 0 });
  const barberB = await insertOne(ownerB.session, "barbeiros", { nome: "B1", ativo: true, barbearia_id: shopB.id, horario_abertura: "08:00", horario_fechamento: "21:00", dia_folga: 0 });

  await check("anon: público e privado", "shops/services public; no appointments", async () => {
    assert.equal(noError(await anon.from("barbearias").select("id").eq("id", shopA.id)).length, 1);
    assert.equal(noError(await anon.from("servicos").select("id").eq("id", serviceA.id)).length, 1);
    denied(await anon.from("agendamentos").select("id"));
  });
  await check("proprietário A: isolamento sem filtro", "A visible, B private hidden", async () => {
    assert.equal(noError(await ownerB.session.from("servicos").select("id").eq("id", privateB.id)).length, 1);
    assert.equal(noError(await ownerA.session.from("servicos").select("id").eq("id", privateB.id)).length, 0);
    denied(await ownerA.session.from("servicos").insert({ nome: "intruso", preco: 1, duracao: 30, ativo: true, barbearia_id: shopB.id }).select());
    denied(await ownerA.session.from("servicos").update({ preco: 1 }).eq("id", privateB.id).select());
    denied(await ownerA.session.from("servicos").delete().eq("id", privateB.id).select());
    assert.equal(noError(await ownerB.session.from("servicos").select("preco").eq("id", privateB.id).single()).preco, 70);
  });
  await check("campos de proprietário e perfil", "client cannot become owner or edit another profile", async () => {
    denied(await clientA.session.from("barbearias").insert({ nome: "fake", slug: `fake-${suffix}`, proprietario_id: ownerA.id, ativa: true }).select());
    denied(await ownerA.session.from("barbearias").update({ proprietario_id: clientA.id }).eq("id", shopA.id).select());
    denied(await clientA.session.from("profiles").update({ nome: "alterado" }).eq("id", clientB.id).select());
  });
  await check("relações cruzadas", "foreign service/barber rejected", async () => {
    denied(await clientA.session.from("agendamentos").insert(booking(clientA, shopA, serviceB, barberA1, "09:00")).select());
    denied(await clientA.session.from("agendamentos").insert(booking(clientA, shopA, serviceA, barberB, "09:00")).select());
    denied(await clientA.session.from("agendamentos").insert(booking(clientB, shopA, serviceA, barberA1, "09:00")).select());
    denied(await clientA.session.from("agendamentos").insert({ ...booking(clientA, shopA, serviceA, barberA1, "09:00"), servico_id: -1 }).select());
  });
  await check("horários inválidos e instantâneo forjado", "all rejected", async () => {
    denied(await clientA.session.from("agendamentos").insert(booking(clientA, shopA, serviceA, barberA1, "07:00")).select());
    denied(await clientA.session.from("agendamentos").insert({ ...booking(clientA, shopA, serviceA, barberA1, "09:00"), data: closedDate }).select());
    denied(await clientA.session.from("agendamentos").insert({ ...booking(clientA, shopA, serviceA, barberA1, "09:00"), data: "2020-01-01" }).select());
    denied(await clientA.session.from("agendamentos").insert({ ...booking(clientA, shopA, serviceA, barberA1, "09:00"), servico_preco: 1, servico_duracao: 1 }).select());
  });

  await check("concorrência: mesmo horário", "exactly one accepted", async () => {
    const outcomes = await Promise.all([
      clientA.session.from("agendamentos").insert(booking(clientA, shopA, serviceA, barberA1, "10:00")).select().single(),
      clientB.session.from("agendamentos").insert(booking(clientB, shopA, serviceA, barberA1, "10:00")).select().single(),
    ]);
    assert.equal(outcomes.filter((x) => !x.error).length, 1);
  });
  await check("disponibilidade pública sem dados pessoais", "occupied interval visible; appointment record private", async () => {
    const occupied = noError(await anon.rpc("naregua_ocupacao", { p_barbearia_id: shopA.id, p_data: workDate }));
    assert.ok(occupied.some((item) => item.horario.startsWith("10:00") && item.servico_duracao === 60));
    assert.ok(occupied.every((item) => Object.keys(item).sort().join(",") === "barbeiro_id,horario,servico_duracao"));
    denied(await anon.from("agendamentos").select("id,usuario_id"));
  });
  await check("repetição não duplica notificação", "one booking and one notification after concurrent retry", async () => {
    const bookings = noError(await ownerA.session.from("agendamentos")
      .select("id").eq("barbearia_id", shopA.id).eq("data", workDate).eq("horario", "10:00"));
    assert.equal(bookings.length, 1);
    const notices = noError(await ownerA.session.from("notificacoes_barbeiro")
      .select("agendamento_id").eq("agendamento_id", bookings[0].id));
    assert.equal(notices.length, 1);
  });
  await check("concorrência: início diferente e sobreposição", "exactly one accepted", async () => {
    const outcomes = await Promise.all([
      clientA.session.from("agendamentos").insert(booking(clientA, shopA, serviceA, barberA1, "11:00")).select().single(),
      clientB.session.from("agendamentos").insert(booking(clientB, shopA, serviceA, barberA1, "11:30")).select().single(),
    ]);
    assert.equal(outcomes.filter((x) => !x.error).length, 1);
  });
  await check("adjacência e barbeiros distintos", "both accepted", async () => {
    noError(await clientA.session.from("agendamentos").insert(booking(clientA, shopA, serviceA, barberA1, "12:00")));
    noError(await clientB.session.from("agendamentos").insert(booking(clientB, shopA, serviceA, barberA1, "13:00")));
    noError(await clientA.session.from("agendamentos").insert(booking(clientA, shopA, serviceA, barberA2, "12:00")));
  });
  await check("capacidade sem barbeiro", "one shared slot; no named overlap", async () => {
    noError(await clientA.session.from("agendamentos").insert(booking(clientA, shopA, serviceA, null, "14:00")));
    denied(await clientB.session.from("agendamentos").insert(booking(clientB, shopA, serviceA, barberA2, "14:30")).select());
  });
  await check("cancelamento libera horário", "another client can book", async () => {
    const existing = await insertOne(clientA.session, "agendamentos", booking(clientA, shopA, serviceA, barberA1, "16:00"));
    noError(await clientA.session.from("agendamentos").update({ status: "cancelado" }).eq("id", existing.id));
    noError(await clientB.session.from("agendamentos").insert(booking(clientB, shopA, serviceA, barberA1, "16:00")));
    denied(await clientA.session.from("agendamentos").update({ status: "confirmado" }).eq("id", existing.id).select());
  });
  await check("reagendamento e status sensível", "direct edit and invalid transition rejected", async () => {
    const own = noError(await clientA.session.from("agendamentos").select("id").eq("barbearia_id", shopA.id).eq("status", "confirmado").limit(1).single());
    denied(await clientA.session.from("agendamentos").update({ horario: "12:30" }).eq("id", own.id).select());
    denied(await clientA.session.from("agendamentos").update({ status: "concluido" }).eq("id", own.id).select());
  });
  await check("isolamento de agendamentos e papel misto", "own + own shop only", async () => {
    const bBooking = await insertOne(clientB.session, "agendamentos", booking(clientB, shopB, serviceB, barberB, "10:00"));
    const mixed = await insertOne(ownerA.session, "agendamentos", booking(ownerA, shopB, serviceB, barberB, "12:00"));
    const aView = noError(await ownerA.session.from("agendamentos").select("id"));
    assert.ok(aView.some((x) => x.id === mixed.id));
    assert.ok(!aView.some((x) => x.id === bBooking.id));
    assert.ok(noError(await clientB.session.from("agendamentos").select("id")).some((x) => x.id === bBooking.id));
    assert.ok(!noError(await clientA.session.from("agendamentos").select("id")).some((x) => x.id === bBooking.id));
  });
  await check("histórico de preço/duração", "snapshot remains after service edit", async () => {
    const existing = noError(await clientA.session.from("agendamentos").select("id,servico_preco,servico_duracao").eq("barbearia_id", shopA.id).limit(1).single());
    noError(await ownerA.session.from("servicos").update({ preco: 99, duracao: 90 }).eq("id", serviceA.id));
    const saved = noError(await clientA.session.from("agendamentos").select("servico_preco,servico_duracao").eq("id", existing.id).single());
    assert.deepEqual(saved, { servico_preco: existing.servico_preco, servico_duracao: existing.servico_duracao });
  });
  await check("duração e preço sensíveis", "invalid service values and appointment fields rejected", async () => {
    denied(await ownerA.session.from("servicos").update({ duracao: 0 }).eq("id", serviceA.id).select());
    denied(await ownerA.session.from("servicos").update({ preco: -1 }).eq("id", serviceA.id).select());
    const own = noError(await clientA.session.from("agendamentos").select("id").eq("barbearia_id", shopA.id).limit(1).single());
    denied(await clientA.session.from("agendamentos").update({ servico_preco: 1 }).eq("id", own.id).select());
    denied(await clientA.session.from("agendamentos").update({ usuario_id: clientB.id }).eq("id", own.id).select());
    denied(await clientA.session.from("agendamentos").update({ barbearia_id: shopB.id }).eq("id", own.id).select());
  });
  await check("cota de upload protegida", "authenticated cannot claim another user's slot", async () => {
    const result = await clientA.session.rpc("naregua_claim_upload_slot", { p_user_id: clientB.id });
    assert.ok(result.error, "quota RPC was callable by a browser client");
  });
  await check("cota de upload concorrente", "ten slots accepted; eleventh rejected", async () => {
    const claims = await Promise.all(Array.from({ length: 11 }, () =>
      admin.rpc("naregua_claim_upload_slot", { p_user_id: clientB.id })));
    assert.ok(claims.every((result) => !result.error), claims.find((result) => result.error)?.error?.message);
    assert.equal(claims.filter((result) => result.data === true).length, 10);
    assert.equal(claims.filter((result) => result.data === false).length, 1);
  });
  await check("exclusão de serviço arquivado", "historical appointment retains snapshot", async () => {
    const existing = noError(await clientA.session.from("agendamentos")
      .select("id,servico_nome,servico_preco,servico_duracao")
      .eq("servico_id", serviceA.id).limit(1).single());
    noError(await ownerA.session.from("servicos").update({ excluido_em: new Date().toISOString() }).eq("id", serviceA.id));
    noError(await ownerA.session.from("servicos").delete().eq("id", serviceA.id));
    const saved = noError(await clientA.session.from("agendamentos")
      .select("servico_id,servico_nome,servico_preco,servico_duracao")
      .eq("id", existing.id).single());
    assert.equal(saved.servico_id, null);
    assert.deepEqual([saved.servico_nome, saved.servico_preco, saved.servico_duracao],
      [existing.servico_nome, existing.servico_preco, existing.servico_duracao]);
  });
  await check("Storage direto", "client write forbidden", async () => {
    const fake = new Blob(["not an image"], { type: "image/png" });
    const result = await clientA.session.storage.from("profile-images").upload(`${clientA.id}/avatar-direct.png`, fake);
    assert.ok(result.error, "direct Storage upload unexpectedly succeeded");
  });
  await check("Storage: exclusão cruzada e acesso público", "other user cannot delete; public image readable", async () => {
    const path = `${clientA.id}/avatar-security-${suffix}.webp`;
    const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: "blue" } }).webp().toBuffer();
    noError(await admin.storage.from("profile-images").upload(path, image, { contentType: "image/webp" }));
    storagePaths.push(path);
    await clientB.session.storage.from("profile-images").remove([path]);
    const stillThere = await admin.storage.from("profile-images").download(path);
    assert.equal(stillThere.error, null, "other user removed the file");
    const publicUrl = admin.storage.from("profile-images").getPublicUrl(path).data.publicUrl;
    assert.equal((await fetch(publicUrl)).status, 200);
    noError(await clientA.session.storage.from("profile-images").remove([path]));
  });
  await check("sessão inválida", "direct REST request rejected", async () => {
    const response = await fetch(`${url}/rest/v1/agendamentos?select=id`, {
      headers: { apikey: anonKey, authorization: "Bearer invalid.jwt.token" },
    });
    assert.ok([401, 403].includes(response.status), `HTTP ${response.status}`);
  });
  await check("logout", "no private reads after signOut", async () => {
    noError(await clientA.session.auth.signOut());
    denied(await clientA.session.from("agendamentos").select("id"));
  });
} catch (error) {
  results.push({ name: "fixture/setup", expected: "two owners, two shops, two clients", observed: error.message, status: "bloqueado" });
} finally {
  if (storagePaths.length) await admin.storage.from("profile-images").remove(storagePaths);
  for (const shopId of shops) {
    await admin.from("notificacoes_barbeiro").delete().eq("barbearia_id", shopId);
    await admin.from("agendamentos").delete().eq("barbearia_id", shopId);
    await admin.from("servicos").delete().eq("barbearia_id", shopId);
    await admin.from("barbeiros").delete().eq("barbearia_id", shopId);
    await admin.from("barbearias").delete().eq("id", shopId);
  }
  for (const id of accounts) {
    await admin.from("profiles").delete().eq("id", id);
    await admin.auth.admin.deleteUser(id);
  }
  console.log(JSON.stringify(results, null, 2));
  if (results.some((r) => r.status !== "passou")) process.exitCode = 1;
}
