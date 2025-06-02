# Product Requirements Document: Restrukturering av Garanti-modul

## 1. Introduksjon/Oversikt

Dette dokumentet beskriver kravene for en restrukturering av den eksisterende Garanti-modulen. Hovedendringen er å gå fra en sak-sentrert modell til en selskaps-sentrert modell, hvor hvert selskap (identifisert med unikt organisasjonsnummer) kan ha flere tilknyttede prosjekter/tilbud. Denne endringen skal forbedre datastruktur, legge til rette for fremtidige funksjonaliteter (som integrasjon med eksterne API-er for selskapsdata og kredittvurdering), og gi bedre oversikt over kundenes engasjement og rammebetingelser.

## 2. Mål

* Etablere en klar og logisk datastruktur med "Selskap" som primærentitet og "Prosjekt/Tilbud" som sekundærentiteter.
* Sørge for at rammeavtaler og overordnet selskapsinformasjon lagres på selskapsnivå.
* Tilrettelegge for enklere søk og gjenfinning av selskaper og deres tilknyttede prosjekter/tilbud.
* Forbedre brukeropplevelsen ved å gi en samlet oversikt over et selskaps aktiviteter og status.
* Legge grunnlaget for fremtidig utvidelse med mer avansert funksjonalitet (f.eks. prisberegningsmodul, eksterne API-koblinger, dashboard for nøkkeltall).
* Implementere en "Selskap"-side som viser selskapsdetaljer, prosjektoversikt, og nylige dokumenter.
* Implementere en "Prosjekt/Tilbud"-detaljside.
* Sikre at alle relevante endringer på selskap og prosjekt loggføres.

## 3. Brukerhistorier

* **Saksbehandler - Selskapsoversikt:** Som en saksbehandler, vil jeg kunne søke etter et selskap (via org.nr., kundenr., eller navn) og se alle prosjekter/tilbud for dette selskapet, slik at jeg raskt får oversikt over deres totale engasjement.
* **Saksbehandler - Kredittinformasjon:** Som saksbehandler ønsker jeg å kunne se nøkkelinformasjon om selskapet (inkludert ramme) på selskapssiden, slik at jeg raskt kan vurdere kredittverdighet.
* **Saksbehandler - Dokumenthåndtering:** Som saksbehandler ønsker jeg enkel tilgang til de siste dokumentene som er lastet opp, både på selskapsnivå og prosjektnivå, og enkelt kunne se hvilket prosjekt/selskap de tilhører.
* **Saksbehandler - Selskapsadministrasjon:** Som saksbehandler vil jeg kunne redigere selskapsinformasjon (f.eks. kontaktperson, adresse, ramme) direkte på selskapssiden.
* **Saksbehandler - Prosjektadministrasjon:** Som saksbehandler vil jeg kunne opprette nye prosjekter/tilbud knyttet til et selskap.
* **Saksbehandler - Konserninfo:** Som saksbehandler må jeg enkelt kunne se om et selskap er en del av et konsern (fremtidig).

## 4. Funksjonelle Krav

### FK1: Selskap Entitet

* FK1.1: Systemet skal tillate opprettelse og lagring av Selskaper.
* FK1.2: Hvert Selskap skal ha et unikt organisasjonsnummer.
* FK1.3: Følgende informasjon skal kunne lagres på et Selskap:
  * Organisasjonsnummer (unikt, obligatorisk)
  * Selskapsnavn
  * Kundenummer Wims
  * Gateadresse
  * Postnummer
  * Poststed
  * Kontaktperson Navn
  * Kontaktperson Telefon
  * Ramme (f.eks. kredittramme, beløp)
* FK1.4: Det skal være mulig å redigere all selskapsinformasjon.
* FK1.5: Selskaper skal kunne søkes opp via organisasjonsnummer, selskapsnavn, eller kundenummer Wims.

### FK2: Prosjekt/Tilbud Entitet

