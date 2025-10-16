#!/usr/bin/env node

// =============================================================================
// MÅNEDLIG PORTEFØLJEDATA SYNC
// =============================================================================
// Kjøres første dag i måneden for å synce siste 5 år porteføljedata
// Bruker norsk tidssone for korrekte datoberegninger
// =============================================================================

const portefoljeanalyseService = require('../src/electron/services/portefoljeanalyseService');
const getPrismaInstance = require('../prisma/client.js');
const log = require('electron-log');

const prisma = getPrismaInstance();

async function hovedSyncJobb() {
    try {
        log.info('🌙 Starter månedlig porteføljedata sync...');

        // Beregn periode (siste 5 år, norsk tidssone)
        const { startDate, endDate } = beregnSyncPeriode();
        log.info(`📅 Sync-periode: ${startDate} til ${endDate}`);

        // Sjekk om vi allerede har data for denne perioden
        const eksisterendeData = await sjekkEksisterendeData(endDate);
        if (eksisterendeData) {
            log.info('✅ Data for denne perioden allerede synced. Avbryter.');
            return;
        }

        // Hent komplett porteføljedata
        log.info('📥 Starter datahenting fra API...');
        const startTime = Date.now();

        const komplettData = await portefoljeanalyseService.hentKomplettPortefoljeData(
            startDate,
            endDate,
            (progress) => {
                if (progress.phase === 'kunde_detaljer' && progress.current % 50 === 0) {
                    log.info(`📊 Progress: ${progress.current}/${progress.total} kunder`);
                }
            }
        );

        const syncTid = Math.round((Date.now() - startTime) / 1000 / 60); // minutter
        log.info(`✅ API-data hentet på ${syncTid} minutter:`, komplettData.summary);

        // Lagre til database
        log.info('💾 Lagrer data til lokal database...');
        const lagringsResultat = await lagrePortefoljeDataTilDB(komplettData, endDate);
        log.info('✅ Database lagring komplett:', lagringsResultat);

        // Cleanup gamle data (>5 år)
        await slettGamlePortefoljeData();

        log.info('🎯 Månedlig sync komplett!');

    } catch (error) {
        log.error('❌ Feil i månedlig sync:', error);
        throw error;
    }
}

function beregnSyncPeriode() {
    // Norsk tidssone (UTC+1/+2)
    const nå = new Date();
    const norskNå = new Date(nå.toLocaleString("en-US", { timeZone: "Europe/Oslo" }));

    // Start: 1. januar for 5 år siden
    const startYear = norskNå.getFullYear() - 5;
    const startDate = `${startYear}-01-01`;

    // Slutt: Siste dag i foregående måned
    const forrigeMåned = new Date(norskNå);
    forrigeMåned.setMonth(forrigeMåned.getMonth() - 1);
    const sisteDagForrigeMåned = new Date(forrigeMåned.getFullYear(), forrigeMåned.getMonth() + 1, 0);
    const endDate = sisteDagForrigeMåned.toISOString().split('T')[0];

    return { startDate, endDate };
}

async function sjekkEksisterendeData(endDate) {
    const syncRecord = await prisma.portefoljeSync.findFirst({
        where: {
            syncDate: {
                gte: new Date(endDate + 'T00:00:00Z'),
                lt: new Date(new Date(endDate + 'T00:00:00Z').getTime() + 24 * 60 * 60 * 1000)
            }
        }
    });

    return syncRecord !== null;
}

async function lagrePortefoljeDataTilDB(komplettData, syncDate) {
    const transaction = await prisma.$transaction(async (tx) => {
        // Opprett sync-record
        const syncRecord = await tx.portefoljeSync.create({
            data: {
                syncDate: new Date(syncDate + 'T00:00:00Z'),
                totalCustomers: komplettData.summary.totalCustomers,
                totalPolicies: komplettData.summary.totalPolicies,
                totalCovers: komplettData.summary.totalCovers,
                dataSize: JSON.stringify(komplettData).length
            }
        });

        // Lagre kunder
        for (const kunde of komplettData.customers) {
            await tx.portefoljeCustomer.create({
                data: {
                    customerNumber: kunde.InsuredNumber,
                    name: kunde.Name,
                    organizationNumber: kunde.OrganizationNumber,
                    email: kunde.EMail,
                    syncId: syncRecord.id,
                    rawData: kunde
                }
            });
        }

        return {
            syncId: syncRecord.id,
            customersLagret: komplettData.customers.length
        };
    });

    return transaction;
}

async function slettGamlePortefoljeData() {
    // Slett data eldre enn 5 år
    const femÅrSiden = new Date();
    femÅrSiden.setFullYear(femÅrSiden.getFullYear() - 5);

    const slettet = await prisma.portefoljeSync.deleteMany({
        where: {
            syncDate: {
                lt: femÅrSiden
            }
        }
    });

    log.info(`🗑️ Slettet ${slettet.count} gamle sync-records`);
    return slettet;
}

// Kjør hvis scriptet kalles direkte
if (require.main === module) {
    hovedSyncJobb()
        .then(() => {
            log.info('✅ Månedlig sync fullført - avslutter script');
            process.exit(0);
        })
        .catch((error) => {
            log.error('❌ Månedlig sync feilet:', error);
            process.exit(1);
        });
}

module.exports = {
    hovedSyncJobb,
    beregnSyncPeriode,
    lagrePortefoljeDataTilDB
};
