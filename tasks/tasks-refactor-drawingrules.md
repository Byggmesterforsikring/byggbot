## Relevant Files

- `src/electron/services/drawingRulesService.js` - Hovedfilen som skal refaktoreres.
- `prisma/schema.prisma` - Inneholder definisjonene for `DrawingRule`, `DrawingRuleVersion`, `DrawingRuleImage`, og `UserV2`.
- `src/components/DrawingRules/DrawingRulesPage.js` - Frontend-komponenten som bruker servicen.
- `src/electron/ipc/drawingRulesHandler.js` (antatt) - IPC-handleren som kaller `drawingRulesService.js`.
- `prisma/client.js` - For å hente Prisma-klientinstansen.

### Notes

- Hovedmålet er å bytte ut rå SQL med Prisma ORM-kall.
- Brukeridentifikasjon må endres fra e-post til `UserV2.id` (integer).
- Sørg for at data som returneres til frontend er i forventet format, eller oppdater frontend tilsvarende.
- Transaksjonshåndtering må oppdateres til `prisma.$transaction`.

## Tasks

- [ ] 1.0 Forberedelser og Felles Endringer
  - [ ] 1.1 Importer Prisma-klient i `drawingRulesService.js`: `const getPrismaInstance = require('../../../prisma/client.js'); const prisma = getPrismaInstance();`.
  - [ ] 1.2 Fjern gammel databasekonfigurasjon (`require('../config/dbConfig')` og bruk av `db.query` / `db.pool`).
  - [ ] 1.3 Gå gjennom alle funksjonssignaturer i `drawingRulesService.js` som mottar `userEmail` og planlegg endring til `userId` (integer, for `UserV2.id`). Selve endringen skjer per funksjon.

- [ ] 2.0 Refaktorer `getAllRules`
  - [ ] 2.1 Erstatt SQL-spørring med `prisma.drawingRule.findMany(...)`.
  - [ ] 2.2 Bruk `include` for å hente relatert `DrawingRuleVersion` (den som er `isCurrent: true`).
  - [ ] 2.3 Bruk `include` for å hente relatert `UserV2` data for `createdBy` og `lastUpdatedBy` (f.eks. `include: { createdBy: { select: { id: true, navn: true, email: true } }, lastUpdatedBy: { select: { id: true, navn: true, email: true } } }`).
  - [ ] 2.4 Sørg for at returformatet matcher det `DrawingRulesPage.js` forventer (spesielt `content` fra gjeldende versjon, og brukerinfo).

- [ ] 3.0 Refaktorer `getRuleBySlug(slug, versionNumber = null)`
  - [ ] 3.1 Erstatt SQL med `prisma.drawingRule.findUnique({ where: { slug }, ... })`.
  - [ ] 3.2 Hvis `versionNumber` er gitt, bruk `include` for å hente spesifikk `DrawingRuleVersion` ( `include: { versions: { where: { versionNumber } } }`).
  - [ ] 3.3 Hvis `versionNumber` ikke er gitt, bruk `include` for å hente versjonen der `isCurrent: true`.
  - [ ] 3.4 Inkluder `UserV2` data for `createdBy` og `lastUpdatedBy` for selve regelen.
  - [ ] 3.5 Juster returdata for å gi korrekt `content` og brukerinfo.

- [ ] 4.0 Refaktorer `createRule(title, content, userId)` (merk endring fra userEmail til userId)
  - [ ] 4.1 Erstatt transaksjonslogikk med `prisma.$transaction(async (tx) => { ... })`.
  - [ ] 4.2 Implementer unik slug-generering med `tx.drawingRule.findUnique` i en løkke.
  - [ ] 4.3 Opprett `DrawingRule` med `tx.drawingRule.create(...)`, bruk `created_by_user_id: userId`, `last_updated_by_user_id: userId`.
  - [ ] 4.4 Opprett første `DrawingRuleVersion` med `tx.drawingRuleVersion.create(...)`, koble til `ruleId`, sett `versionNumber: 1`, `isCurrent: true`, `created_by_user_id: userId`.
  - [ ] 4.5 Returner den nyopprettede regelen (inkludert versjonsdata og brukerinfo) i forventet format.

