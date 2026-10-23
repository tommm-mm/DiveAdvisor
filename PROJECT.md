# DiveAdvisor — La piattaforma italiana per trovare e contattare i diving

Documento di progetto v2 (21 ottobre 2026). Da tenere nel repository come `PROJECT.md`. Le regole operative per Claude Code sono in `CLAUDE.md`.

---

## 1. Visione e problema

**Problema (dalle vostre parole):** è difficile trovare e contattare i diving, e ci sono poche informazioni e recensioni affidabili.

**Soluzione:** una piattaforma dove ogni subacqueo può cercare un diving in Italia (si parte dal Nord, laghi inclusi), capire cosa offre, leggere recensioni verificate e contattarlo in un click.

**Posizionamento (cosa ci differenzia):**
- Copre *tutti* i diving, di ogni federazione (PADI, SSI, TDI, SDI, IANTD...), non solo quelli affiliati a un network.
- Copre tutti i tipi di immersione, tecnico e laghi compresi.
- Il contatto diretto è il centro del prodotto, non la prenotazione online.
- Recensioni su criteri specifici e verificate (legate a un'immersione reale).

**Chi esiste già (da non dimenticare):** CheckYeti (prenotazione con recensioni, forte sui centri turistici), PADI Travel (solo centri PADI), Diviac (database globale, poi spostato sui viaggi), ScubaList. Il nostro spazio è la copertura completa e curata dell'Italia con contatto diretto.

## 2. Utenti

| Utente | Cosa vuole | Cosa gli diamo |
|---|---|---|
| Subacqueo (ricreativo, tecnico, corsista) | Trovare un diving adatto, fidarsi, contattarlo | Ricerca con filtri, schede, recensioni verificate, contatto diretto |
| Titolare di diving | Più visibilità e clienti, meno tempo perso | Scheda gratuita il primo anno, dashboard con contatti e recensioni, risposta alle recensioni |

## 3. Ipotesi da validare (fase 1)

| # | Ipotesi | Come si misura | Soglia per proseguire |
|---|---|---|---|
| H1 | I subacquei fanno fatica a trovare/contattare un diving | 10 interviste | almeno 6 su 10 |
| H2 | I titolari vogliono più visibilità online e sono disposti a comparire | 8 chiamate | almeno 3 su 8 interessati |
| H3 | I diving pagherebbero dopo il primo anno | domanda diretta con 3 fasce di prezzo | almeno 2 su 8 indicano una cifra |
| H4 | I subacquei scrivono una recensione se è facile | test con 10 persone in gennaio | almeno 4 su 10 la completano |

## 4. Funzionalità

### MVP (bozza funzionante entro metà gennaio 2027)
1. Ricerca per zona, tipo di immersione, federazione, servizi, lingue parlate.
2. Mappa con i diving (OpenStreetMap).
3. Scheda del diving: descrizione, servizi, contatti, orari, foto, recensioni.
4. **Contatto diretto**: modulo che invia email al diving e registra il contatto, più link WhatsApp/telefono tracciato.
5. Recensioni con punteggi per criterio (sicurezza, attrezzatura, briefing, dimensione gruppo, ambiente, rapporto qualità/prezzo), testo e data dell'immersione.
6. Verifica della recensione tramite codice che il diving dà al subacqueo (recensione "verificata"); recensioni senza codice ammesse ma etichettate "non verificata" e moderate.
7. "Rivendica la tua scheda": il titolare verifica di essere il proprietario e accede alla dashboard.
8. Dashboard del diving: modifica scheda, contatti ricevuti, recensioni, risposta pubblica, generazione codici di verifica.
9. Pagina "Per i diving" (landing con offerta del primo anno gratuito).
10. Pagine legali (privacy, termini) e analytics senza cookie.

### Dopo l'MVP (non costruire prima)
- Pagine dei siti d'immersione e condizioni del mare/lago.
- Pagamenti e profili in evidenza.
- Servizio di siti web per i diving (prodotto separato, stessa tecnologia).
- Prenotazione online, app mobile, altre nazioni.

## 5. Stack tecnico (e perché)

Vincoli: budget sotto i 50 €, sviluppo con Claude Code, SEO importante (è una directory: le pagine devono essere indicizzabili da Google).

| Livello | Scelta | Motivo | Costo |
|---|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Pagine renderizzate lato server, ottime per SEO; ecosistema molto conosciuto da Claude Code | 0 |
| Stile | **Tailwind CSS** + componenti shadcn/ui | Interfaccia rapida e coerente | 0 |
| Database e login | **Supabase** (Postgres, Auth, Storage, Row Level Security) | Un solo servizio per dati, utenti e foto; regole di sicurezza a livello di riga | piano gratuito |
| Hosting | **Vercel** | Deploy automatico da GitHub, anteprime per ogni modifica | piano gratuito |
| Mappa | **Leaflet + OpenStreetMap** | Gratuita; Google Maps costerebbe | 0 |
| Email | **Resend** | Invio dei contatti ai diving, piano gratuito ampio per l'MVP | 0 |
| Anti-spam | **Cloudflare Turnstile** | Protegge moduli e recensioni | 0 |
| Analytics | **Umami o Vercel Analytics** | Niente cookie, niente banner complicato | 0 |
| Dominio | registrar a scelta | | circa 10–15 €/anno |
| Versioning | **GitHub** | Storia delle modifiche, collaborazione col socio | 0 |

**Alternativa considerata e scartata:** backend Python separato (come nel tuo portfolio tracker). Per questo progetto aggiungerebbe un secondo servizio da mantenere senza benefici; Next.js + Supabase copre tutto.

## 6. Modello dati (Supabase / Postgres)

```
dive_centers
  id, slug, name, description, region, province, city, address, lat, lng,
  phone, whatsapp, email, website, instagram,
  federations text[], dive_types text[], services text[], languages text[],
  season text, status ('unclaimed'|'claimed'|'premium'),
  owner_id -> profiles.id (nullable), source ('manual'|'owner'), created_at, updated_at

profiles
  id (= auth.users.id), display_name, role ('diver'|'center_owner'|'admin'),
  certification_level (opzionale), created_at

reviews
  id, center_id, user_id, dive_date, status ('pending'|'published'|'rejected'),
  verified boolean, verification_code_id (nullable),
  score_safety, score_equipment, score_briefing, score_group, score_environment, score_value (1-5),
  text, owner_reply, owner_reply_at, created_at
  -- più recensioni per utente e centro: illimitate con codice, senza codice max 1 ogni 30 giorni

verification_codes
  id, center_id, code, created_at, used_at, used_by

leads
  id, center_id, user_id (nullable), name, email, message, channel ('form'|'whatsapp'|'phone'),
  created_at

claim_requests
  id, center_id, user_id, evidence, status ('pending'|'approved'|'rejected'), created_at
```

**Sicurezza (Row Level Security):** chiunque legge schede e recensioni pubblicate; solo l'autore scrive/modifica la propria recensione; solo il proprietario modifica la propria scheda; contatti (`leads`) visibili solo al proprietario del centro; moderazione e admin tramite il pannello tabelle di Supabase (nessuna interfaccia admin da costruire nell'MVP).

