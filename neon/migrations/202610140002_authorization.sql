-- Apply to the empty schema from 202610140001 only, after reviewing preflight.
begin;

create or replace function public.naregua_validar_agendamento()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  shop public.barbearias%rowtype;
  service public.servicos%rowtype;
  barber public.barbeiros%rowtype;
  day_config jsonb;
  opening time;
  closing time;
  current_user_id text := auth.user_id();
  is_owner boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into shop from public.barbearias where id = new.barbearia_id;
  if not found then raise exception 'Invalid barbershop' using errcode = '23503'; end if;
  is_owner := shop.proprietario_id::text = current_user_id;

  if tg_op = 'UPDATE' then
    -- A foreign-key action may clear the service after the owner empties the
    -- service trash. Keep the snapshot; browser roles cannot update this column.
    if pg_trigger_depth() > 1 and old.servico_id is not null and new.servico_id is null
       and (new.id, new.usuario_id, new.barbearia_id, new.barbeiro_id,
            new.data, new.horario, new.status, new.servico_nome,
            new.servico_descricao, new.servico_preco, new.servico_duracao)
           is not distinct from
           (old.id, old.usuario_id, old.barbearia_id, old.barbeiro_id,
            old.data, old.horario, old.status, old.servico_nome,
            old.servico_descricao, old.servico_preco, old.servico_duracao) then
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
    if new.status = 'cancelado' and old.status in ('confirmado','pendente','aguardando') then
      if not is_owner and new.usuario_id::text <> current_user_id then
        raise exception 'Appointment owner required' using errcode = '42501';
      end if;
      if not is_owner and (old.data + old.horario) -
        (now() at time zone 'America/Fortaleza') <= interval '2 hours' then
        raise exception 'Cancellation deadline passed' using errcode = '23514';
      end if;
      return new;
    end if;
    if is_owner and old.status in ('confirmado','pendente','aguardando')
       and new.status = 'concluido' then return new; end if;
    if not (is_owner and old.status in ('pendente','aguardando')
            and new.status = 'confirmado') then
      raise exception 'Invalid status transition' using errcode = '23514';
    end if;
  else
    if new.usuario_id::text <> current_user_id or new.status <> 'confirmado' then
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

  -- Serialize both named and wildcard reservations in one shop/day.
  perform pg_advisory_xact_lock(hashtextextended(new.barbearia_id::text || ':' || new.data::text, 0));
  if exists (
    select 1 from public.agendamentos existing
    where existing.barbearia_id = new.barbearia_id and existing.data = new.data
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
revoke all on function public.naregua_validar_agendamento() from public, anonymous, authenticated;
create trigger naregua_validar_agendamento before insert or update on public.agendamentos
  for each row execute function public.naregua_validar_agendamento();

create or replace function public.naregua_ocupacao(p_barbearia_id uuid, p_data date)
returns table (horario time, servico_duracao integer, barbeiro_id uuid)
language sql security definer set search_path = '' stable as $$
  select a.horario, a.servico_duracao, a.barbeiro_id
  from public.agendamentos a
  join public.barbearias b on b.id = a.barbearia_id
  where a.barbearia_id = p_barbearia_id and a.data = p_data
    and b.ativa and a.status <> 'cancelado'
    and p_data >= (now() at time zone 'America/Fortaleza')::date;
$$;
revoke all on function public.naregua_ocupacao(uuid, date) from public;
grant execute on function public.naregua_ocupacao(uuid, date) to anonymous, authenticated;

create or replace function public.naregua_notificar_agendamento()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notificacoes_barbeiro(barbearia_id, agendamento_id, mensagem)
  values (new.barbearia_id, new.id,
    'Novo horário reservado para ' || to_char(new.data, 'DD/MM/YYYY') ||
    ' às ' || left(new.horario::text, 5) || '.');
  return new;
end $$;
revoke all on function public.naregua_notificar_agendamento() from public, anonymous, authenticated;
create trigger naregua_notificar_agendamento after insert on public.agendamentos
  for each row execute function public.naregua_notificar_agendamento();

create or replace function naregua_private.claim_upload_slot(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare claimed integer;
begin
  insert into naregua_private.upload_quota(user_id, window_start, used)
  values (p_user_id, date_trunc('hour', now()), 1)
  on conflict (user_id, window_start) do update
    set used = naregua_private.upload_quota.used + 1
    where naregua_private.upload_quota.used < 10
  returning used into claimed;
  return claimed is not null;
end $$;
revoke all on function naregua_private.claim_upload_slot(uuid) from public, anonymous, authenticated;

alter table public.barbearias enable row level security;
alter table public.servicos enable row level security;
alter table public.barbeiros enable row level security;
alter table public.agendamentos enable row level security;
alter table public.profiles enable row level security;
alter table public.notificacoes_barbeiro enable row level security;

revoke all on public.barbearias, public.servicos, public.barbeiros,
  public.agendamentos, public.profiles, public.notificacoes_barbeiro
  from public, anonymous, authenticated;
grant usage on schema public to anonymous, authenticated;
-- Public catalog access excludes the private owner ID. Authenticated users
-- retain the filter column needed by owner dashboards.
grant select (id, nome, slug, telefone, descricao, logo_url, capa_url,
  instagram, endereco, ativa, horario_abertura, horario_fechamento,
  dia_folga, horarios_funcionamento, created_at)
  on public.barbearias to anonymous;
grant select on public.barbearias, public.servicos, public.barbeiros to authenticated;
grant select on public.servicos, public.barbeiros to anonymous;
grant select on public.agendamentos, public.notificacoes_barbeiro to authenticated;
grant select (id, nome, telefone, avatar_url, barbearias_favoritas) on public.profiles to authenticated;
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
grant insert (id, nome, telefone, avatar_url, barbearias_favoritas) on public.profiles to authenticated;
grant update (nome, telefone, avatar_url, barbearias_favoritas) on public.profiles to authenticated;
grant update (lida_em) on public.notificacoes_barbeiro to authenticated;
grant usage on sequence public.servicos_id_seq, public.agendamentos_id_seq to authenticated;

create policy barbearias_publicas on public.barbearias for select to anonymous, authenticated using (ativa);
create policy barbearias_proprietario_select on public.barbearias for select to authenticated
  using (proprietario_id::text = auth.user_id());
create policy barbearias_proprietario_insert on public.barbearias for insert to authenticated
  with check (proprietario_id::text = auth.user_id());
create policy barbearias_proprietario_update on public.barbearias for update to authenticated
  using (proprietario_id::text = auth.user_id()) with check (proprietario_id::text = auth.user_id());

create policy servicos_publicos on public.servicos for select to anonymous, authenticated
  using (ativo and excluido_em is null and exists
    (select 1 from public.barbearias b where b.id = barbearia_id and b.ativa));
create policy servicos_proprietario_select on public.servicos for select to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()));
create policy servicos_proprietario_insert on public.servicos for insert to authenticated
  with check (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()));
