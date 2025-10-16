const { BenefisientType } = require('../../../prisma/generated/client');
const electronLog = require('electron-log');
const { Decimal } = require('decimal.js');

// Importer Prisma-instansen
const getPrismaInstance = require('../../../prisma/client.js');
const prisma = getPrismaInstance();

class TilbudService {
    // TILBUD CRUD OPERASJONER

    async createTilbud(prosjektId, tilbudData, opprettetAvBrukerId) {
        if (!prosjektId) {
            throw new Error('Prosjekt-ID er påkrevd for å opprette tilbud.');
        }

        const numOpprettetAvBrukerId = parseInt(opprettetAvBrukerId);
        if (isNaN(numOpprettetAvBrukerId)) {
            throw new Error('Ugyldig bruker-ID for oppretter (må være et tall).');
        }

        try {
            // Valider at prosjektet finnes
            const prosjekt = await prisma.garantiProsjekt.findUnique({
                where: { id: prosjektId },
                include: { selskap: true }
            });

            if (!prosjekt) {
                throw new Error(`Prosjekt med ID ${prosjektId} finnes ikke.`);
            }

            // Opprett tilbudet med smarte defaults for ansvarlige
            const dataForCreate = {
                prosjektId: prosjektId,
                status: tilbudData.status || 'Utkast',
                produkttype: tilbudData.produkttype || null,
                opprettetAv: numOpprettetAvBrukerId,
                endretAv: numOpprettetAvBrukerId,
                versjonsnummer: 1,

                // Smarte defaults for ansvarlige
                ansvarligRaadgiverId: tilbudData.ansvarligRaadgiverId || numOpprettetAvBrukerId, // Oppretter blir ansvarlig som standard
                uwAnsvarligId: tilbudData.uwAnsvarligId || prosjekt.uwAnsvarligId, // Arv fra prosjekt som standard
                produksjonsansvarligId: tilbudData.produksjonsansvarligId || prosjekt.produksjonsansvarligId // Arv fra prosjekt
            };

            const nyttTilbud = await prisma.tilbud.create({
                data: dataForCreate,
                include: {
                    prosjekt: {
                        include: { selskap: true }
                    },
                    opprettetAvUser: { select: { id: true, navn: true, email: true } },
                    endretAvUser: { select: { id: true, navn: true, email: true } },
                    beregning: true,
                    benefisienter: true
                }
            });

            // Opprett hendelse
            await prisma.garantiSakHendelse.create({
                data: {
                    prosjektId: prosjektId,
                    hendelseType: 'TILBUD_OPPRETTET',
                    beskrivelse: `Tilbud opprettet for prosjekt: ${prosjekt.navn || 'Uten navn'}`,
                    utfoertAvId: numOpprettetAvBrukerId
                }
            });

            electronLog.info(`Tilbud ${nyttTilbud.id} opprettet for prosjekt ${prosjektId} av bruker ${numOpprettetAvBrukerId}`);

            // Oppdater prosjektstatus basert på nytt tilbud
            await this.oppdaterProsjektStatus(prosjektId);

            return nyttTilbud;

        } catch (error) {
            electronLog.error(`Feil i TilbudService.createTilbud for prosjekt ${prosjektId}:`, error);
            throw new Error(`Kunne ikke opprette tilbud: ${error.message}`);
        }
    }

    async getTilbudById(tilbudId) {
        if (!tilbudId) {
            throw new Error('Tilbud-ID er påkrevd for å hente tilbud.');
        }

        try {
            const tilbud = await prisma.tilbud.findUnique({
                where: { id: tilbudId },
                include: {
                    prosjekt: {
                        include: { selskap: true }
                    },
                    opprettetAvUser: { select: { id: true, navn: true, email: true } },
                    endretAvUser: { select: { id: true, navn: true, email: true } },
                    ansvarligRaadgiver: { select: { id: true, navn: true, email: true } },
                    uwAnsvarlig: { select: { id: true, navn: true, email: true } },
                    produksjonsansvarlig: { select: { id: true, navn: true, email: true } },
                    beregning: true,
                    benefisienter: {
                        orderBy: { opprettetDato: 'asc' }
                    }
                }
            });

            if (tilbud) {
                electronLog.info(`Tilbud ${tilbudId} hentet`);
                return this.convertDecimalFieldsToStrings(tilbud);
            } else {
                electronLog.info(`Tilbud ${tilbudId} ikke funnet`);
                return null;
            }

        } catch (error) {
            electronLog.error(`Feil i TilbudService.getTilbudById for tilbud ${tilbudId}:`, error);
            throw new Error(`Kunne ikke hente tilbud: ${error.message}`);
        }
    }

    async getTilbudByProsjektId(prosjektId) {
        if (!prosjektId) {
            throw new Error('Prosjekt-ID er påkrevd for å hente tilbud.');
        }

        try {
            const tilbudListe = await prisma.tilbud.findMany({
                where: { prosjektId: prosjektId },
                include: {
                    prosjekt: {
                        include: { selskap: true }
                    },
                    opprettetAvUser: { select: { id: true, navn: true, email: true } },
                    endretAvUser: { select: { id: true, navn: true, email: true } },
                    ansvarligRaadgiver: { select: { id: true, navn: true, email: true } },
                    uwAnsvarlig: { select: { id: true, navn: true, email: true } },
                    produksjonsansvarlig: { select: { id: true, navn: true, email: true } },
                    beregning: true,
                    benefisienter: {
                        orderBy: { opprettetDato: 'asc' }
                    }
                },
                orderBy: { opprettetDato: 'desc' }
            });

            if (tilbudListe && tilbudListe.length > 0) {
                electronLog.info(`${tilbudListe.length} tilbud hentet for prosjekt ${prosjektId}`);

                // Konverter Decimal-objekter til strenger før retur
                const konverterteTilbud = tilbudListe.map(tilbud => this.convertDecimalFieldsToStrings(tilbud));
                return konverterteTilbud;
            } else {
                electronLog.info(`Ingen tilbud funnet for prosjekt ${prosjektId}`);
                return [];
            }

        } catch (error) {
            electronLog.error(`Feil i TilbudService.getTilbudByProsjektId for prosjekt ${prosjektId}:`, error);
            throw new Error(`Kunne ikke hente tilbud: ${error.message}`);
        }
    }