* FK2.1: Systemet skal tillate opprettelse og lagring av Prosjekter/Tilbud, som alltid må være knyttet til ett Selskap.
* FK2.2: Hvert Prosjekt/Tilbud skal ha en unik ID.
* FK2.3: Følgende informasjon skal kunne lagres på et Prosjekt/Tilbud:
  * Navn (kan settes uavhengig av adresse, default til prosjektadresse hvis tilgjengelig)
  * Prosjektadresse:
    * Gateadresse
    * Postnummer
    * Poststed
    * Kommune
    * Kommunenummer
  * Status (gjenbruk statuser fra nåværende Garantimodul, f.eks. Ny, Tildelt, Behandles, Avslått, Godkjent etc.)
  * Produkt (gjenbruk fra nåværende løsning)
  * Kommentar fra Kunde (gjenbruk fra nåværende løsning)
* FK2.4: Ingen av feltene for Prosjekt/Tilbud (navn, adressekomponenter) skal være obligatoriske ved opprettelse på nåværende tidspunkt.
* FK2.5: Det skal være mulig å redigere all Prosjekt/Tilbud-informasjon.

### FK3: Selskapsside (UI)

* FK3.1: Det skal finnes en egen side for visning av et Selskap og dets detaljer.
* FK3.2: Selskapssiden skal vise all lagret selskapsinformasjon (ref FK1.3).
* FK3.3: Selskapssiden skal ha funksjonalitet for å redigere selskapsinformasjonen.
* FK3.4: Selskapssiden skal vise en liste over alle tilknyttede Prosjekter/Tilbud.
  * Listen skal som minimum vise Prosjektnavn, Prosjekt ID, Status.
  * Hvert element i listen skal være en lenke til Prosjekt/Tilbud-detaljsiden.
* FK3.5: Selskapssiden skal ha en knapp/funksjon for å opprette et nytt Prosjekt/Tilbud knyttet til det aktuelle selskapet.
* FK3.6: Selskapssiden skal vise en seksjon med nylig opplastede dokumenter (både selskaps- og prosjektspesifikke, med indikasjon på tilhørighet).

### FK4: Prosjekt/Tilbud-detaljside (UI)

* FK4.1: Det skal finnes en egen side for visning av et Prosjekt/Tilbud og dets detaljer.
* FK4.2: Siden skal vise all lagret informasjon for Prosjektet/Tilbudet (ref FK2.3).
* FK4.3: Siden skal ha funksjonalitet for å redigere Prosjekt/Tilbud-informasjonen.
* FK4.4: Funksjonalitet for dokumentopplasting knyttet til prosjektet skal være tilgjengelig (tilsvarende `GarantiSakDetailPage.js`).
* FK4.5: Interne kommentarer knyttet til prosjektet skal kunne legges til og vises (tilsvarende `GarantiSakDetailPage.js`).
* FK4.6: Ansvarlige for prosjektet skal kunne tildeles og vises (tilsvarende `GarantiSakDetailPage.js`).

### FK5: Dokumenthåndtering

* FK5.1: Systemet skal tillate opplasting av dokumenter.
* FK5.2: Dokumenter skal kunne knyttes enten direkte til et Selskap eller til et spesifikt Prosjekt/Tilbud.
* FK5.3: Det skal være mulig å skille mellom selskapsrelevante dokumenter (f.eks. likviditetsbudsjett, balanse) og prosjektspesifikke dokumenter (f.eks. kontrakt, plantegninger).
* FK5.4: Visning av dokumenter skal inkludere filnavn, opplastingsdato, og type/kategori (tilsvarende `GarantiSakDetailPage.js`).

### FK6: Hendelseslogg

* FK6.1: Alle vesentlige endringer i Selskapsdata (opprettelse, redigering) skal loggføres.
* FK6.2: Alle vesentlige endringer i Prosjekt/Tilbud-data (opprettelse, redigering, statusendring) skal loggføres.
* FK6.3: Opplasting av dokumenter (både for selskap og prosjekt) skal loggføres.
* FK6.4: Hendelsesloggen skal vise dato/tid, type hendelse, beskrivelse, og hvem som utførte handlingen (tilsvarende `GarantiSakDetailPage.js`).
* FK6.5: Hendelseslogg skal være synlig på Selskapssiden (for selskapshendelser) og på Prosjekt/Tilbud-detaljsiden (for prosjekthendelser).

