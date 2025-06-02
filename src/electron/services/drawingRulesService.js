const electronLog = require('electron-log');
const getPrismaInstance = require('../../../prisma/client.js');
const prisma = getPrismaInstance();

class DrawingRulesService {
    // Hent alle tegningsregler
    async getAllRules() {
        try {
            const rules = await prisma.drawingRule.findMany({
                orderBy: {
                    title: 'asc',
                },
                include: {
                    versions: {
                        where: { isCurrent: true },
                        select: {
                            content: true,
                            versionNumber: true,
                            createdAt: true,
                        }
                    },
                    createdBy: {
                        select: {
                            id: true,
                            navn: true,
                            email: true,
                        }
                    },
                    lastUpdatedBy: {
                        select: {
                            id: true,
                            navn: true,
                            email: true,
                        }
                    }
                }
            });

            // Mapper om dataen for å matche forventet format for frontend.
            return rules.map(rule => {
                const currentVersion = rule.versions && rule.versions.length > 0 ? rule.versions[0] : {};
                return {
                    ...rule,
                    content: currentVersion.content,
                    version_number: currentVersion.versionNumber,
                    version_created_at: currentVersion.createdAt,
                    created_by_email: rule.createdBy?.email,
                    last_updated_by_email: rule.lastUpdatedBy?.email,
                    last_updated_at: rule.updatedAt
                };
            });
        } catch (error) {
            electronLog.error('Feil ved henting av tegningsregler med Prisma:', error);
            throw error;
        }
    }

    // Hent en spesifikk tegningsregel med versjon
    async getRuleBySlug(slug, versionNumber = null) {
        try {
            const rule = await prisma.drawingRule.findUnique({
                where: { slug },
                include: {
                    versions: {
                        where: versionNumber
                            ? { versionNumber: parseInt(versionNumber) }
                            : { isCurrent: true },
                        select: {
                            content: true,
                            versionNumber: true, // Endret fra version_number for konsistens med schema
                            createdAt: true, // Endret fra created_at for konsistens med schema
                            isCurrent: true,
                            createdBy: {
                                select: {
                                    id: true,
                                    navn: true,
                                    email: true
                                }
                            }
                        }
                    },
                    createdBy: {
                        select: {
                            id: true,
                            navn: true,
                            email: true
                        }
                    },
                    lastUpdatedBy: {
                        select: {
                            id: true,
                            navn: true,
                            email: true
                        }
                    }
                }
            });

            if (!rule) return null;

            // Mapper om dataen for å matche forventet format, spesielt versjonsdata.
            const versionData = rule.versions && rule.versions.length > 0 ? rule.versions[0] : {};

            return {
                ...rule,
                content: versionData.content,
                version_number: versionData.versionNumber, // Bruker ny feltnavn
                version_created_at: versionData.createdAt, // Bruker ny feltnavn
                // Frontend må kanskje justeres for å håndtere createdBy/lastUpdatedBy objekter
                // og den nestede createdBy på versjonen.
                created_by_email: rule.createdBy?.email, // For enkelthets skyld
                last_updated_by_email: rule.lastUpdatedBy?.email, // For enkelthets skyld
                last_updated_at: rule.updatedAt
            };

        } catch (error) {
            electronLog.error('Feil ved henting av tegningsregel med Prisma:', error);
            throw error;
        }
    }

