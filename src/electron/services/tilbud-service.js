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
            // Sjekk om det allerede finnes et tilbud for dette prosjektet (1:1 relasjon)
            const eksisterendeTilbud = await prisma.tilbud.findUnique({
                where: { prosjektId: prosjektId }
            });

            if (eksisterendeTilbud) {
                throw new Error('Det finnes allerede et tilbud for dette prosjektet. Kun ett tilbud per prosjekt er tillatt.');
            }

            // Valider at prosjektet finnes
            const prosjekt = await prisma.garantiProsjekt.findUnique({
                where: { id: prosjektId },
                include: { selskap: true }
            });

            if (!prosjekt) {
                throw new Error(`Prosjekt med ID ${prosjektId} finnes ikke.`);
            }

            // Opprett tilbudet
            const dataForCreate = {
                prosjektId: prosjektId,
                status: tilbudData.status || 'Utkast', // Default status, men følger prosjektets status
                produkttype: tilbudData.produkttype || null,
                opprettetAv: numOpprettetAvBrukerId,
                endretAv: numOpprettetAvBrukerId,
                versjonsnummer: 1
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
            return nyttTilbud;

        } catch (error) {
            electronLog.error(`Feil i TilbudService.createTilbud for prosjekt ${prosjektId}:`, error);
            throw new Error(`Kunne ikke opprette tilbud: ${error.message}`);
        }
    }

    async getTilbudByProsjektId(prosjektId) {
        if (!prosjektId) {
            throw new Error('Prosjekt-ID er påkrevd for å hente tilbud.');
        }

        try {
            const tilbud = await prisma.tilbud.findUnique({
                where: { prosjektId: prosjektId },
                include: {
                    prosjekt: {
                        include: { selskap: true }
                    },
                    opprettetAvUser: { select: { id: true, navn: true, email: true } },
                    endretAvUser: { select: { id: true, navn: true, email: true } },
                    beregning: true,
                    benefisienter: {
                        orderBy: { opprettetDato: 'asc' }
                    }
                }
            });

            if (tilbud) {
                electronLog.info(`Tilbud hentet for prosjekt ${prosjektId}: ${tilbud.id}`);

                // Konverter Decimal-objekter til strenger før retur
                const konvertertTilbud = this.convertDecimalFieldsToStrings(tilbud);
                return konvertertTilbud;
            } else {
                electronLog.info(`Ingen tilbud funnet for prosjekt ${prosjektId}`);
                return null;
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
                sistEndret: new Date()
            };

            // Versjonsnummer økes nå basert på andre endringer, ikke status
            // (Status følger prosjektet og er ikke tilbudsspesifikk lenger)

            const oppdatertTilbud = await prisma.tilbud.update({
                where: { id: tilbudId },
                data: updateData,
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

            // Statusendringer håndteres nå på prosjektnivå, ikke tilbudsnivå

            electronLog.info(`Tilbud ${tilbudId} oppdatert av bruker ${numEndretAvBrukerId}`);
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

    async getBenefisienter(tilbudId) {
        if (!tilbudId) {
            throw new Error('Tilbud-ID er påkrevd for å hente benefisienter.');
        }

        try {
            const benefisienter = await prisma.benefisient.findMany({
                where: { tilbudId: tilbudId },
                orderBy: { opprettetDato: 'asc' }
            });

            electronLog.info(`Hentet ${benefisienter.length} benefisienter for tilbud ${tilbudId}`);

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
            const { type, navn, organisasjonsnummer, personident, andel, kontaktinformasjon } = benefisientData;

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

            // Sjekk at total andel ikke overstiger 100%
            const eksisterendeBenefisienter = await prisma.benefisient.findMany({
                where: { tilbudId: tilbudId }
            });

            const totalEksisterendeAndel = eksisterendeBenefisienter.reduce((sum, b) =>
                sum + parseFloat(b.andel.toString()), 0);

            if (totalEksisterendeAndel + parseFloat(andel) > 100) {
                throw new Error(`Total andel kan ikke overskride 100%. Gjenstående: ${100 - totalEksisterendeAndel}%`);
            }

            const dataForCreate = {
                tilbudId: tilbudId,
                type: type,
                navn: navn,
                organisasjonsnummer: type === BenefisientType.Juridisk ? organisasjonsnummer : null,
                personident: type === BenefisientType.Fysisk ? personident : null,
                andel: new Decimal(andel),
                kontaktinformasjon: kontaktinformasjon || null
            };

            const benefisient = await prisma.benefisient.create({
                data: dataForCreate
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

                // Sjekk total andel
                const andreBenefisienter = await prisma.benefisient.findMany({
                    where: {
                        tilbudId: eksisterendeBenefisient.tilbudId,
                        id: { not: benefisientId }
                    }
                });

                const totalAndreAndeler = andreBenefisienter.reduce((sum, b) =>
                    sum + parseFloat(b.andel.toString()), 0);

                if (totalAndreAndeler + parseFloat(dataToUpdate.andel) > 100) {
                    throw new Error(`Total andel kan ikke overskride 100%. Gjenstående: ${100 - totalAndreAndeler}%`);
                }

                dataToUpdate.andel = new Decimal(dataToUpdate.andel);
            }

            const oppdatertBenefisient = await prisma.benefisient.update({
                where: { id: benefisientId },
                data: dataToUpdate
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

            await prisma.benefisient.delete({
                where: { id: benefisientId }
            });

            electronLog.info(`Benefisient ${benefisientId} slettet`);

        } catch (error) {
            electronLog.error(`Feil i TilbudService.deleteBenefisient for benefisient ${benefisientId}:`, error);
            throw new Error(`Kunne ikke slette benefisient: ${error.message}`);
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
                        isNot: null // Kun prosjekter som har et tilbud
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

                if (navarendeProsjekt?.tilbud?.beregning?.kontraktssum) {
                    navarendeProsjektBelop = parseFloat(navarendeProsjekt.tilbud.beregning.kontraktssum.toString());
                }
            }

            // Beregn forbrukt ramme på andre prosjekter (ekskludert nåværende)
            let forbruktPaAndreProsjekter = 0;
            const andreProsjekter = [];

            for (const prosjekt of produserteProsjekter) {
                if (prosjekt.tilbud && prosjekt.tilbud.beregning && prosjekt.tilbud.beregning.kontraktssum) {
                    // Hopp over nåværende prosjekt hvis det er oppgitt
                    if (navarendeProsjektId && prosjekt.id === navarendeProsjektId) {
                        continue;
                    }

                    const kontraktssum = parseFloat(prosjekt.tilbud.beregning.kontraktssum.toString());
                    forbruktPaAndreProsjekter += kontraktssum;
                    andreProsjekter.push({
                        prosjektId: prosjekt.id,
                        prosjektNavn: prosjekt.navn,
                        kontraktssum: kontraktssum,
                        produkttype: prosjekt.tilbud.produkttype,
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
}

// Eksporter som singleton
const tilbudService = new TilbudService();
module.exports = tilbudService; 