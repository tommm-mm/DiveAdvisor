# DiveAdvisor — piattaforma per trovare e contattare i diving in Italia

## Obiettivo
Directory di diving con ricerca, schede, contatto diretto e recensioni verificate.
Per visione, modello dati, UX/UI e roadmap leggi `PROJECT.md` prima di ogni sprint.
Fase attuale: bozza funzionante entro metà gennaio 2027, da portare a EUDI.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres, Auth, Storage, Row Level Security)
- Vercel (hosting e anteprime)
- Leaflet + OpenStreetMap (mappa)
- Resend (email), Cloudflare Turnstile (anti-spam)
- Analytics senza cookie (Umami o Vercel Analytics)

## Cartelle (struttura prevista)
- `app/` pagine e route (App Router)
- `components/` componenti UI riutilizzabili
- `lib/` client Supabase, utilità, validazioni
- `supabase/migrations/` migrazioni SQL versionate
- `data/` file CSV dei diving (fonte per lo script di seed)
- `scripts/` seed e utilità una tantum
- `tests/` test Playwright dei flussi principali

## Regole generali
- Interfaccia in italiano; codice, nomi di variabili e commenti in inglese.
- Non aggiungere funzionalità fuori dall'MVP descritto in `PROJECT.md` senza chiedere.
- Prima di scrivere codice per un nuovo sprint: proponi un piano breve e aspetta conferma.
- Piccole modifiche, un commit per funzionalità, messaggi chiari in inglese.
- Dopo ogni funzionalità: lint, type-check e un test dei flussi toccati.
- Quando generi qualcosa di nuovo, spiega in 2–3 righe cosa fa e perché: l'utente vuole capire il sistema, non solo averlo.

## Database e sicurezza
- Migrazioni: Claude può applicarle in autonomia (autorizzato dall'utente il 23/10/2026), purché siano versionate in `supabase/migrations/`, mai distruttive senza conferma, e ogni passo sia registrato in `docs/DEVLOG.md` (cosa, perché, esito dell'advisor di sicurezza).
- Ogni sprint aggiorna `docs/DEVLOG.md`: passi fatti, decisioni prese, verifiche, cose rimaste aperte.
- Ogni tabella ha Row Level Security attiva. Non disattivarla mai per comodità.
- Regole di accesso: lettura pubblica di schede e recensioni pubblicate; scrittura solo dell'autore sulla propria recensione; modifica scheda solo del proprietario; `leads` leggibili solo dal proprietario del centro.
- Nessuna chiave o segreto nel codice: solo variabili d'ambiente (`.env.local`, mai committato). Mantieni aggiornato `.env.example` con i nomi (senza valori).
- La chiave di servizio Supabase non va mai esposta al browser.
- Valida sempre l'input lato server (modulo di contatto, recensioni, codici) e proteggi i moduli con Turnstile.

## Frontend e UX
- Mobile-first: progetta a 375 px, poi desktop.
- Server Components per default; Client Components solo dove serve interattività.
- Usa shadcn/ui e Tailwind; un solo colore d'accento; niente gradienti e decorazioni.
- Testi dell'interfaccia: frasi brevi, iniziale maiuscola solo a inizio frase, pulsanti con verbo, niente punti esclamativi.
- Accessibilità: etichette sui campi, focus visibile, contrasto adeguato, navigazione da tastiera.
- Gestisci sempre gli stati di caricamento, errore, nessun risultato e nessuna recensione.
- Ogni pagina pubblica ha `title`, `description` e dati strutturati schema.org dove pertinente.

## Dati e contenuti
- La fonte dei diving è `data/diving.csv`. Lo script di seed valida i campi e stampa un report degli errori.
- Non inventare mai dati di diving reali: usa solo dati verificati o dati di prova chiaramente marcati.
- Le recensioni verificate si distinguono dalle non verificate in modo visibile.
- Il diving può rispondere a una recensione ma non cancellarla.

## Privacy e legale
- Analytics senza cookie. Nessun dato personale nei log.
- Pagine `/privacy` e `/termini` da completare e far rivedere a un professionista prima dell'apertura pubblica.
- Prevedi segnalazione e rimozione di contenuti e la possibilità per un diving di chiedere la cancellazione della scheda.

## Comandi
```
npm run dev      # sviluppo locale
npm run build    # build di produzione
npm run lint     # lint
npm run typecheck
npm run test     # test Playwright
```

## Connettori utili
- Supabase: schema, migrazioni, log e advisor di sicurezza.
- Vercel: deploy, anteprime e log di runtime.
