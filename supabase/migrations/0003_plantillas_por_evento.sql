-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0003: las hojas se arman por evento                                  ║
-- ║                                                                      ║
-- ║ El cliente confirmó que el número de toques y de marchas lo define   ║
-- ║ cada convocatoria y puede variar. El catálogo fijo de 0001 daba por  ║
-- ║ sentados 3 toques y 1 marcha, y con eso el total de 665 puntos.      ║
-- ║                                                                      ║
-- ║ A partir de aquí: el catálogo (event_id NULL) es la plantilla madre, ║
-- ║ y cada evento recibe su propia copia con los criterios que le        ║
-- ║ correspondan. El total deja de ser una constante y se calcula.       ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ─── Cuántas repeticiones usa esta convocatoria ─────────────────────────

alter table events
  add column toques_count  int not null default 3
    check (toques_count between 1 and 20),
  add column marchas_count int not null default 1
    check (marchas_count between 1 and 20);

comment on column events.toques_count is
  'Toques de ordenanza que pide la convocatoria (el PDF del 2º Encuentro usa 3).';
comment on column events.marchas_count is
  'Marchas reglamentarias que pide la convocatoria (el PDF usa 1).';

-- ─── Plantillas propias de cada evento ──────────────────────────────────

alter table sheet_templates
  add column event_id uuid references events (id) on delete cascade;

comment on column sheet_templates.event_id is
  'NULL = plantilla del catálogo madre. Con valor = copia concreta de ese evento.';

-- La unicidad vieja (code, version) sólo tiene sentido para el catálogo:
-- dentro de un evento basta con que el código no se repita.
do $$
declare
  nombre text;
begin
  select conname into nombre
  from pg_constraint
  where conrelid = 'sheet_templates'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) = 'UNIQUE (code, version)';

  if nombre is not null then
    execute format('alter table sheet_templates drop constraint %I', nombre);
  end if;
end $$;

create unique index sheet_templates_catalogo_key
  on sheet_templates (code, version)
  where event_id is null;

create unique index sheet_templates_evento_key
  on sheet_templates (event_id, code)
  where event_id is not null;

-- ─── Una asignación no puede apuntar a la hoja de otro evento ───────────
-- Con la llave compuesta, Postgres lo impide por sí solo. De paso obliga a
-- usar plantillas del evento: las del catálogo tienen event_id NULL y
-- assignments.event_id nunca lo es.

alter table sheet_templates
  add constraint sheet_templates_id_event_key unique (id, event_id);

do $$
declare
  nombre text;
begin
  select conname into nombre
  from pg_constraint
  where conrelid = 'assignments'::regclass
    and contype = 'f'
    and pg_get_constraintdef(oid) like '%sheet_templates%';

  if nombre is not null then
    execute format('alter table assignments drop constraint %I', nombre);
  end if;
end $$;

alter table assignments
  add constraint assignments_template_del_evento_fkey
  foreign key (template_id, event_id)
  references sheet_templates (id, event_id)
  on delete restrict;

-- ─── El admin arma las hojas del evento ─────────────────────────────────
-- Hasta ahora sólo se sembraban con la service_role key. Ahora el panel
-- clona el catálogo al crear un evento, así que el admin necesita escribir.

create policy "admin administra plantillas"
  on sheet_templates for all
  using (is_admin()) with check (is_admin());

create policy "admin administra criterios"
  on sheet_criteria for all
  using (is_admin()) with check (is_admin());
