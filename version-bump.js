#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

// Opprett og sjekk lock-fil for å unngå dobbel versjonsbump
const lockPath = path.join(__dirname, ".version-bump-lock");
if (fs.existsSync(lockPath)) {
  // Sjekk om lock-filen er fra dagens bygg (mindre enn 1 time gammel)
  const stats = fs.statSync(lockPath);
  const lockAge = Date.now() - stats.mtimeMs;
  
  if (lockAge < 3600000) { // 1 time i millisekunder
    console.log("Versjonsbumping allerede utført i denne byggsessionen. Hopper over.");
    process.exit(0);
  }
}

// Les package.json
const packagePath = path.join(__dirname, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

// Parse nåværende versjon
const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split(".").map(Number);

// Øk patch-versjon
const newVersion = `${major}.${minor}.${patch + 1}`;
packageJson.version = newVersion;

// Skriv endringene til package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");

// Opprett lock-fil for å unngå dobbel versjonsbump
fs.writeFileSync(lockPath, new Date().toISOString());

console.log(`Versjon økt fra ${currentVersion} til ${newVersion}`);
