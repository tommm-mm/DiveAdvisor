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
- **Direzione visiva**: tre bozze (A pulito, B outdoor, C tech) nel canvas "DiveAdvisor visual directions"; scelta in attesa.