    async updateTilbud(tilbudId, dataToUpdate, endretAvBrukerId) {
        if (!tilbudId) {
            throw new Error('Tilbud-ID er påkrevd for å oppdatere tilbud.');
        }

        const numEndretAvBrukerId = parseInt(endretAvBrukerId);
        if (isNaN(numEndretAvBrukerId)) {
            throw new Error('Ugyldig bruker-ID for endrer (må være et tall).');
        }

        try {
            // Valider at tilbudet finnes
            const eksisterendeTilbud = await prisma.tilbud.findUnique({
                where: { id: tilbudId },
                include: { prosjekt: true }
            });

            if (!eksisterendeTilbud) {
                throw new Error(`Tilbud med ID ${tilbudId} finnes ikke.`);
            }

            // Tilbudsstatus følger nå prosjektstatusen - ingen egen validering nødvendig

            // Forbered data for oppdatering
            const updateData = {
                ...dataToUpdate,
                endretAv: numEndretAvBrukerId,
                sistEndret: new Date(),
                versjonsnummer: eksisterendeTilbud.versjonsnummer + 1  // Øk versjonsnummer ved endring
            };

            // Spesiell håndtering for prosjekttype (må være en gyldig enum-verdi)
            if (updateData.prosjekttype !== undefined) {
                const validTypes = ['Boligblokk', 'Rekkehus', 'Enebolig', 'Naeringsbygg', 'Kombinasjonsbygg', 'Infrastruktur', 'Annet'];
                if (updateData.prosjekttype !== null && !validTypes.includes(updateData.prosjekttype)) {
                    throw new Error(`Ugyldig prosjekttype: ${updateData.prosjekttype}`);
                }
            }

            const oppdatertTilbud = await prisma.tilbud.update({
                where: { id: tilbudId },
                data: updateData,
                include: {
                    prosjekt: {
                        include: { selskap: true }
                    },
                    opprettetAvUser: { select: { id: true, navn: true, email: true } },
                    endretAvUser: { select: { id: true, navn: true, email: true } },
                    ansvarligRaadgiver: { select: { id: true, navn: true, email: true } },
                    uwAnsvarlig: { select: { id: true, navn: true, email: true } },
                    produksjonsansvarlig: { select: { id: true, navn: true, email: true } },
                    beregning: true,
                    benefisienter: true
                }
            });

            // Statusendringer håndteres nå på prosjektnivå, ikke tilbudsnivå

            electronLog.info(`Tilbud ${tilbudId} oppdatert av bruker ${numEndretAvBrukerId}`);

            // Oppdater prosjektstatus basert på oppdatert tilbud
            await this.oppdaterProsjektStatus(eksisterendeTilbud.prosjektId);

            return this.convertDecimalFieldsToStrings(oppdatertTilbud);

        } catch (error) {
            electronLog.error(`Feil i TilbudService.updateTilbud for tilbud ${tilbudId}:`, error);
            throw new Error(`Kunne ikke oppdatere tilbud: ${error.message}`);
        }
    }

    async deleteTilbud(tilbudId) {
        if (!tilbudId) {
            throw new Error('Tilbud-ID er påkrevd for å slette tilbud.');
        }

        try {
            // Valider at tilbudet finnes og kan slettes
            const tilbud = await prisma.tilbud.findUnique({
                where: { id: tilbudId },
                include: { prosjekt: true }
            });

            if (!tilbud) {
                throw new Error(`Tilbud med ID ${tilbudId} finnes ikke.`);
            }

            // Tilbudet kan slettes så lenge prosjektet ikke er produsert
            // Sjekk prosjektets status i stedet for tilbudsstatus
            if (tilbud.prosjekt.status === 'Produsert') {
                throw new Error(`Tilbud kan ikke slettes når prosjektet har status "Produsert".`);
            }

            // Slett tilbudet (kaskadesletting håndterer relaterte tabeller)
            await prisma.tilbud.delete({
                where: { id: tilbudId }
            });

            // Oppdater prosjektstatus etter sletting
            await this.oppdaterProsjektStatus(tilbud.prosjektId);

            electronLog.info(`Tilbud ${tilbudId} slettet`);

        } catch (error) {
            electronLog.error(`Feil i TilbudService.deleteTilbud for tilbud ${tilbudId}:`, error);
            throw new Error(`Kunne ikke slette tilbud: ${error.message}`);
        }
    }

    // TILBUDSBEREGNING OPERASJONER

    async saveBeregning(tilbudId, beregningData) {
        if (!tilbudId) {
            throw new Error('Tilbud-ID er påkrevd for å lagre beregning.');
        }

        try {
            // Valider at tilbudet finnes
            const tilbud = await prisma.tilbud.findUnique({
                where: { id: tilbudId }
            });

            if (!tilbud) {
                throw new Error(`Tilbud med ID ${tilbudId} finnes ikke.`);
            }

            // Forbered data for lagring
            const dataForSave = {
                tilbudId: tilbudId,
                kontraktssum: beregningData.kontraktssum ? new Decimal(beregningData.kontraktssum) : null,
                startDato: beregningData.startDato ? new Date(beregningData.startDato) : null,
                sluttDato: beregningData.sluttDato ? new Date(beregningData.sluttDato) : null,
                utforelsestid: beregningData.utforelsestid || null,
                garantitid: beregningData.garantitid || null,
                rentesatsUtforelse: beregningData.rentesatsUtforelse ? new Decimal(beregningData.rentesatsUtforelse) : null,
                rentesatsGaranti: beregningData.rentesatsGaranti ? new Decimal(beregningData.rentesatsGaranti) : null,
                etableringsgebyr: beregningData.etableringsgebyr ? new Decimal(beregningData.etableringsgebyr) : null,
                totalPremie: beregningData.totalPremie ? new Decimal(beregningData.totalPremie) : null,
                manueltOverstyrt: beregningData.manueltOverstyrt || false
            };

            // Opprett eller oppdater beregning
            const beregning = await prisma.tilbudsBeregning.upsert({
                where: { tilbudId: tilbudId },
                update: dataForSave,
                create: dataForSave
            });

            // Øk versjonsnummer på tilbudet når beregning endres
            await prisma.tilbud.update({
                where: { id: tilbudId },
                data: {
                    versjonsnummer: { increment: 1 },
                    sistEndret: new Date()
                }
            });

            electronLog.info(`Beregning lagret for tilbud ${tilbudId}`);

            // Konverter Decimal-felter til strenger
            const konvertertBeregning = JSON.parse(JSON.stringify(beregning, (key, value) => {
                if (value && typeof value === 'object' && value.constructor) {
                    if (value.constructor.name === 'Decimal' || value.constructor.name === 'PrismaDecimal') {
                        return value.toString();
                    }
                }
                return value;
            }));

            return konvertertBeregning;

        } catch (error) {
            electronLog.error(`Feil i TilbudService.saveBeregning for tilbud ${tilbudId}:`, error);
            throw new Error(`Kunne ikke lagre beregning: ${error.message}`);
        }
    }

