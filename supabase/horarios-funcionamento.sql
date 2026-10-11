-- Expediente semanal configurável da barbearia (domingo = 0 ... sábado = 6).
alter table public.barbearias
  add column if not exists horarios_funcionamento jsonb;

update public.barbearias b
set horarios_funcionamento = (
  select jsonb_agg(
    jsonb_build_object(
      'aberto', dias.dia <> coalesce(b.dia_folga, 0),
      'abertura', to_char(coalesce(b.horario_abertura, time '08:00'), 'HH24:MI'),
      'fechamento', to_char(coalesce(b.horario_fechamento, time '21:00'), 'HH24:MI')
    ) order by dias.dia
  )
  from generate_series(0, 6) as dias(dia)
)
where b.horarios_funcionamento is null;

alter table public.barbearias
  alter column horarios_funcionamento set default '[{"aberto":true,"abertura":"08:00","fechamento":"21:00"},{"aberto":true,"abertura":"08:00","fechamento":"21:00"},{"aberto":true,"abertura":"08:00","fechamento":"21:00"},{"aberto":true,"abertura":"08:00","fechamento":"21:00"},{"aberto":true,"abertura":"08:00","fechamento":"21:00"},{"aberto":true,"abertura":"08:00","fechamento":"21:00"},{"aberto":true,"abertura":"08:00","fechamento":"21:00"}]'::jsonb,
  alter column horarios_funcionamento set not null;
