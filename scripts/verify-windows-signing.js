/**
 * Verifiserer digital signatur på Windows build
 * Dette scriptet må kjøres på Windows-maskinen
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function verifySignature() {
  try {
    console.log('Validerer Windows signatur på installasjonsfilene...');
    
    // Finn nyeste versjon i dist-mappen
    const distPath = path.resolve(__dirname, '../dist');
    const exeFiles = fs.readdirSync(distPath)
      .filter(file => file.endsWith('.exe') && !file.includes('__uninstaller'))
      .sort((a, b) => {
        return fs.statSync(path.join(distPath, b)).mtime.getTime() - 
               fs.statSync(path.join(distPath, a)).mtime.getTime();
      });
    
    if (exeFiles.length === 0) {
      console.error('Ingen .exe filer funnet i dist mappen');
      return;
    }
    
    const latestExe = exeFiles[0];
    const exePath = path.join(distPath, latestExe);
    
    console.log(`Validerer signatur på: ${latestExe}`);
    
    // Kjør PowerShell kommando for å sjekke signatur
    const signatureInfo = execSync(`powershell -command "Get-AuthenticodeSignature \\"${exePath}\\" | Format-List"`, { encoding: 'utf8' });
    console.log('Signatur detaljer:');
    console.log(signatureInfo);
    
    // Sjekk sertifikatdetaljer
    const certDetails = execSync(`powershell -command "(Get-AuthenticodeSignature \\"${exePath}\\").SignerCertificate | Format-List Subject,Issuer,NotBefore,NotAfter"`, { encoding: 'utf8' });
    console.log('Sertifikat detaljer:');
    console.log(certDetails);
    
    // EV-sertifikat validering
    if (certDetails.includes('GlobalSign') && certDetails.includes('Byggmesterforsikring')) {
      console.log('✅ Dette ser ut til å være et gyldig EV-sertifikat fra GlobalSign');
    }
    
    // Enkel validering
    if (signatureInfo.includes('Valid') && signatureInfo.includes('Byggmesterforsikring')) {
      console.log('✅ Signaturen er gyldig og fra riktig organisasjon!');
    } else {
      console.log('❌ Problemer med signaturen. Se detaljer ovenfor.');
    }
  } catch (error) {
    console.error('Feil ved validering av signatur:', error);
  }
}

// Kjør valideringen hvis vi er på Windows
if (process.platform === 'win32') {
  verifySignature();
} else {
  console.error('Dette scriptet må kjøres på en Windows-maskin for å validere signaturen.');
  console.error('Kopier prosjektet til Windows og kjør: node scripts/verify-windows-signing.js');
}