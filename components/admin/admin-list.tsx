"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { photoUrl } from "@/lib/photos";
import { REGIONS } from "@/lib/regions";

export type AdminCenter = {
  id: string; name: string; city: string | null; region: string; hidden: boolean; owner_id: string | null;
  phone: string | null; email: string | null; website: string | null; description: string | null; lat: number | null;
  business_types: string[]; created_at: string; center_photos: { path: string; position: number }[];
};

// Directory goals on the way to EUDI (17/02/2027), see docs/DEVLOG.md.
const MILESTONES = [
  { target: 60, by: "15/12" },
  { target: 100, by: "metà gennaio" },
  { target: 150, by: "EUDI, 17/02" },
];

// What a listing still lacks, in the order it matters to a diver.
export function missing(c: Pick<AdminCenter, "center_photos" | "description" | "phone" | "email" | "website" | "lat">) {
  const out: string[] = [];
  if (!c.center_photos.length) out.push("foto");
  if (!c.description) out.push("descrizione");
  if (!c.phone && !c.email) out.push("contatti");
  if (!c.website) out.push("sito");
  if (c.lat == null) out.push("mappa");
  return out;
}

const FILTERS = {
  all: "Tutte",
  todo: "Da completare",
  nophoto: "Senza foto",
  hidden: "Nascoste",
  test: "Di prova",
} as const;
type Filter = keyof typeof FILTERS;

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function AdminList({ centers }: { centers: AdminCenter[] }) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const real = centers.filter((c) => !c.name.startsWith("[TEST]") && !c.hidden);
  const weekAgo = Date.now() - 7 * 86400_000;
  const thisWeek = real.filter((c) => new Date(c.created_at).getTime() > weekAgo).length;
  const complete = real.filter((c) => missing(c).length === 0).length;
  const next = MILESTONES.find((m) => real.length < m.target) ?? MILESTONES.at(-1)!;

  const shown = useMemo(() => {
    const needle = normalize(q.trim());
    return centers.filter((c) => {
      const isTest = c.name.startsWith("[TEST]");
      if (filter === "test" ? !isTest : isTest && (filter === "todo" || filter === "nophoto")) return false;
      if (filter === "hidden" && !c.hidden) return false;
      if (filter === "todo" && missing(c).length === 0) return false;
      if (filter === "nophoto" && c.center_photos.length) return false;
      if (region && c.region !== region) return false;
      return !needle || normalize(`${c.name} ${c.city ?? ""}`).includes(needle);
    });
  }, [centers, q, region, filter]);

  return (
    <div className="space-y-6">
      <section aria-label="Avanzamento" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-background p-5 sm:col-span-2">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-medium text-muted-foreground">Schede online</p>
            <p className="text-sm text-muted-foreground">Prossimo obiettivo: <span className="font-semibold text-foreground">{next.target}</span> entro {next.by}</p>
          </div>
          <p className="mt-1 text-5xl font-bold tabular-nums">{real.length}</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={next.target} aria-valuenow={real.length} aria-label={`${real.length} su ${next.target}`}>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (real.length / next.target) * 100)}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            {MILESTONES.map((m) => (
              <span key={m.target} className={real.length >= m.target ? "font-semibold text-primary" : ""}>{m.target} · {m.by}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
          <div className="rounded-2xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Ultimi 7 giorni</p>
            <p className="text-3xl font-bold tabular-nums">+{thisWeek}</p>
          </div>
          <div className="rounded-2xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">Complete</p>
            <p className="text-3xl font-bold tabular-nums">{complete}<span className="text-base font-medium text-muted-foreground"> / {real.length}</span></p>
          </div>
        </div>
      </section>

      <section aria-label="Schede" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="adm-q">Cerca</label>
          <input id="adm-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome o città"
            className="h-12 flex-1 rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
          <label className="sr-only" htmlFor="adm-region">Regione</label>
          <select id="adm-region" value={region} onChange={(e) => setRegion(e.target.value)}
            className="h-12 rounded-xl border bg-background px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-56">
            <option value="">Tutte le regioni</option>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtri">
          {(Object.keys(FILTERS) as Filter[]).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={`h-10 rounded-full border px-4 text-sm font-medium transition-colors ${filter === f ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary"}`}>
              {FILTERS[f]}
            </button>
          ))}
          <span className="ml-auto self-center text-sm text-muted-foreground">{shown.length} schede</span>
        </div>

        {shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-background p-10 text-center">
            <p className="font-medium">Nessuna scheda trovata</p>
            <Link href="/admin/nuovo" className="mt-2 inline-block text-sm text-primary hover:underline">Aggiungine una</Link>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {shown.map((c) => {
              const cover = [...c.center_photos].sort((a, b) => a.position - b.position)[0];
              const todo = missing(c);
              return (
                <li key={c.id}>
                  <Link href={`/admin/${c.id}`}
                    className="flex gap-4 rounded-2xl border bg-background p-3 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {cover
                        ? <Image src={photoUrl(cover.path)} alt="" fill sizes="80px" className="object-cover" />
                        : <span className="flex h-full items-center justify-center text-xs text-muted-foreground">Nessuna foto</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{c.city ? `${c.city}, ` : ""}{c.region}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        {c.hidden && <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">Nascosta</span>}
                        {c.owner_id && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Rivendicata</span>}
                        {todo.length === 0
                          ? <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Completa</span>
                          : <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Manca: {todo.join(", ")}</span>}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
