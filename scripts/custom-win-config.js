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
  
  // Vi bare hopper over versjonssettingen siden den ser ut til å forårsake problemer med Wine
  console.log('Hopper over filversjonssetting for Windows på macOS...');
  
  try {
    // Lag en .electron-builder-skip-rcedit fil for å fortelle electron-builder å hoppe over versjonsstegene
    const skipFilePath = path.join(appOutDir, '.electron-builder-skip-rcedit');
    fs.writeFileSync(skipFilePath, 'Skip rcedit operations on macOS');
    console.log(`Opprettet fil for å hoppe over versjonssetting: ${skipFilePath}`);
    
    return true;
  } catch (err) {
    console.error('Feil ved oppretting av skip-fil:', err);
    // Ikke la feilen stoppe byggprosessen
    return true;
  }
};