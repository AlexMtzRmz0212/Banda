/**
 * Ilustraciones de la guía de instalación.
 *
 * SVG dibujado a mano en lugar de capturas de pantalla: no se desactualiza
 * cuando el navegador cambia de aspecto, se lee bien en cualquier tamaño y
 * pesa unos pocos kilobytes. Cada una lleva <title> para quien use lector de
 * pantalla.
 */

const TRAZO = "#475569";
const TEXTO = "#94a3b8";
const RESALTE = "#38bdf8";

/** Barra de direcciones con el icono de instalar resaltado. */
export function BarraChrome() {
  return (
    <svg
      viewBox="0 0 520 96"
      className="w-full"
      role="img"
      aria-labelledby="t-barra"
    >
      <title id="t-barra">
        Barra de direcciones de Chrome con el icono de instalar resaltado a la
        derecha
      </title>

      <rect
        x="8"
        y="8"
        width="504"
        height="48"
        rx="24"
        fill="#0f172a"
        stroke={TRAZO}
      />

      {/* Candado */}
      <rect x="28" y="24" width="12" height="10" rx="2" fill={TEXTO} />
      <path
        d="M31 24v-3a3 3 0 016 0v3"
        fill="none"
        stroke={TEXTO}
        strokeWidth="2"
      />

      <text x="52" y="37" fill={TEXTO} fontSize="14" fontFamily="monospace">
        banda-9m6l.vercel.app
      </text>

      {/* Icono de instalar, resaltado */}
      <g>
        <circle cx="430" cy="32" r="20" fill={RESALTE} opacity="0.18" />
        <rect
          x="419"
          y="23"
          width="22"
          height="15"
          rx="2"
          fill="none"
          stroke={RESALTE}
          strokeWidth="2"
        />
        <path
          d="M430 26v7m0 0l-3-3m3 3l3-3"
          fill="none"
          stroke={RESALTE}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M424 41h12" stroke={RESALTE} strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Tres puntos */}
      <g fill={TEXTO}>
        <circle cx="482" cy="26" r="2" />
        <circle cx="482" cy="32" r="2" />
        <circle cx="482" cy="38" r="2" />
      </g>

      <path
        d="M430 62v16"
        stroke={RESALTE}
        strokeWidth="2"
        strokeDasharray="3 3"
      />
      <text
        x="430"
        y="92"
        fill={RESALTE}
        fontSize="13"
        textAnchor="middle"
        fontWeight="600"
      >
        Instalar
      </text>
    </svg>
  );
}

/** Menú de tres puntos con la ruta hacia instalar. */
export function MenuChrome() {
  return (
    <svg
      viewBox="0 0 520 190"
      className="w-full"
      role="img"
      aria-labelledby="t-menu"
    >
      <title id="t-menu">
        Menú de Chrome abierto mostrando Enviar, guardar y compartir, e
        Instalar página como aplicación
      </title>

      <g fill={RESALTE}>
        <circle cx="486" cy="14" r="2.5" />
        <circle cx="486" cy="22" r="2.5" />
        <circle cx="486" cy="30" r="2.5" />
      </g>
      <circle cx="486" cy="22" r="17" fill={RESALTE} opacity="0.15" />

      <rect
        x="236"
        y="44"
        width="266"
        height="136"
        rx="10"
        fill="#0f172a"
        stroke={TRAZO}
      />

      <text x="256" y="70" fill={TEXTO} fontSize="13">
        Nueva pestaña
      </text>
      <text x="256" y="94" fill={TEXTO} fontSize="13">
        Historial
      </text>

      <rect
        x="244"
        y="104"
        width="250"
        height="28"
        rx="6"
        fill={RESALTE}
        opacity="0.15"
      />
      <text x="256" y="123" fill={RESALTE} fontSize="13" fontWeight="600">
        Enviar, guardar y compartir
      </text>
      <text x="474" y="123" fill={RESALTE} fontSize="13">
        ›
      </text>

      <rect
        x="244"
        y="138"
        width="250"
        height="28"
        rx="6"
        fill={RESALTE}
        opacity="0.25"
      />
      <text x="268" y="157" fill={RESALTE} fontSize="13" fontWeight="600">
        Instalar página como aplicación
      </text>
    </svg>
  );
}

/** Botón compartir de Safari con la opción de añadir al Dock. */
export function CompartirSafari() {
  return (
    <svg
      viewBox="0 0 520 170"
      className="w-full"
      role="img"
      aria-labelledby="t-safari"
    >
      <title id="t-safari">
        Menú de compartir de Safari con la opción Añadir al Dock
      </title>

      <g>
        <circle cx="60" cy="24" r="18" fill={RESALTE} opacity="0.15" />
        <rect
          x="52"
          y="20"
          width="16"
          height="16"
          rx="3"
          fill="none"
          stroke={RESALTE}
          strokeWidth="2"
        />
        <path
          d="M60 28V12m0 0l-4 4m4-4l4 4"
          fill="none"
          stroke={RESALTE}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <rect
        x="30"
        y="52"
        width="258"
        height="104"
        rx="10"
        fill="#0f172a"
        stroke={TRAZO}
      />

      <text x="50" y="78" fill={TEXTO} fontSize="13">
        Copiar enlace
      </text>

      <rect
        x="38"
        y="90"
        width="242"
        height="28"
        rx="6"
        fill={RESALTE}
        opacity="0.22"
      />
      <text x="50" y="109" fill={RESALTE} fontSize="13" fontWeight="600">
        Añadir al Dock
      </text>

      <text x="50" y="140" fill={TEXTO} fontSize="13">
        Añadir a Favoritos
      </text>
    </svg>
  );
}

/** La aplicación ya instalada, en su propia ventana. */
export function VentanaInstalada() {
  return (
    <svg
      viewBox="0 0 520 190"
      className="w-full"
      role="img"
      aria-labelledby="t-instalada"
    >
      <title id="t-instalada">
        La aplicación instalada abre en su propia ventana, sin barra de
        direcciones
      </title>

      <rect
        x="90"
        y="18"
        width="340"
        height="150"
        rx="10"
        fill="#0f172a"
        stroke={RESALTE}
      />

      <path d="M90 44h340" stroke={TRAZO} />
      <g fill={TRAZO}>
        <circle cx="110" cy="31" r="4" />
        <circle cx="124" cy="31" r="4" />
        <circle cx="138" cy="31" r="4" />
      </g>
      <text x="260" y="36" fill={TEXTO} fontSize="12" textAnchor="middle">
        Calificación
      </text>

      <text
        x="260"
        y="86"
        fill="#e2e8f0"
        fontSize="16"
        textAnchor="middle"
        fontWeight="600"
      >
        Calificación en vivo
      </text>
      <text x="260" y="106" fill={TEXTO} fontSize="12" textAnchor="middle">
        Bandas de Guerra
      </text>

      <rect
        x="170"
        y="120"
        width="180"
        height="26"
        rx="6"
        fill="none"
        stroke={TRAZO}
      />
      <text x="182" y="137" fill={TRAZO} fontSize="11">
        Correo
      </text>

      <rect x="170" y="152" width="180" height="2" rx="1" fill={RESALTE} />
    </svg>
  );
}