    async beregnPremie(produkttype, beregningParams) {
        if (!produkttype) {
            throw new Error('Produkttype er påkrevd for automatisk beregning.');
        }

        try {
            // Hent produktkonfigurasjon
            const produktConfig = await prisma.produktKonfigurasjon.findUnique({
                where: { produktnavn: produkttype }
            });

            if (!produktConfig) {
                throw new Error(`Produktkonfigurasjon ikke funnet for produkttype: ${produkttype}`);
            }

            const {
                kontraktssum,
                utforelsestid,
                garantitid,
                etableringsgebyr
            } = beregningParams;

            if (!kontraktssum || kontraktssum <= 0) {
                throw new Error('Gyldig kontraktssum er påkrevd for beregning.');
            }

            // Konverter til Decimal for presise beregninger
            const kontraktssumDecimal = new Decimal(kontraktssum);
            const standardUtforelseProsent = new Decimal(produktConfig.standardUtforelseProsent);
            const standardGarantiProsent = new Decimal(produktConfig.standardGarantiProsent);
            const etableringsgebyrDecimal = etableringsgebyr ? new Decimal(etableringsgebyr) : new Decimal(0);

            // Beregn utførelsespremie
            const utforelsesPremie = kontraktssumDecimal.mul(standardUtforelseProsent);

            // Beregn garantipremie
            const garantiPremie = kontraktssumDecimal.mul(standardGarantiProsent);

            // Total premie
            const totalPremie = utforelsesPremie.add(garantiPremie).add(etableringsgebyrDecimal);

            const beregning = {
                kontraktssum: kontraktssumDecimal.toString(),
                utforelsestid: utforelsestid || produktConfig.standardGarantitid, // Fallback til standard
                garantitid: garantitid || produktConfig.standardGarantitid,
                rentesatsUtforelse: standardUtforelseProsent.toString(),
                rentesatsGaranti: standardGarantiProsent.toString(),
                etableringsgebyr: etableringsgebyrDecimal.toString(),
                totalPremie: totalPremie.toString(),
                utforelsesPremie: utforelsesPremie.toString(),
                garantiPremie: garantiPremie.toString(),
                manueltOverstyrt: false
            };

            electronLog.info(`Automatisk beregning utført for produkttype: ${produkttype}, kontraktssum: ${kontraktssum}`);
            return beregning;

        } catch (error) {
            electronLog.error(`Feil i TilbudService.beregnPremie for produkttype ${produkttype}:`, error);
            throw new Error(`Kunne ikke utføre automatisk beregning: ${error.message}`);
        }
    }

    // BENEFISIENT OPERASJONER

    async getBenefisienter(tilbudId, kunAktive = false) {
        if (!tilbudId) {
            throw new Error('Tilbud-ID er påkrevd for å hente benefisienter.');
        }

        try {
            const whereClause = { tilbudId: tilbudId };
            if (kunAktive) {
                whereClause.aktiv = true;
            }

            const benefisienter = await prisma.benefisient.findMany({
                where: whereClause,
                orderBy: { opprettetDato: 'asc' }
            });

            electronLog.info(`Hentet ${benefisienter.length} benefisienter for tilbud ${tilbudId} (kunAktive: ${kunAktive})`);

            // Konverter andel felter fra Decimal til string
            const konverterteBenefisienter = benefisienter.map(benefisient => {
                if (benefisient.andel && typeof benefisient.andel === 'object') {
                    benefisient.andel = benefisient.andel.toString();
                }
                return benefisient;
            });

            return konverterteBenefisienter;

        } catch (error) {
            electronLog.error(`Feil i TilbudService.getBenefisienter for tilbud ${tilbudId}:`, error);
            throw new Error(`Kunne ikke hente benefisienter: ${error.message}`);
        }
    }

