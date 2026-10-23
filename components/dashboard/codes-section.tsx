import QRCode from "qrcode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { createVerificationCode } from "@/app/dashboard/actions";
import { formatCode } from "@/lib/review-utils";

export type Code = { id: string; center_id: string; code: string; created_at: string; expires_at: string; used_at: string | null };
type Center = { id: string; name: string; reviewUrl: string };

const fmt = (d: string) => new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short", timeZone: "Europe/Rome" });

function codeStatus(c: Code) {
  if (c.used_at) return { label: "Usato", variant: "secondary" as const };
  if (new Date(c.expires_at) <= new Date()) return { label: "Scaduto", variant: "outline" as const };
  return { label: "Attivo", variant: "default" as const };
}

export async function CodesSection({ centers, codes, error }: { centers: Center[]; codes: Code[]; error: boolean }) {
  // QR for each active code: links to the review form with the code prefilled.
  const qr = new Map<string, string>();
  await Promise.all(codes.filter((c) => codeStatus(c).label === "Attivo").map(async (c) => {
    const url = `${centers.find((x) => x.id === c.center_id)?.reviewUrl}?codice=${formatCode(c.code)}`;
    qr.set(c.id, await QRCode.toString(url, { type: "svg", margin: 1, width: 160 }));
  }));

  return (
    <section aria-labelledby="codici" className="mt-8">
      <h2 id="codici" className="text-lg font-medium">Codici di verifica</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Dai un codice a ogni subacqueo dopo l&apos;immersione: la sua recensione sarà verificata e pubblicata subito. Ogni codice vale una volta e scade dopo 30 giorni.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {centers.map((c) => (
          <form key={c.id} action={createVerificationCode}>
            <input type="hidden" name="centerId" value={c.id} />
            <Button type="submit">{centers.length > 1 ? `Genera codice per ${c.name}` : "Genera codice"}</Button>
          </form>
        ))}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive">Non riusciamo a caricare i codici. Ricarica la pagina.</p>
      ) : !codes.length ? (
        <p className="mt-3 text-sm text-muted-foreground">Nessun codice ancora.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {codes.map((c) => {
            const s = codeStatus(c);
            const link = `${centers.find((x) => x.id === c.center_id)?.reviewUrl}?codice=${formatCode(c.code)}`;
            return (
              <li key={c.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg tracking-wider" data-testid="verification-code">{formatCode(c.code)}</span>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {c.used_at ? `Usato il ${fmt(c.used_at)}` : `Creato il ${fmt(c.created_at)} · scade il ${fmt(c.expires_at)}`}
                  </span>
                </div>
                {s.label === "Attivo" && (
                  <div className="mt-2 flex flex-wrap gap-x-4">
                    <CopyButton value={formatCode(c.code)} label="Copia codice" />
                    <CopyButton value={link} label="Copia link" />
                    <details className="w-full text-sm">
                      <summary className="cursor-pointer text-primary">Mostra QR</summary>
                      <div className="mt-2 w-40 bg-white" role="img" aria-label={`QR del codice ${formatCode(c.code)}`}
                        dangerouslySetInnerHTML={{ __html: qr.get(c.id) ?? "" }} />
                    </details>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