create policy servicos_proprietario_update on public.servicos for update to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()))
  with check (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()));
create policy servicos_proprietario_delete on public.servicos for delete to authenticated
  using (excluido_em is not null and exists
    (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()));

create policy barbeiros_publicos on public.barbeiros for select to anonymous, authenticated
  using (ativo and exists (select 1 from public.barbearias b where b.id = barbearia_id and b.ativa));
create policy barbeiros_proprietario_select on public.barbeiros for select to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()));
create policy barbeiros_proprietario_insert on public.barbeiros for insert to authenticated
  with check (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()));
create policy barbeiros_proprietario_update on public.barbeiros for update to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()))
  with check (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()));
create policy barbeiros_proprietario_delete on public.barbeiros for delete to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()));

create policy agendamentos_cliente_select on public.agendamentos for select to authenticated
  using (usuario_id::text = auth.user_id());
create policy agendamentos_proprietario_select on public.agendamentos for select to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()));
create policy agendamentos_cliente_insert on public.agendamentos for insert to authenticated
  with check (usuario_id::text = auth.user_id() and status = 'confirmado');
create policy agendamentos_cliente_update on public.agendamentos for update to authenticated
  using (usuario_id::text = auth.user_id()) with check (usuario_id::text = auth.user_id());
create policy agendamentos_proprietario_update on public.agendamentos for update to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()))
  with check (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()));

create policy profiles_self_select on public.profiles for select to authenticated
  using (id::text = auth.user_id());
create policy profiles_proprietario_clientes_select on public.profiles for select to authenticated
  using (exists (select 1 from public.agendamentos a join public.barbearias b on b.id = a.barbearia_id
    where a.usuario_id = profiles.id and b.proprietario_id::text = auth.user_id()));
create policy profiles_self_insert on public.profiles for insert to authenticated
  with check (id::text = auth.user_id());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id::text = auth.user_id()) with check (id::text = auth.user_id());

create policy notificacoes_proprietario_select on public.notificacoes_barbeiro for select to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()));
create policy notificacoes_proprietario_update on public.notificacoes_barbeiro for update to authenticated
  using (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()))
  with check (exists (select 1 from public.barbearias b where b.id = barbearia_id and b.proprietario_id::text = auth.user_id()));

commit;