## 7. Pagine e struttura del sito

```
/                               home con ricerca (zona, tipo di immersione)
/diving                         elenco + filtri + mappa
/diving/[regione]               pagina SEO per regione (es. Lombardia)
/diving/[regione]/[slug]        scheda del diving
/diving/[regione]/[slug]/recensione   form di recensione (con codice opzionale)
/per-i-diving                   landing per i titolari (primo anno gratis)
/rivendica/[slug]               richiesta di rivendicazione scheda
/dashboard                      area titolare (scheda, contatti, recensioni, codici)
/accedi, /registrati            login (email + link magico)
/privacy, /termini
```

**SEO:** URL leggibili, titoli e descrizioni per scheda, dati strutturati schema.org (`LocalBusiness`, `AggregateRating`), sitemap automatica, pagine per regione e per tipo di immersione ("diving tecnico sul Lago di Garda").

## 8. Flussi chiave

**Contatto:** utente apre scheda → compila modulo (nome, email, messaggio, Turnstile) → il lead viene salvato e inviato via email al diving → il diving vede il contatto in dashboard. Questa è la metrica che giustificherà la fee dopo il primo anno.

**Recensione verificata:** al termine dell'immersione il diving genera un codice o QR dalla dashboard → il subacqueo apre il link, accede e compila la recensione → il codice viene consumato e la recensione è "verificata".

