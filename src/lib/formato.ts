const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * Formatea una fecha `YYYY-MM-DD` de Postgres.
 *
 * Se hace a mano en lugar de `new Date(...).toLocaleDateString()` por dos
 * razones: con Cache Components, Next marca el constructor Date como valor
 * inestable durante el prerenderizado; y construir un Date desde una fecha
 * sin hora arrastra la zona horaria, que puede correr el día del evento.
 */
export function formatearFecha(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${day} de ${MESES[month - 1]} de ${year}`;
}
