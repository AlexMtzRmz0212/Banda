"use client";

export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-10 rounded-lg bg-sky-500 px-4 text-sm font-medium text-white transition-colors hover:bg-sky-400"
    >
      Imprimir o guardar PDF
    </button>
  );
}