### FK7: `GarantisakerPage`

* FK7.1: `GarantisakerPage` kan i utgangspunktet forbli som den er, og fungere som en innboks for nye saker/henvendelser som ennå ikke er formalisert som et Prosjekt/Tilbud under et Selskap. (Detaljer for overgang fra "Sak" til "Prosjekt/Tilbud" må avklares nærmere).

## 5. Non-Goals (Ute av Omfang)

* **Prisberegningsmodul:** Utvikling av en modul for å beregne pris på prosjekter/tilbud er ikke en del av denne leveransen.
* **Datamigrering:** Migrering av eksisterende data er ikke nødvendig, da nåværende data er dummy-data.
* **Avansert Dashboard:** Utvikling av et dashboard med nøkkeltall for selskapet er utsatt.
* **Eksterne API-integrasjoner:** Direkte integrasjon med Enin, Dun & Bradstreet eller lignende for automatisk henting av selskapsdata er utsatt.
* **Konsernstruktur:** Håndtering av komplekse konsernstrukturer er utsatt.
* **Prosjekt-start dato og detaljert økonomi:** Felter relatert til den fremtidige prisberegningsmodulen (som prosjekt-startdato) er ikke en del av denne fasen.

## 6. Designhensyn (Valgfritt)

* **UI-rammeverk:** Shadcn skal benyttes.
* **Gjenbruk:** Komponenter og stiler fra eksisterende `GarantiSakDetailPage.js` og andre UI-komponenter (`~/components/ui/`) bør gjenbrukes der det er hensiktsmessig.
* **Brukeropplevelse:** Grensesnittet skal være enkelt, intuitivt og oversiktlig.
* **Visuell stil:** Bruk av ikoner (f.eks. Lucide-react) og tydelige, konsise tekster. Unngå unødvendig detaljrikdom.

## 7. Tekniske Hensyn (Valgfritt)

* **Database:** Endringer i `prisma/schema.prisma` vil være nødvendig for å reflektere den nye datamodellen (Selskap, Prosjekt/Tilbud, relasjoner).
* **API Endepunkter:** Nye API-endepunkter (i `src/electron/api-handlers/`) og servicelogikk (i `src/electron/services/`) må utvikles for å håndtere CRUD-operasjoner for Selskap og Prosjekt/Tilbud.
* **Frontend:** Nye React-komponenter må utvikles for Selskapssiden og Prosjekt/Tilbud-detaljsiden.

## 8. Suksessmetrikker

* Saksbehandlere kan effektivt søke opp og finne selskaper.
* Saksbehandlere kan enkelt se en oversikt over et selskaps prosjekter/tilbud og deres status.
* Saksbehandlere kan manuelt legge til og redigere selskaps- og prosjektinformasjon.
* Dokumenter kan lastes opp og knyttes korrekt til enten selskap eller prosjekt.
* Hendelsesloggen fanger opp alle relevante endringer korrekt.
* Den nye strukturen oppleves som mer logisk og brukervennlig av saksbehandlerne.

## 9. Åpne Spørsmål

* Hvordan skal overgangen fra en "Garantisak" (fra `GarantisakerPage`) til et formelt "Prosjekt/Tilbud" under et "Selskap" håndteres i arbeidsflyten? Skal en "Garantisak" konverteres, eller er "Prosjekt/Tilbud" en helt ny type etter at et selskap er identifisert/opprettet?
* Skal det være en egen listeside for *alle* selskaper, i tillegg til søkefunksjonaliteten?
* Detaljer rundt hvilke spesifikke felter fra `GarantiSakDetailPage.js` som skal gjenbrukes direkte på den nye "Prosjekt/Tilbud"-siden.
* Trenger vi en egen "Prosjekt/Tilbud" listeside, eller er listen på "Selskap"-siden tilstrekkelig for nå?

---
Dette PRD er basert på brukerdialog og tar sikte på å veilede utviklingen av den restrukturerte Garanti-modulen.
