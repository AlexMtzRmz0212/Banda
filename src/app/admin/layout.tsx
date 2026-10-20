/**
 * Todo el panel va detrás de sesión y es distinto para cada usuario, así que
 * no hay un "cascarón estático" que valga la pena preservar: la navegación
 * bloquea en el servidor a propósito.
 *
 * Es la ruta de migración que documenta Next para Cache Components. Cuando la
 * pantalla del juez necesite pintar algo antes de resolver la sesión (fase 3),
 * ahí sí conviene <Suspense> en lugar de esto.
 */
export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
