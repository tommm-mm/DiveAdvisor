import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser, safeNext } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Accedi",
  description: "Accedi con un link via email, senza password.",
  robots: { index: false },
};

type Props = { searchParams: Promise<{ next?: string; errore?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, errore } = await searchParams;
  const target = safeNext(next);
  if (await getUser()) redirect(target);
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Accedi</h1>
      <p className="mt-1 text-sm text-muted-foreground">Ti inviamo un link via email: niente password da ricordare.</p>
      {errore && (
        <p role="alert" className="mt-4 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
          Il link non è valido o è scaduto. Richiedine uno nuovo.
        </p>
      )}
      <div className="mt-6"><LoginForm next={target} /></div>
    </main>
  );
}
