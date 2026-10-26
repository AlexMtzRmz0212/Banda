import Link from "next/link";
import {
  BarraChrome,
  MenuChrome,
  CompartirSafari,
  VentanaInstalada,
} from "./ilustraciones";

export const instant = false;

export const metadata = {
  title: "Instalar la app — Calificación Bandas de Guerra",
  description:
    "Cómo instalar la aplicación de calificación en una laptop o tableta.",
};

/**
 * Guía de instalación.
 *
 * Es pública a propósito: el juez la abre antes de tener cuenta, muchas veces
 * el día del concurso y con prisa. Las ilustraciones son SVG dibujados aquí
 * mismo, no capturas de pantalla: no se desactualizan cuando el navegador
 * cambia de aspecto, y pesan unos cuantos kilobytes.
 */
export default function InstalarPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold">Instalar la aplicación</h1>
        <p className="mt-2 text-slate-400">
          No hace falta descargar nada de una tienda. El navegador la instala
          como un programa más: queda con su propio icono y abre en su ventana,
          sin barra de direcciones ni pestañas que estorben mientras calificas.
        </p>
      </header>

      <section className="mb-10 rounded-lg border border-sky-500/30 bg-sky-500/5 p-4">
        <h2 className="font-medium text-sky-300">¿Para qué sirve?</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
          <li>
            <strong>Abre sin señal.</strong> Si se cae el internet a media
            competencia, la aplicación sigue abriendo y puedes seguir
            calificando.
          </li>
          <li>
            <strong>Protege lo que capturaste.</strong> Instalada, el navegador
            se compromete a no borrar las calificaciones que aún no se han
            subido.
          </li>
          <li>
            <strong>Se abre de un clic</strong>, sin teclear la dirección.
          </li>
        </ul>
      </section>

      <Paso
        numero={1}
        titulo="Chrome o Edge en laptop"
        descripcion="Busca el icono de instalar en el lado derecho de la barra de direcciones. Es una pantalla con una flecha hacia abajo."
      >
        <BarraChrome />
      </Paso>

      <Paso
        numero={2}
        titulo="Si no aparece el icono"
        descripcion="Abre el menú de los tres puntos, arriba a la derecha, y busca «Enviar, guardar y compartir» → «Instalar página como aplicación»."
      >
        <MenuChrome />
      </Paso>

      <Paso
        numero={3}
        titulo="Safari en Mac o iPad"
        descripcion="Toca el botón de compartir y elige «Añadir al Dock» en Mac, o «Añadir a pantalla de inicio» en iPad."
      >
        <CompartirSafari />
      </Paso>

      <Paso
        numero={4}
        titulo="Listo"
        descripcion="La aplicación abre en su propia ventana, con su icono en el escritorio o en la barra de tareas. Entras con el correo y la contraseña que te dio la coordinación."
      >
        <VentanaInstalada />
      </Paso>

      <section className="mt-10 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="font-medium">¿Y si no quiero instalarla?</h2>
        <p className="mt-2 text-sm text-slate-400">
          Funciona igual desde el navegador normal. Instalarla sólo agrega
          comodidad y una garantía extra de que no se borren las
          calificaciones pendientes de subir.
        </p>
      </section>

      <div className="mt-10 text-center">
        <Link
          href="/login"
          className="inline-block rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-400"
        >
          Ir a entrar
        </Link>
      </div>
    </main>
  );
}

function Paso({
  numero,
  titulo,
  descripcion,
  children,
}: {
  numero: number;
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-300">
          {numero}
        </span>
        <div>
          <h2 className="font-medium">{titulo}</h2>
          <p className="mt-1 text-sm text-slate-400">{descripcion}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        {children}
      </div>
    </section>
  );
}