    // Opprett ny tegningsregel
    async createRule(title, content, userId) {
        return prisma.$transaction(async (tx) => {
            // Generer slug fra tittel
            let baseSlug = title.toLowerCase()
                .replace(/[æå]/g, 'a')
                .replace(/[ø]/g, 'o')
                .replace(/[^a-z0-9\s-]/g, '') // Fjern ugyldige tegn
                .replace(/\s+/g, '-') // Erstatt mellomrom med bindestrek
                .replace(/^-+|-+$/g, '');

            // Sjekk om slug allerede eksisterer og legg til et tall hvis nødvendig
            let slug = baseSlug;
            let counter = 1;
            while (true) {
                const existingRule = await tx.drawingRule.findUnique({
                    where: { slug },
                });
                if (!existingRule) break;
                slug = `${baseSlug}-${counter}`;
                counter++;
            }

            console.log('[drawingRulesService.createRule] Mottatt userId for opprettelse:', userId, 'Type:', typeof userId);

            // Opprett tegningsregel
            const rule = await tx.drawingRule.create({
                data: {
                    title,
                    slug,
                    created_by_user_id: userId,
                    last_updated_by_user_id: userId,
                    versions: {
                        create: [
                            {
                                content,
                                versionNumber: 1,
                                isCurrent: true,
                                created_by_user_id: userId,
                            },
                        ],
                    },
                },
                include: {
                    versions: {
                        where: { isCurrent: true },
                        select: {
                            content: true,
                            versionNumber: true,
                            createdAt: true,
                            isCurrent: true,
                            createdBy: {
                                select: {
                                    id: true,
                                    navn: true,
                                    email: true
                                }
                            }
                        }
                    },
                    createdBy: {
                        select: {
                            id: true,
                            navn: true,
                            email: true,
                        },
                    },
                    lastUpdatedBy: {
                        select: {
                            id: true,
                            navn: true,
                            email: true,
                        },
                    },
                },
            });

            electronLog.info('Opprettet ny regel med Prisma:', {
                id: rule.id,
                title: rule.title,
                slug: rule.slug
            });

            // Mapper om data for retur, lignende getRuleBySlug
            const versionData = rule.versions && rule.versions.length > 0 ? rule.versions[0] : {};

            return {
                ...rule,
                content: versionData.content,
                version_number: versionData.versionNumber,
                version_created_at: versionData.createdAt,
                created_by_email: rule.createdBy?.email,
                last_updated_by_email: rule.lastUpdatedBy?.email,
                last_updated_at: rule.updatedAt
            };
        }).catch(error => {
            electronLog.error('Feil ved opprettelse av tegningsregel med Prisma:', error);
            throw error;
        });
    }

    // Slett tegningsregel
    async deleteRule(slug) {
        try {
            const result = await prisma.drawingRule.delete({
                where: { slug },
            });
            // result vil inneholde den slettede regelen hvis den fantes, ellers kastes en feil
            // P2025: Record to delete not found.
            // Vi kan returnere true hvis ingen feil kastes, eller sjekke result.
            return true; // Antar suksess hvis ingen feil kastes.
        } catch (error) {
            // Sjekk om feilen er fordi posten ikke finnes, og returner false i så fall
            if (error.code === 'P2025') {
                electronLog.warn(`Forsøk på å slette tegningsregel som ikke finnes: ${slug}`);
                return false;
            }
            electronLog.error('Feil ved sletting av tegningsregel med Prisma:', error);
            throw error;
        }
    }

