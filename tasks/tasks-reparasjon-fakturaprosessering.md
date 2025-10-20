## Relevant Files

- `prisma/schema.prisma` - Definerer databasemodeller, inkludert den manglende `Invoices`-modellen.
- `src/services/invoiceService.js` - Hovedservice for fakturaprosessering, feiler pga. manglende `prisma.invoices`.
- `src/electron/ipc/invoiceHandler.js` - Håndterer IPC-kall relatert til faktura, avhengig av `invoiceService.js`.
- `prisma/client.js` - Sikrer korrekt instansiering av Prisma-klienten.
- `src/electron/services/azureAiService.js` - Brukes for PDF-parsing og AI-kall; må sikres at den fortsatt fungerer som forventet med `invoiceService.js`.
- `src/components/Admin/InvoiceFeedback.js` - Mulig frontend-komponent for faktura-tilbakemelding.
- `src/components/Skade/Betalinger/InvoiceResultDialog.js` - Mulig frontend-komponent for visning av fakturaresultater.

### Notes

- Fokus er på backend-fikser relatert til Prisma og `invoiceService.js`.
- Frontend-filer er listet for kontekst, men endringer der er ikke primærfokus med mindre direkte påvirket av backend-feil.
- Test grundig etter hver hovedoppgave for å sikre at funksjonaliteten gjenopprettes trinnvis.

## Tasks

- [ ] 1.0 Gjenopprett `Invoices`-modellen i `prisma/schema.prisma`
  - [ ] 1.1 Finn den korrekte definisjonen av `Invoices`-modellen (basert på tidligere samtaler eller databasestruktur hvis mulig).
  - [ ] 1.2 Lim inn `Invoices`-modelldefinisjonen i `prisma/schema.prisma`.
  - [ ] 1.3 Sørg for at eventuelle relasjoner til andre modeller (f.eks. `UserV2` hvis fakturaer skal knyttes til brukere) er korrekt definert.
  - [ ] 1.4 Dobbeltsjekk feltnavn og datatyper mot det `invoiceService.js` forventer.

- [ ] 2.0 Kjør Prisma-migrering og -generering
  - [ ] 2.1 Åpne terminalen i prosjektets rotmappe.
  - [ ] 2.2 Kjør kommandoen `npx prisma migrate dev --name added_invoices_table` (eller et lignende beskrivende navn) for å lage en ny migreringsfil og oppdatere databasen.
  - [ ] 2.3 Inspiser den genererte SQL-migreringsfilen for å sikre at den ser fornuftig ut.
  - [ ] 2.4 Hvis migreringen feiler, analyser feilmeldingen. Vanlige årsaker kan være uoverensstemmelser mellom `schema.prisma` og den faktiske databasestrukturen, eller problemer med `shadowDatabaseUrl`.
  - [ ] 2.5 Kjør kommandoen `npx prisma generate` for å oppdatere Prisma Client basert på det nye skjemaet.

- [ ] 3.0 Verifiser og korriger Prisma-klienttilgang i `invoiceService.js`
  - [ ] 3.1 Åpne `src/services/invoiceService.js`.
  - [ ] 3.2 Bekreft at `prisma.invoices` nå er definert og ikke `undefined` (f.eks. ved å midlertidig logge `typeof prisma.invoices` eller ved å se på autocompletion i IDE).
  - [ ] 3.3 Gå gjennom alle steder hvor `prisma.invoices` brukes (f.eks. `prisma.invoices.create`, `prisma.invoices.update`) og sikre at kallene er korrekte i henhold til den gjenopprettede modellen.

- [ ] 4.0 Test kjernefunksjonalitet for fakturaopplasting og -prosessering
  - [ ] 4.1 Start applikasjonen i utviklingsmodus (`npm run dev` eller tilsvarende).
  - [ ] 4.2 Forsøk å laste opp en test-PDF-faktura via brukergrensesnittet (hvis dette er den vanlige arbeidsflyten).
  - [ ] 4.3 Overvåk backend-loggene (spesielt fra `invoiceService.js` og `invoiceHandler.js`) for feil under prosesseringen.
  - [ ] 4.4 Sjekk om en ny rad blir opprettet i `invoices`-tabellen i databasen.
  - [ ] 4.5 Verifiser at dataene som er lagret (f.eks. `extracted_text`, `extracted_json`, `status`) ser korrekte ut.

- [ ] 5.0 Verifiser og eventuelt korriger relaterte funksjoner i `invoiceService.js`
  - [ ] 5.1 Identifiser andre funksjoner i `invoiceService.js` som interagerer med `Invoices`-modellen (f.eks. `getInvoiceById`, `getAllInvoices`, `saveFeedback`, `getPdfForInvoice`, `deleteInvoice`, `deleteAllInvoices`).
  - [ ] 5.2 Test disse funksjonene (enten via UI-kall som trigger dem, eller ved å kalle dem direkte hvis mulig i et testmiljø/script).
  - [ ] 5.3 Rett opp eventuelle feil relatert til Prisma-interaksjoner eller datamodellen.
  - [ ] 5.4 Vurder om funksjoner som `getInvoicePrompt`, `setInvoicePrompt`, `getInvoicePromptHistory` (som bruker `SystemPrompts`) fortsatt fungerer som forventet og ikke har blitt negativt påvirket.
