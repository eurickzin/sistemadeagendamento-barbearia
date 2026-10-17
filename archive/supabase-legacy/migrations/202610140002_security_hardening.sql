-- Apply only after 202610140001 has passed in an isolated test project.
-- Review the captured policy/grant inventory before applying to production.
begin;

create extension if not exists btree_gist;

-- No implicit repair: these statements fail if legacy data violates the rules.
create unique index barbearias_um_proprietario_idx on public.barbearias (proprietario_id);
alter table public.servicos add constraint servicos_preco_duracao_validos
  check (preco is not null and preco > 0 and duracao is not null and duracao > 0);
alter table public.agendamentos add constraint agendamentos_duracao_ativa_valida
  check (status = 'cancelado' or (servico_duracao is not null and servico_duracao > 0));

-- [start,end) permits adjacent appointments and rejects overlapping starts.
alter table public.agendamentos add constraint agendamentos_barbeiro_sem_sobreposicao
  exclude using gist (
    barbeiro_id with =,
    tsrange(data + horario, data + horario + servico_duracao * interval '1 minute', '[)') with &&
  ) where (barbeiro_id is not null and status <> 'cancelado');
alter table public.agendamentos add constraint agendamentos_sem_barbeiro_sem_sobreposicao
  exclude using gist (
    barbearia_id with =,
    tsrange(data + horario, data + horario + servico_duracao * interval '1 minute', '[)') with &&
  ) where (barbeiro_id is null and status <> 'cancelado');

-- The old snapshot trigger only ran when servico_id changed, allowing direct
-- writes to the snapshot columns. Replace it with full validation on every write.
drop trigger if exists salvar_dados_servico_agendamento on public.agendamentos;
drop trigger if exists validar_barbeiro_agendamento_ativo on public.agendamentos;

create or replace function public.naregua_validar_agendamento()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  shop public.barbearias%rowtype;
  service public.servicos%rowtype;
  barber public.barbeiros%rowtype;
  day_config jsonb;
  opening time;
  closing time;
  is_owner boolean;
  privileged boolean;
