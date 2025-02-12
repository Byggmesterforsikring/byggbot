# CalcPro

CalcPro er et forsikringsberegningsverktøy bygget med Electron og React.

## Forutsetninger

- Node.js (v14 eller høyere)
- npm (følger med Node.js)

## Kom i gang

1. Installer avhengigheter:

```bash
npm install
```

2. Start applikasjonen i utviklingsmodus:

```bash
npm start
```

3. Bygg applikasjonen for produksjon:

```bash
echo "" > ~/Library/Logs/Byggbot/main.log && source .env.production && export GH_TOKEN=$(grep GH_TOKEN .env | cut -d '=' -f2) && NODE_ENV=production npm run build
```

4. For utvikling:

```bash
NODE_ENV=development npm run api #startes i egen terminal
NODE_ENV=development npm run dev-app #startes i egen terminal
```

## Prosjektstruktur

```
calcpro/
├── src/
│   ├── components/
│   │   ├── Auto/
│   │   │   ├── steps/
│   │   │   └── constants/
│   │   └── ProductCard.js
│   ├── assets/
│   └── App.js
├── assets/
│   └── BMF_logo_sort.svg
└── build/
```

## Tilgjengelige Scripts

- `npm start` - Starter applikasjonen i utviklingsmodus
- `npm run build` - Bygger applikasjonen for produksjon

## Funksjoner

- Auto forsikringskalkulator
  - Flere dekningsalternativer
  - Bonusberegning
  - Tilleggsdekninger
  - Sanntids prisberegning

## Lisens

Dette prosjektet er privat og konfidensielt. Alle rettigheter forbeholdt.

## Apple Signing og Notarisering

### Forutsetninger
- Apple Developer konto
- Developer ID Certificate
- API nøkkel fra Apple Developer portal

### Miljøvariabler
Følgende variabler må være definert i `.env` filen:
```env
APPLE_TEAM_ID=<team-id>
APPLE_API_KEY_PATH=auth/AuthKey_<key-id>.p8
APPLE_API_KEY_ID=<key-id>
APPLE_API_ISSUER_ID=<issuer-id>
```

### Notarisering
Når du bygger appen for macOS, vil den automatisk bli sendt til Apple for notarisering. Denne prosessen kan ta fra noen minutter til flere timer. Du kan sjekke status på notariseringen med følgende kommando:

```bash
xcrun notarytool history \
  --key-id "<key-id>" \
  --key "./auth/AuthKey_<key-id>.p8" \
  --team-id "<team-id>" \
  --issuer "<issuer-id>"
```

For å se detaljer om en spesifikk innsending:
```bash
xcrun notarytool info <submission-id> \
  --key-id "<key-id>" \
  --key "./auth/AuthKey_<key-id>.p8" \
  --team-id "<team-id>" \
  --issuer "<issuer-id>"
```

### Verifisering av Signering
For å sjekke om appen er korrekt signert:
```bash
# Grunnleggende verifisering
codesign -vv --deep --strict ./dist/mac-arm64/Byggbot.app

# Detaljert verifisering
codesign --verify --deep --strict --verbose=2 ./dist/mac-arm64/Byggbot.app

# Se all signeringsinformasjon
codesign -dvv ./dist/mac-arm64/Byggbot.app

# Verifiser notarisering og Gatekeeper-godkjenning
spctl --assess --verbose=2 --type execute ./dist/mac-arm64/Byggbot.app
```

### Feilsøking
- Hvis notariseringen tar lang tid, kan du fortsette å sjekke status med `notarytool history`
- Status "In Progress" betyr at Apple fortsatt prosesserer innsendingen
- Status "Accepted" betyr at notariseringen er vellykket
- Hvis bygget feiler med timeout, sjekk status manuelt med kommandoene over

### Viktige Merknader
- Hver build må signeres og notariseres på nytt
- Notarisering er kun nødvendig for distribusjon utenfor Mac App Store
- Oppbevar API-nøkler og sertifikater på et sikkert sted
- Ikke del .env filen eller API-nøkler i versjonskontroll
