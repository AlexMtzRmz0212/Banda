import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/dal";
import { LoginForm } from "./login-form";

export const instant = false;

export const metadata = {
  title: "Entrar — Calificación Bandas de Guerra",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));

  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-white">
            Calificación en vivo
          </h1>
          <p className="mt-1 text-sm text-slate-400">Bandas de Guerra</p>
        </div>

        <LoginForm next={next} />

        <p className="mt-6 text-center text-xs text-slate-500">
          ¿Problemas para entrar? Busca al coordinador del evento.
        </p>
      </div>
    </main>
  );
}