begin
  privileged := current_setting('request.jwt.claim.role', true) = 'service_role'
    or session_user = 'postgres';
  if not privileged and auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into shop from public.barbearias where id = new.barbearia_id;
  if not found then raise exception 'Invalid barbershop' using errcode = '23503'; end if;
  is_owner := shop.proprietario_id = auth.uid();

  if tg_op = 'UPDATE' then
    -- ON DELETE SET NULL keeps historical snapshots when an archived service
    -- is permanently removed. Clients have no UPDATE grant on servico_id.
    if old.servico_id is not null and new.servico_id is null
       and new.status = old.status
       and (new.id, new.usuario_id, new.barbearia_id, new.barbeiro_id,
            new.data, new.horario, new.servico_nome, new.servico_descricao,
            new.servico_preco, new.servico_duracao)
           is not distinct from
           (old.id, old.usuario_id, old.barbearia_id, old.barbeiro_id,
            old.data, old.horario, old.servico_nome, old.servico_descricao,
            old.servico_preco, old.servico_duracao)
       and not exists (select 1 from public.servicos where id = old.servico_id) then
      return new;
    end if;
    if (new.id, new.usuario_id, new.barbearia_id, new.servico_id,
        new.barbeiro_id, new.data, new.horario, new.servico_nome,
        new.servico_descricao, new.servico_preco, new.servico_duracao)
       is distinct from
       (old.id, old.usuario_id, old.barbearia_id, old.servico_id,
        old.barbeiro_id, old.data, old.horario, old.servico_nome,
        old.servico_descricao, old.servico_preco, old.servico_duracao) then
      raise exception 'Appointment fields cannot be changed' using errcode = '42501';
    end if;
    if new.status = old.status then return new; end if;
    if new.status = 'cancelado' and old.status in ('confirmado', 'pendente', 'aguardando') then
      if not privileged and not is_owner and new.usuario_id <> auth.uid() then
        raise exception 'Appointment owner required' using errcode = '42501';
      end if;
      if not privileged and not is_owner and
         (old.data + old.horario) - (now() at time zone 'America/Fortaleza') <= interval '2 hours' then
        raise exception 'Cancellation deadline passed' using errcode = '23514';
      end if;
      return new;
    end if;
    if is_owner or privileged then
      if old.status in ('confirmado', 'pendente', 'aguardando') and new.status = 'concluido' then
        return new;
      end if;
      if old.status in ('pendente', 'aguardando') and new.status = 'confirmado' then
        -- Continue to the availability checks below.
        null;
      else
        raise exception 'Invalid status transition' using errcode = '23514';
      end if;
    else
      raise exception 'Invalid status transition' using errcode = '23514';
    end if;
  else
    if not privileged and (new.usuario_id <> auth.uid() or new.status <> 'confirmado') then
      raise exception 'Appointment must belong to its creator' using errcode = '42501';
    end if;
    if not shop.ativa then
      raise exception 'Barbershop unavailable' using errcode = '23514';
    end if;
  end if;

  if new.servico_id is null then
    raise exception 'Service required' using errcode = '23514';
  end if;
  select * into service from public.servicos where id = new.servico_id;
  if not found or service.barbearia_id <> new.barbearia_id or not service.ativo
     or service.excluido_em is not null or service.duracao <= 0 or service.preco <= 0 then
    raise exception 'Service unavailable for this barbershop' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    new.servico_nome := service.nome;
    new.servico_descricao := service.descricao;
    new.servico_preco := service.preco;
    new.servico_duracao := service.duracao;
  end if;

  if new.barbeiro_id is not null then
    select * into barber from public.barbeiros where id = new.barbeiro_id;
    if not found or barber.barbearia_id <> new.barbearia_id or not barber.ativo then
      raise exception 'Barber unavailable for this barbershop' using errcode = '23514';
    end if;
    if barber.dia_folga = extract(dow from new.data)::int then
      raise exception 'Barber does not work on this day' using errcode = '23514';
    end if;
  end if;

  if new.data + new.horario <= now() at time zone 'America/Fortaleza' then
    raise exception 'Appointment time is in the past' using errcode = '23514';
  end if;
  day_config := shop.horarios_funcionamento -> extract(dow from new.data)::int;
  if day_config is not null then
    if day_config->>'aberto' is distinct from 'true' then
      raise exception 'Barbershop closed on this day' using errcode = '23514';
    end if;
    opening := (day_config->>'abertura')::time;
    closing := (day_config->>'fechamento')::time;
  else
    if shop.dia_folga = extract(dow from new.data)::int then
      raise exception 'Barbershop closed on this day' using errcode = '23514';
    end if;
    opening := shop.horario_abertura;
    closing := shop.horario_fechamento;
  end if;
  if opening is null or closing is null or opening >= closing then
    raise exception 'Invalid opening hours' using errcode = '23514';
  end if;
  if new.barbeiro_id is not null then
    opening := greatest(opening, barber.horario_abertura);
    closing := least(closing, barber.horario_fechamento);
  end if;
  if new.horario < opening or
     new.data + new.horario + new.servico_duracao * interval '1 minute' > new.data + closing then
    raise exception 'Appointment outside opening hours' using errcode = '23514';
  end if;

  -- A shop/date lock serializes the wildcard rule: a booking without a barber
  -- occupies the barbershop, while different named barbers may overlap.
  perform pg_advisory_xact_lock(hashtextextended(new.barbearia_id::text || ':' || new.data::text, 0));
  if exists (
    select 1 from public.agendamentos existing
    where existing.barbearia_id = new.barbearia_id
      and existing.data = new.data
      and existing.status <> 'cancelado'
      and (tg_op = 'INSERT' or existing.id <> new.id)
      and (new.barbeiro_id is null or existing.barbeiro_id is null
           or existing.barbeiro_id = new.barbeiro_id)
      and tsrange(existing.data + existing.horario,
                  existing.data + existing.horario + existing.servico_duracao * interval '1 minute', '[)')
          && tsrange(new.data + new.horario,
                     new.data + new.horario + new.servico_duracao * interval '1 minute', '[)')
  ) then
    raise exception 'Appointment interval is occupied' using errcode = '23P01';
  end if;
  return new;
end $$;

revoke all on function public.naregua_validar_agendamento() from public, anon, authenticated;
create trigger naregua_validar_agendamento
  before insert or update on public.agendamentos
  for each row execute function public.naregua_validar_agendamento();

