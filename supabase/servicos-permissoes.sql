-- Execute este arquivo no SQL Editor do Supabase.
-- A Lixeira arquiva serviços e permite esvaziá-la sem perder o histórico.

alter table public.servicos enable row level security;
alter table public.servicos
  add column if not exists excluido_em timestamptz;

alter table public.agendamentos
  add column if not exists servico_nome text,
  add column if not exists servico_descricao text,
  add column if not exists servico_preco numeric,
  add column if not exists servico_duracao integer;

-- Guarda uma cópia dos dados do serviço em cada agendamento antigo.
update public.agendamentos a
set servico_nome = s.nome,
    servico_descricao = s.descricao,
    servico_preco = s.preco,
    servico_duracao = s.duracao
from public.servicos s
where a.servico_id = s.id
  and a.servico_nome is null;

create or replace function public.salvar_dados_servico_agendamento()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  servico_atual record;
begin
  if new.servico_id is not null then
    select nome, descricao, preco, duracao
    into servico_atual
    from public.servicos
    where id = new.servico_id;

    if found then
      new.servico_nome := servico_atual.nome;
      new.servico_descricao := servico_atual.descricao;
      new.servico_preco := servico_atual.preco;
      new.servico_duracao := servico_atual.duracao;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists salvar_dados_servico_agendamento
  on public.agendamentos;
create trigger salvar_dados_servico_agendamento
  before insert or update of servico_id on public.agendamentos
  for each row execute function public.salvar_dados_servico_agendamento();

-- Esvaziar a Lixeira pode apagar o serviço, pois os agendamentos guardam
-- seus próprios dados históricos e deixam de depender do registro original.
do $$
declare
  restricao record;
begin
  for restricao in
    select c.conname
    from pg_constraint c
    where c.contype = 'f'
      and c.conrelid = 'public.agendamentos'::regclass
      and c.confrelid = 'public.servicos'::regclass
  loop
    execute format('alter table public.agendamentos drop constraint %I', restricao.conname);
  end loop;
end;
$$;

alter table public.agendamentos alter column servico_id drop not null;
alter table public.agendamentos
  add constraint agendamentos_servico_id_fkey
  foreign key (servico_id) references public.servicos(id) on delete set null;

drop policy if exists "Proprietário atualiza serviços da própria barbearia"
  on public.servicos;

create policy "Proprietário atualiza serviços da própria barbearia"
  on public.servicos
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.barbearias b
      where b.id = servicos.barbearia_id
        and b.proprietario_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.barbearias b
      where b.id = servicos.barbearia_id
        and b.proprietario_id = auth.uid()
    )
  );

grant update (ativo, excluido_em) on public.servicos to authenticated;

drop policy if exists "Proprietário exclui serviços da própria barbearia"
  on public.servicos;
drop policy if exists "Proprietário esvazia a lixeira da própria barbearia"
  on public.servicos;
create policy "Proprietário esvazia a lixeira da própria barbearia"
  on public.servicos
  for delete
  to authenticated
  using (
    excluido_em is not null
    and exists (
      select 1
      from public.barbearias b
      where b.id = servicos.barbearia_id
        and b.proprietario_id = auth.uid()
    )
  );

grant delete on public.servicos to authenticated;