**Recensione non verificata:** stesso form senza codice → stato `pending` → moderata da voi prima della pubblicazione → etichetta "non verificata".

**Rivendicazione scheda:** il titolare invia richiesta con prova (email del dominio del diving o conferma telefonica) → voi approvate → accede alla dashboard.

**Anti-recensioni false:** con codice una recensione per immersione (ogni codice vale una volta); senza codice al massimo una ogni 30 giorni per utente e centro, Turnstile, moderazione, il diving può rispondere ma non cancellare, segnalazione di contenuti.

## 9. Raccolta dati (collo di bottiglia reale)

Foglio di lavoro (CSV, poi importato con uno script di seed):

`nome, regione, provincia, città, indirizzo, lat, lng, telefono, whatsapp, email, sito, instagram, federazioni, tipi di immersione, servizi, lingue, rating Google, n. recensioni Google, fonte, data verifica, contattato (sì/no), esito`

Fonti: siti dei diving, Google Maps, elenchi delle federazioni, contatti da EUDI. **Verificare sempre telefono e sito prima di pubblicare.** Obiettivi: 60 centri entro 15 dicembre, 100 entro metà gennaio, 150 per EUDI.

## 10. Roadmap

Ipotesi di lavoro: 8–10 ore a settimana ciascuno (Tommaso a Rotterdam fino a fine dicembre). Da correggere con i tempi reali.

| Periodo | Obiettivo | Output | Criterio di uscita |
|---|---|---|---|
| **Sprint 0** 21–27 ott | Fondamenta | Repo GitHub, Next.js + Supabase + Vercel collegati, dominio, `CLAUDE.md`, schema DB, foglio dati creato | Sito vuoto online su dominio di prova |
| **Sprint 1** 28 ott–10 nov | Directory base | Seed di 20 diving, elenco, filtri, scheda, mappa | Un amico trova un diving in meno di 1 minuto |
| **In parallelo** 21 ott–15 nov | Validazione | 10 interviste subacquei, 8 chiamate a diving, mappa concorrenti | Soglie H1–H3 raggiunte (altrimenti rivedere) |
| **Sprint 2** 11 nov–1 dic | Contatto e login | Modulo contatto, email, tracciamento lead, auth, rivendicazione | Contatto di test arriva via email e compare in dashboard |
| **Sprint 3** 2–22 dic | Recensioni | Form a criteri, codici di verifica, moderazione, risposta del diving | Recensione verificata end-to-end |
| **Sprint 4** 23 dic–15 gen | Bozza funzionante | SEO, landing "Per i diving", pagine legali, analytics, 100 diving, test con 10 utenti | **Bozza pubblica** con soglia H4 testata |
| **Sprint 5** 16 gen–EUDI | Preparazione EUDI | One-pager per diving, QR/flyer per subacquei, demo, script di onboarding in 5 minuti | Materiali pronti, 5 diving "partner" già dentro |
| **EUDI** (verificare date) | Marketing e vendita | Iscrizione diving, registrazione subacquei, recensioni | KPI sotto |

**Punti di decisione:**
- **15 nov:** H1–H3 non raggiunte → fermarsi a rivedere proposta di valore, non continuare a costruire.
- **15 gen:** bozza online con almeno 100 diving? In caso contrario si rimanda EUDI come "beta" e si privilegia la raccolta dati.
- **Dopo EUDI:** decidere su monetizzazione e scala in base ai KPI.

## 11. KPI

