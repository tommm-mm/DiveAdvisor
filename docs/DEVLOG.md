# Dev log

Diario di lavoro: cosa è stato fatto, perché e con quale esito. Il più recente in alto.
Serve a Tommaso per seguire il progetto e alle sessioni future di Claude per ripartire senza riscoprire il contesto.

## Sprint 3 — Recensioni (branch `claude/beautiful-hamilton-w9xbsf`)

### Decisioni
- Codice di verifica: monouso, scade dopo 30 giorni, non legato a una data. Formato 8 caratteri senza 0/O/1/I, mostrato come `XXXX-XXXX`.
- Codice errato o scaduto: il form mostra un errore (non salva in silenzio come non verificata). L'utente può correggere o lasciare il campo vuoto.
- Recensione senza codice: `pending`, pubblicata solo dopo moderazione in Supabase, etichetta "Non verificata".
- **Più recensioni per lo stesso diving** (richiesta di Tommaso, 23/10): con codice illimitate (una per immersione), senza codice max 1 ogni 30 giorni per utente e centro. Sostituisce il vincolo `UNIQUE (center_id, user_id)` di `PROJECT.md`.
- L'autore non modifica né cancella la recensione (fuori MVP); per la rimozione si usa la segnalazione.
- Email di moderazione e di nuova recensione: per ora a `LEAD_EMAIL_OVERRIDE` (email di Tommaso) finché non c'è il dominio.
- Recensioni anonime in pagina ("Subacqueo"): i profili non sono leggibili pubblicamente e non mostriamo nomi.
- Autorizzazione: l'utente ha permesso a Claude di applicare migrazioni in autonomia, con registrazione in questo file.

### Passi
1. **Migrazione `20261023000000_reviews_moderation.sql`** — applicata su Supabase (versione remota `20261023123830`).
   - `verification_codes.expires_at` (default +30 giorni).
   - Policy "reviews: owner read own centre": il titolare legge le recensioni non rifiutate del proprio centro (anche `pending`).
   - Tabella `review_reports` con RLS: insert solo della propria segnalazione, nessuna lettura via API.
   - Vista `center_ratings` (`security_invoker`): medie per criterio e conteggio, solo recensioni pubblicate.
   - Funzione `submit_verified_review` (solo `service_role`): blocca il codice (`for update`), inserisce la recensione verificata e pubblicata, segna il codice come usato, tutto in una transazione.
   - Advisor di sicurezza dopo la migrazione: solo l'avviso preesistente "Leaked password protection" (irrilevante: usiamo magic link).
