-- Execute no SQL Editor do Supabase antes de usar os campos e uploads novos.
alter table public.barbearias
  add column if not exists capa_url text,
  add column if not exists instagram text,
  add column if not exists endereco text,
  add column if not exists horario_abertura time not null default '08:00',
  add column if not exists horario_fechamento time not null default '21:00';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Usuários enviam imagens para a própria pasta" on storage.objects;
create policy "Usuários enviam imagens para a própria pasta"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Usuários alteram imagens da própria pasta" on storage.objects;
create policy "Usuários alteram imagens da própria pasta"
on storage.objects for update to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Usuários removem imagens da própria pasta" on storage.objects;
create policy "Usuários removem imagens da própria pasta"
on storage.objects for delete to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Usuários editam o próprio perfil" on public.profiles;
create policy "Usuários editam o próprio perfil"
on public.profiles for update to authenticated
using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Usuários criam o próprio perfil" on public.profiles;
create policy "Usuários criam o próprio perfil"
on public.profiles for insert to authenticated
with check (auth.uid() = id);
