## Relevant Files

- `prisma/schema.prisma` - Database schema updates for tilbud, beregning, benefisienter og produktkonfigurasjon tabeller
- `src/components/Garanti/GarantiProsjektDetailPage.js` - Hovedkomponent som skal utvides med ny "Tilbud" tab
- `src/components/Garanti/Tilbud/TilbudDetailPage.js` - Ny hovedkomponent for tilbudsvisning og redigering
- `src/components/Garanti/Tilbud/TilbudTab.js` - Tab-komponent som vises på prosjektdetaljsiden
- `src/components/Garanti/Tilbud/TilbudBeregning.js` - Komponent for automatisk og manuell prisberegning
- `src/components/Garanti/Tilbud/BenefisientAdmin.js` - CRUD-komponent for benefisient-administrasjon
- `src/components/Garanti/Tilbud/RammeOvervakning.js` - Visuell komponent for rammeforbruk
- `src/components/Garanti/Tilbud/ProduktVelger.js` - Dropdown-komponent for produktvalg
- `src/electron/api-handlers/tilbud-handlers.js` - Backend API-handlers for tilbud-operasjoner
- `src/electron/services/tilbud-service.js` - Business logic for tilbudsberegning og validering
- `src/electron/services/prisma-service.js` - Database-operasjoner via Prisma (kan utvides)
- `src/utils/tilbud-beregninger.js` - Hjelpefunksjoner for matematiske beregninger
- `src/utils/tilbud-konstanter.js` - Konstanter for produkttyper, statuser og standardverdier

### Notes

- Database migrasjoner skal kjøres med `npx prisma migrate dev --name tilbud-system`
- Prisma Client må regenereres etter schema-endringer med `npx prisma generate`
- Følg eksisterende mønster for API-handlers og services fra prosjekt-funksjonaliteten
- Gjenbruk design-komponenter fra prosjektdetaljsiden for konsistent UI

## Tasks

- [ ] 1.0 Database Schema og Migrasjoner
  - [ ] 1.1 Opprette Tilbud-tabell i Prisma schema med alle nødvendige felt (id, prosjektId UNIQUE, status, produkttype, opprettetDato, opprettetAv, sistEndret, endretAv, versjonsnummer)
  - [ ] 1.2 Opprette TilbudsBeregning-tabell med beregningsparametere (tilbudId, kontraktssum, startDato, sluttDato, utforelsestid, garantitid, rentesatsUtforelse, rentesatsGaranti, etableringsgebyr, totalPremie, manueltOverstyrt)
  - [ ] 1.3 Opprette Benefisient-tabell for eiere/interessenter (id, tilbudId, type, navn, organisasjonsnummer, personident, andel, kontaktinformasjon)
  - [ ] 1.4 Opprette ProduktKonfigurasjon-tabell for produktinnstillinger (id, produktnavn, standardUtforelseProsent, standardGarantiProsent, standardGarantitid, maksKontraktssum, aktiv)
  - [ ] 1.5 Definere relasjoner mellom tabeller (foreign keys og Prisma relations)
  - [ ] 1.6 Generere og kjøre Prisma migrering med `npx prisma migrate dev --name tilbud-system`
  - [ ] 1.7 Opprette seed-data for ProduktKonfigurasjon med alle 8 produkttyper og deres standardverdier
  - [ ] 1.8 Oppdatere eksisterende Prosjekt-modell med optional tilbud-referanse hvis nødvendig

- [ ] 2.0 Backend API og Business Logic  
  - [ ] 2.1 Opprette tilbud-handlers.js med CRUD-operasjoner (createTilbud, getTilbudByProsjektId, updateTilbud, deleteTilbud - kun ett tilbud per prosjekt)
  - [ ] 2.2 Implementere tilbud-service.js med business logic for tilbudsvalidering og statusendringer
  - [ ] 2.3 Lage beregnings-service med automatiske prisberegninger basert på formler fra PRD
  - [ ] 2.4 Implementere ramme-validering som sjekker selskaps ramme mot eksisterende forbruk
  - [ ] 2.5 Opprette benefisient-handlers for CRUD-operasjoner på benefisienter
  - [ ] 2.6 Integrere med eksisterende endringslogg-system for tilbudsendringer
  - [ ] 2.7 Implementere produktkonfigurasjon-handlers for henting av standardverdier
  - [ ] 2.8 Lage valideringsfunksjoner for tilbudsdata (required fields, ranges, business rules)

- [ ] 3.0 Frontend Grunnstruktur og Navigation
  - [ ] 3.1 Utvide GarantiProsjektDetailPage.js med ny "Tilbud" tab i TAB_STRUKTUR array
  - [ ] 3.2 Opprette TilbudTab.js komponent som viser tilbudsstatus eller "Opprett tilbud" knapp (1:1 relasjon)
  - [ ] 3.3 Implementere navigasjon fra TilbudTab til dedikert TilbudDetailPage
  - [ ] 3.4 Opprette TilbudDetailPage.js som hovedkomponent for tilbudsvisning og redigering
  - [ ] 3.5 Sette opp routing i hovedapp for tilbudssider (f.eks. /garanti/prosjekt/:id/tilbud - 1:1 relasjon)
  - [ ] 3.6 Implementere tilgangskontroll basert på brukerroller og prosjektstatus
  - [ ] 3.7 Lage grunnleggende layout og header for TilbudDetailPage med prosjektinfo og tilbudsstatus
  - [ ] 3.8 Opprette loading og error states for tilbudsdata

- [ ] 4.0 Tilbudsberegning og Produkthåndtering
  - [ ] 4.1 Opprette ProduktVelger.js komponent med dropdown for alle 8 produkttyper
  - [ ] 4.2 Implementere TilbudBeregning.js komponent med automatisk prisberegning
  - [ ] 4.3 Lage input-felt for alle beregningsparametere (kontraktssum, datoer, rentesatser, etableringsgebyr)
  - [ ] 4.4 Implementere real-time beregning når parametere endres
  - [ ] 4.5 Lage "manuell overstyring" funksjonalitet hvor rådgiver kan sette total premie og få beregnet rentesats
  - [ ] 4.6 Opprette BenefisientAdmin.js komponent med tabell og CRUD-operasjoner
  - [ ] 4.7 Implementere benefisient-skjema med validering av organisasjonsnummer/personident
  - [ ] 4.8 Lage statusendring-funksjonalitet med bekreftelsesdialoguer
  - [ ] 4.9 Implementere lagring av tilbudsdata med optimistic updates

- [ ] 5.0 Rammeovervåking og Validering
  - [ ] 5.1 Opprette RammeOvervakning.js komponent som henter og viser selskapets rammeforbruk
  - [ ] 5.2 Implementere backend-logikk for beregning av forbrukt ramme basert på produserte prosjekter
  - [ ] 5.3 Lage visuell fremstilling av ramme (total/forbrukt/tilgjengelig) med progress bar eller lignende
  - [ ] 5.4 Implementere fargekoding (grønn/gul/rød) basert på forbruksnivå
  - [ ] 5.5 Lage advarselskomponent som vises hvis tilbud overstiger tilgjengelig ramme
  - [ ] 5.6 Implementere real-time oppdatering av rammeforbruk når tilbudsbeløp endres
  - [ ] 5.7 Lage validering som forhindrer statusendring til "Produsert" hvis ramme overskrides
  - [ ] 5.8 Opprette oversikt over alle aktive prosjekter og deres rammeforbruk for selskapet
