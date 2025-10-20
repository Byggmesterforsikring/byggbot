const { PrismaClient } = require('./generated/client');
const electronLog = require('electron-log'); // Kan være nyttig for logging her også

let prismaInstance = null;

function getPrismaInstance() {
    if (!prismaInstance) {
        try {
            prismaInstance = new PrismaClient({
                log: [
                    { emit: 'stdout', level: 'query' },
                    { emit: 'stdout', level: 'info' },
                    { emit: 'stdout', level: 'warn' },
                    { emit: 'stdout', level: 'error' },
                ],
            });

            // Korrekt logging av modelltyper basert på schema-navn (camelCase)
            const userV2Type = typeof prismaInstance?.userV2;
            const selskapType = typeof prismaInstance?.selskap;
            const invoicesType = typeof prismaInstance?.invoices;
            const drawingRuleType = typeof prismaInstance?.drawingRule;
            const systemPromptsType = typeof prismaInstance?.systemPrompts;
            // ... legg til flere modeller ved behov ...

            electronLog.info(`[prisma/client.js] NEW PrismaClient instance created: ` +
                `prisma type=${typeof prismaInstance}, ` +
                `userV2 type=${userV2Type}, ` +
                `selskap type=${selskapType}, ` +
                `invoices type=${invoicesType}, ` +
                `drawingRule type=${drawingRuleType}, ` +
                `systemPrompts type=${systemPromptsType}`);

        } catch (error) {
            electronLog.error('[prisma/client.js] FAILED to create PrismaClient instance:', error);
            throw error;
        }
    }
    return prismaInstance;
}

// Eksporter funksjonen istedenfor instansen direkte
module.exports = getPrismaInstance; 