-- Availability is public, but appointment IDs, customers and service names
-- stay behind RLS. The booking UI consumes only these occupied intervals.
create or replace function public.naregua_ocupacao(p_barbearia_id uuid, p_data date)
returns table (horario time, servico_duracao integer, barbeiro_id uuid)
language sql security definer set search_path = '' stable as $$
  select a.horario, a.servico_duracao, a.barbeiro_id
  from public.agendamentos a
  join public.barbearias b on b.id = a.barbearia_id
  where a.barbearia_id = p_barbearia_id and a.data = p_data
    and b.ativa = true and a.status <> 'cancelado'
    and p_data >= (now() at time zone 'America/Fortaleza')::date;
$$;
revoke all on function public.naregua_ocupacao(uuid, date) from public;
grant execute on function public.naregua_ocupacao(uuid, date) to anon, authenticated;

-- Rebuild policies because permissive policies combine with OR. The read-only
-- preflight must be saved before this step; review grants and any extra policies.
do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in
      ('barbearias','servicos','barbeiros','agendamentos','profiles','notificacoes_barbeiro')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.barbearias enable row level security;
alter table public.servicos enable row level security;
alter table public.barbeiros enable row level security;
alter table public.agendamentos enable row level security;
alter table public.profiles enable row level security;
alter table public.notificacoes_barbeiro enable row level security;

revoke all on public.barbearias, public.servicos, public.barbeiros,
  public.agendamentos, public.profiles, public.notificacoes_barbeiro from public, anon, authenticated;
-- Table-level REVOKE does not remove prior column-level grants.
do $$
declare t text; columns_sql text;
begin
  foreach t in array array['barbearias','servicos','barbeiros','agendamentos','profiles','notificacoes_barbeiro'] loop
    select string_agg(format('%I', attname), ',') into columns_sql
    from pg_attribute where attrelid = format('public.%I', t)::regclass and attnum > 0 and not attisdropped;
    execute format('revoke select (%1$s), insert (%1$s), update (%1$s), references (%1$s) on public.%2$I from public, anon, authenticated', columns_sql, t);
  end loop;
end $$;

grant select on public.barbearias, public.servicos, public.barbeiros to anon, authenticated;
grant select on public.agendamentos, public.notificacoes_barbeiro to authenticated;
grant select (id, nome, telefone) on public.profiles to authenticated;
grant insert (nome, slug, telefone, descricao, logo_url, ativa, proprietario_id)
  on public.barbearias to authenticated;
grant update (nome, slug, telefone, descricao, logo_url, capa_url, instagram,
  endereco, horario_abertura, horario_fechamento, dia_folga, horarios_funcionamento)
  on public.barbearias to authenticated;
grant insert (nome, descricao, preco, duracao, ativo, barbearia_id)
  on public.servicos to authenticated;
grant update (nome, descricao, preco, duracao, ativo, excluido_em)
  on public.servicos to authenticated;
grant delete on public.servicos to authenticated;
grant insert (nome, ativo, horario_abertura, horario_fechamento, dia_folga, barbearia_id)
  on public.barbeiros to authenticated;
grant update (nome, ativo, horario_abertura, horario_fechamento, dia_folga)
  on public.barbeiros to authenticated;
grant delete on public.barbeiros to authenticated;
grant insert (usuario_id, barbearia_id, servico_id, barbeiro_id, data, horario, status)
  on public.agendamentos to authenticated;
grant update (status) on public.agendamentos to authenticated;
grant insert (id, nome, telefone) on public.profiles to authenticated;
grant update (nome, telefone) on public.profiles to authenticated;
grant update (lida_em) on public.notificacoes_barbeiro to authenticated;
do $$
declare seq_name text;
begin
  foreach seq_name in array array[
    pg_get_serial_sequence('public.servicos', 'id'),
    pg_get_serial_sequence('public.agendamentos', 'id')
  ] loop
    if seq_name is not null then execute format('grant usage on sequence %s to authenticated', seq_name); end if;
  end loop;
end $$;

create policy barbearias_publicas on public.barbearias for select to anon, authenticated
  using (ativa = true);
create policy barbearias_proprietario_select on public.barbearias for select to authenticated
  using (proprietario_id = auth.uid());
create policy barbearias_proprietario_insert on public.barbearias for insert to authenticated
  with check (proprietario_id = auth.uid());
create policy barbearias_proprietario_update on public.barbearias for update to authenticated
  using (proprietario_id = auth.uid()) with check (proprietario_id = auth.uid());

