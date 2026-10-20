import { requireJudge } from "@/lib/dal";
import { logout } from "@/app/login/actions";

export default async function JuezPage() {
  const session = await requireJudge();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{session.fullName || "Juez"}</h1>
          <p className="text-sm text-slate-400">{session.email}</p>
        </div>
        <form action={logout}>
          <button className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
            Salir
          </button>
        </form>
      </header>

      <p className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
        Aquí aparecerán las hojas que se te asignen. (Pantalla de calificación:
        fase 3.)
      </p>
    </main>
  );
}