| Fase | Metrica | Obiettivo |
|---|---|---|
| Pre-lancio | Diving in database (verificati) | 100 entro metà gennaio |
| Pre-lancio | Interviste completate | 10 subacquei + 8 diving |
| Bozza | Subacquei che trovano un diving in meno di 1 minuto (test) | 8 su 10 |
| EUDI | Diving che rivendicano la scheda | 15+ |
| EUDI | Subacquei registrati | 150+ |
| EUDI | Recensioni raccolte | 30+ (verificate almeno metà) |
| Dopo | Contatti inviati ai diving al mese | trend crescente (base per la fee) |

(Obiettivi di partenza da ricalibrare dopo le interviste.)

## 12. Modello di ricavo (da testare, non da fissare)

- **Primo anno: gratis** per tutti i diving (scheda base, dashboard, contatti, recensioni).
- **Da validare nelle interviste:** profilo in evidenza / piano premium (statistiche, posizione in alto, foto illimitate) con 3 fasce di prezzo da proporre nelle chiamate.
- Commissioni e pubblicità: più avanti.
- **Siti web per diving:** offerta a parte, lanciata dopo l'MVP, riusando lo stesso stack (template personalizzabili).

## 13. Rischi

| Rischio | Impatto | Mitigazione |
|---|---|---|
| Pochi contenuti all'inizio (uovo e gallina) | Alto | Voi caricate i diving; EUDI come acceleratore; recensioni non verificate moderate per partire |
| Dati sbagliati o obsoleti sui diving | Medio | Verifica manuale, data di verifica visibile, rivendicazione scheda |
| Concorrenti già presenti | Medio | Nicchia Italia + tutte le federazioni + contatto diretto + verifica recensioni |
| Titolari diffidenti verso le recensioni | Medio | Diritto di risposta, moderazione, verifica, offerta gratuita |
| Questioni legali (privacy, recensioni, uso di dati pubblici dei centri) | Medio | Privacy e termini, procedura di segnalazione e rimozione, opzione di cancellazione scheda. **Farli rivedere da un professionista prima dell'apertura pubblica** |
| Tempo limitato (Erasmus ed esami) | Medio | Sprint corti, MVP minimale, niente funzioni extra |
| Dipendenza dal socio per il dominio subacqueo | Basso | Ruoli chiari: tu sviluppo e business, lui contenuti, contatti e test sul campo |

## 14. Ruoli

- **Tommaso:** sviluppo con Claude Code, dati, business, interviste.
- **Socio (geometra e subacqueo):** conoscenza del settore, rete di contatti nei diving, controllo qualità dei dati e dei criteri di recensione, test sul campo.

---

## Appendice A — UX/UI (bozza da realizzare)

### Principi
- **Semplice e sobrio:** sfondo chiaro, molto spazio bianco, un solo colore d'accento (blu acqua), nessuna decorazione superflua.
- **Mobile-first:** molti subacquei cercano da telefono, spesso vicino al lago o al mare. Si progetta prima per 375 px e poi per desktop.
- **Il contatto è l'azione principale:** su ogni scheda il pulsante o il modulo di contatto è sempre raggiungibile (su mobile, barra fissa in basso con "Contatta").
- **Fiducia:** le recensioni verificate sono ben distinte da quelle non verificate; la data di verifica dei dati del diving è visibile.
- **Testi:** italiano, frasi brevi, iniziale maiuscola solo all'inizio della frase, pulsanti con verbo (es. "Cerca", "Invia richiesta", "Scrivi una recensione"), nessun punto esclamativo.
- **Accessibilità:** contrasto adeguato, focus visibile, etichette sui campi, navigazione da tastiera, testo alternativo sulle immagini.

### Componenti (shadcn/ui + Tailwind)
Navbar, barra di ricerca, filtri (checkbox e select), scheda elenco, mappa, badge (tipo di immersione, federazione, "Verificata"), barre di punteggio per criterio, modulo di contatto, modulo di recensione, tabella dei contatti, card metriche.

### Schermata 1 — Home (`/`)
- Navbar: logo, "Cerca diving", "Per i diving", "Accedi".
- Titolo "Trova il diving giusto, in Italia" e sottotitolo con la promessa (cerca, confronta, contatta).
- Ricerca: campo zona o lago, selezione del tipo di immersione, pulsante "Cerca".
- Scorciatoie: Laghi, Mare, Tecnico, Corsi.
- Tre blocchi: Cerca, Confronta, Contatta.

