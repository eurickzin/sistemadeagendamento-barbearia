-- Read-only inventory. Run in a NEW test project before applying migrations.
begin transaction read only;

select current_database() as database_name, current_user as connected_role,
       to_regprocedure('auth.user_id()') as neon_user_id_function,
       to_regrole('anonymous') as anonymous_role,
       to_regrole('authenticated') as authenticated_role,
       to_regclass('neon_auth.user') as neon_auth_users;

select schemaname, tablename, tableowner, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
order by table_name, grantee, privilege_type;

-- A fresh migration requires all six application tables to be absent.
select table_name, to_regclass('public.' || table_name) as existing_table
from (values ('barbearias'), ('servicos'), ('barbeiros'),
             ('agendamentos'), ('profiles'), ('notificacoes_barbeiro')) as tables(table_name);

-- If any application table already exists, STOP. Inventory its columns and
-- records first. Existing bookings must be checked for overlaps before any
-- constraint is applied; do not drop, truncate or silently normalize them.
commit;
