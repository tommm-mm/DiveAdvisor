# Moderazione delle recensioni

Non c'è un pannello admin (fuori MVP): si modera dal Table Editor di Supabase.

## Recensioni non verificate
1. Arriva un'email "Recensione da moderare" (a `ADMIN_EMAIL`, per ora l'email di Tommaso).
2. Supabase → Table Editor → `reviews` → filtra `status = pending`.
3. Leggi il testo. Cambia `status` in `published` (va online con l'etichetta "Non verificata") o `rejected` (resta nascosta a tutti, anche al diving). Se rifiuti, scrivi il motivo in `moderation_note`: ogni mattina alle 7 (ora italiana, 8 con l'ora legale) l'autore riceve un'email con quel motivo.
4. La scheda si aggiorna entro 10 minuti (cache della pagina).

Criteri per rifiutare: insulti o dati personali, contenuti non legati a un'immersione, spam o pubblicità, conflitto di interessi evidente (es. scritta dal diving o da un concorrente).

## Segnalazioni
1. Arriva un'email "Recensione segnalata" con l'id.
2. Table Editor → `review_reports` per il motivo, poi `reviews` per la recensione.
3. Se va rimossa: `status = rejected` e il motivo in `moderation_note` (l'autore viene avvisato la mattina dopo). Il diving non può cancellare recensioni, solo rispondere.

## Recensioni verificate
Sono pubblicate subito perché il codice dimostra l'immersione. Si possono comunque rifiutare dopo una segnalazione.

## Nuove attività suggerite
1. Supabase → Table editor → `business_suggestions`, filtra `status = pending`.
2. Controlla i dati (nome, regione, città, email, sito). Correggi se serve.
3. Imposta `status = approved`: la scheda viene creata subito; il giorno dopo l'attività riceve l'email con il link.
4. Spam o dati non verificabili: `status = rejected`.

Più semplice: le richieste compaiono anche in cima a `/admin`, con i pulsanti Approva e Rifiuta.
