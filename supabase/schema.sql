-- =====================================================================
-- Acerca Clock - Esquema Supabase
-- Ejecutar este script ENTERO en: Supabase > SQL Editor > New query
-- =====================================================================

-- 1. Tabla principal: time_events ------------------------------------------------

create table if not exists public.time_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  email             text not null,
  full_name         text,
  event_type        text not null,
  event_timestamp   timestamptz not null default now(),
  local_date        date not null,
  local_time        time not null,
  timezone          text not null default 'Europe/Madrid',
  ip_address        text,
  user_agent        text,
  created_at        timestamptz not null default now(),

  constraint time_events_event_type_check
    check (event_type in (
      'CLOCK_IN',
      'BREAK_START',
      'BREAK_END',
      'LUNCH_START',
      'LUNCH_END',
      'CLOCK_OUT'
    ))
);

-- 2. Índices ---------------------------------------------------------------------

create index if not exists idx_time_events_email_local_date
  on public.time_events (email, local_date);

create index if not exists idx_time_events_event_timestamp
  on public.time_events (event_timestamp desc);

create index if not exists idx_time_events_event_type
  on public.time_events (event_type);

create index if not exists idx_time_events_user_id_local_date
  on public.time_events (user_id, local_date);

-- 3. Row Level Security ----------------------------------------------------------

alter table public.time_events enable row level security;

-- Lectura: el usuario autenticado solo puede leer sus propios eventos.
drop policy if exists "users_select_own_events" on public.time_events;
create policy "users_select_own_events"
  on public.time_events
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Inserción: el usuario autenticado solo puede insertar eventos a su nombre.
drop policy if exists "users_insert_own_events" on public.time_events;
create policy "users_insert_own_events"
  on public.time_events
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and lower(email) = lower(auth.jwt() ->> 'email')
  );

-- No se permite UPDATE ni DELETE: registros inmutables.
-- (al no crear policies de update/delete, RLS las bloquea por defecto)

-- 4. Vista de resumen diario para RRHH ------------------------------------------
-- Calcula, por usuario y día, primer CLOCK_IN, último CLOCK_OUT,
-- minutos de descanso, minutos de comida y minutos netos trabajados.

create or replace view public.daily_time_summary as
with paired as (
  select
    email,
    full_name,
    local_date,
    event_type,
    event_timestamp,
    -- siguiente evento del mismo usuario en el mismo día
    lead(event_timestamp) over (
      partition by email, local_date
      order by event_timestamp
    ) as next_ts,
    lead(event_type) over (
      partition by email, local_date
      order by event_timestamp
    ) as next_type
  from public.time_events
),
intervals as (
  select
    email,
    full_name,
    local_date,
    case
      when event_type = 'BREAK_START' and next_type = 'BREAK_END'
        then extract(epoch from (next_ts - event_timestamp)) / 60.0
      else 0
    end as break_minutes,
    case
      when event_type = 'LUNCH_START' and next_type = 'LUNCH_END'
        then extract(epoch from (next_ts - event_timestamp)) / 60.0
      else 0
    end as lunch_minutes
  from paired
),
day_bounds as (
  select
    email,
    max(full_name) as full_name,
    local_date,
    min(event_timestamp) filter (where event_type = 'CLOCK_IN')  as first_clock_in,
    max(event_timestamp) filter (where event_type = 'CLOCK_OUT') as last_clock_out
  from public.time_events
  group by email, local_date
),
day_intervals as (
  select
    email,
    local_date,
    coalesce(sum(break_minutes), 0) as break_minutes,
    coalesce(sum(lunch_minutes), 0) as lunch_minutes
  from intervals
  group by email, local_date
)
select
  d.email,
  d.full_name,
  d.local_date,
  d.first_clock_in,
  d.last_clock_out,
  round(coalesce(i.break_minutes, 0)::numeric, 2)            as break_minutes,
  round(coalesce(i.lunch_minutes, 0)::numeric, 2)            as lunch_minutes,
  case
    when d.first_clock_in is not null and d.last_clock_out is not null then
      round(extract(epoch from (d.last_clock_out - d.first_clock_in)) / 60.0, 2)
    else null
  end as gross_minutes,
  case
    when d.first_clock_in is not null and d.last_clock_out is not null then
      round(
        (extract(epoch from (d.last_clock_out - d.first_clock_in)) / 60.0)
        - coalesce(i.break_minutes, 0)
        - coalesce(i.lunch_minutes, 0),
        2
      )
    else null
  end as net_worked_minutes
from day_bounds d
left join day_intervals i
  on i.email = d.email and i.local_date = d.local_date
order by d.local_date desc, d.email;

-- 5. Comentarios -----------------------------------------------------------------

comment on table public.time_events is 'Eventos inmutables de fichaje laboral. RRHH consulta directamente desde Supabase.';
comment on column public.time_events.event_type is 'CLOCK_IN | BREAK_START | BREAK_END | LUNCH_START | LUNCH_END | CLOCK_OUT';
comment on column public.time_events.local_date is 'Fecha en zona horaria Europe/Madrid (para consulta sencilla)';
comment on column public.time_events.local_time is 'Hora en zona horaria Europe/Madrid (para consulta sencilla)';
comment on view  public.daily_time_summary is 'Resumen diario por trabajador: inicio, fin, descansos, comida y tiempo neto trabajado.';
