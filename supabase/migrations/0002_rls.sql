-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0002: Row Level Security                                             ║
-- ║                                                                      ║
-- ║ La garantía "un juez no puede ver ni alterar las calificaciones de   ║
-- ║ otro juez" vive aquí, en la base de datos — no en la interfaz. Un    ║
-- ║ cliente comprometido o una llamada directa a la API siguen topando   ║
-- ║ con estas políticas.                                                 ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Por omisión, una vista se ejecuta con los permisos de su dueño, lo que
-- saltaría el RLS de las tablas que consulta. security_invoker la obliga a
-- correr como quien la llama, de modo que un juez sólo ve sus propios totales.
alter view v_sheet_totals set (security_invoker = true);
alter view v_band_totals  set (security_invoker = true);

alter table profiles        enable row level security;
alter table events          enable row level security;
alter table categories      enable row level security;
alter table bands           enable row level security;
alter table sheet_templates enable row level security;
alter table sheet_criteria  enable row level security;
alter table assignments     enable row level security;
alter table score_sheets    enable row level security;
alter table scores          enable row level security;

-- ─── Perfiles ───────────────────────────────────────────────────────────

create policy "perfil propio visible"
  on profiles for select
  using (id = auth.uid() or is_admin());

create policy "admin administra perfiles"
  on profiles for all
  using (is_admin()) with check (is_admin());

-- ─── Catálogo de hojas: lectura para cualquier usuario autenticado ──────
-- El juez necesita los criterios para pintar su hoja; nadie los edita desde
-- la app (se siembran por script con la service_role key).

create policy "catálogo legible"
  on sheet_templates for select to authenticated using (true);

create policy "criterios legibles"
  on sheet_criteria for select to authenticated using (true);

-- ─── Eventos, categorías y bandas ───────────────────────────────────────
-- El admin manda. El juez sólo lee los eventos donde tiene asignación.

create policy "admin administra eventos"
  on events for all
  using (is_admin()) with check (is_admin());

create policy "juez lee su evento"
  on events for select to authenticated
  using (
    exists (
      select 1 from assignments a
      where a.event_id = events.id and a.judge_id = auth.uid()
    )
  );

create policy "admin administra categorías"
  on categories for all
  using (is_admin()) with check (is_admin());

create policy "juez lee categorías de su evento"
  on categories for select to authenticated
  using (
    exists (
      select 1 from assignments a
      where a.event_id = categories.event_id and a.judge_id = auth.uid()
    )
  );

create policy "admin administra bandas"
  on bands for all
  using (is_admin()) with check (is_admin());

create policy "juez lee bandas de su evento"
  on bands for select to authenticated
  using (
    exists (
      select 1 from assignments a
      where a.event_id = bands.event_id and a.judge_id = auth.uid()
    )
  );

-- ─── Asignaciones ───────────────────────────────────────────────────────

create policy "admin administra asignaciones"
  on assignments for all
  using (is_admin()) with check (is_admin());

create policy "juez lee sus asignaciones"
  on assignments for select to authenticated
  using (judge_id = auth.uid());

-- ─── Hojas llenadas ─────────────────────────────────────────────────────

create policy "admin administra hojas"
  on score_sheets for all
  using (is_admin()) with check (is_admin());

create policy "juez lee sus hojas"
  on score_sheets for select to authenticated
  using (
    exists (
      select 1 from assignments a
      where a.id = score_sheets.assignment_id and a.judge_id = auth.uid()
    )
  );

create policy "juez abre sus hojas"
  on score_sheets for insert to authenticated
  with check (
    exists (
      select 1 from assignments a
      where a.id = score_sheets.assignment_id and a.judge_id = auth.uid()
    )
  );

-- El juez puede entregar su hoja, pero no reabrirla: locked_at sólo lo
-- limpia un admin (cubierto por la política "admin administra hojas").
create policy "juez entrega su hoja"
  on score_sheets for update to authenticated
  using (
    locked_at is null
    and exists (
      select 1 from assignments a
      where a.id = score_sheets.assignment_id and a.judge_id = auth.uid()
    )
  )
  with check (
    locked_at is null
    and exists (
      select 1 from assignments a
      where a.id = score_sheets.assignment_id and a.judge_id = auth.uid()
    )
  );

-- ─── Calificaciones ─────────────────────────────────────────────────────
-- El corazón del modelo: la hoja debe ser del juez Y no estar bloqueada.

-- Dueño de la hoja, esté abierta o cerrada. Rige la LECTURA: tras entregar,
-- el juez debe poder seguir consultando lo que calificó.
create or replace function owns_sheet(p_sheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.score_sheets ss
    join public.assignments  a on a.id = ss.assignment_id
    where ss.id = p_sheet_id
      and a.judge_id = auth.uid()
  );
$$;

-- Dueño de una hoja AÚN ABIERTA. Rige la ESCRITURA: una vez bloqueada, sólo
-- un admin puede reabrirla.
create or replace function owns_open_sheet(p_sheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.score_sheets ss
    join public.assignments  a on a.id = ss.assignment_id
    where ss.id = p_sheet_id
      and a.judge_id = auth.uid()
      and ss.locked_at is null
  );
$$;

create policy "admin lee todas las calificaciones"
  on scores for select
  using (is_admin());

create policy "juez lee sus calificaciones"
  on scores for select to authenticated
  using (owns_sheet(sheet_id));

create policy "juez captura en su hoja abierta"
  on scores for insert to authenticated
  with check (owns_open_sheet(sheet_id));

create policy "juez corrige en su hoja abierta"
  on scores for update to authenticated
  using (owns_open_sheet(sheet_id))
  with check (owns_open_sheet(sheet_id));

-- Nadie borra calificaciones: no se define política DELETE para jueces, y
-- con RLS activo la ausencia de política equivale a negar la operación.
create policy "admin corrige calificaciones"
  on scores for all
  using (is_admin()) with check (is_admin());
