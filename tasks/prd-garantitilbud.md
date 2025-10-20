# PRD: Garantitilbud - Prisberegning og Tilbudshåndtering

## Introduksjon/Oversikt

Dette dokumentet beskriver utviklingen av et omfattende tilbudssystem for garantiforsikringer innenfor Byggbot-applikasjonen. Systemet skal la rådgivere beregne priser på ulike garantiprodukter, håndtere benefisienter, overvåke rammeforbruk, og administrere tilbudsstatuser gjennom hele livssyklusen.

**Problem:** I dag mangler systemet evnen til å beregne priser på garantiforsikringer og administrere tilbud strukturert. Rådgivere må gjøre manuelle beregninger utenfor systemet, noe som fører til ineffektivitet og potensial for feil.

**Mål:** Implementere et integrert tilbudssystem som automatiserer prisberegning, sikrer overholdelse av kundens ramme/limit, og gir full sporbarhet av endringer.

## Mål

1. **Automatisert prisberegning** for alle 8 garantiprodukter basert på konfigurerbare parametere
2. **Rammeovervåking** som viser real-time rammeforbruk og advarer ved overskridelser  
3. **Tilbudshåndtering** med statusflyt fra utkast til produsert/aktiv
4. **Benefisient-administrasjon** for komplekse prosjekter med flere eiere
5. **Full sporbarhet** gjennom endringslogg for alle tilbudsrelaterte handlinger
6. **Integrert brukeropplevelse** via ny tab på prosjektdetaljsiden

## Brukerhistorier

### Hovedbrukerhistorier

1. **Som rådgiver** ønsker jeg å opprette et pristilbud for et tildelt prosjekt, slik at jeg kan beregne korrekt premie for kunden.

2. **Som rådgiver** ønsker jeg å velge produkttype og overstyre alle beregningsparametere manuelt, slik at jeg kan tilpasse tilbudet til spesifikke kundebehov.

3. **Som rådgiver** ønsker jeg å se real-time rammeforbruk for selskapet, slik at jeg kan vurdere om tilbudet er innenfor kundens finansielle kapasitet.

4. **Som rådgiver** ønsker jeg å legge til og administrere benefisienter for prosjektet, slik at alle eiere av boliger/seksjoner er korrekt registrert.

5. **Som rådgiver** ønsker jeg å se en visuell oversikt over selskapets totale rammeforbruk, slik at jeg kan forstå deres finansielle posisjon.

6. **Som systembruker** ønsker jeg at alle endringer i tilbud logges automatisk, slik at det er full sporbarhet.

## Funksjonelle Krav

### Database og Datamodell

#### 1. Tilbud (Tilbud-tabell)

- **Tilbud-ID** (primær nøkkel)
- **Prosjekt-ID** (foreign key til Prosjekt - UNIQUE for 1:1 relasjon)
- **Status** (enum: 'Utkast', 'Tilbud', 'Produsert', 'Aktiv')
- **Produkttype** (enum: se produktliste nedenfor)
- **Opprettet dato/tid** og **Opprettet av** (User-ID)
- **Sist endret dato/tid** og **Endret av** (User-ID)
- **Versjonsnummer** (for å håndtere endringer)

#### 2. Tilbudsberegning (TilbudsBeregning-tabell)

- **Tilbud-ID** (foreign key)
- **Kontraktssum** (prosjektverdi i kroner)
- **Start dato** (prosjektets startdato)
- **Slutt dato** (prosjektets overleveringsdato)  
- **Utførelsestid** (beregnet i dager)
- **Garantitid/Reklamasjonstid** (i år)
- **Rentesats utførelse** (prosent)
- **Rentesats garanti** (prosent)
- **Etableringsgebyr** (fast beløp i kroner)
- **Total premie** (beregnet sum)
- **Manuelt overstyrt** (boolean - om verdier er manuelt justert)

#### 3. Benefisienter (Benefisient-tabell)

- **Benefisient-ID** (primær nøkkel)
- **Tilbud-ID** (foreign key)
- **Type** (enum: 'Privatperson', 'Bedrift')
- **Navn/Bedriftsnavn**
- **Organisasjonsnummer** (hvis bedrift)
- **Personident** (hvis privatperson)
- **Andel/Prosent** (av total eierskap)
- **Kontaktinformasjon** (adresse, telefon, e-post)

