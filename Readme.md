# Byggbot

Byggbot er et forsikringsberegningsverktøy bygget med Electron og React.

## Forutsetninger

- Node.js (v18 eller høyere)
- npm (følger med Node.js)
- Wine - for Windows-bygging på macOS maskiner

## Kom i gang

1. Installer avhengigheter:

```bash
npm install
```

2. Start applikasjonen i utviklingsmodus:

```bash
npm run dev
```

3. Bygg applikasjonen for produksjon:

```bash
echo "" > ~/Library/Logs/Byggbot/main.log && source .env.production && npm run build
```

## Byggealternativer

- `npm run build` - Bygger applikasjonen for både macOS og Windows
- `npm run build-mac` - Bygger kun macOS-versjonen
- `npm run build-win` - Bygger kun Windows-versjonen (med tilpassede flagg for macOS/Wine)

## Prosjektstruktur

```
byggbot/
├── src/
│   ├── components/
│   │   ├── Auto/
│   │   ├── AiChat/
│   │   ├── Reports/
│   │   ├── Dashboard/
│   │   └── DrawingRules/
│   ├── electron/
│   │   ├── ipc/
│   │   ├── services/
│   │   └── main.js
│   ├── assets/
│   └── App.js
├── assets/
│   ├── BMF_logo_sort.svg
│   └── icons/
│       ├── byggbot.png
│       ├── byggbot@3x.icns
│       └── byggbot@3x.ico
└── scripts/
    ├── notarize.js
    ├── azure-signing.js
    └── cleanup-dashboard-data.js
```

## Tilgjengelige Scripts

- `npm run dev` - Starter applikasjonen i utviklingsmodus (webpack + electron)
- `npm run start` - Starter den bygget applikasjonen
- `npm run build` - Bygger applikasjonen for både macOS og Windows
- `npm run build-mac` - Bygger kun macOS-versjonen
- `npm run build-win` - Bygger kun Windows-versjonen
- `npm run clean` - Renser build- og dist-mapper
- `npm run webpack-build` - Kjører kun webpack bygg av frontend
- `npm run test-db` - Tester databasetilkobling
- `npm run test-azure` - Tester Azure-tilkobling

## Funksjoner

- Auto forsikringskalkulator
  - Flere dekningsalternativer
  - Bonusberegning
  - Tilleggsdekninger
  - Flåtekalkulator

- Dashboard
  - Statistikk over salg og skader
  - Trendanalyse
  - Historiske data

- Rapportgenerator
  - Skaderapporter
  - Garantirapporter
  - Nysalgsrapporter

- AI Chat
  - Dokumentanalyse
  - Filvedlegg-støtte
  - Kontekstuell forståelse

- Tegningsregler
  - Interaktiv editor
  - Versjonskontroll
  - Eksport av regler

## Lisens

Dette prosjektet er privat og konfidensielt. Alle rettigheter forbeholdt.

## Signering og Pakking

### macOS Signering og Notarisering

#### Forutsetninger
- Apple Developer konto
- Developer ID Certificate
- API nøkkel fra Apple Developer portal

#### Miljøvariabler
Følgende variabler må være definert i `.env.production` filen:
```env
APPLE_TEAM_ID=<team-id>
APPLE_API_KEY_PATH=certs/auth/AuthKey_<key-id>.p8
APPLE_API_KEY_ID=<key-id>
APPLE_API_ISSUER_ID=<issuer-id>
```

#### Notarisering
Når du bygger appen for macOS, vil den automatisk bli sendt til Apple for notarisering. Denne prosessen kan ta fra noen minutter til flere timer. Du kan sjekke status med:

```bash
xcrun notarytool history \
  --key-id "<key-id>" \
  --key "certs/auth/AuthKey_<key-id>.p8" \
  --team-id "<team-id>" \
  --issuer "<issuer-id>"
```

#### Verifisering av Signering
```bash
npm run verify-mac-signing
```

### Windows Signering med Azure Key Vault

#### Forutsetninger
- Azure konto med Key Vault opprettet
- Code Signing Certificate lastet opp til Key Vault

#### Miljøvariabler
Følgende variabler må være definert i `.env.production` filen:
```env
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
AZURE_TENANT_ID=<tenant-id>
AZURE_KEY_VAULT_NAME=<vault-name>
AZURE_KEY_VAULT_CERT=<cert-name>
AZURE_KEY_VAULT_CERT_ID=<cert-url>
```

#### Teste Azure Key Vault Tilkobling
```bash
npm run test-azure
```

### Feilsøking av Bygg-problemer

#### macOS-spesifikke problemer
- Hvis signering feiler, sjekk at sertifikatet er gyldig i Keychain Access
- For Wine-relaterte problemer ved Windows-bygging på macOS, bruk `npm run build-win` kommandoen som setter nødvendige flagg
- Ved ELECTRON_BUILDER_NO_RCEDIT-feil, sjekk at Wine er installert og fungerer

#### Windows-spesifikke problemer
- Hvis ikonet ikke vises riktig, sjekk at PNG-filen `assets/icons/byggbot.png` eksisterer
- Ved Azure Key Vault feil, verifiser at alle miljøvariabler er riktig satt
- Loggfiler for byggeprosessen finnes i `~/Library/Logs/Byggbot/`

### Viktige Merknader
- Hver build må signeres og notariseres på nytt
- macOS-oppdateringer kan påvirke Wine-funksjonalitet og kreve reinstallasjon
- Oppbevar API-nøkler og sertifikater på et sikkert sted
- Ikke del .env filen eller API-nøkler i versjonskontroll
