-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0004: el juez sí puede entregar su hoja                              ║
-- ║                                                                      ║
-- ║ La política de 0002 exigía `locked_at is null` también en el WITH    ║
-- ║ CHECK, que se evalúa sobre el renglón YA MODIFICADO. Entregar una    ║
-- ║ hoja es justamente ponerle locked_at, así que la condición nunca se  ║
-- ║ podía cumplir: la entrega se rechazaba siempre, y en silencio,       ║
-- ║ porque un UPDATE que no alcanza ningún renglón no es un error.       ║
-- ║                                                                      ║
-- ║ El USING sigue exigiendo que la hoja esté abierta, y eso basta: una  ║
-- ║ vez bloqueada, el juez ya no puede volver a tocarla.                 ║
-- ╚══════════════════════════════════════════════════════════════════════╝

drop policy "juez entrega su hoja" on score_sheets;

create policy "juez entrega su hoja"
  on score_sheets for update to authenticated
  using (
    -- Sólo hojas suyas y todavía abiertas.
    locked_at is null
    and exists (
      select 1 from assignments a
      where a.id = score_sheets.assignment_id and a.judge_id = auth.uid()
    )
  )
  with check (
    -- Al guardar sólo se comprueba la pertenencia: poner locked_at es
    -- precisamente lo que hace la entrega.
    exists (
      select 1 from assignments a
      where a.id = score_sheets.assignment_id and a.judge_id = auth.uid()
    )
  );
