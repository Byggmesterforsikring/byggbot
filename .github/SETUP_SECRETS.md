# Oppsett av GitHub Secrets for Windows Code Signing

For at GitHub Actions skal kunne signere Windows-bygget med Azure Key Vault, må du sette opp følgende secrets i GitHub repository.

## Steg 1: Gå til GitHub Repository Settings

1. Gå til: https://github.com/Byggmesterforsikring/byggbot/settings/secrets/actions
2. Klikk på "New repository secret" for hver av secrets nedenfor

## Steg 2: Legg til følgende secrets

**VIKTIG:** Finn verdiene i prosjektets **`.env.production`-fil** (IKKE `.env`). Produksjonsbygget bruker andre Azure credentials enn dev!

### AZURE_KEY_VAULT_NAME
- **Navn:** `AZURE_KEY_VAULT_NAME`
- **Verdi:** Se `AZURE_KEY_VAULT_NAME` i `.env.production` (linje 33)

### AZURE_KEY_VAULT_CERT
- **Navn:** `AZURE_KEY_VAULT_CERT`
- **Verdi:** Se `AZURE_KEY_VAULT_CERT` i `.env.production` (linje 34)

### AZURE_KEY_VAULT_CERT_ID
- **Navn:** `AZURE_KEY_VAULT_CERT_ID`
- **Verdi:** Se `AZURE_KEY_VAULT_CERT_ID` i `.env.production` (linje 35)

### AZURE_CLIENT_ID
- **Navn:** `AZURE_CLIENT_ID`
- **Verdi:** Se `AZURE_CLIENT_ID` i `.env.production` (linje 36)

### AZURE_CLIENT_SECRET
- **Navn:** `AZURE_CLIENT_SECRET`
- **Verdi:** Se `AZURE_CLIENT_SECRET` i `.env.production` (linje 37)

### AZURE_TENANT_ID
- **Navn:** `AZURE_TENANT_ID`
- **Verdi:** Se `AZURE_TENANT_ID` i `.env.production` (linje 38)

### REACT_APP_AZURE_CLIENT_ID
- **Navn:** `REACT_APP_AZURE_CLIENT_ID`
- **Verdi:** Se `REACT_APP_AZURE_CLIENT_ID` i `.env.production` (linje 14)

### REACT_APP_AZURE_TENANT_ID
- **Navn:** `REACT_APP_AZURE_TENANT_ID`
- **Verdi:** Se `REACT_APP_AZURE_TENANT_ID` i `.env.production` (linje 15)

## Steg 3: Verifiser oppsett

Etter at alle secrets er lagt til:

1. Gå til "Actions" tab i GitHub repository
2. Kjør workflowen manuelt ved å velge "Build Windows Release" og klikke "Run workflow"
3. Eller push en commit til main/master branch for å trigge automatisk

## Steg 4: Sjekk resultat

Når workflowen er ferdig:

1. Sjekk at alle steg er grønne
2. Se etter "Verify Windows signing" steget - dette skal vise signatur-informasjon
3. Last ned artifacts fra "Summary" siden og test installeren

## Sikkerhet

**VIKTIG:** Disse credentials gir tilgang til code signing sertifikatet. Pass på at:
- Repository er private eller secrets er godt beskyttet
- Kun trusted contributors har tilgang
- Revurder tilganger regelmessig

## Feilsøking

Hvis signering feiler, sjekk:

1. **Azure permissions:** At service principal har tilgang til sertifikatet i Key Vault
2. **Certificate validity:** At sertifikatet ikke er utløpt
3. **Workflow logs:** For spesifikke feilmeldinger fra signtool.exe