    async createBenefisient(tilbudId, benefisientData) {
        if (!tilbudId) {
            throw new Error('Tilbud-ID er påkrevd for å opprette benefisient.');
        }

        try {
            // Valider at tilbudet finnes
            const tilbud = await prisma.tilbud.findUnique({
                where: { id: tilbudId }
            });

            if (!tilbud) {
                throw new Error(`Tilbud med ID ${tilbudId} finnes ikke.`);
            }

            // Valider benefisientdata
            const {
                type,
                navn,
                organisasjonsnummer,
                personident,
                kjonn,
                fodselsdato,
                boenhet,
                adresse,
                postnummer,
                poststed,
                gardsnummer,
                bruksnummer,
                festenummer,
                seksjonsnummer,
                epost,
                telefon,
                mobiltelefon,
                kontaktinformasjon,
                aktiv,
                aktivFra,
                aktivTil,
                kommentar,
                andel,
                enhetId
            } = benefisientData;

            if (!type || !Object.values(BenefisientType).includes(type)) {
                throw new Error(`Ugyldig benefisienttype: ${type}`);
            }

            if (!navn) {
                throw new Error('Navn er påkrevd for benefisient.');
            }

            if (type === BenefisientType.Juridisk && !organisasjonsnummer) {
                throw new Error('Organisasjonsnummer er påkrevd for juridisk benefisient.');
            }

            if (type === BenefisientType.Fysisk && !personident) {
                throw new Error('Personident er påkrevd for fysisk benefisient.');
            }

            if (!andel || andel <= 0 || andel > 100) {
                throw new Error('Andel må være mellom 0 og 100 prosent.');
            }

            // Hvis enhetId er spesifisert, sjekk at total andel for enheten ikke overstiger 100%
            if (enhetId) {
                const enhet = await prisma.enhet.findUnique({
                    where: { id: enhetId }
                });

                if (!enhet) {
                    throw new Error(`Enhet med ID ${enhetId} finnes ikke.`);
                }

                if (enhet.tilbudId !== tilbudId) {
                    throw new Error('Enheten tilhører ikke dette tilbudet.');
                }

                const eksisterendeBenefisienter = await prisma.benefisient.findMany({
                    where: {
                        tilbudId: tilbudId,
                        enhetId: enhetId,
                        aktiv: true // Kun tell aktive benefisienter
                    }
                });

                // Debug logging
                electronLog.info(`Sjekker eksisterende benefisienter for enhet ${enhetId}:`, {
                    antall: eksisterendeBenefisienter.length,
                    benefisienter: eksisterendeBenefisienter.map(b => ({
                        id: b.id,
                        navn: b.navn,
                        aktiv: b.aktiv,
                        andel: b.andel.toString()
                    }))
                });

                const totalEksisterendeAndel = eksisterendeBenefisienter.reduce((sum, b) =>
                    sum + parseFloat(b.andel.toString()), 0);

                if (totalEksisterendeAndel + parseFloat(andel) > 100) {
                    throw new Error(`Total andel for enheten kan ikke overskride 100%. Gjenstående: ${100 - totalEksisterendeAndel}%`);
                }
            } else {
                // For tilfeller uten enheter (enebolig, infrastruktur), sjekk total andel for tilbudet
                const eksisterendeBenefisienter = await prisma.benefisient.findMany({
                    where: {
                        tilbudId: tilbudId,
                        enhetId: null,
                        aktiv: true // Kun tell aktive benefisienter
                    }
                });

                const totalEksisterendeAndel = eksisterendeBenefisienter.reduce((sum, b) =>
                    sum + parseFloat(b.andel.toString()), 0);

                if (totalEksisterendeAndel + parseFloat(andel) > 100) {
                    throw new Error(`Total andel kan ikke overskride 100%. Gjenstående: ${100 - totalEksisterendeAndel}%`);
                }
            }

            const dataForCreate = {
                tilbudId: tilbudId,
                enhetId: enhetId || null,
                type: type,
                navn: navn,
                organisasjonsnummer: type === BenefisientType.Juridisk ? organisasjonsnummer : null,
                personident: type === BenefisientType.Fysisk ? personident : null,
                kjonn: type === BenefisientType.Fysisk ? kjonn : null,
                fodselsdato: type === BenefisientType.Fysisk ? fodselsdato : null,
                // Boenhet/adresse-informasjon
                boenhet: boenhet || null,
                adresse: adresse || null,
                postnummer: postnummer || null,
                poststed: poststed || null,
                // Matrikkel-informasjon
                gardsnummer: gardsnummer || null,
                bruksnummer: bruksnummer || null,
                festenummer: festenummer || null,
                seksjonsnummer: seksjonsnummer || null,
                // Strukturerte kontaktfelter
                epost: epost || null,
                telefon: telefon || null,
                mobiltelefon: mobiltelefon || null,
                kontaktinformasjon: kontaktinformasjon || null,
                // Historikk og status
                aktiv: aktiv !== undefined ? aktiv : true,
                aktivFra: aktivFra ? new Date(aktivFra) : new Date(),
                aktivTil: aktivTil ? new Date(aktivTil) : null,
                kommentar: kommentar || null,
                andel: new Decimal(andel)
            };

            const benefisient = await prisma.benefisient.create({
                data: dataForCreate
            });

            // Øk versjonsnummer på tilbudet når benefisient legges til
            await prisma.tilbud.update({
                where: { id: tilbudId },
                data: {
                    versjonsnummer: { increment: 1 },
                    sistEndret: new Date()
                }
            });

            electronLog.info(`Benefisient ${benefisient.id} opprettet for tilbud ${tilbudId}`);

            // Konverter andel fra Decimal til string
            if (benefisient.andel && typeof benefisient.andel === 'object') {
                benefisient.andel = benefisient.andel.toString();
            }

            return benefisient;

        } catch (error) {
            electronLog.error(`Feil i TilbudService.createBenefisient for tilbud ${tilbudId}:`, error);
            throw new Error(`Kunne ikke opprette benefisient: ${error.message}`);
        }
    }

    async updateBenefisient(benefisientId, dataToUpdate) {
        if (!benefisientId) {
            throw new Error('Benefisient-ID er påkrevd for å oppdatere benefisient.');
        }

        try {
            // Valider at benefisienten finnes
            const eksisterendeBenefisient = await prisma.benefisient.findUnique({
                where: { id: benefisientId }
            });

            if (!eksisterendeBenefisient) {
                throw new Error(`Benefisient med ID ${benefisientId} finnes ikke.`);
            }

            // Valider andel hvis den oppdateres
            if (dataToUpdate.andel !== undefined) {
                if (dataToUpdate.andel <= 0 || dataToUpdate.andel > 100) {
                    throw new Error('Andel må være mellom 0 og 100 prosent.');
                }

                // Sjekk total andel - må ta hensyn til om benefisienten tilhører en enhet
                const whereClause = {
                    tilbudId: eksisterendeBenefisient.tilbudId,
                    id: { not: benefisientId },
                    aktiv: true // Kun tell aktive benefisienter
                };

                // Hvis eksisterende benefisient har enhetId, sjekk kun innenfor samme enhet
                if (eksisterendeBenefisient.enhetId) {
                    whereClause.enhetId = eksisterendeBenefisient.enhetId;
                } else {
                    // For tilfeller uten enheter (enebolig, infrastruktur)
                    whereClause.enhetId = null;
                }

                const andreBenefisienter = await prisma.benefisient.findMany({
                    where: whereClause
                });

                const totalAndreAndeler = andreBenefisienter.reduce((sum, b) =>
                    sum + parseFloat(b.andel.toString()), 0);

                if (totalAndreAndeler + parseFloat(dataToUpdate.andel) > 100) {
                    const enhetInfo = eksisterendeBenefisient.enhetId ?
                        ` for enheten` :
                        '';
                    throw new Error(`Total andel${enhetInfo} kan ikke overskride 100%. Gjenstående: ${100 - totalAndreAndeler}%`);
                }

                dataToUpdate.andel = new Decimal(dataToUpdate.andel);
            }

            const oppdatertBenefisient = await prisma.benefisient.update({
                where: { id: benefisientId },
                data: dataToUpdate
            });

            // Øk versjonsnummer på tilbudet når benefisient endres
            await prisma.tilbud.update({
                where: { id: eksisterendeBenefisient.tilbudId },
                data: {
                    versjonsnummer: { increment: 1 },
                    sistEndret: new Date()
                }
            });

            electronLog.info(`Benefisient ${benefisientId} oppdatert`);

            // Konverter andel fra Decimal til string
            if (oppdatertBenefisient.andel && typeof oppdatertBenefisient.andel === 'object') {
                oppdatertBenefisient.andel = oppdatertBenefisient.andel.toString();
            }

            return oppdatertBenefisient;

        } catch (error) {
            electronLog.error(`Feil i TilbudService.updateBenefisient for benefisient ${benefisientId}:`, error);
            throw new Error(`Kunne ikke oppdatere benefisient: ${error.message}`);
        }
    }

