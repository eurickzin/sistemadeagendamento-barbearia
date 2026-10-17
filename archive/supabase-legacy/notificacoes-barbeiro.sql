-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Cria uma notificação sempre que um cliente faz um novo agendamento.

create table if not exists public.notificacoes_barbeiro (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  agendamento_id bigint,
  titulo text not null default 'Novo agendamento',
  mensagem text not null,
  lida_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notificacoes_barbeiro_nao_lidas_idx
  on public.notificacoes_barbeiro (barbearia_id, created_at desc)
  where lida_em is null;

create index if not exists notificacoes_barbeiro_historico_idx
  on public.notificacoes_barbeiro (barbearia_id, created_at desc);

alter table public.notificacoes_barbeiro enable row level security;

drop policy if exists "Proprietário consulta notificações da própria barbearia"
  on public.notificacoes_barbeiro;
create policy "Proprietário consulta notificações da própria barbearia"
  on public.notificacoes_barbeiro for select to authenticated
  using (
    exists (
      select 1 from public.barbearias b
      where b.id = notificacoes_barbeiro.barbearia_id
        and b.proprietario_id = auth.uid()
    )
  );

drop policy if exists "Proprietário marca notificações da própria barbearia como lidas"
  on public.notificacoes_barbeiro;
create policy "Proprietário marca notificações da própria barbearia como lidas"
  on public.notificacoes_barbeiro for update to authenticated
  using (
    exists (
      select 1 from public.barbearias b
      where b.id = notificacoes_barbeiro.barbearia_id
        and b.proprietario_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.barbearias b
      where b.id = notificacoes_barbeiro.barbearia_id
        and b.proprietario_id = auth.uid()
    )
  );

grant select on public.notificacoes_barbeiro to authenticated;
grant update (lida_em) on public.notificacoes_barbeiro to authenticated;

create or replace function public.notificar_novo_agendamento()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notificacoes_barbeiro (
    barbearia_id,
    agendamento_id,
    titulo,
    mensagem
  )
  values (
    new.barbearia_id,
    new.id,
    'Novo agendamento',
    'Novo horário reservado para ' || to_char(new.data::date, 'DD/MM/YYYY') ||
      ' às ' || left(new.horario::text, 5) || '.'
  );

  return new;
end;
$$;

drop trigger if exists notificar_novo_agendamento
  on public.agendamentos;
create trigger notificar_novo_agendamento
  after insert on public.agendamentos
  for each row execute function public.notificar_novo_agendamento();

-- Habilita atualizações instantâneas para o sininho, sem duplicar a publicação.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notificacoes_barbeiro'
    ) then
    alter publication supabase_realtime
      add table public.notificacoes_barbeiro;
  end if;
end;
$$;
