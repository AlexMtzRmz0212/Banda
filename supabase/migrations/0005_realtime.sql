-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0005: publicar los cambios para el tablero en vivo                   ║
-- ║                                                                      ║
-- ║ Supabase sólo transmite los cambios de las tablas que estén en la    ║
-- ║ publicación `supabase_realtime`. Sin esto, el tablero del admin se   ║
-- ║ quedaría quieto aunque los jueces estuvieran calificando.            ║
-- ║                                                                      ║
-- ║ El RLS se sigue aplicando a lo que se transmite: un juez suscrito    ║
-- ║ no recibe las calificaciones de otro.                                ║
-- ╚══════════════════════════════════════════════════════════════════════╝

do $$
declare
  t text;
begin
  foreach t in array array['scores', 'score_sheets', 'bands'] loop
    -- Volver a agregar una tabla ya publicada es un error, no un no-op.
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I', t
      );
    end if;
  end loop;
end $$;

-- Para que un UPDATE transmita también los valores anteriores. Sin esto, al
-- corregir una calificación el cliente no puede saber qué renglón cambió.
alter table scores replica identity full;