    async deleteBenefisient(benefisientId) {
        if (!benefisientId) {
            throw new Error('Benefisient-ID er påkrevd for å slette benefisient.');
        }

        try {
            // Valider at benefisienten finnes
            const benefisient = await prisma.benefisient.findUnique({
                where: { id: benefisientId }
            });

            if (!benefisient) {
                throw new Error(`Benefisient med ID ${benefisientId} finnes ikke.`);
            }

            const tilbudId = benefisient.tilbudId;

            await prisma.benefisient.delete({
                where: { id: benefisientId }
            });

            // Øk versjonsnummer på tilbudet når benefisient slettes
            await prisma.tilbud.update({
                where: { id: tilbudId },
                data: {
                    versjonsnummer: { increment: 1 },
                    sistEndret: new Date()
                }
            });

            electronLog.info(`Benefisient ${benefisientId} slettet`);

        } catch (error) {
            electronLog.error(`Feil i TilbudService.deleteBenefisient for benefisient ${benefisientId}:`, error);
            throw new Error(`Kunne ikke slette benefisient: ${error.message}`);
        }
    }

    async deaktiverBenefisient(benefisientId, kommentar = null) {
        if (!benefisientId) {
            throw new Error('Benefisient-ID er påkrevd for å deaktivere benefisient.');
        }

        try {
            // Valider at benefisienten finnes
            const benefisient = await prisma.benefisient.findUnique({
                where: { id: benefisientId }
            });

            if (!benefisient) {
                throw new Error(`Benefisient med ID ${benefisientId} finnes ikke.`);
            }

            const oppdatertBenefisient = await prisma.benefisient.update({
                where: { id: benefisientId },
                data: {
                    aktiv: false,
                    aktivTil: new Date(),
                    kommentar: kommentar || `Deaktivert ${new Date().toLocaleDateString('no-NO')}`
                }
            });

            // Øk versjonsnummer på tilbudet når benefisient deaktiveres
            await prisma.tilbud.update({
                where: { id: benefisient.tilbudId },
                data: {
                    versjonsnummer: { increment: 1 },
                    sistEndret: new Date()
                }
            });

            electronLog.info(`Benefisient ${benefisientId} deaktivert`);

            // Konverter andel fra Decimal til string
            if (oppdatertBenefisient.andel && typeof oppdatertBenefisient.andel === 'object') {
                oppdatertBenefisient.andel = oppdatertBenefisient.andel.toString();
            }

            return oppdatertBenefisient;

        } catch (error) {
            electronLog.error(`Feil i TilbudService.deaktiverBenefisient for benefisient ${benefisientId}:`, error);
            throw new Error(`Kunne ikke deaktivere benefisient: ${error.message}`);
        }
    }

    async aktiverBenefisient(benefisientId) {
        if (!benefisientId) {
            throw new Error('Benefisient-ID er påkrevd for å aktivere benefisient.');
        }

        try {
            // Valider at benefisienten finnes
            const benefisient = await prisma.benefisient.findUnique({
                where: { id: benefisientId }
            });

            if (!benefisient) {
                throw new Error(`Benefisient med ID ${benefisientId} finnes ikke.`);
            }

            const oppdatertBenefisient = await prisma.benefisient.update({
                where: { id: benefisientId },
                data: {
                    aktiv: true,
                    aktivTil: null,
                    kommentar: `Reaktivert ${new Date().toLocaleDateString('no-NO')}`
                }
            });

            // Øk versjonsnummer på tilbudet når benefisient aktiveres
            await prisma.tilbud.update({
                where: { id: benefisient.tilbudId },
                data: {
                    versjonsnummer: { increment: 1 },
                    sistEndret: new Date()
                }
            });

            electronLog.info(`Benefisient ${benefisientId} aktivert`);

            // Konverter andel fra Decimal til string
            if (oppdatertBenefisient.andel && typeof oppdatertBenefisient.andel === 'object') {
                oppdatertBenefisient.andel = oppdatertBenefisient.andel.toString();
            }

            return oppdatertBenefisient;

        } catch (error) {
            electronLog.error(`Feil i TilbudService.aktiverBenefisient for benefisient ${benefisientId}:`, error);
            throw new Error(`Kunne ikke aktivere benefisient: ${error.message}`);
        }
    }

    // ENHET OPERASJONER

    async getEnheter(tilbudId) {
        if (!tilbudId) {
            throw new Error('Tilbud-ID er påkrevd for å hente enheter.');
        }

        try {
            const enheter = await prisma.enhet.findMany({
                where: { tilbudId: tilbudId },
                include: {
                    benefisienter: true
                },
                orderBy: { midlertidigNummer: 'asc' }
            });

            electronLog.info(`Hentet ${enheter.length} enheter for tilbud ${tilbudId}`);

            // Konverter Decimal-felter
            const konverterteEnheter = enheter.map(enhet => {
                if (enhet.andelAvHelhet && typeof enhet.andelAvHelhet === 'object') {
                    enhet.andelAvHelhet = enhet.andelAvHelhet.toString();
                }
                // Konverter benefisienter også
                if (enhet.benefisienter) {
                    enhet.benefisienter = enhet.benefisienter.map(b => {
                        if (b.andel && typeof b.andel === 'object') {
                            b.andel = b.andel.toString();
                        }
                        return b;
                    });
                }
                return enhet;
            });

            return konverterteEnheter;

        } catch (error) {
            electronLog.error(`Feil i TilbudService.getEnheter for tilbud ${tilbudId}:`, error);
            throw new Error(`Kunne ikke hente enheter: ${error.message}`);
        }
    }

