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

## Sprint 4 — foto e video
- **Migrazione `20261024000000_center_photos.sql`** — applicata. Bucket Storage pubblico `center-photos` (solo JPG/PNG/WebP, max 5 MB), file in `<center_id>/…`; policy su `storage.objects` (insert/update/delete solo del titolare, via `private.owns_photo_folder` che rifiuta cartelle non-uuid); tabella `center_photos` (ordine, posizione 0 = copertina, alt) con RLS (lettura pubblica, gestione del titolare); trigger max 8 foto; colonna `dive_centers.video_urls` (max 3, modificabile dal titolare). Advisor: nessun nuovo avviso.
- Dashboard → Modifica scheda: gestione foto (compressione nel browser a 1600 px WebP, che elimina anche i metadati EXIF come il GPS; carica, elimina, rendi copertina), campi video con validazione (YouTube o post/reel Instagram).
- Pubblico: copertina sulle card, galleria nella scheda, sezione Video (YouTube si carica solo al click dal dominio youtube-nocookie; Instagram come link perché l'embed imposta cookie), foto in schema.org e nell'immagine di condivisione.
- Schede non rivendicate: restano senza foto (niente foto prese dai siti dei diving senza permesso).
- Nota: l'upload con `upsert` richiederebbe anche permessi di lettura/aggiornamento su storage; non lo usiamo.
- Test: upload foto + video + pulizia (`tests/owner.spec.ts`, in serie perché modificano lo stesso centro).
- Deciso con Tommaso: revisione completa UX/UI pagina per pagina più avanti (inizio gennaio, prima del soft launch), con più direzioni e test con 3–5 persone.

## Sprint 4 — checkpoint 4: strumenti per i diving
- **Migrazione `20261024010000_centre_tools.sql`** — applicata. `center_daily_views` (centro, giorno, conteggio; lettura solo del titolare) + funzione `increment_center_view` (solo service role); `removal_requests` con RLS e nessuna policy (solo service role: l'advisor lo segnala come INFO, è voluto).
- Visite: `/api/view` chiamata da un beacon nella scheda, una volta per scheda per scheda del browser (sessionStorage, non cookie); esclusi i bot; nessun IP né user agent salvato.
- Dashboard: statistiche 30 giorni (visite, contatti, da gestire, recensioni pubblicate); sezione "Strumenti per farti trovare" con poster QR stampabile (`/dashboard/poster/[id]`, A4, header e footer nascosti in stampa) e badge recensioni (`/api/badge/[slug]`, SVG con voto, cache 1 ora) con codice da copiare.
- `/rimuovi-scheda`: richiesta di rimozione (Turnstile, honeypot, salvata in `removal_requests`, email al team con impegno di 7 giorni). Link dalla scheda non rivendicata, dal footer e dalla FAQ.
- `npm run outreach [url]`: CSV con email "La tua scheda è su DiveAdvisor" per ogni diving non rivendicato con email (esclusi i [TEST]); da inviare a mano dal nostro indirizzo. `outreach*.csv` in `.gitignore`.
- Bug trovato dai test: arrivando a un modulo con un link interno, il widget Turnstile non compariva (lo script disegna i widget solo al primo caricamento). Nuovo componente `components/turnstile.tsx` con render esplicito, usato da contatto, recensione e rimozione.
- Test: `tests/tools.spec.ts` (badge, contatore, rimozione via link, strumenti in dashboard, poster altrui 404).

## Sprint 4 — checkpoint 5–6: analytics e bozze legali
- Vercel Web Analytics (`@vercel/analytics`, senza cookie) nel layout. **Va attivato da Tommaso** nel progetto Vercel (Analytics → Enable): il connettore non ha un comando per farlo.
- `vercel.json` con `regions: ["fra1"]`: le funzioni girano a Francoforte, come il database Supabase (`eu-central-1`). Dati in UE e pagine più veloci.
- Bozze legali (marcate "Bozza in revisione"): `/termini` (utenti, regole recensioni, diving, sponsor, segnalazioni, responsabilità), `/privacy` (titolare Tommaso, dati e basi giuridiche, cookie solo tecnici, fornitori e trasferimenti, conservazione, diritti, età minima 14), `/come-verifichiamo-le-recensioni` (Codice del Consumo art. 21). Contatto da `NEXT_PUBLIC_CONTACT_EMAIL`.
- Consensi: al login (termini + privacy + almeno 14 anni) e nel form recensione (regole), verificati anche lato server. Link nel footer, sotto le recensioni e in sitemap.
- **Da fare per rispettare quanto scritto nelle bozze**: (1) cancellazione automatica dei messaggi ai diving dopo 24 mesi; (2) email di spiegazione all'autore quando una recensione viene rifiutata o rimossa; (3) revisione da un professionista prima dell'apertura pubblica; (4) email di contatto sul dominio.

## Promesse delle bozze legali: conservazione e avviso di rifiuto
- **Migrazione `20261024020000_moderation_notes.sql`** — applicata. `reviews.moderation_note` (motivo per l'autore) e `rejection_notified_at`; permessi di colonna: anon/authenticated non possono leggere queste due colonne via API. Advisor: nessun nuovo avviso.
- Job giornaliero `/api/cron/daily` (Vercel Cron, 06:00 UTC, `vercel.json`), protetto da `CRON_SECRET` (variabile "sensitive" creata nel progetto Vercel, anche in `.env.local`): elimina i messaggi ai diving più vecchi di 24 mesi; invia una volta all'autore l'email di rifiuto con il motivo. Se l'invio fallisce riprova il giorno dopo.
- Nota: finché Resend usa il mittente di prova (senza dominio), le email arrivano solo all'indirizzo del proprietario dell'account Resend; con il dominio (dicembre) arriveranno a tutti.
- `docs/moderation.md` aggiornato: scrivere il motivo in `moderation_note` quando si rifiuta.
- Test: `tests/cron.spec.ts` (401 senza segreto; esecuzione con segreto sulla preview).

## Tipi di attività, card per recensioni verificate, tutta Italia (24/10/2026)
- Decisioni: copertura di **tutta Italia** da subito (PROJECT.md aggiornato); un'attività può essere diving, scuola e/o negozio insieme; kit "recensione verificata" da regalare ai diving (poster + card).
- Note legali (risposta a Tommaso): inserire attività con dati pubblici è lecito con legittimo interesse, solo dati dell'attività, informativa entro un mese (art. 14 GDPR, l'email "sei su DiveAdvisor" ora contiene fonte dei dati e link alla privacy), opposizione facile, raccolta a mano da più fonti senza copiare in blocco database altrui, testi/foto/loghi mai copiati. Recensioni **mai importate** da altri siti (diritto d'autore, termini delle piattaforme, Codice del Consumo): solo raccolte con codici o da immersioni reali. Rating Google solo per uso interno, mai pubblicato.
- **Migrazione `20261024030000_business_types_and_code_cards.sql`** — applicata. `dive_centers.business_types` (diving/scuola/negozio, 1–3 valori, indice GIN, modificabile dal titolare); vincolo sui codici: scadenza massima 1 anno. Advisor: nessun nuovo avviso.
- Sito: filtro "Tipo di attività", tipo mostrato su card e scheda, scelta nel modulo di modifica (almeno uno), colonna `tipo_attivita` nel seed (vuoto = diving).
- Card stampabili (`/dashboard/card/[id]`): "Genera e stampa 8 card" crea 8 codici validi 6 mesi e un A4 con 8 card ritagliabili, ognuna con il suo QR (codice già dentro: recensione verificata senza digitare). "Ristampa le card non usate". Poster aggiornato ("Chiedi la tua card allo staff"). Testi di FAQ, "Come verifichiamo" e sezione codici aggiornati (card 6 mesi, codici via link 30 giorni).
- Foglio raccolta dati rigenerato: colonna tipo attività, regole sui dati, colonne Google in grigio "solo uso interno", obiettivi per tutta Italia.

## Recensioni: "scrivi prima, conferma dopo" (25/10/2026)
- Decisioni: niente login prima di scrivere (riduce l'attrito principale); invito WhatsApp in dashboard da fare dopo; report "censimento dei diving italiani" per EUDI pianificato a gennaio; il marketing si discute nella chat dedicata, non qui.
- **Migrazione `20261025000000_review_drafts.sql`** — applicata. `review_drafts` (solo hash del token, email, centro, contenuto, scadenza 48 h; RLS senza policy = solo service role, INFO dell'advisor voluto) e funzione `user_id_by_email` (solo service role).
- Flusso: il visitatore scrive la recensione + email → controllo del codice subito (errore prima dell'email) → bozza + email "Conferma la tua recensione" → `/recensione/conferma` con **pulsante** (non conferma automatica, così gli antivirus che aprono i link non pubblicano) → account creato o ritrovato per quell'email → stesse regole di salvataggio (`lib/review-save.ts`, condiviso con gli utenti loggati). Se nel frattempo il codice è stato usato, la recensione resta come non verificata.
- Consenso: per chi non ha fatto login la casella finale include termini, privacy e 14 anni.
- Il job giornaliero elimina anche le bozze scadute.
- Limite noto: fino al dominio, Resend consegna solo all'email del proprietario dell'account, quindi le conferme arrivano solo a Tommaso.

## Invito WhatsApp e link di gruppo (25/10/2026)
- Tommaso: l'invito WhatsApp a persona ha ancora attrito. Soluzione: **un link per immersione** da mandare nel gruppo WhatsApp della barca.
- **Migrazione `20261025010000_group_codes.sql`** — applicata. `verification_codes.max_uses` (1–30) e `use_count`; `used_at` = "nessun uso rimasto"; tolto il vincolo "un codice = una recensione", aggiunto indice unico (codice, utente) = una recensione a testa; `submit_verified_review` aggiornata (blocca la riga, controlla usi e persona). Advisor: nessun nuovo avviso.
- Dashboard → "Chiedi una recensione": scegli quante persone (1–20) → "Crea il link per il gruppo" (7 giorni) o "Crea l'invito" (1 persona, 30 giorni) → "Invia su WhatsApp" (messaggio pronto, apre WhatsApp sul telefono del diving: non vediamo i numeri dei clienti), "Copia il messaggio", "Copia solo il link". Elenco codici: "Gruppo · x/N usati".
- Test: link di gruppo → recensione verificata; seconda recensione della stessa persona rifiutata; contatore 1/4.
