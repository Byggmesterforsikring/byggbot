#!/usr/bin/env node

/**
 * Dette scriptet håndterer Windows-bygging på macOS plattform
 * ved å midlertidig modifisere byggkonfigurasjonen for å unngå Wine-problemer.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const packageJson = require('../package.json');

// Sjekk om vi kjører på macOS
const isMacOS = process.platform === 'darwin';

if (!isMacOS) {
  console.log('Dette scriptet er designet for å bygge Windows-applikasjonen på macOS.');
  console.log('Siden du kjører på Windows, bruk npm run build-win direkte i stedet.');
  process.exit(0);
}

console.log('Bygger Windows applikasjon på macOS...');
console.log('Denne prosessen vil skape en fungerende Windows-pakke, men uten innebygd versjonsinformasjon.');

// Kjør byggkommandoen med spesielle flagg for å unngå rcedit-problemer
try {
  console.log('Kjører electron-builder for Windows med spesielle flagg for macOS...');
  
  // Bruk ELECTRON_BUILDER_NO_RCEDIT miljøvariabel og fjern versjonsparsing
  execSync('ELECTRON_BUILDER_NO_RCEDIT=true CSC_IDENTITY_AUTO_DISCOVERY=false WINEDEBUG=-all NODE_ENV=production electron-builder --win --publish always', {
    stdio: 'inherit'
  });
  
  console.log('Windows-bygging fullført!');
  console.log('Merk: Versjonsinformasjon er ikke innebygd i .exe filen, men funksjonaliteten er intakt.');
  console.log('For produktsjonsutgivelse med versjonsinformasjon, bygg på en Windows-maskin eller GitHub Actions.');
  
} catch (error) {
  console.error('Feil under Windows-bygging:', error.message);
  process.exit(1);
}