    async autoGenererEnheter(tilbudId, antallEnheter, prosjekttype) {
        if (!tilbudId || !antallEnheter || !prosjekttype) {
            throw new Error('Tilbud-ID, antall enheter og prosjekttype er påkrevd.');
        }

        try {
            // Sjekk om det allerede finnes enheter
            const eksisterendeEnheter = await prisma.enhet.count({
                where: { tilbudId: tilbudId }
            });

            if (eksisterendeEnheter > 0) {
                throw new Error('Det finnes allerede enheter for dette tilbudet. Slett eksisterende enheter først.');
            }

            // Beregn andel per enhet
            const andelPerEnhet = new Decimal(100).div(antallEnheter);

            // Generer enheter basert på prosjekttype
            const enheter = [];
            for (let i = 1; i <= antallEnheter; i++) {
                let midlertidigNummer;
                let type;

                switch (prosjekttype) {
                    case 'Boligblokk':
                    case 'Rekkehus':
                        midlertidigNummer = `L${i.toString().padStart(2, '0')}`;
                        type = 'Leilighet';
                        break;
                    case 'Enebolig':
                        midlertidigNummer = `E${i}`;
                        type = 'Enebolig';
                        break;
                    case 'Naeringsbygg':
                        midlertidigNummer = `N${i.toString().padStart(2, '0')}`;
                        type = 'Næringsseksjon';
                        break;
                    case 'Kombinasjonsbygg':
                        midlertidigNummer = `K${i.toString().padStart(2, '0')}`;
                        type = 'Kombinasjonsseksjon';
                        break;
                    default:
                        midlertidigNummer = `E${i.toString().padStart(2, '0')}`;
                        type = 'Enhet';
                        break;
                }

                enheter.push({
                    tilbudId: tilbudId,
                    midlertidigNummer: midlertidigNummer,
                    type: type,
                    andelAvHelhet: andelPerEnhet
                });
            }

            // Opprett alle enheter i en transaksjon
            const opprettedeEnheter = await prisma.enhet.createMany({
                data: enheter
            });

            electronLog.info(`Auto-genererte ${opprettedeEnheter.count} enheter for tilbud ${tilbudId}`);

            // Hent og returner de opprettede enhetene
            return await this.getEnheter(tilbudId);

        } catch (error) {
            electronLog.error(`Feil i TilbudService.autoGenererEnheter for tilbud ${tilbudId}:`, error);
            throw new Error(`Kunne ikke auto-generere enheter: ${error.message}`);
        }
    }

    async slettAlleEnheter(tilbudId) {
        if (!tilbudId) {
            throw new Error('Tilbud-ID er påkrevd for å slette enheter.');
        }

        try {
            // Slett alle enheter (benefisienter slettes automatisk pga cascade)
            const result = await prisma.enhet.deleteMany({
                where: { tilbudId: tilbudId }
            });

            electronLog.info(`Slettet ${result.count} enheter for tilbud ${tilbudId}`);
            return result.count;

        } catch (error) {
            electronLog.error(`Feil i TilbudService.slettAlleEnheter for tilbud ${tilbudId}:`, error);
            throw new Error(`Kunne ikke slette enheter: ${error.message}`);
        }
    }

    async updateEnhet(enhetId, dataToUpdate) {
        if (!enhetId) {
            throw new Error('Enhet-ID er påkrevd for å oppdatere enhet.');
        }

        try {
            const oppdatertEnhet = await prisma.enhet.update({
                where: { id: enhetId },
                data: {
                    ...dataToUpdate,
                    sistEndret: new Date()
                },
                include: {
                    benefisienter: true
                }
            });

            electronLog.info(`Enhet ${enhetId} oppdatert`);
            return this.convertDecimalFieldsToStrings(oppdatertEnhet);

        } catch (error) {
            electronLog.error(`Feil i TilbudService.updateEnhet for enhet ${enhetId}:`, error);
            throw new Error(`Kunne ikke oppdatere enhet: ${error.message}`);
        }
    }

    // PRODUKTKONFIGURASJON OPERASJONER

    async getProduktKonfigurasjoner() {
        try {
            const produkter = await prisma.produktKonfigurasjon.findMany({
                where: { aktiv: true },
                orderBy: { produktnavn: 'asc' }
            });

            electronLog.info(`Hentet ${produkter.length} aktive produktkonfigurasjoner`);

            // Konverter Decimal-felter til strenger
            const konverterteProdukter = produkter.map(produkt => {
                if (produkt.standardUtforelseProsent && typeof produkt.standardUtforelseProsent === 'object') {
                    produkt.standardUtforelseProsent = produkt.standardUtforelseProsent.toString();
                }
                if (produkt.standardGarantiProsent && typeof produkt.standardGarantiProsent === 'object') {
                    produkt.standardGarantiProsent = produkt.standardGarantiProsent.toString();
                }
                if (produkt.maksKontraktssum && typeof produkt.maksKontraktssum === 'object') {
                    produkt.maksKontraktssum = produkt.maksKontraktssum.toString();
                }
                return produkt;
            });

            return konverterteProdukter;

        } catch (error) {
            electronLog.error('Feil i TilbudService.getProduktKonfigurasjoner:', error);
            throw new Error(`Kunne ikke hente produktkonfigurasjoner: ${error.message}`);
        }
    }

    async getProduktKonfigurasjonByNavn(produktnavn) {
        if (!produktnavn) {
            throw new Error('Produktnavn er påkrevd.');
        }

        try {
            const produkt = await prisma.produktKonfigurasjon.findUnique({
                where: { produktnavn: produktnavn }
            });

            if (!produkt) {
                throw new Error(`Produktkonfigurasjon ikke funnet for: ${produktnavn}`);
            }

            electronLog.info(`Produktkonfigurasjon hentet for: ${produktnavn}`);
            return produkt;

        } catch (error) {
            electronLog.error(`Feil i TilbudService.getProduktKonfigurasjonByNavn for ${produktnavn}:`, error);
            throw new Error(`Kunne ikke hente produktkonfigurasjon: ${error.message}`);
        }
    }

    // RAMMEOVERVÅKING

