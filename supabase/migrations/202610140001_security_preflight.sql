-- Read-only preflight. Run in a TEST project before 202610140002.
-- An exception aborts; no data is repaired or removed automatically.
do $$
declare
  missing text;
  bad bigint;
begin
  select string_agg(required.name, ', ') into missing
  from (values
    ('public.barbearias'), ('public.servicos'), ('public.barbeiros'),
    ('public.agendamentos'), ('public.profiles'), ('public.notificacoes_barbeiro')
  ) as required(name)
  where to_regclass(required.name) is null;
  if missing is not null then
    raise exception 'Missing tables: %', missing;
  end if;

  select count(*) into bad from public.barbearias
  where proprietario_id is null;
  if bad > 0 then raise exception '% barbearias have no owner', bad; end if;

  select count(*) into bad from (
    select proprietario_id from public.barbearias group by proprietario_id having count(*) > 1
  ) duplicates;
  if bad > 0 then raise exception '% owners have multiple barbearias; resolve manually', bad; end if;

  select count(*) into bad from public.servicos
  where preco is null or preco <= 0 or duracao is null or duracao <= 0;
  if bad > 0 then raise exception '% services have invalid price/duration', bad; end if;

  select count(*) into bad
  from public.agendamentos a
  left join public.servicos s on s.id = a.servico_id
  left join public.barbeiros b on b.id = a.barbeiro_id
  where (a.servico_id is not null and (s.id is null or s.barbearia_id <> a.barbearia_id))
     or (a.barbeiro_id is not null and (b.id is null or b.barbearia_id <> a.barbearia_id))
     or (a.status <> 'cancelado' and (a.servico_duracao is null or a.servico_duracao <= 0));
  if bad > 0 then raise exception '% appointments have invalid relations/duration', bad; end if;

  select count(*) into bad from public.agendamentos
  where status not in ('confirmado', 'cancelado', 'pendente', 'aguardando', 'concluido')
     or (status <> 'cancelado' and data + horario + servico_duracao * interval '1 minute' > data + interval '1 day');
  if bad > 0 then raise exception '% appointments have unsupported status or cross midnight', bad; end if;

  select count(*) into bad
  from public.agendamentos a
  join public.agendamentos b on a.id < b.id
    and a.barbearia_id = b.barbearia_id and a.data = b.data
    and (a.barbeiro_id = b.barbeiro_id or a.barbeiro_id is null or b.barbeiro_id is null)
    and a.status <> 'cancelado' and b.status <> 'cancelado'
    and tsrange(a.data + a.horario, a.data + a.horario + a.servico_duracao * interval '1 minute', '[)')
        && tsrange(b.data + b.horario, b.data + b.horario + b.servico_duracao * interval '1 minute', '[)');
  if bad > 0 then raise exception '% overlapping appointment pairs; resolve manually', bad; end if;
end $$;

-- Save this output with the change record. SQL files in git are not evidence
-- that the current Supabase project has these structures or policies.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
  and tablename in ('barbearias', 'servicos', 'barbeiros', 'agendamentos', 'profiles', 'notificacoes_barbeiro', 'objects')
order by schemaname, tablename, policyname;

select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
  and table_name in ('barbearias', 'servicos', 'barbeiros', 'agendamentos', 'profiles', 'notificacoes_barbeiro', 'objects')
order by table_schema, table_name, grantee, privilege_type;

select n.nspname as schema_name, p.proname as function_name, p.prosecdef as security_definer,
       pg_get_function_arguments(p.oid) as arguments, pg_get_userbyid(p.proowner) as owner,
       p.proacl as execute_grants
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by function_name;

select schemaname, tablename, rowsecurity, relforcerowsecurity
from pg_tables join pg_class on pg_class.oid = format('%I.%I', schemaname, tablename)::regclass
where schemaname in ('public', 'storage')
  and tablename in ('barbearias', 'servicos', 'barbeiros', 'agendamentos', 'profiles', 'notificacoes_barbeiro', 'objects');

select table_schema, table_name, view_definition
from information_schema.views where table_schema = 'public';

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'profile-images';
