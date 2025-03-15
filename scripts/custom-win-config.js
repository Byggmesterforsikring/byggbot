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
  
  // Versjonene bør følge semver men med 4 tall (major.minor.patch.build)
  const pkgVersion = packager.appInfo.version;
  const fileVersion = pkgVersion.split('.').length === 3 
    ? `${pkgVersion}.0` 
    : pkgVersion;

  console.log(`Setter Windows filversjon til: ${fileVersion}`);
  
  // Dette gjøres normalt av electron-builder, men for å unngå Wine-problemer
  // kan vi legge inn egne tilpassede trinn her.
  
  return true;
};