create policy servicos_publicos on public.servicos for select to anon, authenticated
  using (ativo = true and excluido_em is null and exists
    (select 1 from public.barbearias b where b.id = barbearia_id and b.ativa = true));
create policy servicos_proprietario_select on public.servicos for select to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()));
create policy servicos_proprietario_insert on public.servicos for insert to authenticated
  with check (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()));
create policy servicos_proprietario_update on public.servicos for update to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()))
  with check (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()));
create policy servicos_proprietario_delete on public.servicos for delete to authenticated
  using (excluido_em is not null and exists
    (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()));

create policy barbeiros_publicos on public.barbeiros for select to anon, authenticated
  using (ativo = true and exists
    (select 1 from public.barbearias b where b.id = barbearia_id and b.ativa = true));
create policy barbeiros_proprietario_select on public.barbeiros for select to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()));
create policy barbeiros_proprietario_insert on public.barbeiros for insert to authenticated
  with check (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()));
create policy barbeiros_proprietario_update on public.barbeiros for update to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()))
  with check (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()));
create policy barbeiros_proprietario_delete on public.barbeiros for delete to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()));

create policy agendamentos_cliente_select on public.agendamentos for select to authenticated
  using (usuario_id = auth.uid());
create policy agendamentos_proprietario_select on public.agendamentos for select to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()));
create policy agendamentos_cliente_insert on public.agendamentos for insert to authenticated
  with check (usuario_id = auth.uid() and status = 'confirmado');
create policy agendamentos_cliente_update on public.agendamentos for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy agendamentos_proprietario_update on public.agendamentos for update to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()))
  with check (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()));

create policy profiles_self_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_proprietario_clientes_select on public.profiles for select to authenticated
  using (exists (select 1 from public.agendamentos a join public.barbearias b on b.id = a.barbearia_id
    where a.usuario_id = profiles.id and b.proprietario_id = auth.uid()));
create policy profiles_self_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy notificacoes_proprietario_select on public.notificacoes_barbeiro for select to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()));
create policy notificacoes_proprietario_update on public.notificacoes_barbeiro for update to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()))
  with check (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id = auth.uid()));

-- Direct writes to this public bucket cannot inspect file bytes. The upload
-- route validates and re-encodes images; only it uses service_role on server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', true, 5242880,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;
create policy naregua_profile_images_direct_insert_denied on storage.objects
  as restrictive for insert to public
  with check (bucket_id <> 'profile-images');
create policy naregua_profile_images_direct_update_denied on storage.objects
  as restrictive for update to public
  using (bucket_id <> 'profile-images') with check (bucket_id <> 'profile-images');
create policy naregua_profile_images_delete_own on storage.objects
  as restrictive for delete to public
  using (bucket_id <> 'profile-images' or
    (storage.foldername(name))[1] = auth.uid()::text);
create policy naregua_profile_images_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-images' and
    (storage.foldername(name))[1] = auth.uid()::text);

-- Durable per-user quota across server instances. Only the server-side
-- service role may claim a slot; browsers cannot call this RPC.
create schema if not exists naregua_private;
revoke all on schema naregua_private from public, anon, authenticated;
create table naregua_private.upload_quota (
  user_id uuid not null,
  window_start timestamptz not null,
  used integer not null check (used between 1 and 10),
  primary key (user_id, window_start)
);
revoke all on naregua_private.upload_quota from public, anon, authenticated;
create or replace function public.naregua_claim_upload_slot(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare claimed integer;
begin
  insert into naregua_private.upload_quota (user_id, window_start, used)
  values (p_user_id, date_trunc('hour', now()), 1)
  on conflict (user_id, window_start) do update
    set used = naregua_private.upload_quota.used + 1
    where naregua_private.upload_quota.used < 10
  returning used into claimed;
  return claimed is not null;
end $$;
revoke all on function public.naregua_claim_upload_slot(uuid) from public, anon, authenticated;
grant execute on function public.naregua_claim_upload_slot(uuid) to service_role;

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.salvar_dados_servico_agendamento()',
    'public.validar_barbeiro_agendamento_ativo()',
    'public.notificar_novo_agendamento()'
  ] loop
    if to_regprocedure(fn) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', fn);
    end if;
  end loop;
end $$;
commit;
