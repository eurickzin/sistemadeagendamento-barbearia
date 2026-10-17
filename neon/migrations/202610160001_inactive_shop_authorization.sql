-- Review and apply manually to the authorized Neon project only.
-- Keep the owner able to read their shop row so the login can explain a
-- deactivation; block all other owner access while the shop is inactive.
begin;

alter policy barbearias_proprietario_update on public.barbearias
  using (proprietario_id::text = auth.user_id() and ativa)
  with check (proprietario_id::text = auth.user_id() and ativa);

alter policy servicos_proprietario_select on public.servicos
  using (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa));
alter policy servicos_proprietario_insert on public.servicos
  with check (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa));
alter policy servicos_proprietario_update on public.servicos
  using (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa))
  with check (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa));
alter policy servicos_proprietario_delete on public.servicos
  using (excluido_em is not null and exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa));

alter policy barbeiros_proprietario_select on public.barbeiros
  using (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa));
alter policy barbeiros_proprietario_insert on public.barbeiros
  with check (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa));
alter policy barbeiros_proprietario_update on public.barbeiros
  using (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa))
  with check (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa));
alter policy barbeiros_proprietario_delete on public.barbeiros
  using (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa));

alter policy agendamentos_proprietario_select on public.agendamentos
  using (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa));
alter policy agendamentos_proprietario_update on public.agendamentos
  using (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa))
  with check (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa));

alter policy profiles_proprietario_clientes_select on public.profiles
  using (exists (select 1 from public.agendamentos a
    join public.barbearias b on b.id = a.barbearia_id
    where a.usuario_id = profiles.id and b.proprietario_id::text = auth.user_id() and b.ativa));

alter policy notificacoes_proprietario_select on public.notificacoes_barbeiro
  using (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa));
alter policy notificacoes_proprietario_update on public.notificacoes_barbeiro
  using (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa))
  with check (exists (select 1 from public.barbearias b
    where b.id = barbearia_id and b.proprietario_id::text = auth.user_id() and b.ativa));

commit;
