"use client";

import { useFormStatus } from "react-dom";

/** Botón de envío que se deshabilita solo mientras corre la acción. */
export function SubmitButton({
  children,
  pendingLabel,
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        "h-10 rounded-lg bg-sky-500 px-4 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-50 " +
        className
      }
    >
      {pending ? (pendingLabel ?? "Guardando…") : children}
    </button>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-sm text-red-400">
      {children}
    </p>
  );
}

export const inputClass =
  "h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-500";
