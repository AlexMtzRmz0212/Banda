import Link from "next/link";
import { logout } from "@/app/login/actions";

export function AdminShell({
  title,
  subtitle,
  back,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            {back ? (
              <Link
                href={back.href}
                className="mb-1 inline-block text-sm text-slate-400 hover:text-slate-200"
              >
                ← {back.label}
              </Link>
            ) : null}
            <h1 className="text-xl font-semibold">{title}</h1>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>
            ) : null}
          </div>
          <form action={logout}>
            <button className="shrink-0 text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
              Salir
            </button>
          </form>
        </div>
      </header>
      {children}
    </main>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-medium tracking-wide text-slate-400 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}