- [ ] 5.0 Refaktorer `updateRule(slug, title, content, userId)` (merk endring fra userEmail til userId)
  - [ ] 5.1 Bruk `prisma.$transaction(async (tx) => { ... })`.
  - [ ] 5.2 Hent `DrawingRule` med `tx.drawingRule.findUnique({ where: { slug } })`.
  - [ ] 5.3 Oppdater `DrawingRule` (tittel, `last_updated_by_user_id: userId`) med `tx.drawingRule.update(...)`.
  - [ ] 5.4 Hent høyeste `versionNumber` for regelen med `tx.drawingRuleVersion.aggregate(...)` eller `findMany` med `orderBy` og `take`.
  - [ ] 5.5 Sett `isCurrent = false` for alle eksisterende versjoner av regelen med `tx.drawingRuleVersion.updateMany(...)`.
  - [ ] 5.6 Opprett ny `DrawingRuleVersion` med `tx.drawingRuleVersion.create(...)` (nytt versjonsnummer, `isCurrent: true`, `created_by_user_id: userId`).
  - [ ] 5.7 Returner den oppdaterte regelen.

- [ ] 6.0 Refaktorer `deleteRule(slug)`
  - [ ] 6.1 Erstatt SQL med `prisma.drawingRule.delete({ where: { slug } })`. `onDelete: Cascade` i schema.prisma skal håndtere sletting av relaterte versjoner og bilder.
  - [ ] 6.2 Bekreft at `onDelete: Cascade` er satt på `DrawingRuleVersion.rule` og `DrawingRuleImage.ruleVersion` relasjonene i `prisma/schema.prisma`.

- [ ] 7.0 Refaktorer `getRuleVersions(slug)`
  - [ ] 7.1 Erstatt SQL med `prisma.drawingRuleVersion.findMany(...)`.
  - [ ] 7.2 Filtrer på `rule: { slug: slug }`.
  - [ ] 7.3 Inkluder `createdBy` (UserV2) for hver versjon.
  - [ ] 7.4 Sorter etter `versionNumber` synkende.

- [ ] 8.0 Refaktorer `saveImage(ruleVersionId, filename, fileData, mimeType, userId)` og `getImage(imageId)`
  - [ ] 8.1 `saveImage`: Erstatt SQL med `prisma.drawingRuleImage.create(...)`. `fileData` (Bytes) skal sendes som en Node.js `Buffer`. `created_by_user_id: userId`.
  - [ ] 8.2 `getImage`: Erstatt SQL med `prisma.drawingRuleImage.findUnique({ where: { id: imageId } })`. Returnert `fileData` vil være en `Buffer`.

- [ ] 9.0 Oppdater Frontend (`DrawingRulesPage.js`) for UserV2 ID og dataformat
  - [ ] 9.1 I `handleSave`, endre `const userEmail = account?.username || account?.email;` til å hente `const userId = authManager.getCurrentUserDetails()?.id;`.
  - [ ] 9.2 Send `userId` i stedet for `userEmail` til `createRule` og `updateRule` IPC-kallene.
  - [ ] 9.3 Juster hvordan brukerinfo vises (f.eks. `created_by_email` til `createdBy.navn` eller `createdBy.email`) basert på hva Prisma-kallene nå returnerer.

- [ ] 10.0 Testing og Verifisering
  - [ ] 10.1 Test all CRUD-funksjonalitet for tegningsregler via UI.
  - [ ] 10.2 Test oppretting og visning av versjoner.
  - [ ] 10.3 Test opplasting og visning av bilder knyttet til versjoner (hvis UI for dette eksisterer).
  - [ ] 10.4 Verifiser at brukerinfo (`createdBy`/`lastUpdatedBy`) vises korrekt.
