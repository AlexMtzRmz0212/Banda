# Sistema de Calificación — Bandas de Guerra

Calificación en vivo para encuentros intercolegiales de bandas de guerra.
Los jueces califican desde una tableta, el administrador ve los totales
actualizarse en tiempo real, y la Hoja de Sumatoria Total se calcula en lugar
de transcribirse a mano.

- **Sin conexión primero.** Los patios y canchas tienen mala señal: cada toque
  se guarda en el dispositivo y se sincroniza al reconectar. Una señal caída
  nunca pierde calificaciones.
- **Una cuenta por juez.** Cada juez ve únicamente la hoja que se le asignó;
  el administrador ve todo. La separación se impone en la base de datos
  mediante Row Level Security, no en la interfaz.
- **Multi-evento.** El administrador crea eventos, categorías, bandas y
  asignaciones. Sirve para cualquier concurso, no sólo para uno.

## Stack

| | |
|---|---|
| Aplicación | Next.js 16 (App Router), TypeScript, Tailwind 4 |
| Base de datos | Supabase — Postgres, Auth, Realtime, RLS |
| Sin conexión | Dexie (IndexedDB) + service worker, PWA instalable |
| Hospedaje | Vercel |

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # llena los valores del panel de Supabase
```

Aplica las migraciones en orden desde el **SQL Editor** de Supabase
(`supabase/migrations/0001_init.sql`, luego `0002_rls.sql`), o con la CLI:

```bash
npx supabase db push
```

Siembra el catálogo de hojas y levanta el servidor:

```bash
npm run seed
npm run dev
```

## Comandos

| | |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm test` | Pruebas (catálogo, RLS, sincronización) |
| `npm run seed` | Siembra las 11 plantillas de hojas |
| `npm run lint` | ESLint |

## El modelo de calificación

Transcrito de *HOJAS DE EVALUACION INTERCOLEGIALES.pdf*. Toda hoja tiene la
misma forma: criterios calificados de **0.5 a 5.0 en pasos de 0.5**, más
observaciones por renglón.

El PDF lista 16 renglones sumables porque seis hojas se evalúan por duplicado
(Juez 1 y Juez 2). El código las representa como **11 plantillas** con
`judge_slots`, lo que evita once pares de definiciones duplicadas:

| Hoja | Criterios | Puntos | Jueces |
|---|---|---|---|
| Revista de Personal | 9 | 45 | 1 |
| Revista de Instrumentos — Caja | 10 | 50 | 1 |
| Revista de Instrumentos — Corneta/Clarín | 6 | 30 | 1 |
| Orden Cerrado | 8 | 40 | 1 |
| Toques de Ordenanza — Cajeros | 12 | 60 | 2 |
| Toques de Ordenanza — Cornetas | 12 | 60 | 2 |
| Marcha Reglamentaria — Cajas | 5 | 25 | 2 |
| Marcha Reglamentaria — Cornetas | 5 | 25 | 2 |
| Rutina Libre — Cajeros | 8 | 40 | 2 |
| Rutina Libre — Cornetas | 8 | 40 | 2 |
| **Total compilatorio** | | **665** | |
| Comandante | 8 | 40 | 1 — *no suma al total* |

`src/lib/sheets.ts` es la fuente de la verdad; la base de datos se siembra
desde ahí. Las pruebas verifican que cada hoja cuadre con el máximo impreso y
que el compilatorio dé exactamente 665, de modo que un criterio perdido o
duplicado en la transcripción falla de inmediato.

## Decisiones de diseño

**Los totales nunca se almacenan.** `v_band_totals` y `v_sheet_totals` los
calculan, así que no pueden desfasarse de las calificaciones que los originan.

**`UNIQUE (sheet_id, criterion_id)`** es lo que hace seguro el modo sin
conexión: reenviar la cola pendiente se vuelve un upsert idempotente, y los
conflictos se resuelven por `client_updated_at`. Un juez puede calificar una
banda entera en modo avión, reconectar, y cada calificación aterriza
exactamente una vez.

**El RLS es la frontera de seguridad.** Un juez sólo escribe en hojas que (a)
le pertenecen y (b) siguen abiertas. Puede seguir leyendo lo que entregó, pero
no modificarlo: reabrir una hoja es facultad del administrador. Nadie borra
calificaciones.

**Portabilidad.** El proyecto evita funciones exclusivas de Vercel (ISR,
optimización de `next/image`, Edge Middleware para auth) y concentra el acceso
al entorno en `src/lib/env.ts`. Si algún día deja de ser un favor y hay que
mudarse a Cloudflare o a Vercel Pro, el cambio es de configuración.

## Operación

**Supabase pausa los proyectos gratuitos tras 7 días sin tráfico** y hay que
restaurarlos a mano desde el panel. Como los concursos ocurren con meses de
diferencia, `.github/workflows/keepalive.yml` hace un ping semanal. Aun así,
**revisa el proyecto 48 horas antes de cada evento.**

El plan gratuito no tiene recuperación a un punto en el tiempo: respalda con
`pg_dump` después de cada evento y deja una copia en manos del cliente.

Las vistas previas de Vercel Hobby no llevan contraseña. **Nunca pongas datos
reales de jueces o bandas en una URL de preview** — la base guarda nombres de
menores de edad. Para demostraciones, usa nombres de bandas inventados.

## Notas

`npm audit` reporta `braces` como vulnerabilidad alta. Llega únicamente a
través de `eslint-config-next` (herramienta de desarrollo, no código que se
despliega) y la corrección automática degrada ESLint a la v14, lo que rompe el
linting de Next 16. Se deja como está a propósito.
