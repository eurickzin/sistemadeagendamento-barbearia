-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Cada barbeiro possui sua própria janela de atendimento e dia de folga.

create table if not exists public.barbeiros (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  nome text not null,
  ativo boolean not null default true,
  horario_abertura time not null default time '08:00',
  horario_fechamento time not null default time '21:00',
  dia_folga smallint not null default 0 check (dia_folga between 0 and 6),
  created_at timestamptz not null default now(),
  constraint barbeiros_id_barbearia_unique unique (id, barbearia_id),
  constraint barbeiros_horario_valido check (horario_abertura < horario_fechamento)
);

alter table public.agendamentos
  add column if not exists barbeiro_id uuid;

-- Cria o barbeiro principal das barbearias já cadastradas.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'barbearias'
      and column_name = 'horario_abertura'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'barbearias'
      and column_name = 'horario_fechamento'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'barbearias'
      and column_name = 'dia_folga'
  ) then
    execute $seed$
      insert into public.barbeiros (
        barbearia_id, nome, horario_abertura, horario_fechamento, dia_folga
      )
      select b.id, 'Barbeiro principal',
        coalesce(b.horario_abertura, time '08:00'),
        coalesce(b.horario_fechamento, time '21:00'),
        coalesce(b.dia_folga, 0)::smallint
      from public.barbearias b
      where not exists (
        select 1 from public.barbeiros equipe where equipe.barbearia_id = b.id
      )
    $seed$;
  else
    insert into public.barbeiros (barbearia_id, nome)
    select b.id, 'Barbeiro principal'
    from public.barbearias b
    where not exists (
      select 1 from public.barbeiros equipe where equipe.barbearia_id = b.id
    );
  end if;
end;
$$;

-- Reservas antigas continuam ocupando o horário do barbeiro principal.
with barbeiro_principal as (
  select distinct on (barbearia_id) id, barbearia_id
  from public.barbeiros
  order by barbearia_id, created_at, id
)
update public.agendamentos agendamento
set barbeiro_id = barbeiro_principal.id
from barbeiro_principal
where agendamento.barbeiro_id is null
  and agendamento.barbearia_id = barbeiro_principal.barbearia_id;

alter table public.agendamentos
  drop constraint if exists agendamentos_barbeiro_barbearia_fk;

alter table public.agendamentos
  add constraint agendamentos_barbeiro_barbearia_fk
  foreign key (barbeiro_id, barbearia_id)
  references public.barbeiros (id, barbearia_id);

create or replace function public.validar_barbeiro_agendamento_ativo()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.barbeiro_id is not null and not exists (
    select 1
    from public.barbeiros b
    where b.id = new.barbeiro_id
      and b.barbearia_id = new.barbearia_id
      and b.ativo = true
  ) then
    raise exception 'O barbeiro escolhido não está disponível nesta barbearia.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists validar_barbeiro_agendamento_ativo
  on public.agendamentos;
create trigger validar_barbeiro_agendamento_ativo
  before insert or update of barbeiro_id, barbearia_id
  on public.agendamentos
  for each row execute function public.validar_barbeiro_agendamento_ativo();

create index if not exists barbeiros_barbearia_ativo_idx
  on public.barbeiros (barbearia_id, ativo, nome);

create index if not exists agendamentos_barbeiro_data_idx
  on public.agendamentos (barbeiro_id, data, status);

-- Remove a antiga regra que reservava um horário para a barbearia inteira.
-- Agora a mesma faixa pode ser usada por barbeiros diferentes.
do $$
declare
  regra record;
begin
  for regra in
    select n.nspname as esquema, t.relname as tabela, c.conname as nome
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.contype = 'u'
      and c.conrelid = 'public.agendamentos'::regclass
      and (
        select array_agg(a.attname::text order by a.attname::text)
        from unnest(c.conkey) as chave(attnum)
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = chave.attnum
      ) @> array['data', 'horario']::text[]
      and (
        select array_agg(a.attname::text order by a.attname::text)
        from unnest(c.conkey) as chave(attnum)
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = chave.attnum
      ) <@ array['barbearia_id', 'data', 'horario', 'status']::text[]
  loop
    execute format('alter table %I.%I drop constraint %I', regra.esquema, regra.tabela, regra.nome);
  end loop;

  for regra in
    select ns.nspname as esquema, idx.relname as nome
    from pg_index i
    join pg_class idx on idx.oid = i.indexrelid
    join pg_namespace ns on ns.oid = idx.relnamespace
    where i.indrelid = 'public.agendamentos'::regclass
      and i.indisunique
      and not i.indisprimary
      and i.indnkeyatts >= 2
      and not exists (
        select 1 from pg_constraint c where c.conindid = i.indexrelid
      )
      and (
        select array_agg(a.attname::text order by a.attname::text)
        from unnest(i.indkey) with ordinality as chave(attnum, posicao)
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = chave.attnum
        where chave.posicao <= i.indnkeyatts
      ) @> array['data', 'horario']::text[]
      and (
        select array_agg(a.attname::text order by a.attname::text)
        from unnest(i.indkey) with ordinality as chave(attnum, posicao)
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = chave.attnum
        where chave.posicao <= i.indnkeyatts
      ) <@ array['barbearia_id', 'data', 'horario', 'status']::text[]
  loop
    execute format('drop index %I.%I', regra.esquema, regra.nome);
  end loop;
end;
$$;

create unique index if not exists agendamentos_barbeiro_horario_unique
  on public.agendamentos (barbearia_id, barbeiro_id, data, horario)
  where barbeiro_id is not null and status <> 'cancelado';

create unique index if not exists agendamentos_sem_barbeiro_horario_unique
  on public.agendamentos (barbearia_id, data, horario)
  where barbeiro_id is null and status <> 'cancelado';

alter table public.barbeiros enable row level security;

drop policy if exists "Público consulta barbeiros de barbearias ativas"
  on public.barbeiros;
create policy "Público consulta barbeiros de barbearias ativas"
  on public.barbeiros for select to anon, authenticated
  using (
    exists (
      select 1 from public.barbearias b
      where b.id = barbeiros.barbearia_id and b.ativa = true
    )
  );

drop policy if exists "Proprietário gerencia barbeiros da própria barbearia"
  on public.barbeiros;
create policy "Proprietário gerencia barbeiros da própria barbearia"
  on public.barbeiros for all to authenticated
  using (
    exists (
      select 1 from public.barbearias b
      where b.id = barbeiros.barbearia_id and b.proprietario_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.barbearias b
      where b.id = barbeiros.barbearia_id and b.proprietario_id = auth.uid()
    )
  );
