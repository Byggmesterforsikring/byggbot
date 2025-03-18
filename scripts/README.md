# Byggbot Scripts

Denne mappen inneholder forskjellige nytteskript for Byggbot-applikasjonen.

> **Merk:** Disse skriptene pakkes ikke med i Electron-appen ved bygging. De er kun ment for å brukes av utviklere og systemadministratorer.

## Skript for databasehåndtering

### cleanup-dashboard-data.js

Dette skriptet brukes for å slette eldre dashboard-statistikk fra databasen.

#### Bruk

```bash
# Sletter records eldre enn den spesifiserte datoen
npm run cleanup-dashboard 2025-03-18

# Sletter records eldre enn dagens dato (standard)
npm run cleanup-dashboard
```

#### Funksjonalitet

Skriptet:
1. Validerer datoen som ble angitt (eller bruker dagens dato)
2. Kobler til databasen
3. Viser oversikt over:
   - Hvilken dato som brukes for filtrering
   - Totalt antall records i databasen før sletting
   - Antall records som vil bli slettet
4. Sletter alle dashboard-statistikk-records eldre enn den angitte datoen
5. Viser antall gjenværende records og en oversikt over dem

#### Avhengigheter

- Skriptet bruker `pg`-biblioteket for PostgreSQL-tilkobling
- Databasekonfigurasjonen hentes fra applikasjonens normale DB-config

## Andre nytteskript

### test-db-connection.js

Tester tilkoblingen til databasen som er konfigurert i applikasjonen.

```bash
npm run test-db
```

### test-azure-connection.js

Tester tilkoblingen til Azure-tjenester.

```bash
npm run test-azure
```