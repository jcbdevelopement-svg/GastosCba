create table if not exists public.metricas_diarias (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  visitas integer not null default 0 check (visitas >= 0),
  usuarios integer not null default 0 check (usuarios >= 0),
  conversiones integer not null default 0 check (conversiones >= 0),
  ingresos numeric(12,2) not null default 0 check (ingresos >= 0),
  creado_en timestamptz not null default now()
);
alter table public.metricas_diarias enable row level security;
create policy "metricas visibles publicamente" on public.metricas_diarias for select using (true);
insert into public.metricas_diarias (fecha,visitas,usuarios,conversiones,ingresos) values
('2026-07-26',1840,1190,84,4320),('2026-07-27',2210,1370,102,5180),('2026-07-28',2080,1280,96,4860),('2026-07-29',2650,1580,121,6240),('2026-07-30',2870,1710,137,7180),('2026-07-31',2740,1660,129,6810),('2026-08-01',3240,1920,158,8290)
on conflict (fecha) do update set visitas=excluded.visitas,usuarios=excluded.usuarios,conversiones=excluded.conversiones,ingresos=excluded.ingresos;