    async getRammeForbruk(selskapId, navarendeProsjektId = null) {
        if (!selskapId) {
            throw new Error('Selskaps-ID er påkrevd for å hente rammeforbruk.');
        }

        try {
            // Hent selskap med ramme
            const selskap = await prisma.selskap.findUnique({
                where: { id: selskapId },
                select: { id: true, selskapsnavn: true, ramme: true }
            });

            if (!selskap) {
                throw new Error(`Selskap med ID ${selskapId} finnes ikke.`);
            }

            const totalRamme = selskap.ramme ? parseFloat(selskap.ramme) : 0;

            // Hent alle produserte prosjekter for selskapet med tilbud
            const produserteProsjekter = await prisma.garantiProsjekt.findMany({
                where: {
                    selskapId: selskapId,
                    status: 'Produsert',
                    tilbud: {
                        some: {} // Kun prosjekter som har minst ett tilbud
                    }
                },
                include: {
                    tilbud: {
                        include: {
                            beregning: true
                        }
                    }
                }
            });

            // Hent nåværende prosjekt separat hvis oppgitt
            let navarendeProsjektBelop = 0;
            if (navarendeProsjektId) {
                const navarendeProsjekt = await prisma.garantiProsjekt.findUnique({
                    where: { id: navarendeProsjektId },
                    include: {
                        tilbud: {
                            include: {
                                beregning: true
                            }
                        }
                    }
                });

                // Summer kontraktssum fra alle tilbud for nåværende prosjekt
                if (navarendeProsjekt?.tilbud && Array.isArray(navarendeProsjekt.tilbud)) {
                    for (const tilbud of navarendeProsjekt.tilbud) {
                        if (tilbud.beregning?.kontraktssum) {
                            navarendeProsjektBelop += parseFloat(tilbud.beregning.kontraktssum.toString());
                        }
                    }
                }
            }

            // Beregn forbrukt ramme på andre prosjekter (ekskludert nåværende)
            let forbruktPaAndreProsjekter = 0;
            const andreProsjekter = [];

            for (const prosjekt of produserteProsjekter) {
                // Hopp over nåværende prosjekt hvis det er oppgitt
                if (navarendeProsjektId && prosjekt.id === navarendeProsjektId) {
                    continue;
                }

                // Summer kontraktssum fra alle tilbud for dette prosjektet
                let prosjektKontraktssum = 0;
                let harKontraktssum = false;

                if (prosjekt.tilbud && Array.isArray(prosjekt.tilbud)) {
                    for (const tilbud of prosjekt.tilbud) {
                        if (tilbud.beregning?.kontraktssum) {
                            prosjektKontraktssum += parseFloat(tilbud.beregning.kontraktssum.toString());
                            harKontraktssum = true;
                        }
                    }
                }

                if (harKontraktssum) {
                    forbruktPaAndreProsjekter += prosjektKontraktssum;
                    andreProsjekter.push({
                        prosjektId: prosjekt.id,
                        prosjektNavn: prosjekt.navn,
                        kontraktssum: prosjektKontraktssum,
                        antallTilbud: prosjekt.tilbud.length,
                        produkttype: prosjekt.tilbud[0]?.produkttype || 'Ukjent',
                        produsertDato: prosjekt.updated_at
                    });
                }
            }

            // Total forbruk inkludert nåværende prosjekt
            const totalForbruk = forbruktPaAndreProsjekter + navarendeProsjektBelop;

            // Tilgjengelig ramme (ekskludert nåværende prosjekt)
            const tilgjengeligRamme = totalRamme - forbruktPaAndreProsjekter;

            // Prosent av total ramme brukt
            const forbruksProsent = totalRamme > 0 ? (totalForbruk / totalRamme) * 100 : 0;

            // Bestem fargekoding basert på total forbruk
            let fargekode = 'grønn'; // Under 70%
            if (forbruksProsent >= 90) {
                fargekode = 'rød';
            } else if (forbruksProsent >= 70) {
                fargekode = 'gul';
            }

            const rammeInfo = {
                selskapId: selskapId,
                selskapsnavn: selskap.selskapsnavn,
                totalRamme: totalRamme,
                navarendeProsjektBelop: navarendeProsjektBelop,
                forbruktPaAndreProsjekter: forbruktPaAndreProsjekter,
                tilgjengeligRamme: tilgjengeligRamme,
                totalForbruk: totalForbruk,
                forbruksProsent: Math.round(forbruksProsent * 100) / 100,
                fargekode: fargekode,
                antallAndreProsjekter: andreProsjekter.length,
                andreProsjekter: andreProsjekter,
                sistOppdatert: new Date().toISOString()
            };

            electronLog.info(`Rammeforbruk hentet for selskap ${selskapId}: Nåværende: ${navarendeProsjektBelop}, Andre: ${forbruktPaAndreProsjekter}, Tilgjengelig: ${tilgjengeligRamme}/${totalRamme}`);
            return rammeInfo;

        } catch (error) {
            electronLog.error(`Feil i TilbudService.getRammeForbruk for selskap ${selskapId}:`, error);
            throw new Error(`Kunne ikke hente rammeforbruk: ${error.message}`);
        }
    }

    async validerRammeForbruk(selskapId, tilbudBelop) {
        if (!selskapId || !tilbudBelop) {
            throw new Error('Selskaps-ID og tilbudsbeløp er påkrevd for rammevalidering.');
        }

        try {
            const rammeInfo = await this.getRammeForbruk(selskapId);
            const tilbudBelopNum = parseFloat(tilbudBelop);

            const nyTilgjengeligRamme = rammeInfo.tilgjengeligRamme - tilbudBelopNum;
            const overskridelse = nyTilgjengeligRamme < 0;

            const validering = {
                gyldig: !overskridelse,
                tilbudBelop: tilbudBelopNum,
                gjeldendeTilgjengeligRamme: rammeInfo.tilgjengeligRamme,
                nyTilgjengeligRamme: nyTilgjengeligRamme,
                overskridelse: overskridelse,
                overskredetBelop: overskridelse ? Math.abs(nyTilgjengeligRamme) : 0,
                advarsel: rammeInfo.tilgjengeligRamme - tilbudBelopNum < rammeInfo.totalRamme * 0.1, // Advarsling hvis mindre enn 10% igjen
                rammeInfo: rammeInfo
            };

            electronLog.info(`Rammevalidering for selskap ${selskapId}, beløp ${tilbudBelop}: ${validering.gyldig ? 'GYLDIG' : 'UGYLDIG'}`);
            return validering;

        } catch (error) {
            electronLog.error(`Feil i TilbudService.validerRammeForbruk for selskap ${selskapId}:`, error);
            throw new Error(`Kunne ikke validere rammeforbruk: ${error.message}`);
        }
    }