### Schermata 2 — Elenco (`/diving`)
- Colonna filtri: tipo di immersione, federazione, lingue, servizi.
- Mappa con segnaposto, sincronizzata con i filtri.
- Schede in elenco: nome, località, badge, valutazione e numero di recensioni, pulsante "Vedi scheda".
- Stato senza recensioni: "Nessuna recensione" con invito a scriverne una.
- Stato senza risultati: messaggio breve e invito ad allargare i filtri.
- Su mobile i filtri stanno in un pannello apribile e la mappa si apre con un pulsante.

### Schermata 3 — Scheda diving (`/diving/[regione]/[slug]`)
- Intestazione: nome, località, tempo di risposta tipico, badge e lingue.
- Descrizione e servizi.
- Recensioni: media, numero totale e numero di verificate; sei barre di punteggio (sicurezza, attrezzatura, briefing, dimensione del gruppo, ambiente, qualità/prezzo); elenco con badge "Verificata" e risposta del diving; pulsante "Scrivi una recensione".
- Colonna di contatto: nome, email, messaggio, "Invia richiesta"; sotto, WhatsApp, telefono e sito web (link tracciati).
- Validazione del modulo con messaggio d'errore sotto il campo; dopo l'invio conferma chiara.
- Se la scheda non è rivendicata: link "Sei il titolare? Rivendica questa scheda".

### Schermata 4 — Dashboard del diving (`/dashboard`)
- Metriche: contatti del mese, numero di recensioni, valutazione media.
- Ultimi contatti con nome, motivo e data (stato: nuovo, risposto).
- Recensioni: elenco, risposta pubblica, segnalazione di contenuti inappropriati.
- Codici di verifica: pulsante "Genera codice" che crea un codice di 6 caratteri (o un QR) da dare al cliente dopo l'immersione.
- Modifica scheda: descrizione, servizi, orari, foto, contatti.

### Stati e casi limite da gestire
Caricamento (scheletri), errore di rete con tentativo di nuovo invio, spam bloccato da Turnstile, utente non autenticato che prova a scrivere una recensione (login con link magico, poi ritorno alla scheda), codice di verifica non valido o già usato.

### Come usare la bozza visiva
La bozza interattiva fatta in chat è solo un wireframe per allinearvi. In Claude Code si parte da qui: chiedere prima la struttura delle pagine e dei componenti, poi lo stile.

## Appendice B — Primi prompt per Claude Code (Sprint 0)

1. *"Leggi PROJECT.md e CLAUDE.md. Proponi un piano di lavoro per lo Sprint 0 e aspetta la mia conferma prima di scrivere codice."* (usa la modalità piano)
2. *"Crea un progetto Next.js con TypeScript e Tailwind seguendo il piano. Spiegami brevemente cosa fa ogni cartella creata."*
3. *"Scrivi le migrazioni SQL per `dive_centers`, `profiles`, `reviews`, `verification_codes`, `leads`, `claim_requests` con le policy RLS, ma non applicarle: mostrami prima lo schema."*
4. *"Scrivi uno script di seed che legga `data/diving.csv` e popoli `dive_centers`, con validazione dei campi e un report degli errori."*
5. *"Crea la pagina /diving con elenco, filtri (regione, tipo di immersione, federazione) e mappa Leaflet, usando i dati di seed."*

## Appendice C — Come lavorare con Claude Code in modo efficace

- **Piano prima del codice:** per ogni sprint chiedi un piano e approvalo.
- **Passi piccoli:** una funzionalità alla volta, con commit e deploy di anteprima su Vercel.
- **Chiedi spiegazioni brevi** su ciò che viene generato: ti serve per capire il sistema e per mantenerlo.
- **Collega gli strumenti:** il connettore Supabase per schema e migrazioni, quello Vercel per deploy e log (entrambi già disponibili nel tuo account).
- **Test e controlli:** lint, type-check e un test dei flussi critici (contatto, recensione) a ogni sprint.
- **Dati reali presto:** usa subito pochi diving veri per scoprire problemi di dati e di interfaccia.
