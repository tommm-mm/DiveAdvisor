"use client";

import Image from "next/image";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAX_PHOTOS, PHOTO_BUCKET, photoUrl } from "@/lib/photos";
import { photosChanged } from "@/app/dashboard/scheda/[id]/actions";

type Photo = { id: string; path: string; position: number };

// Resize to max 1600 px and re-encode as WebP in the browser: uploads stay small even on mobile data,
// and EXIF metadata (e.g. GPS position) is dropped.
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/webp", 0.82));
}

export function PhotoManager({ centerId, centerName, initial }: { centerId: string; centerName: string; initial: Photo[] }) {
  const [photos, setPhotos] = useState<Photo[]>([...initial].sort((a, b) => a.position - b.position));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const supabase = createClient();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    const chosen = [...files].filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (!chosen.length) {
      setMessage({ ok: false, text: room ? "Scegli dei file immagine." : `Puoi caricare al massimo ${MAX_PHOTOS} foto.` });
      return;
    }
    setBusy(true);
    setMessage(null);
    const added: Photo[] = [];
    let failed = 0;
    for (const [i, file] of chosen.entries()) {
      try {
        const blob = await compress(file);
        const path = `${centerId}/${crypto.randomUUID()}.webp`;
        const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/webp" });
        if (upErr) throw upErr;
        const position = (photos.at(-1)?.position ?? -1) + 1 + i;
        const { data, error } = await supabase.from("center_photos")
          .insert({ center_id: centerId, path, position, alt: centerName }).select("id, path, position").single();
        if (error) {
          await supabase.storage.from(PHOTO_BUCKET).remove([path]);
          throw error;
        }
        added.push(data);
      } catch {
        failed++;
      }
    }
    setPhotos((p) => [...p, ...added]);
    await photosChanged(centerId);
    setBusy(false);
    setMessage(failed
      ? { ok: false, text: `${failed} foto non caricate. Riprova con file JPG, PNG o WebP sotto i 5 MB.` }
      : { ok: true, text: added.length === 1 ? "Foto caricata." : `${added.length} foto caricate.` });
  }

  async function remove(photo: Photo) {
    setBusy(true);
    const { error } = await supabase.from("center_photos").delete().eq("id", photo.id);
    if (!error) {
      await supabase.storage.from(PHOTO_BUCKET).remove([photo.path]);
      setPhotos((p) => p.filter((x) => x.id !== photo.id));
      await photosChanged(centerId);
      setMessage({ ok: true, text: "Foto eliminata." });
    } else setMessage({ ok: false, text: "Non siamo riusciti a eliminare la foto. Riprova." });
    setBusy(false);
  }

  async function makeCover(photo: Photo) {
    setBusy(true);
    const ordered = [photo, ...photos.filter((x) => x.id !== photo.id)].map((p, i) => ({ ...p, position: i }));
    const results = await Promise.all(ordered.map((p) => supabase.from("center_photos").update({ position: p.position }).eq("id", p.id)));
    if (results.every((r) => !r.error)) {
      setPhotos(ordered);
      await photosChanged(centerId);
      setMessage({ ok: true, text: "Copertina aggiornata." });
    } else setMessage({ ok: false, text: "Non siamo riusciti a cambiare la copertina. Riprova." });
    setBusy(false);
  }

  return (
    <section aria-labelledby="foto" className="space-y-3">
      <div>
        <h2 id="foto" className="font-sans text-lg font-semibold">Foto</h2>
        <p className="text-sm text-muted-foreground">
          Fino a {MAX_PHOTOS} foto. La prima è la copertina. Usa solo foto tue o di cui hai i diritti.
        </p>
      </div>
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.id} className="space-y-1">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                <Image src={photoUrl(p.path)} alt={`Foto ${i + 1} di ${centerName}`} fill sizes="200px" className="object-cover" />
                {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-background px-2 py-0.5 text-xs font-semibold">Copertina</span>}
              </div>
              <div className="flex flex-wrap gap-x-3 text-xs">
                {i > 0 && <button type="button" disabled={busy} onClick={() => makeCover(p)} className="text-primary hover:underline">Rendi copertina</button>}
                <button type="button" disabled={busy} onClick={() => remove(p)} className="text-destructive hover:underline">Elimina</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {photos.length < MAX_PHOTOS && (
        <label className={`flex h-24 cursor-pointer items-center justify-center rounded-xl border border-dashed text-sm font-medium text-primary focus-within:ring-3 focus-within:ring-ring/50 ${busy ? "pointer-events-none opacity-60" : "hover:border-primary"}`}>
          {busy ? "Caricamento in corso" : "Aggiungi foto"}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy}
            onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </label>
      )}
      {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-primary" : "text-destructive"}`}>{message.text}</p>}
    </section>
  );
}
