# Dev log

Diario di lavoro: cosa è stato fatto, perché e con quale esito. Il più recente in alto.
Serve a Tommaso per seguire il progetto e alle sessioni future di Claude per ripartire senza riscoprire il contesto.

## Sprint 3 — Recensioni (branch `claude/beautiful-hamilton-w9xbsf`)

### Decisioni
- Codice di verifica: monouso, scade dopo 30 giorni, non legato a una data. Formato 8 caratteri senza 0/O/1/I, mostrato come `XXXX-XXXX`.
- Codice errato o scaduto: il form mostra un errore (non salva in silenzio come non verificata). L'utente può correggere o lasciare il campo vuoto.
- Recensione senza codice: `pending`, pubblicata solo dopo moderazione in Supabase, etichetta "Non verificata".
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