2. **Librerie** — `lib/review-utils.ts` (criteri, tipi, formati, condivisi client/server), `lib/reviews.ts` (letture pubbliche), `lib/codes.ts` (generazione codici, solo server, `crypto.randomInt`). `lib/email.ts` rifattorizzato in un helper unico + email per nuova recensione verificata (al diving), moderazione e segnalazione (a `ADMIN_EMAIL`, fallback `LEAD_EMAIL_OVERRIDE`).
3. **Form recensione** `/diving/[regione]/[slug]/recensione` — login obbligatorio (ritorno al form con `?codice=`), 6 criteri 1–5, data (non futura, ultimi 12 mesi), testo 40–2000, codice facoltativo, Turnstile. Validazione zod lato server. Con codice: RPC `submit_verified_review` (service role). Senza: insert con il client dell'utente (RLS permette solo `pending`). Blocchi: già recensito, recensire il proprio centro.
4. **Scheda** — sezione recensioni con medie per criterio, badge "Verificata" / "Non verificata", risposta del diving, link "Segnala" (form, richiede login), stati vuoto/errore, `AggregateRating` nello schema.org.
5. **Dashboard** — "Genera codice" (insert con RLS del titolare), elenco codici con stato attivo/usato/scaduto, copia codice/link, QR (SVG generato lato server con `qrcode`, link sull'host corrente). Recensioni del centro (anche in moderazione) con risposta pubblica, salvata via service role dopo controllo di proprietà. Nessuna cancellazione.
6. **Moderazione** — procedura in `docs/moderation.md`.
7. **Test** — `tests/reviews.spec.ts` + helper `tests/helpers/auth.ts` (login con password, cookie copiati nel browser: niente magic link nei test). `playwright.config.ts` carica `.env.local` e accetta `E2E_BASE_URL` per testare una preview.
   - Utenti di test creati via SQL (password in `.env.local` come `E2E_PASSWORD`, mai committata): `e2e-owner@diveadvisor.test` (titolare di **[TEST] Verbano Tech Prova**, ruolo `center_owner`) e `e2e-diver@diveadvisor.test`.
   - In locale manca la service role key: il flusso verificato end-to-end gira solo sulla preview Vercel.
   - Aggiornati due test vecchi: testo "Nessuna recensione ancora"; link di rivendicazione testato su Bellagio (Como Deep Prova ora è rivendicata).
   - Pulizia dopo una corsa e2e (il diver può recensire un centro una sola volta):
     Non più necessaria dopo il passo 8 (si può recensire di nuovo), utile solo per tenere pulite le pagine di prova:
     ```sql
     delete from reviews where user_id = (select id from auth.users where email = 'e2e-diver@diveadvisor.test');
     delete from verification_codes where center_id = (select id from dive_centers where slug = 'test-verbano-tech-prova-verbania');
     ```
8. **Migrazione `20261023010000_multiple_reviews.sql`** — applicata. Rimosso `reviews_center_id_user_id_key`, aggiunto indice `(center_id, user_id, created_at)`, trigger `private.limit_unverified_reviews` che blocca una seconda recensione non verificata entro 30 giorni (errore `unverified_too_soon`, vale anche per insert diretti via API). Advisor: nessun nuovo avviso. Form: niente più blocco "già recensito", solo un promemoria dell'ultima immersione recensita. Test: il passo finale ora verifica che lo stesso codice non si riusi.
9. **Bug trovato sulla preview** — dopo l'invio, la pagina si ri-renderizzava e mostrava "già recensito" invece di "Recensione pubblicata". Risolto (il blocco non esiste più; il messaggio di successo resta nel form).
10. **Test sulla preview protetta** — Vercel richiede login sulle preview: `tests/helpers/global-setup.ts` apre un link di condivisione temporaneo (`VERCEL_SHARE_TOKEN`, generato con il connettore Vercel, scade in 23 ore) e riusa il cookie. Comando:
    `E2E_BASE_URL=<url preview> VERCEL_SHARE_TOKEN=<token> PW_CHROMIUM_PATH=... npx playwright test`
    Nota: il connettore Supabase chiede conferma per i `delete`; senza risposta va in timeout.

## Decisioni di prodotto (23/10/2026)
- Nome definitivo: **DiveAdvisor** (aggiornati `CLAUDE.md` e `PROJECT.md`).
- Foto: per la bozza foto stock gratuite (Unsplash) chiaramente di prova; foto ufficiali dei diving più avanti.
- Audit UI/UX: dopo aver completato altre funzionalità e una bozza solida.
- P.IVA: da aprire solo all'arrivo dei primi ricavi (sentire un commercialista circa un mese prima). Titolare del trattamento: Tommaso.
- Lancio: sito online e curato prima di proporlo ai diving; lancio pubblico prima settimana di febbraio 2027, EUDI il 17 febbraio. Dominio acquistato a dicembre.

## Da ricordare a Tommaso
- **KPI**: definirli insieme (richiesta del 23/10/2026). Proposta di partenza: contatti inviati per diving al mese, recensioni verificate, diving rivendicati, visitatori unici.
- **Modello di business**: ne parla col socio; bozza in `PROJECT.md` §11.
- **Direzione visiva**: scelta "AB" (mix di A pulito e B outdoor) come base. Nella fase UI/UX Tommaso vuole vedere molte più direzioni da analizzare: semplice, facile da navigare, piacevole.
- **Marketing**: priorità ai diving (portano traffico e lo ricevono). Tommaso farà gruppi Facebook, blog/newsletter, Instagram/TikTok su diving, siti e sito. SEO prioritaria.

## Sprint 4 — checkpoint 1: stile AB
- Font: Inter (testo) + Fraunces (titoli h1/h2, nel layer base così `font-sans` li sovrascrive). Accento blu petrolio `oklch(0.44 0.07 213)` (#0f5e6e), sabbia `--sand` per le sezioni calde.
- Home nuova: banda colorata con titolo, ricerca (regione + tipo, GET su `/diving`), riquadri "Dove immergersi" per regione con conteggio, "Diving in evidenza" (i meglio recensiti), invito ai titolari.
- Card: blocco colore al posto della foto (`PhotoTone`, tono stabile dal nome), voto medio e numero recensioni (`getRatings`, una query per lista), card tutta cliccabile.
- Foto: Unsplash blocca il download automatico da questo ambiente; i blocchi colore si sostituiscono con `<Image>` quando avremo le foto.
- Test: il test filtri su mobile falliva ~1 volta su 3 (click prima dell'idratazione); ora riprova finché il filtro è applicato. 28/28 su 4 ripetizioni.

## Regole di lavoro (23/10/2026)
- Per ogni cosa da provare: PR con anteprima Vercel → Tommaso prova e dà feedback → merge. Checkpoint senza nulla da provare restano sul branch.
- Instagram gestito da Tommaso (luoghi, diving, consigli, alloggi, dietro le quinte); contenuti pagati sempre etichettati.
- Sponsor: mai influenzano voti o recensioni; solo badge "Partner" e spazi in evidenza etichettati. EUDI = networking, vendita da primavera, accordi con alloggi dall'estate.

## Decisioni (23/10/2026, sera)
- Schede: le aggiungiamo noi con dati pubblici verificati (scheda "non rivendicata"), poi contattiamo il diving.
- Negozi e scuole: sì, più avanti (tabelle/tipo attività separati, recensioni negozi dopo).
- Pagina `/eudi` con modulo "Aggiungi la tua attività": approvata, da fare a gennaio (con dominio ed email); deve attirare sia attività sia subacquei.
- Marketing e strategia: Tommaso usa un Claude Project separato; il brief non sta su GitHub.

## Sprint 4 — checkpoint 2: SEO
- `app/sitemap.ts` (home, `/diving`, regioni, pagine per tipo, schede, privacy) e `app/robots.ts` (in anteprima blocca tutto; in produzione esclude dashboard, login, rivendica, form recensione, API). URL base da `lib/site.ts` (`NEXT_PUBLIC_SITE_URL`, poi dominio di produzione Vercel).
- Pagine nuove per le ricerche a coda lunga: `/immersioni/[tipo]` e `/immersioni/[tipo]/[regione]` (es. "Diving tecnico in Piemonte"), con filtri senza il gruppo "tipo"; collegate dal footer e tra loro (solo regioni con risultati).
- Canonical su home, `/diving`, regioni, pagine per tipo e schede (le varianti con filtri puntano alla pagina pulita).
- schema.org: `WebSite` in home, `BreadcrumbList` + `ItemList` negli elenchi, `BreadcrumbList` + `LocalBusiness` (url, sameAs, AggregateRating) nella scheda. Helper `components/json-ld.tsx`.
- Immagini di condivisione: generale (`app/opengraph-image.tsx`) e per scheda (nome, luogo, voto).
- Footer nuovo con link alle pagine SEO.
- Schede `[TEST]`: `noindex` ed escluse dalla sitemap; regioni e tipi compaiono in sitemap solo con diving reali.
- Test: `tests/seo.spec.ts` (titolo, canonical, breadcrumb, 404, sitemap, noindex, immagine). Da fare nella fase UI: controllo velocità (Lighthouse) con foto vere.
- Proposto a Tommaso: modello Google Sheet con menu a tendina + geocodifica automatica dall'indirizzo (OpenStreetMap) + import a lotti tramite lo script di seed. In attesa di scelta (a) Drive / (b) Excel.

## Sprint 4 — checkpoint 3: pagina "Per i diving" e modifica scheda
- Raccolta dati: Google Drive non permette al connettore di creare file (permesso negato); inviato a Tommaso il file Excel `diveadvisor-raccolta-diving.xlsx` (guida, menu a tendina, note sulle colonne, valori ammessi) da aprire con Fogli Google.
- Script di seed: coordinate calcolate dall'indirizzo con OpenStreetMap Nominatim (1 richiesta/s, cache in `data/geocode-cache.json`, ripiego sul centro città con avviso), controllo dei valori ammessi (regione, federazioni, tipi, servizi, lingue), righe vuote ignorate, e **mai sovrascrivere schede rivendicate** (`where owner_id is null` nell'SQL, esclusione in `--write`).
- Ricerca per nome (`?q=`) nell'elenco e nei filtri (caratteri jolly LIKE neutralizzati).
- `/per-i-diving`: hero, ricerca della propria scheda, "Come funziona" in 3 passi, "Cosa ottieni", FAQ (con schema.org `FAQPage`), invito per chi non è in elenco (pulsante email solo se `NEXT_PUBLIC_CONTACT_EMAIL` è impostata). Link da header, home, footer e sitemap.
- Trovato durante la verifica: la pagina prometteva "modifica scheda" ma la dashboard non l'aveva (è nell'MVP, punto 8). Aggiunta `/dashboard/scheda/[id]`: descrizione, contatti, indirizzo, stagione, tipi, federazioni, servizi, lingue; validazione lato server; RLS e grant di colonna limitano al titolare e a questi campi; la scheda pubblica si aggiorna subito.
- Bug trovato dal test: dopo un errore di validazione il form perdeva tutte le modifiche (React azzera il form dopo l'azione). Ora l'azione restituisce i valori inviati e il form li ripropone.
- Test: `tests/owner.spec.ts` (modifica + errore + pagina pubblica aggiornata; 404 su scheda altrui), test della pagina "Per i diving" e della ricerca per nome.