#### 4. Produktkonfigurasjon (ProduktKonfig-tabell)

- **Produkt-ID** (primær nøkkel)
- **Produktnavn** (enum)
- **Standard utførelse prosent** (% av kontraktssum under utførelse)
- **Standard garanti prosent** (% av kontraktssum under garanti)
- **Standard garantitid** (år)
- **Maks kontraktssum** (øvre grense)
- **Aktiv** (boolean)

### Produktliste (8 produkter)

1. Samlegaranti
2. Entrepenørgaranti - proff  
3. Entrepenørgaranti - forbruker
4. Entrepenørgaranti - byggherre
5. Forskuddsgaranti
6. Forskuddsgaranti - proff
7. Betalingsgaranti
8. Byggesett

### Beregningslogikk

#### 5. Automatisk prisberegning skal følge denne formelen

```
Utførelsestid = Slutt dato - Start dato (i dager)
Utførelse garantisum = Kontraktssum × Produkt utførelse prosent
Utførelse premie = Utførelse garantisum × Rentesats utførelse × (Utførelsestid/365)

Garanti garantisum = Kontraktssum × Produkt garanti prosent  
Garanti premie = Garanti garantisum × Rentesats garanti × Garantitid

Total premie = Utførelse premie + Garanti premie + Etableringsgebyr
```

#### 6. Alternativ beregning (baklengs fra ønsket pris)

- Rådgiver kan sette **Total premie** manuelt
- Systemet beregner tilbake til nødvendig rentesats
- Viser både opprinnelig og justert rentesats

### Brukergrensesnitt

#### 7. Ny tab "Tilbud" på prosjektdetaljsiden

- Vises kun for prosjekter med status "Tildelt" eller senere
- Kun synlig for rådgiver tildelt prosjektet + UW-roller
- Knapp: "Opprett tilbud" (hvis tilbud ikke finnes)
- Direkte visning av tilbudsstatus og sist endret (hvis tilbud finnes)
- Navigasjon til TilbudDetailPage for redigering

#### 8. Hovedtilbudsside (egen side)

- **Header:** Prosjektnavn, tilbudsstatus, versjon
- **Seksjon 1:** Produktvalg (dropdown med 8 produkter)
- **Seksjon 2:** Beregningsparametere (alle felt kan overstyres manuelt)
- **Seksjon 3:** Benefisient-administrasjon (tabell med CRUD-operasjoner)
- **Seksjon 4:** Rammeovervåking (visuell fremstilling)
- **Seksjon 5:** Beregningsresultat og handlinger

#### 9. Rammeovervåkingskomponent

- **Total ramme** (fra selskap)
- **Forbrukt ramme** (sum av produserte prosjekter innenfor periode)
- **Under behandling** (sum av aktive tilbud)  
- **Tilgjengelig ramme** (total - forbrukt - under behandling)
- **Visuell indikator:** Grønn/gul/rød basert på forbruksnivå
- **Advarselsmelding** hvis tilbud overstiger tilgjengelig ramme

### Statusflyt og Tillatelser

#### 10. Tilbudsstatus og tillatte handlinger

- **Utkast:** Alle felt kan endres, kan slettes
- **Tilbud:** Kun mindre justeringer, kan konverteres til Produsert
- **Produsert:** Kun visning, registreres som rammeforbruk
- **Aktiv:** Kun visning, historisk record

**Viktig:** Tilbudsstatus følger prosjektstatus. Ett prosjekt har nøyaktig ett tilbud (1:1 relasjon). Endringer i tilbud logges via det eksisterende endringslogg-systemet.

#### 11. Tilgangscontroll

- **Opprettelse:** Kun rådgiver tildelt prosjektet
- **Visning:** Rådgiver + UW-roller + ledelse
- **Redigering:** Kun rådgiver (begrenset etter status)
- **Statusendring:** Rådgiver → Tilbud, UW-rolle → Produsert

### Endringslogg og Sporbarhet

#### 12. Automatisk logging av alle endringer

