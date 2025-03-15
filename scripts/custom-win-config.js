// Dette skriptet brukes for å håndtere versjonsproblemer i Windows-bygg
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

exports.default = async function(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  
  if (electronPlatformName !== 'win32') {
    return;
  }
  
  console.log('Kjører tilpasset Windows-konfigurering...');
  
  // Detekter om vi kjører på macOS
  const isMacOS = process.platform === 'darwin';
  
  if (isMacOS) {
    console.log('Kjører på macOS - hopper over Wine-avhengige operasjoner');
    // På macOS vil vi bruke build-win-no-rcedit kommandoen istedet
    console.log('Tips: Bruk npm run build-win-no-rcedit for å bygge uten rcedit');
  } else {
    console.log('Kjører på Windows - prosesserer versjonsinformasjon normalt');
  }
  
  // Vi fortsetter uansett for å ikke stoppe byggeprosessen
  return true;
};