    // VALIDERING OG HJELPEFUNKSJONER

    convertDecimalFieldsToStrings(tilbud) {
        if (!tilbud) return tilbud;

        // Lag en dyp kopi for å ikke endre original
        const converted = JSON.parse(JSON.stringify(tilbud, (key, value) => {
            // Konverter Decimal objekter til strenger
            if (value && typeof value === 'object' && value.constructor) {
                if (value.constructor.name === 'Decimal' || value.constructor.name === 'PrismaDecimal') {
                    return value.toString();
                }
            }
            return value;
        }));

        // Manuell konvertering av kjente Decimal-felter som backup
        if (converted.beregning) {
            const beregning = converted.beregning;
            if (beregning.kontraktssum && typeof beregning.kontraktssum === 'object') {
                beregning.kontraktssum = beregning.kontraktssum.toString();
            }
            if (beregning.rentesatsUtforelse && typeof beregning.rentesatsUtforelse === 'object') {
                beregning.rentesatsUtforelse = beregning.rentesatsUtforelse.toString();
            }
            if (beregning.rentesatsGaranti && typeof beregning.rentesatsGaranti === 'object') {
                beregning.rentesatsGaranti = beregning.rentesatsGaranti.toString();
            }
            if (beregning.etableringsgebyr && typeof beregning.etableringsgebyr === 'object') {
                beregning.etableringsgebyr = beregning.etableringsgebyr.toString();
            }
            if (beregning.totalPremie && typeof beregning.totalPremie === 'object') {
                beregning.totalPremie = beregning.totalPremie.toString();
            }
        }

        // Konverter benefisient andeler
        if (converted.benefisienter && Array.isArray(converted.benefisienter)) {
            converted.benefisienter.forEach(benefisient => {
                if (benefisient.andel && typeof benefisient.andel === 'object') {
                    benefisient.andel = benefisient.andel.toString();
                }
            });
        }

        // Konverter selskap ramme hvis det finnes
        if (converted.prosjekt && converted.prosjekt.selskap && converted.prosjekt.selskap.ramme && typeof converted.prosjekt.selskap.ramme === 'object') {
            converted.prosjekt.selskap.ramme = converted.prosjekt.selskap.ramme.toString();
        }

        return converted;
    }

    async validerTilbudsdata(tilbudData) {
        const feil = [];

        // Valider produkttype
        if (tilbudData.produkttype) {
            const produktConfig = await prisma.produktKonfigurasjon.findUnique({
                where: { produktnavn: tilbudData.produkttype }
            });
            if (!produktConfig) {
                feil.push(`Ugyldig produkttype: ${tilbudData.produkttype}`);
            }
        }

        // Tilbudsstatus følger nå prosjektstatusen, så ingen validering nødvendig

        if (feil.length > 0) {
            throw new Error(`Valideringsfeil: ${feil.join(', ')}`);
        }

        return true;
    }

    // STATUS BEREGNING

    /**
     * Beregner prosjektstatus basert på tilbudsstatus
     * Prioritet: Produsert > Godkjent > UnderUWBehandling > TilBehandling > Utkast
     */
    async beregnProsjektStatus(prosjektId) {
        try {
            const tilbudListe = await prisma.tilbud.findMany({
                where: { prosjektId: prosjektId },
                orderBy: { opprettetDato: 'desc' }
            });

            if (!tilbudListe || tilbudListe.length === 0) {
                return 'Ny'; // Ingen tilbud = ny prosjekt
            }

            // Statusprioritet (høyest til lavest)
            const statusPrioritet = {
                'Produsert': 6,
                'Godkjent': 5,
                'UnderUWBehandling': 4,
                'TilBehandling': 3,
                'Utkast': 2,
                'Avslatt': 1,
                'Utlopt': 1
            };

            // Finn høyeste prioritet
            let høyestePrioritet = 0;
            let høyesteStatus = 'Utkast';

            for (const tilbud of tilbudListe) {
                const prioritet = statusPrioritet[tilbud.status] || 0;
                if (prioritet > høyestePrioritet) {
                    høyestePrioritet = prioritet;
                    høyesteStatus = tilbud.status;
                }
            }

            // Sjekk om dette er et "utvides" scenario
            const harHistoriskProdusertTilbud = tilbudListe.some(t => t.status === 'Produsert');
            const harAktivtNyttTilbud = tilbudListe.some(t =>
                ['Utkast', 'TilBehandling', 'UnderUWBehandling', 'Godkjent'].includes(t.status)
            );

            if (harHistoriskProdusertTilbud && harAktivtNyttTilbud) {
                return 'Utvides';
            }

            // Map tilbudsstatus til prosjektstatus
            const statusMapping = {
                'Produsert': 'Produsert',
                'Godkjent': 'KlarTilProduksjon',
                'UnderUWBehandling': 'AvventerGodkjenningUW',
                'TilBehandling': 'Behandles',
                'Utkast': 'Tildelt',
                'Avslatt': 'Avslaatt',
                'Utlopt': 'Avslaatt'
            };

            return statusMapping[høyesteStatus] || 'Behandles';

        } catch (error) {
            electronLog.error(`Feil i beregnProsjektStatus for prosjekt ${prosjektId}:`, error);
            return 'Behandles'; // Fallback
        }
    }

    /**
     * Oppdaterer prosjektstatus basert på tilbudsstatus
     */
    async oppdaterProsjektStatus(prosjektId) {
        try {
            const nyStatus = await this.beregnProsjektStatus(prosjektId);

            await prisma.garantiProsjekt.update({
                where: { id: prosjektId },
                data: { status: nyStatus }
            });

            electronLog.info(`Prosjektstatus oppdatert til "${nyStatus}" for prosjekt ${prosjektId}`);
            return nyStatus;

        } catch (error) {
            electronLog.error(`Feil i oppdaterProsjektStatus for prosjekt ${prosjektId}:`, error);
            throw new Error(`Kunne ikke oppdatere prosjektstatus: ${error.message}`);
        }
    }
}

// Eksporter som singleton
const tilbudService = new TilbudService();
module.exports = tilbudService; 