- **Tilbudsendringer:** Alle feltendringer med før/etter verdier
- **Statusendringer:** Tidspunkt, bruker, årsak
- **Benefisientendringer:** CRUD-operasjoner med detaljer
- **Beregningsendringer:** Manuell overstyring vs. automatisk

## Non-Goals (Utenfor Scope)

1. **WIMS API-integrasjon** - Kommer i senere fase
2. **Kunde-tilgang** - Kun intern electron-app
3. **E-post varsling** - Ikke del av MVP
4. **Avansert rapportering** - Kun grunnleggende visning
5. **Bulk-operasjoner** - Håndterer ett tilbud av gangen
6. **Eksport til PDF/Word** - Ikke prioritert i første versjon

## Design Considerations

### UI/UX Retningslinjer

- **Konsistent design** med eksisterende prosjektdetaljside
- **Ikoner og fargebruk** følger etablert design system
- **Responsive layout** for ulike skjermstørrelser
- **Loading states** under beregninger og lagring
- **Feilhåndtering** med tydelige feilmeldinger
- **Bekreftelsesdialoguer** for kritiske handlinger (sletting, statusendring)

### Komponenter å gjenbruke

- **DetailField** (med ikoner fra eksisterende system)
- **Button, Input, Select** (fra UI-biblioteket)
- **Toast notifications** (for suksess/feil-meldinger)
- **Tabs navigation** (samme struktur som prosjektdetalj)

## Tekniske Considerations

### Database

- **Prisma migrations** for nye tabeller
- **Relasjonelle integritet** mellom Prosjekt → Tilbud → Benefisienter
- **Indeksering** på Prosjekt-ID og Status for rask oppslag
- **Soft delete** for å bevare historikk

### Performance

- **Lazy loading** av tilbudsdata på tab-aktivering
- **Caching** av produktkonfigurasjon
- **Optimistic updates** for rask brukeropplevelse
- **Batch updates** for komplekse beregninger

### Integrasjon

- **Gjenbruk av fetchProsjektData** funksjon
- **Utvidelse av ProsjektDetailPage** med ny tab
- **Samme endringslogg-mønster** som eksisterende hendelser

## Success Metrics

### Funksjonelle målinger

1. **95% av tilbud** opprettes uten feil innen 2 minutter
2. **100% sporbarhet** - alle endringer logges korrekt
3. **Null overskredet ramme** uten forhåndsvarsel
4. **Redusert beregningstid** fra 15 minutter til 3 minutter per tilbud

### Brukervennlighet

1. **Rådgiver-feedback:** "Enklere enn manuelle beregninger"
2. **Ingen trening nødvendig** - intuitiv basert på eksisterende UI
3. **99% uptime** for tilbudsfunksjonalitet

## Utviklingsfaser (Foreslått)

### Fase 1: Grunnleggende struktur (2-3 uker)

- Database schema og migrasjoner
- Grunnleggende UI med tab og ny side
- Produktvalg og enkle beregninger

### Fase 2: Avansert beregning (2 uker)  

- Komplette beregningsformler for alle produkter
- Manuell overstyring av parametere
- Rammeovervåking-komponent

### Fase 3: Benefisienter og status (1-2 uker)

- Benefisient CRUD-operasjoner
- Statusflyt implementasjon
- Endringslogg integrasjon

### Fase 4: Validering og polish (1 uke)

- Feilhåndtering og validering
- Performance optimalisering
- Testing og bug fixes

## Åpne Spørsmål

1. **Historikk ved statusendring:** Skal gamle versjoner av tilbud bevares som separate records, eller kun i endringslogg?

2. **Ramme-periode:** Skal rammeforbruk beregnes per kalenderår, eller rullende 12-månedersperiode?

3. **Benefisient-validering:** Trenger vi validering mot folkeregister/Brønnøysund for benefisienter?

4. **Decimal precision:** Hvor mange desimaler ønskes for rentesatser og premieberegninger?

5. **Concurrent editing:** Hva skjer hvis to rådgivere redigerer samme tilbud samtidig?

6. **Backup/Recovery:** Spesielle krav til sikkerhetskopi av tilbudsdata?

---

**Opprettet:** [Dato]  
**Forfatter:** AI Assistant basert på krav fra produkteier  
**Status:** Utkast - venter på godkjenning
