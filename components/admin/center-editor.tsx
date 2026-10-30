"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { compress } from "@/lib/compress-image";
import { MAX_PHOTOS, PHOTO_BUCKET, photoUrl } from "@/lib/photos";
import { REGIONS } from "@/lib/regions";
import { BUSINESS_TYPE_LABELS, DIVE_TYPE_LABELS, FEDERATIONS, LANGUAGE_LABELS, SERVICE_LABELS } from "@/lib/labels";
import {
  addPhoto, findSimilar, lookupMapsLink, photoUploadUrl, removePhoto, reorderPhotos, saveCenter, setHidden,
} from "@/app/admin/actions";

const TEXT_KEYS = ["id", "name", "region", "city", "province", "address", "lat", "lng", "description", "phone", "whatsapp",
  "email", "website", "instagram", "season"] as const;
const LIST_KEYS = ["business_types", "federations", "dive_types", "services", "languages", "video_urls"] as const;
type TextKey = (typeof TEXT_KEYS)[number];
type ListKey = (typeof LIST_KEYS)[number];
type Values = Record<TextKey, string> & Record<ListKey, string[]>;

export type EditorCenter = Partial<Record<TextKey, string | number | null>> & Partial<Record<ListKey, string[]>> & {
  id: string; slug: string; region: string; hidden: boolean; owner_id: string | null;
  center_photos: { id: string; path: string; position: number }[];
};

type Photo = { id: string; path: string; position: number };
type Queued = { key: string; file: File; preview: string };

function initialValues(c?: EditorCenter, keep?: Partial<Values>): Values {
  const v = {} as Values;
  for (const k of TEXT_KEYS) v[k] = c?.[k] == null ? "" : String(c[k]);
  for (const k of LIST_KEYS) v[k] = c?.[k] ?? [];
  if (!c) v.business_types = ["diving"];
  return { ...v, ...keep };
}

const field = "w-full rounded-xl border bg-background px-3.5 text-base outline-none transition-shadow focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive disabled:opacity-60";

