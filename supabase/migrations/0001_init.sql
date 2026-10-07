-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ Sistema de calificación — Bandas de Guerra                           ║
-- ║ 0001: esquema base                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

create extension if not exists "pgcrypto";

-- ─── Perfiles ───────────────────────────────────────────────────────────
-- Espejo de auth.users con el rol. Se llena por trigger al registrarse.

create type user_role as enum ('admin', 'judge');

create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  role       user_role not null default 'judge',
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'judge')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper usado por las políticas RLS. SECURITY DEFINER para no recursar
-- sobre las políticas de `profiles` al consultarse a sí misma.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── Eventos ────────────────────────────────────────────────────────────

create type event_status as enum ('draft', 'live', 'closed');

create table events (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  event_date date not null,
  venue      text not null default '',
  status     event_status not null default 'draft',
  owner_id   uuid not null references profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index events_owner_idx on events (owner_id);

create table categories (
  id       uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  name     text not null,
  position int  not null default 0,
  unique (event_id, name)
);

create table bands (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events (id) on delete cascade,
  category_id uuid not null references categories (id) on delete restrict,
  name        text not null,
  -- "Turno" en la hoja: orden de participación dentro del evento.
  turno       int  not null,
  created_at  timestamptz not null default now(),
  unique (event_id, name),
  unique (event_id, turno) deferrable initially deferred
);

create index bands_event_idx    on bands (event_id);
create index bands_category_idx on bands (category_id);

-- ─── Catálogo de hojas ──────────────────────────────────────────────────
-- Se siembra desde src/lib/sheets.ts (transcrito del PDF). Versionado para
-- que un cambio de reglamento no altere eventos ya calificados.

create table sheet_templates (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null,
  name                 text not null,
  version              int  not null default 1,
  -- Cuántos jueces llenan la hoja por banda (Juez 1 / Juez 2).
  judge_slots          int  not null default 1 check (judge_slots between 1 and 2),
  -- Comandante se califica pero no suma al total de la banda.
  counts_toward_total  boolean not null default true,
  max_points           numeric(6, 1) not null check (max_points > 0),
  unique (code, version)
);

create table sheet_criteria (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references sheet_templates (id) on delete cascade,
  -- Encabezado dentro de la hoja: "PERSONAL", "UNIFORME", "TOQUE 1"...
  section     text,
  position    int  not null,
  label       text not null check (length(trim(label)) > 0),
  max_points  numeric(3, 1) not null default 5.0,
  -- Regla impresa para criterios que se calculan restando.
  deduction_hint text,
  unique (template_id, position)
);

create index sheet_criteria_template_idx on sheet_criteria (template_id);

-- ─── Asignaciones ───────────────────────────────────────────────────────
-- Qué juez llena qué hoja en qué evento. judge_slot distingue Juez 1 de Juez 2.

create table assignments (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events (id) on delete cascade,
  judge_id    uuid not null references profiles (id) on delete restrict,
  template_id uuid not null references sheet_templates (id) on delete restrict,
  judge_slot  int  not null default 1 check (judge_slot between 1 and 2),
  created_at  timestamptz not null default now(),
  -- Un mismo puesto (hoja + slot) no puede estar asignado dos veces.
  unique (event_id, template_id, judge_slot)
);

create index assignments_event_idx on assignments (event_id);
create index assignments_judge_idx on assignments (judge_id);

-- ─── Hojas llenadas ─────────────────────────────────────────────────────

create type sheet_status as enum ('draft', 'submitted');

create table score_sheets (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events (id) on delete cascade,
  band_id       uuid not null references bands (id) on delete cascade,
  assignment_id uuid not null references assignments (id) on delete cascade,
  status        sheet_status not null default 'draft',
  submitted_at  timestamptz,
  -- Una vez bloqueada, sólo un admin puede reabrirla.
  locked_at     timestamptz,
  observador    text not null default '',
  created_at    timestamptz not null default now(),
  -- Una hoja por banda por puesto de juez.
  unique (band_id, assignment_id)
);

create index score_sheets_event_idx      on score_sheets (event_id);
create index score_sheets_band_idx       on score_sheets (band_id);
create index score_sheets_assignment_idx on score_sheets (assignment_id);

-- ─── Calificaciones ─────────────────────────────────────────────────────
-- UNIQUE(sheet_id, criterion_id) es lo que hace seguro el modo sin conexión:
-- reenviar la cola pendiente es un upsert idempotente, y los conflictos se
-- resuelven por client_updated_at (gana la captura más reciente del juez).

create table scores (
  id                uuid primary key default gen_random_uuid(),
  sheet_id          uuid not null references score_sheets (id) on delete cascade,
  criterion_id      uuid not null references sheet_criteria (id) on delete restrict,
  value             numeric(3, 1) not null
                      check (value >= 0.5 and value <= 5.0 and (value * 10)::int % 5 = 0),
  observacion       text not null default '',
  -- Reloj del dispositivo del juez al momento del toque. Resuelve conflictos.
  client_updated_at timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (sheet_id, criterion_id)
);

create index scores_sheet_idx on scores (sheet_id);

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger scores_touch_updated_at
  before update on scores
  for each row execute function touch_updated_at();

-- ─── Totales ────────────────────────────────────────────────────────────
-- Los totales NUNCA se almacenan: se calculan, para que no puedan desfasarse
-- de las calificaciones que los originan.

-- Total por hoja llenada.
create view v_sheet_totals as
select
  ss.id              as sheet_id,
  ss.event_id,
  ss.band_id,
  ss.assignment_id,
  ss.status,
  a.judge_id,
  a.judge_slot,
  t.id               as template_id,
  t.code             as template_code,
  t.name             as template_name,
  t.counts_toward_total,
  t.max_points,
  coalesce(sum(s.value), 0)        as total,
  count(s.id)                      as scored_count,
  (select count(*) from sheet_criteria c where c.template_id = t.id) as criteria_count
from score_sheets ss
join assignments     a on a.id = ss.assignment_id
join sheet_templates t on t.id = a.template_id
left join scores     s on s.sheet_id = ss.id
group by ss.id, a.judge_id, a.judge_slot, t.id;

-- Total compilatorio por banda (máximo 665) + Comandante por separado.
create view v_band_totals as
select
  b.id          as band_id,
  b.event_id,
  b.category_id,
  b.name        as band_name,
  b.turno,
  coalesce(sum(st.total) filter (where st.counts_toward_total), 0) as total_compilatorio,
  coalesce(sum(st.total) filter (where st.template_code = 'comandante'), 0) as total_comandante,
  count(st.sheet_id) filter (where st.status = 'submitted') as sheets_submitted,
  count(st.sheet_id)                                        as sheets_started
from bands b
left join v_sheet_totals st on st.band_id = b.id
group by b.id;
