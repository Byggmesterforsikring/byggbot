#!/usr/bin/env node

const readline = require('readline');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function getCurrentVersion() {
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return packageJson.version;
    } catch (error) {
        console.error('Feil ved lesing av package.json:', error.message);
        return null;
    }
}

function calculateNextVersions(currentVersion) {
    if (!currentVersion || !/^\d+\.\d+\.\d+$/.test(currentVersion)) {
        // Hvis versjonen ikke er i forventet format, returner placeholdere
        console.warn(`Ugyldig nåværende versjonsformat: ${currentVersion}. Kan ikke kalkulere neste versjoner nøyaktig.`);
        return { major: 'X.Y.Z', minor: 'X.Y.Z', patch: 'X.Y.Z' };
    }
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    return {
        major: `${major + 1}.0.0`,
        minor: `${major}.${minor + 1}.0`,
        patch: `${major}.${minor}.${patch + 1}`
    };
}

function preNpmVersionChecks(callback) {
    exec('git rev-parse --is-inside-work-tree', { encoding: 'utf8' }, (errGitRepo, stdoutGitRepo) => {
        const isGitRepo = !errGitRepo && stdoutGitRepo.trim() === 'true';

        if (isGitRepo) {
            exec('git status --porcelain', { encoding: 'utf8' }, (errGitStatus, stdoutGitStatus) => {
                if (errGitStatus) {
                    console.error('\nFeil ved sjekking av Git-status:', errGitStatus.message);
                    callback(false, isGitRepo, 'Git status check failed');
                    return;
                }
                if (stdoutGitStatus.trim() !== '') {
                    console.error('\nFEIL: Du har ustagede eller ucommitede endringer i ditt Git-repository.');
                    console.error('Commit eller stash endringene dine før du øker versjonen.');
                    console.error('Kommandoen "npm version" krever et rent arbeidsområde for å lage en versjonscommit og tag.');
                    callback(false, isGitRepo, 'Git working directory not clean');
                    return;
                }
                callback(true, isGitRepo); // Git repo is clean
            });
        } else {
            // Ikke et Git-repo, eller `git` kommandoen er ikke tilgjengelig.
            // Dette er ikke en kritisk feil for `npm version` (som fortsatt vil oppdatere package.json),
            // men brukeren bør informeres.
            console.warn('\nAdvarsel: Ikke i et Git-repository (eller git-kommandoen feilet).');
            console.warn('"npm version" vil kun oppdatere package.json (og evt. lock-fil) lokalt, uten å lage en Git commit/tag.');
            callback(true, false); // Not a Git repo (or git check failed), proceed
        }
    });
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const currentVersion = getCurrentVersion();
if (currentVersion === null) {
    console.error("Kunne ikke hente nåværende versjon fra package.json. Avslutter.");
    rl.close();
    process.exit(1);
}

const nextVersions = calculateNextVersions(currentVersion);

console.log(`\nNåværende versjon: ${currentVersion}`);
console.log('--------------------------------------------------------------------------');
console.log('Velg type versjonsøkning for bygget:');
console.log(`  1. Major (f.eks. ${currentVersion} -> ${nextVersions.major}) - For store endringer, ofte med brudd i API.`);
console.log(`  2. Minor (f.eks. ${currentVersion} -> ${nextVersions.minor}) - For ny funksjonalitet, bakoverkompatibel.`);
console.log(`  3. Patch (f.eks. ${currentVersion} -> ${nextVersions.patch}) - For feilrettinger, bakoverkompatibel.`);
console.log(`  4. Ingen (fortsett bygging med nåværende versjon ${currentVersion})`);
console.log('--------------------------------------------------------------------------');

rl.question('Ditt valg (1-4): ', (answer) => {
    let versionType = '';
    let performBump = true;

    switch (answer.trim()) {
        case '1':
            versionType = 'major';
            break;
        case '2':
            versionType = 'minor';
            break;
        case '3':
            versionType = 'patch';
            break;
        case '4':
            console.log(`\nIngen versjonsøkning valgt. Bygg fortsetter med versjon ${currentVersion}.`);
            performBump = false;
            rl.close();
            process.exit(0); // Exit successfully, continue build
            return;
        default:
            console.error('\nUgyldig valg. Versjonsøkning og bygging avbrutt.');
            performBump = false;
            rl.close();
            process.exit(1); // Exit with error, stop build
            return;
    }

    if (performBump && versionType) {
        preNpmVersionChecks((canProceed, isGitRepoContext, errorReason) => {
            if (!canProceed) {
                // Error messages already printed by preNpmVersionChecks or this block
                if (errorReason === 'Git working directory not clean') {
                    // Message already printed
                } else if (errorReason) {
                    console.error(`\nForhåndssjekk for "npm version" feilet: ${errorReason}`);
                }
                console.error("Versjonsøkning og bygging avbrutt.");
                rl.close();
                process.exit(1); // Abort build
                return;
            }

            console.log(`\nStarter "npm version ${versionType}"...`);
            try {
                execSync(`npm version ${versionType}`, { stdio: 'inherit' });
                const newVersion = getCurrentVersion(); // Get updated version after bump
                if (newVersion === null) {
                    console.error("Kritisk feil: Kunne ikke lese ny versjon etter 'npm version' kommandoen.");
                    rl.close();
                    process.exit(1);
                    return;
                }
                console.log(`\nVersjon vellykket økt til ${newVersion}.`);
                if (isGitRepoContext) { // isGitRepoContext vil være true bare hvis det ER et git repo OG det var rent
                    console.log(`En ny commit og tag (f.eks. "v${newVersion}") er automatisk opprettet i Git.`);
                } else {
                    console.log(`package.json (og evt. package-lock.json) er oppdatert til versjon ${newVersion}.`);
                }
                rl.close();
                process.exit(0); // Success, continue build
            } catch (error) {
                console.error(`\nFEIL under kjøring av "npm version ${versionType}".`);
                console.error('Dette kan skje hvis det er et problem som ikke ble fanget av forhåndssjekken (f.eks. problemer med package.json filen, eller Git-konflikter).');
                console.error('Sjekk outputen over for detaljer fra npm/git.');
                console.error('Versjonsøkning og bygging avbrutt.');
                rl.close();
                process.exit(1); // Exit with error, stop build
            }
        });
    }
});

rl.on('SIGINT', () => {
    console.log('\nAvbrutt av bruker (Ctrl+C). Ingen versjonsøkning utført. Bygging avbrutt.');
    rl.close();
    process.exit(1);
});