export function CenterEditor({ center, publicUrl, justCreated }: { center?: EditorCenter; publicUrl?: string; justCreated?: boolean }) {
  const router = useRouter();
  const isNew = !center;
  const locked = !!center?.owner_id;
  const supabase = useRef(createClient()).current;

  const [v, setV] = useState<Values>(() => initialValues(center));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ ok: boolean; text: string; href?: string } | null>(
    justCreated ? { ok: true, text: "Scheda creata. Completa i dettagli." } : null);
  const [saving, startSave] = useTransition();
  const [mapsLink, setMapsLink] = useState("");
  const [mapsState, setMapsState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [dupes, setDupes] = useState<{ id: string; name: string; city: string | null; region: string }[]>([]);
  const [photos, setPhotos] = useState<Photo[]>(() => [...(center?.center_photos ?? [])].sort((a, b) => a.position - b.position));
  const [queued, setQueued] = useState<Queued[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [hidden, setHiddenState] = useState(center?.hidden ?? false);
  const [dirty, setDirty] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const set = (k: TextKey, value: string) => { setV((p) => ({ ...p, [k]: value })); setDirty(true); };
  const toggle = (k: ListKey, value: string) => {
    setV((p) => ({ ...p, [k]: p[k].includes(value) ? p[k].filter((x) => x !== value) : [...p[k], value] }));
    setDirty(true);
  };

  useEffect(() => { if (toast?.ok) { const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => () => queued.forEach((q) => URL.revokeObjectURL(q.preview)), [queued]);

  // Google Maps link: fills name, address, town, region and the map pin in one go.
  async function fillFromMaps(link: string) {
    if (!link.trim()) return;
    setMapsState("loading");
    const place = await lookupMapsLink(link.trim());
    if (!place) return setMapsState("error");
    setV((p) => ({
      ...p,
      name: p.name || place.name || "",
      address: place.address ?? p.address,
      city: place.city ?? p.city,
      province: place.province ?? p.province,
      region: place.region ?? p.region,
      lat: place.lat != null ? String(place.lat) : p.lat,
      lng: place.lng != null ? String(place.lng) : p.lng,
    }));
    setDirty(true);
    setMapsState("ok");
    if (isNew && place.name) checkDupes(place.name, place.city ?? "");
  }

  async function checkDupes(name: string, city: string) {
    if (!isNew || name.trim().length < 3) return setDupes([]);
    setDupes(await findSimilar(name, city));
  }

  async function uploadFiles(centerId: string, files: File[]) {
    let ok = 0;
    for (const file of files) {
      try {
        const blob = await compress(file);
        const slot = await photoUploadUrl(centerId);
        if (!slot) continue;
        const { error } = await supabase.storage.from(PHOTO_BUCKET).uploadToSignedUrl(slot.path, slot.token, blob, { contentType: "image/webp" });
        if (error) continue;
        const photo = await addPhoto(centerId, slot.path);
        if (photo) { ok++; setPhotos((p) => [...p, photo]); }
      } catch { /* counted as failed below */ }
    }
    return { ok, failed: files.length - ok };
  }

  function pickFiles(list: FileList | null) {
    const room = MAX_PHOTOS - photos.length - queued.length;
    const files = [...(list ?? [])].filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, room));
    if (!files.length) return setToast({ ok: false, text: room ? "Scegli dei file immagine." : `Massimo ${MAX_PHOTOS} foto.` });
    if (isNew) {
      setQueued((q) => [...q, ...files.map((file) => ({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }))]);
      setDirty(true);
      return;
    }
    setPhotoBusy(true);
    uploadFiles(center!.id, files).then(({ ok, failed }) => {
      setPhotoBusy(false);
      setToast(failed ? { ok: false, text: `${failed} foto non caricate. Riprova.` } : { ok: true, text: ok === 1 ? "Foto caricata." : `${ok} foto caricate.` });
      router.refresh();
    });
  }

  async function movePhoto(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    setPhotos(next);
    if (!(await reorderPhotos(center!.id, next.map((p) => p.id)))) setToast({ ok: false, text: "Ordine non salvato. Riprova." });
  }

  async function deletePhoto(p: Photo) {
    setPhotoBusy(true);
    if (await removePhoto(p.id)) setPhotos((list) => list.filter((x) => x.id !== p.id));
    else setToast({ ok: false, text: "Foto non eliminata. Riprova." });
    setPhotoBusy(false);
  }

  const save = useCallback((andNew: boolean) => {
    if (locked) return;
    startSave(async () => {
      const form = new FormData();
      for (const k of TEXT_KEYS) form.set(k, v[k]);
      for (const k of LIST_KEYS) v[k].forEach((x) => form.append(k, x));
      const res = await saveCenter(form);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setToast({ ok: false, text: res.message ?? "Salvataggio non riuscito." });
        const first = Object.keys(res.fieldErrors ?? {})[0];
        if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
        return;
      }
      setErrors({});
      setDirty(false);
      let photoNote = "";
      if (queued.length) {
        const { failed } = await uploadFiles(res.id, queued.map((q) => q.file));
        if (failed) photoNote = ` ${failed} foto non caricate: riprova dalla scheda.`;
      }
      const name = v.name.trim();
      if (isNew && andNew) {
        // Keep the area: the next listing is usually in the same town.
        setV(initialValues(undefined, { region: v.region, city: v.city, province: v.province }));
        setQueued([]);
        setPhotos([]);
        setMapsLink("");
        setMapsState("idle");
        setDupes([]);
        setToast({ ok: !photoNote, text: `${name} è online.${photoNote}`, href: `/admin/${res.id}` });
        window.scrollTo({ top: 0, behavior: "smooth" });
        nameRef.current?.focus();
        router.refresh();
      } else if (isNew) {
        router.replace(`/admin/${res.id}?nuova=1`);
      } else {
        setToast({ ok: !photoNote, text: `Salvato. È già online.${photoNote}`, href: res.url });
        router.refresh();
      }
    });
  }, [v, queued, isNew, locked, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl/Cmd+S saves, like any editor (tablet keyboards included).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const input = (k: TextKey, labelText: string, opts: { type?: string; placeholder?: string; inputMode?: "tel" | "email" | "url" | "decimal"; className?: string } = {}) => (
    <div className={`space-y-1.5 ${opts.className ?? ""}`}>
      <label htmlFor={`ad-${k}`} className="text-sm font-medium">{labelText}</label>
      <input id={`ad-${k}`} name={k} type={opts.type ?? "text"} value={v[k]} placeholder={opts.placeholder} inputMode={opts.inputMode}
        ref={k === "name" ? nameRef : undefined} disabled={locked}
        onChange={(e) => set(k, e.target.value)}
        onBlur={k === "name" || k === "city" ? () => checkDupes(v.name, v.city) : undefined}
        aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `ad-${k}-err` : undefined}
        className={`${field} h-12`} />
      {errors[k] && <p id={`ad-${k}-err`} className="text-sm text-destructive">{errors[k]}</p>}
    </div>
  );

  const chips = (k: ListKey, title: string, options: [string, string][]) => (
    <fieldset className="space-y-2" aria-describedby={errors[k] ? `ad-${k}-err` : undefined}>
      <legend className="text-sm font-medium">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([value, text]) => {
          const on = v[k].includes(value);
          return (
            <button key={value} type="button" role="checkbox" aria-checked={on} disabled={locked} onClick={() => toggle(k, value)}
              className={`h-11 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 ${on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary"}`}>
              {text}
            </button>
          );
        })}
      </div>
      {errors[k] && <p id={`ad-${k}-err`} className="text-sm text-destructive">{errors[k]}</p>}
    </fieldset>
  );

  const card = "rounded-2xl border bg-background p-5 space-y-4";
  const pinned = v.lat && v.lng;
  const allPhotos = photos.length + queued.length;

  return (
    <form ref={formRef} onSubmit={(e) => { e.preventDefault(); save(false); }} noValidate className="pb-28">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold sm:text-3xl">{isNew ? "Nuova scheda" : v.name || "Scheda"}</h1>
        {!isNew && publicUrl && !hidden && (
          <Link href={publicUrl} target="_blank" className="h-10 rounded-xl border bg-background px-4 text-sm font-medium leading-10 hover:border-primary">Vedi online</Link>
        )}
        {!isNew && (
          <button type="button" onClick={async () => { await setHidden(center!.id, !hidden); setHiddenState(!hidden); router.refresh(); }}
            className={`h-10 rounded-xl border px-4 text-sm font-medium ${hidden ? "border-primary text-primary" : "bg-background hover:border-destructive hover:text-destructive"}`}>
            {hidden ? "Rendi visibile" : "Nascondi"}
          </button>
        )}
      </div>

      {locked && (
        <p className="mb-4 rounded-xl bg-primary/10 p-4 text-sm">Questa scheda è stata rivendicata: la modifica solo il proprietario. Puoi comunque nasconderla.</p>
      )}
      {hidden && <p className="mb-4 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">Scheda nascosta: non è visibile sul sito.</p>}

      {!locked && (
        <section className="mb-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-5">
          <label htmlFor="ad-maps" className="text-sm font-semibold">Link di Google Maps</label>
          <p className="text-sm text-muted-foreground">Su Maps tocca Condividi, copia il link e incollalo qui: compiliamo nome, indirizzo e posizione.</p>
          <div className="mt-3 flex gap-2">
            <input id="ad-maps" type="url" inputMode="url" value={mapsLink} placeholder="https://maps.app.goo.gl/…"
              onChange={(e) => setMapsLink(e.target.value)}
              onPaste={(e) => { const t = e.clipboardData.getData("text"); setTimeout(() => fillFromMaps(t), 0); }}
              className={`${field} h-12 flex-1`} />
            <button type="button" onClick={() => fillFromMaps(mapsLink)} disabled={mapsState === "loading"}
              className="h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {mapsState === "loading" ? "Cerco" : "Compila"}
            </button>
          </div>
          <p role="status" className="mt-2 min-h-5 text-sm">
            {mapsState === "ok" && <span className="font-medium text-primary">Dati compilati. Controlla e completa.</span>}
            {mapsState === "error" && <span className="text-destructive">Link non riconosciuto. Usa il link di condivisione di Google Maps.</span>}
          </p>
        </section>
      )}

      {dupes.length > 0 && (
        <div role="alert" className="mb-4 rounded-2xl border border-foreground/20 bg-sand p-4 text-sm">
          <p className="font-semibold">Forse esiste già:</p>
          <ul className="mt-1 space-y-0.5">
            {dupes.map((d) => <li key={d.id}><Link href={`/admin/${d.id}`} className="underline underline-offset-2">{d.name}</Link> · {d.city ?? d.region}</li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card} aria-labelledby="sec-base">
          <h2 id="sec-base" className="font-sans text-lg font-semibold">Dati principali</h2>
          {input("name", "Nome")}
          {chips("business_types", "Tipo di attività", Object.entries(BUSINESS_TYPE_LABELS))}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="ad-region" className="text-sm font-medium">Regione</label>
              <select id="ad-region" name="region" value={v.region} disabled={locked} onChange={(e) => set("region", e.target.value)}
                aria-invalid={!!errors.region} className={`${field} h-12`}>
                <option value="" disabled>Scegli</option>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
              {errors.region && <p className="text-sm text-destructive">{errors.region}</p>}
            </div>
            {input("city", "Città")}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {input("address", "Indirizzo", { className: "sm:col-span-2" })}
            {input("province", "Provincia")}
          </div>
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-primary">
              {pinned ? "Posizione sulla mappa impostata" : "Nessuna posizione: la troviamo dall'indirizzo al salvataggio"}
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {input("lat", "Latitudine", { inputMode: "decimal" })}
              {input("lng", "Longitudine", { inputMode: "decimal" })}
            </div>
          </details>
        </section>

        <section className={card} aria-labelledby="sec-contacts">
          <h2 id="sec-contacts" className="font-sans text-lg font-semibold">Contatti</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {input("phone", "Telefono", { type: "tel", inputMode: "tel" })}
            <div className="space-y-1.5">
              {input("whatsapp", "WhatsApp", { type: "tel", inputMode: "tel" })}
              {v.phone && !v.whatsapp && !locked && (
                <button type="button" onClick={() => set("whatsapp", v.phone)} className="text-xs font-medium text-primary hover:underline">Uguale al telefono</button>
              )}
            </div>
          </div>
          {input("email", "Email", { type: "email", inputMode: "email" })}
          {input("website", "Sito web", { type: "url", inputMode: "url", placeholder: "https://" })}
          {input("instagram", "Instagram", { placeholder: "@nomeprofilo" })}
          {input("season", "Stagione", { placeholder: "aprile–ottobre" })}
        </section>

        <section className={`${card} lg:col-span-2`} aria-labelledby="sec-photos">
          <div className="flex items-baseline justify-between">
            <h2 id="sec-photos" className="font-sans text-lg font-semibold">Foto</h2>
            <span className="text-sm text-muted-foreground">{allPhotos} / {MAX_PHOTOS} · la prima è la copertina</span>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((p, i) => (
              <li key={p.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                <Image src={photoUrl(p.path)} alt={`Foto ${i + 1}`} fill sizes="300px" className="object-cover" />
                {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-background px-2 py-0.5 text-xs font-semibold">Copertina</span>}
                {!locked && (
                  <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/45 p-2">
                    <div className="flex gap-1">
                      <button type="button" aria-label="Sposta a sinistra" disabled={i === 0 || photoBusy} onClick={() => movePhoto(i, -1)} className="size-9 rounded-lg bg-background/90 text-sm font-bold disabled:opacity-40">←</button>
                      <button type="button" aria-label="Sposta a destra" disabled={i === photos.length - 1 || photoBusy} onClick={() => movePhoto(i, 1)} className="size-9 rounded-lg bg-background/90 text-sm font-bold disabled:opacity-40">→</button>
                    </div>
                    <button type="button" aria-label="Elimina foto" disabled={photoBusy} onClick={() => deletePhoto(p)} className="h-9 rounded-lg bg-background/90 px-3 text-xs font-semibold text-destructive">Elimina</button>
                  </div>
                )}
              </li>
            ))}
            {queued.map((q, i) => (
              <li key={q.key} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img src={q.preview} alt={`Nuova foto ${i + 1}`} className="size-full object-cover" />
                {photos.length + i === 0 && <span className="absolute left-2 top-2 rounded-full bg-background px-2 py-0.5 text-xs font-semibold">Copertina</span>}
                <button type="button" aria-label="Togli foto" onClick={() => setQueued((list) => list.filter((x) => x.key !== q.key))}
                  className="absolute bottom-2 right-2 h-9 rounded-lg bg-background/90 px-3 text-xs font-semibold text-destructive">Togli</button>
              </li>
            ))}
            {allPhotos < MAX_PHOTOS && !locked && (
              <li>
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); pickFiles(e.dataTransfer.files); }}
                  className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center text-sm font-medium text-primary focus-within:ring-3 focus-within:ring-ring/40 ${photoBusy ? "pointer-events-none opacity-60" : "hover:border-primary hover:bg-primary/5"}`}>
                  <span className="text-2xl leading-none" aria-hidden>+</span>
                  {photoBusy ? "Caricamento" : "Aggiungi foto"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="sr-only" disabled={photoBusy}
                    onChange={(e) => { pickFiles(e.target.files); e.target.value = ""; }} />
                </label>
              </li>
            )}
          </ul>
          <p className="text-xs text-muted-foreground">Solo foto tue, del tuo socio o con il permesso del diving. Le comprimiamo e togliamo la posizione GPS.</p>
        </section>

        <section className={`${card} lg:col-span-2`} aria-labelledby="sec-details">
          <h2 id="sec-details" className="font-sans text-lg font-semibold">Dettagli</h2>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label htmlFor="ad-description" className="text-sm font-medium">Descrizione</label>
              <span className="text-xs tabular-nums text-muted-foreground">{v.description.length} / 1500</span>
            </div>
            <textarea id="ad-description" name="description" rows={5} maxLength={1500} value={v.description} disabled={locked}
              onChange={(e) => set("description", e.target.value)} aria-invalid={!!errors.description}
              className={`${field} py-3`} placeholder="Cosa offre, dove si immerge, per chi è adatto." />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {chips("dive_types", "Immersioni", Object.entries(DIVE_TYPE_LABELS))}
            {chips("services", "Servizi", Object.entries(SERVICE_LABELS))}
            {chips("federations", "Federazioni", FEDERATIONS.map((f) => [f, f]))}
            {chips("languages", "Lingue", Object.entries(LANGUAGE_LABELS))}
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Video YouTube o Instagram (fino a 3)</legend>
            <div className="grid gap-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <input key={i} type="url" inputMode="url" aria-label={`Video ${i + 1}`} placeholder="https://" disabled={locked}
                  value={v.video_urls[i] ?? ""} name="video_urls"
                  onChange={(e) => { const list = [...v.video_urls]; list[i] = e.target.value; setV((p) => ({ ...p, video_urls: list })); setDirty(true); }}
                  className={`${field} h-12`} aria-invalid={!!errors.video_urls} />
              ))}
            </div>
            {errors.video_urls && <p className="text-sm text-destructive">{errors.video_urls}</p>}
          </fieldset>
        </section>
      </div>

      {!locked && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <div role="status" aria-live="polite" className="mr-auto min-w-0 text-sm">
              {toast ? (
                <span className={toast.ok ? "font-medium text-primary" : "text-destructive"}>
                  {toast.text}{toast.href && <> <Link href={toast.href} className="underline underline-offset-2">Apri</Link></>}
                </span>
              ) : (
                <span className="text-muted-foreground">{dirty ? "Modifiche non salvate" : isNew ? "Compila e salva: va online subito" : "Tutto salvato"}</span>
              )}
            </div>
            {isNew && (
              <button type="button" onClick={() => save(true)} disabled={saving}
                className="h-12 rounded-xl border px-5 text-sm font-semibold hover:border-primary disabled:opacity-60">
                Salva e aggiungi un&apos;altra
              </button>
            )}
            <button type="submit" disabled={saving}
              className="h-12 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {saving ? "Salvataggio" : "Salva"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