    // Oppdater tegningsregel
    async updateRule(slug, title, content, userId) {
        return prisma.$transaction(async (tx) => {
            // Hent eksisterende regel for å få ID og sjekke at den finnes
            const existingRule = await tx.drawingRule.findUnique({
                where: { slug },
                select: { id: true } // Trenger bare ID her
            });

            if (!existingRule) {
                throw new Error('Tegningsregel ikke funnet for oppdatering');
            }

            // 1. Hent høyeste eksisterende versjonsnummer for regelen
            const latestVersion = await tx.drawingRuleVersion.findFirst({
                where: { ruleId: existingRule.id },
                orderBy: { versionNumber: 'desc' },
                select: { versionNumber: true }
            });
            const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

            // 2. Sett isCurrent = false for alle eksisterende versjoner av denne regelen
            await tx.drawingRuleVersion.updateMany({
                where: { ruleId: existingRule.id },
                data: { isCurrent: false },
            });

            // 3. Oppdater DrawingRule og opprett ny DrawingRuleVersion i én operasjon
            const updatedRule = await tx.drawingRule.update({
                where: { slug },
                data: {
                    title,
                    last_updated_by_user_id: userId,
                    versions: {
                        create: [
                            {
                                content,
                                versionNumber: nextVersionNumber,
                                isCurrent: true,
                                created_by_user_id: userId,
                            },
                        ],
                    },
                },
                include: {
                    versions: {
                        where: { isCurrent: true }, // Hent kun den nye, gjeldende versjonen
                        select: {
                            content: true,
                            versionNumber: true,
                            createdAt: true,
                            isCurrent: true,
                            createdBy: {
                                select: {
                                    id: true,
                                    navn: true,
                                    email: true
                                }
                            }
                        }
                    },
                    createdBy: {
                        select: {
                            id: true,
                            navn: true,
                            email: true,
                        },
                    },
                    lastUpdatedBy: {
                        select: {
                            id: true,
                            navn: true,
                            email: true,
                        },
                    },
                },
            });

            electronLog.info('Oppdatert regel med Prisma:', {
                id: updatedRule.id,
                title: updatedRule.title,
                slug: updatedRule.slug,
                version: nextVersionNumber
            });

            // Mapper om data for retur
            const versionData = updatedRule.versions && updatedRule.versions.length > 0 ? updatedRule.versions[0] : {};

            return {
                ...updatedRule,
                content: versionData.content,
                version_number: versionData.versionNumber,
                version_created_at: versionData.createdAt,
                created_by_email: updatedRule.createdBy?.email,
                last_updated_by_email: updatedRule.lastUpdatedBy?.email,
                last_updated_at: updatedRule.updatedAt
            };
        }).catch(error => {
            electronLog.error('Feil ved oppdatering av tegningsregel med Prisma:', error);
            throw error;
        });
    }

    // Hent versjonshistorikk for en regel
    async getRuleVersions(slug) {
        try {
            const versions = await prisma.drawingRuleVersion.findMany({
                where: {
                    rule: { slug: slug },
                },
                include: {
                    createdBy: { // Inkluderer UserV2 data for createdBy
                        select: {
                            id: true,
                            navn: true,
                            email: true,
                        },
                    },
                },
                orderBy: {
                    versionNumber: 'desc',
                },
            });

            return versions.map(v => ({
                ...v, // Inneholder v.id, v.ruleId, v.versionNumber, v.content, v.createdAt, v.isCurrent, v.metadata, v.createdBy (objekt)
                created_by_email: v.createdBy?.email,
                // Legg til created_at for å matche hva frontend (ModernRuleDetail) forventer for formatDate
                created_at: v.createdAt
            }));
        } catch (error) {
            electronLog.error('Feil ved henting av versjonshistorikk med Prisma:', error);
            throw error;
        }
    }

    // Lagre bilde
    async saveImage(ruleVersionId, filename, fileData, mimeType, userId) {
        try {
            // Sikre at fileData er en Buffer hvis det ikke allerede er det.
            // Dette steget kan være avhengig av hvordan fileData kommer inn fra IPC handleren.
            // Hvis det allerede er en Buffer, er Buffer.from(fileData) idempotent.
            const dataBuffer = Buffer.isBuffer(fileData) ? fileData : Buffer.from(fileData);

            const image = await prisma.drawingRuleImage.create({
                data: {
                    ruleVersionId: parseInt(ruleVersionId), // Sikre at ID er integer
                    filename,
                    fileData: dataBuffer, // Prisma forventer Buffer for Bytes type
                    mimeType,
                    created_by_user_id: userId,
                },
                select: { // Velg kun de feltene som er nødvendige for retur, f.eks. ID
                    id: true,
                    filename: true,
                    mimeType: true,
                    createdAt: true,
                    ruleVersionId: true
                }
            });
            return image; // Returnerer det opprettede bildeobjektet (uten fileData)
        } catch (error) {
            electronLog.error('Feil ved lagring av bilde med Prisma:', error);
            throw error;
        }
    }

    // Hent bilde
    async getImage(imageId) {
        try {
            const image = await prisma.drawingRuleImage.findUnique({
                where: { id: parseInt(imageId) }, // Sikre at ID er integer
            });
            // Prisma returnerer `fileData` som en Buffer automatisk.
            return image;
        } catch (error) {
            electronLog.error('Feil ved henting av bilde med Prisma:', error);
            throw error;
        }
    }
}

module.exports = new DrawingRulesService(); 