# Byggbot

Byggbot er et forsikringsberegningsverktøy bygget med Electron og React.

## Forutsetninger

- Node.js (v18 eller høyere)
- npm (følger med Node.js)
- Docker (for Prisma skyggedatabase under utvikling)
- Wine (for Windows-bygging på macOS-maskiner)

## Innholdsfortegnelse

- [Kom i gang](#kom-i-gang)
- [Prosjektstruktur](#prosjektstruktur)
- [Utviklings- og Deployeringsflyt](#utviklings--og-deployeringsflyt)
  - [Utviklingsmiljø (Lokal flyt)](#utviklingsmiljø-lokal-flyt)
  - [Bygging for Produksjon](#bygging-for-produksjon)
  - [Deployering til Produksjon/Staging](#deployering-til-produksjonstaging)
    - [Database-migrering](#database-migrering)
    - [Applikasjonsoppdatering](#applikasjonsoppdatering)
  - [Første Gangs Oppsett av en Ny Database](#første-gangs-oppsett-av-en-ny-database)
- [Tilgjengelige Scripts](#tilgjengelige-scripts)
- [Signering og Pakking](#signering-og-pakking)
- [Viktig Lærdom og Beste Praksis](#viktig-lærdom-og-beste-praksis)
- [Funksjoner](#funksjoner)
- [Lisens](#lisens)

## Kom i gang

1. **Installer avhengigheter:**

    ```bash
    npm install
    ```

2. **Konfigurer miljøvariabler:**
    - Kopier `.env.example` til `.env` og fyll ut nødvendige verdier for ditt lokale utviklingsmiljø.
        - `DATABASE_URL`: Peker til din lokale utviklingsdatabase.
        - `SHADOW_DATABASE_URL`: Peker til en skyggedatabase som Prisma bruker under utvikling for å generere migreringer. Denne kan også være en lokal database, gjerne administrert via Docker. Se [Prisma docs om shadow database](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/shadow-database) for detaljer.
    - Kopier `.env.example` til `.env.production` og fyll ut verdier for produksjonsmiljøet (eller tilsvarende for staging, f.eks. `.env.staging`). Disse filene brukes av `dotenv-cli` for spesifikke kommandoer, men for faktiske serverdeploys bør miljøvariabler settes direkte på serveren/plattformen.
        - **VIKTIG:** Ikke commit faktiske `.env.*`-filer med sensitive produksjonshemmeligheter til Git. Bruk dem lokalt og administrer produksjonsvariabler sikkert i deploymiljøet.

3. **Start applikasjonen i utviklingsmodus:**

    ```bash
    npm run dev
    ```

    Dette starter Webpack dev-server for React-appen og Electron-applikasjonen.

## Prosjektstruktur

(Oversikt over viktige mapper og filer)

```
byggbot/
├── prisma/                 # Prisma schema, migreringer og seed-script
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.js
├── public/                 # Statiske filer for React-appen (index.html, etc.)
├── scripts/                # Diverse bygg- og hjelpeskript
├── src/                    # Kildekoden
│   ├── components/         # React-komponenter
│   ├── electron/           # Electron main-prosess kode, preload scripts, tjenester
│   │   ├── api-handlers/
│   │   ├── services/
│   │   └── main.js
│   ├── assets/             # Bilder, fonter etc. brukt av React-appen
│   ├── styles/             # Globale stiler
│   ├── utils/              # Hjelpefunksjoner
│   ├── App.js              # Hoved React app-komponent
│   └── index.js            # Inngangspunkt for React-appen (renderer)
├── .env.example            # Eksempelfil for miljøvariabler
├── .env                    # Lokale utviklingsmiljøvariabler (IKKE commit hvis sensitiv)
├── .env.production         # Produksjonsmiljøvariabler for lokale skript (IKKE commit hvis sensitiv)
├── package.json
└── README.md
```

## Utviklings- og Deployeringsflyt

Denne seksjonen beskriver den typiske arbeidsflyten fra lokal utvikling til produksjonssetting.

### Utviklingsmiljø (Lokal flyt)

1. **Start applikasjonen:**

    ```bash
    npm run dev
    ```

    Dette gir deg hot-reloading for React-appen og starter Electron.

2. **Databaseendringer (Prisma):**
    Når du trenger å gjøre endringer i databasemodellene:
    - Modifiser `prisma/schema.prisma`.
    - Generer og kjør en ny migrering mot din lokale utviklingsdatabase:

        ```bash
        npx prisma migrate dev --name en-beskrivende-navn-paa-endringen
        ```

        - Denne kommandoen bruker `DATABASE_URL` og `SHADOW_DATABASE_URL` fra din `.env`-fil. Skyggedatabasen brukes for å trygt generere migrerings-SQL. Det anbefales å bruke Docker for skyggedatabasen for å sikre et rent miljø.
        - En ny migreringsfil blir opprettet i `prisma/migrations/TIMESTAMP_navn-paa-endring/`.
        - Prisma Client (`prisma/generated/client`) blir automatisk oppdatert.
    - **Commit `prisma/schema.prisma` og hele `prisma/migrations`-mappen til Git.** Disse filene definerer databasens historikk og er nødvendige for å oppdatere andre miljøer.

3. **Seeding av utviklingsdatabase (ved behov):**
    Hvis du har endret seed-data eller satt opp en ny utviklingsdatabase, kan du kjøre seed-scriptet:

    ```bash
    npx prisma db seed
    ```

    Dette kjører `node prisma/seed.js` (som definert i `package.json`).

### Bygging for Produksjon

#### Lokal Bygging

- Den normale kommandoen for å bygge applikasjonen for både macOS og Windows er:

    ```bash
    npm run build
    ```

    Dette skriptet inkluderer `npx prisma generate` for å sikre at den nyeste Prisma Client er en del av bygget.
- For plattformspesifikke bygg, bruk:
  - `npm run build-mac` - Bygger for macOS (krever macOS)
  - `npm run build-win` - Bygger for Windows (krever Wine på macOS, eller Windows)

**Merk:** Windows-bygging på macOS med Wine har begrensninger, spesielt for code signing med Azure Key Vault som krever ekte Windows-miljø.

#### GitHub Actions (Automatisk CI/CD)

For Windows-bygging bruker vi GitHub Actions som bygger på en ekte Windows-maskin. Dette sikrer ordentlig code signing med Azure Key Vault.

**Automatisk trigger:**
- Workflow trigges automatisk ved push til `main` eller `master` branch
- Se `.github/workflows/build-windows.yml` for konfigurasjon

**Manuell trigger:**
1. Gå til GitHub repository → Actions tab
2. Velg "Build Windows Release"
3. Klikk "Run workflow"

**Spare bygg-minutter:**

GitHub Actions forbruker bygg-minutter (Windows-runner bruker 2x faktor). For å unngå unødvendige bygg:

1. **Bruk `[skip ci]` i commit-melding:**
   ```bash
   git commit -m "Oppdater dokumentasjon [skip ci]"
   ```

   Eller: `[ci skip]`, `[no ci]`, `[skip actions]`

2. **Push til en annen branch først:**
   ```bash
   git push origin feature-branch  # Trigger ikke workflow
   # Test/review først, deretter merge til main
   ```

3. **Batch flere commits:**
   - Samle flere commits lokalt før du pusher til main
   - Hver push = ett bygg, så færre pushes = færre bygg

**Overvåke forbruk:**
- Se brukte minutter: `https://github.com/settings/billing`

### Deployering til Produksjon/Staging

Dette antar at du har en eksisterende database for miljøet ditt. Hvis det er første gang du setter opp databasen, se [Første Gangs Oppsett av en Ny Database](#første-gangs-oppsett-av-en-ny-database).

#### Database-migrering

Når du har nye, commitede migreringsfiler fra utvikling som skal applikeres på produksjons- eller staging-databasen:

1. **Sørg for korrekt `DATABASE_URL`:**
    - For **faktiske serverdeploys (CI/CD, etc.)**: `DATABASE_URL` (og andre hemmeligheter) bør være satt som miljøvariabler direkte på serveren/plattformen. Ikke deploy `.env.production`-filen med ekte hemmeligheter til serveren.
    - For **manuell kjøring lokalt mot prod/staging**: Sørg for at din lokale `.env.production` (eller f.eks. `.env.staging`) fil har korrekt `DATABASE_URL`.

2. **Kjør migreringskommandoen:**

    ```bash
    # Anbefalt måte via npm script (bruker .env.production)
    npm run db:migrate:prod 
    ```

    Eller direkte (hvis du f.eks. har en `.env.staging`):

    ```bash
    # npx dotenv-cli -e .env.staging -- npx prisma migrate deploy
    ```

    Denne kommandoen (`npx prisma migrate deploy`) vil:
    - Sjekke `_prisma_migrations`-tabellen i måldatabasen.
    - Kjøre alle ventende migreringsfiler fra `prisma/migrations`-mappen i rekkefølge.
    - **Viktig:** Den vil *ikke* slette data og vil *ikke* generere nye migreringer basert på `schema.prisma`. Den kun anvender eksisterende, commitede migreringsfiler.

#### Applikasjonsoppdatering

Etter at databasen er migrert (hvis nødvendig), deployer du den nybygde applikasjonen (fra `dist/`-mappen) til dine brukere eller servere.

### Første Gangs Oppsett av en Ny Database

For å initialisere eller fullstendig tilbakestille en database (f.eks. for et helt nytt produksjons- eller staging-miljø) til en ren tilstand basert på alle gjeldende Prisma-migreringer, og deretter kjøre seed-scriptet:

1. Sørg for at `DATABASE_URL` i din `.env.production` (eller tilsvarende for miljøet) peker til den nye, tomme databasen.
2. Kjør følgende kommando:

    **ADVARSEL:** Denne kommandoen vil slette all eksisterende data i databasen som spesifiseres!

    ```bash
    npx dotenv-cli -e .env.production -- npx prisma migrate reset
    ```

    Dette vil:
    - Nullstille databasen.
    - Kjøre alle migreringer fra `prisma/migrations`.
    - Kjøre seed-scriptet (`prisma/seed.js`).

## Tilgjengelige Scripts

(Her kan du liste opp de viktigste skriptene igjen, eller referere til `package.json`)

- `npm run dev`: Starter utviklingsmiljø.
- `npm run build`: Bygger app for produksjon (macOS & Windows).
- `npm run build-mac`: Bygger kun for macOS.
- `npm run build-win`: Bygger kun for Windows.
- `npm run clean`: Renser `build/` og `dist/` mappene.
- `npm run db:migrate:prod`: Kjører produksjonsmigreringer (bruker `.env.production`).
- `npm run db:seed:prod`: Kjører produksjonsseed (bruker `.env.production`).
- `npx prisma migrate dev --name <navn>`: Genererer ny utviklingsmigrering.
- `npx prisma db seed`: Kjører seed for utviklingsmiljø (bruker `.env`).
- `npm test`: (Hvis du legger til tester)
- `npm run lint`: (Hvis du legger til linter)

## Signering og Pakking

### macOS Code Signing

macOS-signering håndteres automatisk av `electron-builder` ved bygging:
- Bruker Apple Developer credentials (se `.env` for `APPLE_ID`, `APPLE_TEAM_ID`, etc.)
- Notarization kjøres via `scripts/notarize.js` (krever Apple API nøkkel)
- Konfigurert i `package.json` under `build.mac` og `build.afterSign`

### Windows Code Signing

Windows code signing krever spesielle hensyn på grunn av Azure Key Vault:

**Lokal bygging (macOS/Linux):**
- `npm run build-win` fungerer, men **kan ikke signere** ordentlig
- Wine kan ikke autentisere mot Azure Key Vault
- Resultat: Usignerte `.exe`-filer

**GitHub Actions (anbefalt):**
- Automatisk Windows-bygging på ekte Windows-runner
- Autentiserer mot Azure Key Vault for code signing
- Konfigurasjon: `.github/workflows/build-windows.yml`
- Setup: Se `.github/SETUP_SECRETS.md` for påkrevde GitHub Secrets

**Verifisere signatur:**

macOS:
```bash
# Installer osslsigncode
brew install osslsigncode

# Verifiser Windows .exe
osslsigncode verify dist/Byggbot-Setup-*.exe
```

Windows (PowerShell):
```powershell
Get-AuthenticodeSignature -FilePath "dist\Byggbot-Setup-*.exe"
```

## Viktig Lærdom og Beste Praksis

Under utviklingen av denne applikasjonen har vi lært flere viktige ting, spesielt rundt pakking av Electron-applikasjoner og håndtering av avhengigheter som Prisma:

1. **Electron `asar` Pakking og `asarUnpack`:**
    - Electron pakker applikasjonskoden inn i et `app.asar`-arkiv. Noen Node.js-moduler, spesielt de med native C++ tillegg (som noen database-drivere eller Prisma's query engine) eller de som trenger å lese filer relativt til sin egen plassering, fungerer ikke korrekt fra innsiden av et `asar`-arkiv.
    - **Løsning:** Bruk `build.asarUnpack` i `package.json` for å spesifisere mapper eller filer som må pakkes ut til en `app.asar.unpacked`-mappe ved siden av arkivet.
    - **Eksempler fra dette prosjektet:**
        - `node_modules/@prisma/client/**/*` (og mer spesifikke filer som `default.js`, `index.js`, `runtime/**/*`)
        - `node_modules/.prisma/**/*` (hvor Prisma's native query engine havner som standard)
        - `prisma/**/*` (hvis du, som vi gjorde, konfigurerer Prisma Client til å genereres inn i `prisma/generated/client`)
        - Pakker som `@azure/identity/**/*` og `@azure/core-auth/**/*` kan også trenge dette.

2. **`dependencies` vs. `devDependencies`:**
    - Moduler som er nødvendige for at applikasjonen skal kjøre i produksjon (f.eks. `@azure/identity`, `@prisma/client`) *må* være listet under `dependencies` i `package.json`.
    - `devDependencies` blir vanligvis ikke inkludert av `electron-builder` i produksjonsbygget.

3. **Prisma Client Konfigurasjon for Electron:**
    - **Output Path:** Standard output for Prisma Client (`node_modules/.prisma/client`) kan være problematisk med `asar`. Det er mer robust å endre output-stien i `prisma/schema.prisma` til en mappe du kontrollerer og som du enkelt kan inkludere i `asarUnpack`, f.eks.:

        ```prisma
        generator client {
          provider = "prisma-client-js"
          output   = "../prisma/generated/client" // Relativt til schema.prisma
        }
        ```

    - **Importer:** All applikasjonskode må da oppdateres til å importere Prisma Client fra denne nye plasseringen.
    - **Webpack `externals` (for Renderer-prosessen):** Hvis du bruker Webpack for renderer-koden (som er vanlig i React+Electron-prosjekter), må du markere Prisma Client (både den originale `@prisma/client` og din egendefinerte genererte klient) som "external". Dette hindrer Webpack i å prøve å bundle den, noe som kan ødelegge dens evne til å finne native filer.
        Eksempel i `webpack.config.js`:

        ```javascript
        externals: {
          '@prisma/client': 'commonjs @prisma/client',
          // Hvis din genererte klient importeres annerledes:
          // '../prisma/generated/client': 'commonjs ../prisma/generated/client'
        }
        ```

4. **Miljøspesifikke `.env`-filer for CLI-kommandoer:**
    - Prisma CLI (`npx prisma ...`) laster som standard kun fra en `.env`-fil. For å bruke andre filer som `.env.production` for spesifikke kommandoer (som `migrate deploy` eller `db seed` mot et produksjonsmiljø), bruk `dotenv-cli`.
    - Installer: `npm install dotenv-cli --save-dev`
    - Bruk i `package.json` scripts: ` "db:migrate:prod": "npx dotenv-cli -e .env.production -- npx prisma migrate deploy" `
    - **Viktig:** For faktiske server-deploys, bør miljøvariabler settes direkte på serveren/plattformen, ikke via `.env`-filer i kildekoden.

Ved å følge disse prinsippene kan man unngå mange vanlige og tidkrevende pakkings- og kjøretidsfeil i Electron-prosjekter som bruker verktøy som Prisma og Azure SDK-er.

## Funksjoner

(Dette avsnittet kan beholdes som det er)
... (eksisterende innhold om funksjoner) ...

## Lisens

(Dette avsnittet kan beholdes som det er)
... (eksisterende innhold om lisens) ...
