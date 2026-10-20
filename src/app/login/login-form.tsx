"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "./actions";

const inicial: LoginState = { error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-lg bg-sky-500 font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-50"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(login, inicial);

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-slate-300"
        >
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          // Las tabletas suelen capitalizar la primera letra y romper el correo.
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="h-12 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none placeholder:text-slate-600 focus:border-sky-500"
          placeholder="juez@ejemplo.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-slate-300"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-sky-500"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
        >
          {state.error}
        </p>
      ) : null}

      <Submit />
    </form>
  );
}
