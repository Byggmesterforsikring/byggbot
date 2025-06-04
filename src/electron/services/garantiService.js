const { GarantiProsjektStatus } = require('../../../prisma/generated/client');
const { BlobServiceClient, BlobSASPermissions, SASProtocol, generateBlobSASQueryParameters, StorageSharedKeyCredential } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const electronLog = require('electron-log');
const dotenv = require('dotenv');
const { ClientSecretCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

// Importer funksjonen for å hente PrismaClient-instansen
const getPrismaInstance = require('../../../prisma/client.js');
// Kall funksjonen for å få den faktiske instansen
const prisma = getPrismaInstance();

dotenv.config();

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING_GARANTI;
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME_GARANTI || 'garanti-dokumenter';

let blobServiceClient;
if (AZURE_STORAGE_CONNECTION_STRING) {
    try {
        blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        electronLog.info('SUCCESS: Azure Blob Service Client initialisert for Garanti.');
    } catch (error) {
        electronLog.error('FEIL: Kunne ikke initialisere Azure Blob Service Client for Garanti:', error);
    }
} else {
    electronLog.warn('INFO: Azure Blob Service Client for Garanti ble ikke initialisert fordi Connection String mangler.');
}

// Definerer statusverdier for Select-listen (gjenbrukes fra frontend)
const GARANTI_PROSJEKT_STATUS_OPTIONS = [
    { value: "Ny", label: "Ny" },
    { value: "Tildelt", label: "Tildelt" },
    { value: "Behandles", label: "Behandles" },
    { value: "Avslaatt", label: "Avslått" },
    { value: "Godkjent", label: "Godkjent" },
    { value: "AvventerGodkjenningUW", label: "Avventer Godkjenning UW" },
    { value: "KlarTilProduksjon", label: "Klar til Produksjon" },
    { value: "Produsert", label: "Produsert" }
];

// Hjelpefunksjon for å få visningsnavn for en status
const getStatusDisplayName = (statusValue) => {
    if (!statusValue) return statusValue; // Returner null/undefined som det er
    const option = GARANTI_PROSJEKT_STATUS_OPTIONS.find(opt => opt.value === statusValue);
    return option ? option.label : statusValue;
};

class GarantiService {
    async getStorageAccountKey() {
        const keyVaultName = process.env.AZURE_KEY_VAULT_NAME;
        const secretName = "byggbotgaranti-storage-account-key1"; // Navnet på secret i Key Vault

        const clientId = process.env.AZURE_CLIENT_ID;
        const clientSecret = process.env.AZURE_CLIENT_SECRET;
        const tenantId = process.env.AZURE_TENANT_ID;

        if (!keyVaultName || !clientId || !clientSecret || !tenantId) {
            electronLog.error("Mangler nødvendig konfigurasjon for Key Vault-tilgang i .env: AZURE_KEY_VAULT_NAME, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID");
            throw new Error("Konfigurasjonsfeil: Nødvendige verdier for Key Vault-tilgang mangler.");
        }

        try {
            electronLog.info(`Prøver å hente secret '${secretName}' fra Key Vault '${keyVaultName}' med Client ID: ${clientId.substring(0, 4)}...`);

            const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

            const vaultUrl = `https://${keyVaultName}.vault.azure.net`;
            const client = new SecretClient(vaultUrl, credential);

            const secret = await client.getSecret(secretName);

            if (secret && secret.value) {
                electronLog.info(`Lagringskontonøkkel hentet fra Key Vault secret: ${secretName}`);
                return secret.value;
            } else {
                electronLog.error(`Secret ${secretName} ikke funnet i Key Vault ${keyVaultName}, eller den har ingen verdi.`);
                throw new Error(`Secret ${secretName} ikke funnet eller er tom.`);
            }
        } catch (error) {
            electronLog.error(`Feil ved henting av secret '${secretName}' fra Key Vault '${keyVaultName}': Vault URL: ${`https://${keyVaultName}.vault.azure.net`}, Feil: ${error.message}`, error);
            if (error.statusCode === 404) {
                throw new Error(`Secret '${secretName}' ble ikke funnet i Key Vault '${keyVaultName}'. Sjekk navnet og appens tilganger.`);
            } else if (error.statusCode === 401 || error.statusCode === 403 || error.name === 'AuthenticationError') {
                throw new Error(`Autentiseringsfeil mot Key Vault '${keyVaultName}' for å hente '${secretName}'. Sjekk appens rettigheter og konfigurasjon (AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET).`);
            }
            throw new Error('Kunne ikke hente lagringskontonøkkel fra Key Vault. Se logger for detaljer.');
        }
    }

    async generateSasTokenUrl(containerName, blobName) {
        if (!blobServiceClient) {
            electronLog.error('Azure Blob Service Client er ikke initialisert. Kan ikke generere SAS-token.');
            throw new Error('Azure Blob Service Client er ikke initialisert.');
        }
        if (!containerName || !blobName) {
            throw new Error('Container-navn og blob-navn er påkrevd for å generere SAS-token.');
        }

        try {
            const accountName = blobServiceClient.accountName;
            const accountKey = await this.getStorageAccountKey();

            const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
            const blobClient = blobServiceClient.getContainerClient(containerName).getBlobClient(blobName);

            const sasOptions = {
                containerName: containerName,
                blobName: blobName,
                startsOn: new Date(),
                expiresOn: new Date(new Date().valueOf() + 15 * 60 * 1000), // 15 minutter gyldighet
                permissions: BlobSASPermissions.parse("r"),
                protocol: SASProtocol.Https
            };

            const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
            const sasUrl = `${blobClient.url}?${sasToken}`;

            electronLog.info(`Generert SAS URL for ${blobName}`);
            return sasUrl;

        } catch (error) {
            electronLog.error(`Feil ved generering av SAS-token for ${blobName}:`, error);
            throw new Error(`Kunne ikke generere sikker tilgangs-URL: ${error.message}`);
        }
    }

    async handleNewGuaranteeRequest(requestData, opprettetAvBrukerId_UserV2) {
        if (!requestData || Object.keys(requestData).length === 0) {
            throw new Error('RequestData er påkrevd.');
        }
        // VALIDER BRUKER-ID
        const numOpprettetAvBrukerId = parseInt(opprettetAvBrukerId_UserV2);
        if (isNaN(numOpprettetAvBrukerId)) {
            throw new Error('Ugyldig bruker-ID for den som oppretter (må være et tall).');
        }

        const {
            organisasjonsnummer,
            selskapsnavn, gateadresse, postnummer, poststed,
            kontaktpersonNavn, kontaktpersonTelefon, kundenummerWims, ramme,
            prosjektNavn,
            prosjektGateadresse, prosjektPostnummer, prosjektPoststed,
            prosjektKommune, prosjektKommunenummer,
            produkt, prosjektStatus, kommentarKunde,
            ansvarligRaadgiverId, uwAnsvarligId, produksjonsansvarligId
        } = requestData;

        if (!organisasjonsnummer) {
            throw new Error('Organisasjonsnummer er påkrevd.');
        }
        if (typeof organisasjonsnummer !== 'string' || organisasjonsnummer.length !== 9 || !/^\d+$/.test(organisasjonsnummer)) {
            throw new Error('Organisasjonsnummer må være en streng bestående av 9 siffer.');
        }

        let selskapId;

        try {
            const eksisterendeSelskap = await prisma.selskap.findUnique({
                where: { organisasjonsnummer: organisasjonsnummer },
            });

            if (eksisterendeSelskap) {
                selskapId = eksisterendeSelskap.id;
                electronLog.info(`Fant eksisterende selskap: ${eksisterendeSelskap.selskapsnavn} (ID: ${selskapId}) for org.nr: ${organisasjonsnummer}`);
            } else {
                if (!selskapsnavn) {
                    throw new Error('Selskapsnavn er påkrevd for å opprette et nytt selskap.');
                }
                const selskapsDataForCreate = {
                    organisasjonsnummer, selskapsnavn, gateadresse, postnummer, poststed,
                    kontaktpersonNavn, kontaktpersonTelefon, kundenummerWims, ramme
                };
                Object.keys(selskapsDataForCreate).forEach(key => selskapsDataForCreate[key] === undefined && delete selskapsDataForCreate[key]);

                electronLog.info(`Oppretter nytt selskap: ${selskapsnavn} (org.nr: ${organisasjonsnummer})`);
                const nyttSelskap = await this.createSelskap(selskapsDataForCreate, numOpprettetAvBrukerId);
                selskapId = nyttSelskap.id;
            }

            const prosjektDataForCreate = {
                navn: prosjektNavn,
                prosjektGateadresse, prosjektPostnummer, prosjektPoststed,
                prosjektKommune, prosjektKommunenummer,
                produkt, status: prosjektStatus, kommentarKunde,
                ansvarligRaadgiverId, uwAnsvarligId, produksjonsansvarligId
            };
            Object.keys(prosjektDataForCreate).forEach(key => prosjektDataForCreate[key] === undefined && delete prosjektDataForCreate[key]);

            electronLog.info(`Oppretter nytt prosjekt under selskap ID: ${selskapId}`);
            const nyttProsjekt = await this.createProsjekt(prosjektDataForCreate, selskapId, numOpprettetAvBrukerId);

            electronLog.info(`Ny garantiprosess håndtert: Prosjekt ID ${nyttProsjekt.id} for Selskap ID ${selskapId}`);
            return nyttProsjekt;

        } catch (error) {
            electronLog.error('Feil i GarantiService.handleNewGuaranteeRequest:', error);
            throw new Error(`Kunne ikke håndtere ny garantiforespørsel: ${error.message}`);
        }
    }

    async uploadDokument(entityContext, filBuffer, originaltFilnavn, dokumentType, opplastetAvId_UserV2) {
        if (!blobServiceClient) {
            electronLog.error('Azure Blob Service Client er ikke initialisert. Kan ikke laste opp fil.');
            throw new Error('Azure Blob Service Client er ikke initialisert. Sjekk konfigurasjon og serverlogger.');
        }
        // VALIDER BRUKER-ID
        const numOpplastetAvId = parseInt(opplastetAvId_UserV2);
        if (isNaN(numOpplastetAvId)) {
            throw new Error('Ugyldig bruker-ID for opplaster (må være et tall).');
        }
        if (!entityContext || !entityContext.id || !entityContext.type || !filBuffer || !originaltFilnavn || !dokumentType /* numOpplastetAvId er validert */) {
            throw new Error('Mangler påkrevde parametere for dokumentopplasting (entityContext, filBuffer, originaltFilnavn, dokumentType, opplastetAvId_UserV2).');
        }
        if (!['sak', 'selskap', 'prosjekt'].includes(entityContext.type)) {
            throw new Error('Ugyldig entityContext.type. Må være en av: sak, selskap, prosjekt.');
        }
        if (!(filBuffer instanceof Buffer)) {
            electronLog.error('filBuffer er ikke en Buffer. Faktisk type:', typeof filBuffer);
            throw new Error('Ugyldig filformat for opplasting (forventet Buffer).');
        }

        const { id: entityId, type: entityType } = entityContext;

        try {
            const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
            const blobNavn = `${uuidv4()}-${originaltFilnavn.replace(/[^a-zA-Z0-9._-]/g, '')}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobNavn);

            electronLog.info(`Laster opp fil: ${originaltFilnavn} (${(filBuffer.length / 1024).toFixed(2)} KB) til Azure som: ${blobNavn} for ${entityType} ID: ${entityId}`);
            await blockBlobClient.uploadData(filBuffer);
            const blobUrl = blockBlobClient.url;
            electronLog.info(`Fil lastet opp til: ${blobUrl}`);

            const dokumentData = {
                dokumentType: dokumentType,
                filnavn: originaltFilnavn,
                blobUrl: blobUrl,
                containerNavn: AZURE_STORAGE_CONTAINER_NAME,
                blobNavn: blobNavn,
                opplastetAvId: numOpplastetAvId,
            };

            if (entityType === 'sak') {
                dokumentData.sakId = entityId;
            } else if (entityType === 'selskap') {
                dokumentData.selskapId = entityId;
            } else if (entityType === 'prosjekt') {
                dokumentData.prosjektId = entityId;
            }

            const nyttDokument = await prisma.garantiSakDokument.create({
                data: dokumentData,
            });

            const hendelseData = {
                hendelseType: 'DOKUMENT_LASTET_OPP',
                beskrivelse: `Fil: ${originaltFilnavn} | Type: ${dokumentType}`,
                utfoertAvId: numOpplastetAvId,
            };

            if (entityType === 'sak') {
                hendelseData.sakId = entityId;
            } else if (entityType === 'selskap') {
                hendelseData.selskapId = entityId;
            } else if (entityType === 'prosjekt') {
                hendelseData.prosjektId = entityId;
            }

            await prisma.garantiSakHendelse.create({ data: hendelseData });

            electronLog.info(`Dokument ${nyttDokument.id} lagret for ${entityType} ${entityId}`);
            return nyttDokument;

        } catch (error) {
            electronLog.error(`Feil i GarantiService.uploadDokument for ${entityType} ${entityId}:`, error);
            if (error.code === 'P2003') {
                throw new Error(`Kunne ikke laste opp dokument: Den tilknyttede ${entityType} med ID ${entityId} finnes ikke, eller en annen nøkkelreferanse feilet.`);
            }
            throw new Error(`Kunne ikke laste opp dokument: ${error.message}`);
        }
    }

    async getUsersV2(filterParams = {}) {
        try {
            electronLog.info('Henter UserV2 brukere med filter:', filterParams);
            const users = await prisma.userV2.findMany({
                where: {
                    is_active: true,
                    // TODO: Implementer rollefiltrering hvis filterParams.roleName er satt
                    // roller: filterParams.roleName ? { some: { role: { role_name: filterParams.roleName } } } : undefined
                },
                include: {
                    roller: { include: { role: true } }
                },
                orderBy: { navn: 'asc' }
            });
            return users.map(u => ({
                id: u.id,
                navn: u.navn || u.email,
                email: u.email,
                user_type: u.user_type,
                is_active: u.is_active,
                roller: u.roller.map(ur => ur.role.role_name)
            }));
        } catch (error) {
            electronLog.error('Feil i GarantiService.getUsersV2:', error);
            throw new Error(`Kunne ikke hente V2-brukere: ${error.message}`);
        }
    }

    async getSelskapById(selskapId) {
        if (!selskapId) {
            throw new Error('Selskaps-ID er påkrevd.');
        }
        try {
            const selskap = await prisma.selskap.findUnique({
                where: { id: selskapId },
                include: {
                    prosjekter: {
                        orderBy: { updated_at: 'desc' },
                        select: { // Velg kun nøkkelinfo for listevisning på selskapsiden
                            id: true,
                            navn: true,
                            status: true,
                            produkt: true,
                            updated_at: true
                        }
                    },
                    dokumenter: {
                        orderBy: { opplastetDato: 'desc' },
                        include: { opplastetAv: { select: { id: true, navn: true, email: true } } }
                    },
                    hendelser: {
                        orderBy: { dato: 'desc' },
                        include: { utfoertAv: { select: { id: true, navn: true, email: true } } }
                    },
                    interneKommentarer: {
                        orderBy: { opprettet_dato: 'desc' },
                        include: { opprettetAv: { select: { id: true, navn: true, email: true } } }
                    }
                },
            });
            if (!selskap) {
                electronLog.warn(`Fant ingen selskap med ID: ${selskapId}`);
                return null;
            }
            electronLog.info(`Selskap hentet med ID ${selskapId}: ${selskap.selskapsnavn}`);
            return selskap;
        } catch (error) {
            electronLog.error(`Feil i GarantiService.getSelskapById for ID ${selskapId}:`, error);
            throw new Error(`Kunne ikke hente selskap: ${error.message}`);
        }
    }

    async createSelskap(selskapData, opprettetAvBrukerId_UserV2) {
        const numOpprettetAvBrukerId = parseInt(opprettetAvBrukerId_UserV2);
        if (isNaN(numOpprettetAvBrukerId)) {
            throw new Error('Ugyldig bruker-ID for den som oppretter (må være et tall).');
        }
        if (!selskapData) {
            throw new Error('Selskapsdata er påkrevd.');
        }

        const {
            organisasjonsnummer,
            selskapsnavn,
            gateadresse,
            postnummer,
            poststed,
            kontaktpersonNavn,
            kontaktpersonTelefon,
            kundenummerWims,
            ramme,
            // Nye Brreg-felter
            organisasjonsformBeskrivelse,
            forretningsKommune,
            forretningsKommunenummer,
            stiftelsesdato, // Forventes som YYYY-MM-DD streng eller null
            antallAnsatte,  // Forventes som integer eller null
            naeringskode1Beskrivelse,
            hjemmeside
        } = selskapData;

        if (!organisasjonsnummer || !selskapsnavn) {
            throw new Error('Organisasjonsnummer og selskapsnavn er påkrevd for å opprette et selskap.');
        }
        if (typeof organisasjonsnummer !== 'string' || organisasjonsnummer.length !== 9 || !/^\d+$/.test(organisasjonsnummer)) {
            throw new Error('Organisasjonsnummer må være en streng bestående av 9 siffer.');
        }

        try {
            const dataForCreate = {
                organisasjonsnummer,
                selskapsnavn,
                gateadresse: gateadresse || null,
                postnummer: postnummer || null,
                poststed: poststed || null,
                kontaktpersonNavn: kontaktpersonNavn || null,
                kontaktpersonTelefon: kontaktpersonTelefon || null,
                kundenummerWims: kundenummerWims || null,
                ramme: ramme || null,
                // Nye Brreg-felter
                organisasjonsformBeskrivelse: organisasjonsformBeskrivelse || null,
                forretningsKommune: forretningsKommune || null,
                forretningsKommunenummer: forretningsKommunenummer || null,
                stiftelsesdato: stiftelsesdato ? new Date(stiftelsesdato) : null, // Konverter YYYY-MM-DD til Date-objekt
                antallAnsatte: antallAnsatte !== null && !isNaN(parseInt(antallAnsatte)) ? parseInt(antallAnsatte) : null,
                naeringskode1Beskrivelse: naeringskode1Beskrivelse || null,
                hjemmeside: hjemmeside || null,
                // Standardverdier for evt. andre påkrevde felter settes her om nødvendig
                hendelser: {
                    create: {
                        hendelseType: 'SELSKAP_OPPRETTET_BRREG', // Ny hendelsestype?
                        beskrivelse: `Selskap ${selskapsnavn} (org.nr: ${organisasjonsnummer}) ble opprettet (info fra Brreg).`,
                        utfoertAvId: numOpprettetAvBrukerId,
                    },
                },
            };

            // Nye debug-logger
            console.log('[GarantiService.createSelskap] DEBUG: Er prisma.selskap definert? Type:', typeof prisma.selskap, 'Keys:', Object.keys(prisma.selskap || {}));
            console.log('[GarantiService.createSelskap] DEBUG: Finnes organisasjonsformBeskrivelse i dataForCreate?:', 'organisasjonsformBeskrivelse' in dataForCreate, 'Verdi:', dataForCreate.organisasjonsformBeskrivelse);
            console.log('[GarantiService.createSelskap] DEBUG: Hele dataForCreate-objektet:', JSON.stringify(dataForCreate, null, 2));

            const nyttSelskap = await prisma.selskap.create({
                data: dataForCreate,
                include: {
                    prosjekter: true,
                    hendelser: { include: { utfoertAv: true } }
                }
            });

            electronLog.info(`Selskap ${nyttSelskap.id} (${nyttSelskap.selskapsnavn}) opprettet av bruker ${numOpprettetAvBrukerId}, med Brreg-data.`);
            return nyttSelskap;
        } catch (error) {
            electronLog.error('Feil i GarantiService.createSelskap (med Brreg-data):', error);
            if (error.code === 'P2002' && error.meta?.target?.includes('organisasjonsnummer')) {
                throw new Error('Et selskap med dette organisasjonsnummeret finnes allerede.');
            }
            throw new Error(`Kunne ikke opprette selskap: ${error.message}`);
        }
    }

    async findSelskap(searchTerm) {
        if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim() === '') {
            // Vurder om vi skal returnere alle selskaper, eller en tom liste, eller kaste feil.
            // For nå, returnerer tom liste hvis searchTerm er ugyldig/tomt.
            electronLog.info('findSelskap kalt med tomt eller ugyldig søketerm.');
            return [];
        }

        const searchTrimmed = searchTerm.trim();

        try {
            const selskaper = await prisma.selskap.findMany({
                where: {
                    OR: [
                        {
                            organisasjonsnummer: {
                                contains: searchTrimmed,
                                mode: 'insensitive', // Selv om org.nr er tall, kan bruker lime inn med whitespace e.l.
                            },
                        },
                        {
                            selskapsnavn: {
                                contains: searchTrimmed,
                                mode: 'insensitive',
                            },
                        },
                        {
                            kundenummerWims: {
                                contains: searchTrimmed,
                                mode: 'insensitive',
                            },
                        },
                    ],
                },
                select: { // Velg felter som er nyttige for en listevisning
                    id: true,
                    organisasjonsnummer: true,
                    selskapsnavn: true,
                    kundenummerWims: true,
                    poststed: true, // Kan være nyttig for å skille selskaper med liknende navn
                    _count: { // Inkluder antall prosjekter
                        select: { prosjekter: true },
                    },
                    // Vurder å inkludere `ramme` eller `status` hvis det er viktig for oversikten
                },
                orderBy: {
                    selskapsnavn: 'asc',
                },
                take: 50, // Begrens antall resultater for å unngå overveldende lister
            });

            electronLog.info(`Søk etter selskaper med term "${searchTrimmed}" returnerte ${selskaper.length} resultater.`);
            return selskaper;
        } catch (error) {
            electronLog.error(`Feil i GarantiService.findSelskap med søketerm "${searchTrimmed}":`, error);
            throw new Error(`Kunne ikke søke etter selskaper: ${error.message}`);
        }
    }

    async updateSelskap(selskapId, dataToUpdate, endretAvBrukerId_UserV2) {
        // VALIDER BRUKER-ID
        const numEndretAvBrukerId = parseInt(endretAvBrukerId_UserV2);
        if (isNaN(numEndretAvBrukerId)) {
            throw new Error('Ugyldig bruker-ID for den som endrer (må være et tall).');
        }
        if (!selskapId || !dataToUpdate || Object.keys(dataToUpdate).length === 0 /* numEndretAvBrukerId er validert */) {
            electronLog.warn('updateSelskap kalt med ugyldige parametere:', { selskapId, dataToUpdate, endretAvBrukerId_UserV2 });
            throw new Error("Selskaps-ID, data for oppdatering, og bruker-ID for den som endrer er påkrevd.");
        }

        // Definer tillatte felter for oppdatering på Selskap-modellen
        const tillatteSelskapsFelter = [
            'selskapsnavn', 'gateadresse', 'postnummer', 'poststed',
            'kontaktpersonNavn', 'kontaktpersonTelefon', 'kundenummerWims', 'ramme'
            // Merk: organisasjonsnummer bør vanligvis ikke endres etter opprettelse.
        ];

        const validData = {};
        const endringerForLogg = [];

        try {
            const gammeltSelskap = await prisma.selskap.findUnique({
                where: { id: selskapId },
            });
            if (!gammeltSelskap) throw new Error(`Selskap med ID ${selskapId} ikke funnet.`);

            // Hjelpefunksjon for å formatere feltnavn for loggen (kan generaliseres senere)
            const getSelskapFeltVisningsnavn = (feltNokkel) => {
                const map = {
                    selskapsnavn: "Selskapsnavn",
                    gateadresse: "Gateadresse",
                    postnummer: "Postnummer",
                    poststed: "Poststed",
                    kontaktpersonNavn: "Kontaktperson navn",
                    kontaktpersonTelefon: "Kontaktperson telefon",
                    kundenummerWims: "Kundenummer Wims",
                    ramme: "Ramme"
                };
                return map[feltNokkel] || feltNokkel;
            };

            for (const key of tillatteSelskapsFelter) {
                if (dataToUpdate.hasOwnProperty(key)) {
                    let originalVerdiDb = gammeltSelskap[key];
                    let nyVerdiFraInput = dataToUpdate[key];

                    // Standardiser tomme strenger til null for konsistens, hvis det er ønskelig
                    if (nyVerdiFraInput === '') nyVerdiFraInput = null;
                    if (originalVerdiDb === '') originalVerdiDb = null;

                    if (originalVerdiDb !== nyVerdiFraInput) {
                        validData[key] = nyVerdiFraInput;
                        endringerForLogg.push(
                            `${getSelskapFeltVisningsnavn(key)} endret fra '${originalVerdiDb || 'ikke satt'}' til '${nyVerdiFraInput || 'ikke satt'}'`
                        );
                    }
                }
            }

            if (Object.keys(validData).length === 0) {
                electronLog.info(`Ingen faktiske dataendringer for selskap ${selskapId}. Returnerer eksisterende selskap.`);
                return this.getSelskapById(selskapId); // Returnerer med alle includes
            }

            // Utfør oppdateringen
            const oppdatertSelskap = await prisma.selskap.update({
                where: { id: selskapId },
                data: validData,
            });

            // Logg hendelsen
            if (endringerForLogg.length > 0) {
                const beskrivelse = 'Selskapsopplysninger oppdatert. Endringer: ' + endringerForLogg.join('; ') + '.';
                await prisma.garantiSakHendelse.create({
                    data: {
                        hendelseType: 'SELSKAP_OPPDATERT', // Ny hendelsestype
                        beskrivelse: beskrivelse,
                        utfoertAvId: numEndretAvBrukerId, // Bruk validert ID
                        selskapId: selskapId, // Koble hendelsen til selskapet
                    },
                });
            }

            electronLog.info(`Selskap ${selskapId} oppdatert. Endringer: ${endringerForLogg.join('; ')}`);
            return this.getSelskapById(selskapId); // Returner fullt objekt med oppdaterte data og relasjoner

        } catch (error) {
            electronLog.error(`Feil ved oppdatering av selskap ${selskapId}:`, error);
            if (error.code === 'P2025') { // "Record to update not found"
                throw new Error(`Kunne ikke oppdatere selskap: Selskap med ID ${selskapId} finnes ikke.`);
            }
            // Andre Prisma-feil eller generelle feil
            throw new Error(`Kunne ikke oppdatere selskap: ${error.message}`);
        }
    }

    async getProsjektById(prosjektId) {
        if (!prosjektId) {
            throw new Error('Prosjekt-ID er påkrevd.');
        }
        try {
            const prosjekt = await prisma.garantiProsjekt.findUnique({
                where: { id: prosjektId },
                include: {
                    selskap: {
                        select: {
                            id: true,
                            selskapsnavn: true,
                            organisasjonsnummer: true
                        }
                    },
                    ansvarligRaadgiver: { select: { id: true, email: true, navn: true } },
                    uwAnsvarlig: { select: { id: true, email: true, navn: true } },
                    produksjonsansvarlig: { select: { id: true, email: true, navn: true } },
                    dokumenter: {
                        orderBy: { opplastetDato: 'desc' },
                        include: { opplastetAv: { select: { id: true, navn: true, email: true } } }
                    },
                    hendelser: {
                        orderBy: { dato: 'desc' },
                        include: { utfoertAv: { select: { id: true, navn: true, email: true } } }
                    },
                    interneKommentarer: {
                        orderBy: { opprettet_dato: 'desc' },
                        include: { opprettetAv: { select: { id: true, navn: true, email: true } } }
                    }
                },
            });
            if (!prosjekt) {
                electronLog.warn(`Fant ingen prosjekt med ID: ${prosjektId}`);
                return null;
            }
            electronLog.info(`Prosjekt hentet med ID ${prosjektId}: ${prosjekt.navn || 'Navnløst prosjekt'}`);
            return prosjekt;
        } catch (error) {
            electronLog.error(`Feil i GarantiService.getProsjektById for ID ${prosjektId}:`, error);
            throw new Error(`Kunne ikke hente prosjekt: ${error.message}`);
        }
    }

    async createProsjekt(prosjektData, selskapId, opprettetAvBrukerId_UserV2) {
        // VALIDER BRUKER-ID
        const numOpprettetAvBrukerId = parseInt(opprettetAvBrukerId_UserV2);
        if (isNaN(numOpprettetAvBrukerId)) {
            throw new Error('Ugyldig bruker-ID for den som oppretter (må være et tall).');
        }
        if (!prosjektData || !selskapId /* numOpprettetAvBrukerId er validert */) {
            throw new Error('Prosjektdata, Selskaps-ID og Bruker-ID for den som oppretter er påkrevd.');
        }

        const {
            navn,
            ansvarligRaadgiverId,
            uwAnsvarligId,
            produksjonsansvarligId,
            status,
            ...restProsjektData
        } = prosjektData;

        try {
            const selskapFinnes = await prisma.selskap.findUnique({
                where: { id: selskapId },
            });
            if (!selskapFinnes) {
                throw new Error(`Selskap med ID ${selskapId} ble ikke funnet. Kan ikke opprette prosjekt.`);
            }

            const dataForCreate = {
                navn: navn,
                ...restProsjektData,
                selskap: {
                    connect: { id: selskapId },
                },
                status: status || GarantiProsjektStatus.Ny,
                hendelser: {
                    create: {
                        hendelseType: 'PROSJEKT_OPPRETTET',
                        beskrivelse: `Prosjekt "${navn || 'Navnløst prosjekt'}" ble opprettet under selskap ${selskapFinnes.selskapsnavn}.`,
                        utfoertAvId: numOpprettetAvBrukerId, // Bruk validert ID
                    },
                },
            };

            if (ansvarligRaadgiverId) {
                dataForCreate.ansvarligRaadgiver = { connect: { id: parseInt(ansvarligRaadgiverId) } };
            }
            if (uwAnsvarligId) {
                dataForCreate.uwAnsvarlig = { connect: { id: parseInt(uwAnsvarligId) } };
            }
            if (produksjonsansvarligId) {
                dataForCreate.produksjonsansvarlig = { connect: { id: parseInt(produksjonsansvarligId) } };
            }

            const nyttProsjekt = await prisma.garantiProsjekt.create({
                data: dataForCreate,
                include: {
                    selskap: { select: { id: true, selskapsnavn: true, organisasjonsnummer: true } },
                    hendelser: { include: { utfoertAv: true } },
                    ansvarligRaadgiver: true,
                    uwAnsvarlig: true,
                    produksjonsansvarlig: true,
                },
            });

            electronLog.info(`Prosjekt ${nyttProsjekt.id} ("${nyttProsjekt.navn || 'Navnløst'}") opprettet for selskap ${selskapId} av bruker ${numOpprettetAvBrukerId}.`);
            return nyttProsjekt;
        } catch (error) {
            electronLog.error('Feil i GarantiService.createProsjekt:', error);
            if (error.code === 'P2025') {
                throw new Error(`Kunne ikke opprette prosjekt: En relatert oppføring (f.eks. selskap eller ansvarlig bruker med ID) ble ikke funnet. Detaljer: ${error.message}`);
            }
            throw new Error(`Kunne ikke opprette prosjekt: ${error.message}`);
        }
    }

    async updateProsjekt(prosjektId, dataToUpdate, endretAvBrukerId_UserV2) {
        electronLog.info('garantiService.updateProsjekt kalt med:', { prosjektId, dataToUpdate, endretAvBrukerId_UserV2 });

        // VALIDER BRUKER-ID
        const numEndretAvBrukerId = parseInt(endretAvBrukerId_UserV2);
        if (isNaN(numEndretAvBrukerId)) {
            throw new Error('Ugyldig bruker-ID for den som endrer (må være et tall).');
        }

        const numProsjektId = typeof prosjektId === 'number' ? prosjektId : parseInt(prosjektId);
        if (isNaN(numProsjektId) && typeof prosjektId !== 'string') {
            throw new Error('Ugyldig prosjekt-ID format.');
        }
        const idForQuery = typeof prosjektId === 'string' && !isNaN(numProsjektId) ? numProsjektId : prosjektId;

        const tillatteProsjektFelter = [
            'navn', 'prosjektGateadresse', 'prosjektPostnummer', 'prosjektPoststed',
            'prosjektKommune', 'prosjektKommunenummer', 'status', 'produkt', 'kommentarKunde',
            'ansvarligRaadgiverId', 'uwAnsvarligId', 'produksjonsansvarligId'
        ];

        const validData = {};
        const endringerForLogg = [];
        let gammelStatusVerdi = null;

        try {
            const gammeltProsjekt = await prisma.garantiProsjekt.findUnique({
                where: { id: idForQuery },
                include: {
                    ansvarligRaadgiver: { select: { id: true, navn: true, email: true } },
                    uwAnsvarlig: { select: { id: true, navn: true, email: true } },
                    produksjonsansvarlig: { select: { id: true, navn: true, email: true } }
                }
            });

            if (!gammeltProsjekt) throw new Error(`Prosjekt med ID ${prosjektId} ikke funnet.`);
            gammelStatusVerdi = gammeltProsjekt.status;

            const getUserDisplayName = (userObj) => userObj ? (userObj.navn || userObj.email || `ID: ${userObj.id}`) : 'ikke satt';
            const getProsjektFeltVisningsnavn = (feltNokkel) => {
                const map = {
                    navn: "Prosjektnavn", prosjektGateadresse: "Prosjekt gateadresse", prosjektPostnummer: "Prosjekt postnummer",
                    prosjektPoststed: "Prosjekt poststed", prosjektKommune: "Prosjekt kommune", prosjektKommunenummer: "Prosjekt kommunenummer",
                    status: "Status", produkt: "Produkt", kommentarKunde: "Kommentar fra kunde",
                    ansvarligRaadgiverId: "Ansvarlig rådgiver", uwAnsvarligId: "UW ansvarlig", produksjonsansvarligId: "Produksjonsansvarlig"
                };
                return map[feltNokkel] || feltNokkel;
            };

            for (const key of tillatteProsjektFelter) {
                if (dataToUpdate.hasOwnProperty(key)) {
                    let originalVerdiDb = gammeltProsjekt[key];
                    let nyVerdiFraInput = dataToUpdate[key];

                    if (nyVerdiFraInput === '') nyVerdiFraInput = null;
                    if (originalVerdiDb === '') originalVerdiDb = null;

                    if (key.endsWith('Id') && key !== 'prosjektId' && key !== 'selskapId') {
                        const nyId = nyVerdiFraInput ? parseInt(nyVerdiFraInput) : null;
                        if (originalVerdiDb !== nyId) {
                            validData[key] = nyId; // Lagrer kun IDen for update
                            let gammelAnsvarligNavn = 'ikke satt';
                            if (key === 'ansvarligRaadgiverId' && gammeltProsjekt.ansvarligRaadgiver) gammelAnsvarligNavn = getUserDisplayName(gammeltProsjekt.ansvarligRaadgiver);
                            else if (key === 'uwAnsvarligId' && gammeltProsjekt.uwAnsvarlig) gammelAnsvarligNavn = getUserDisplayName(gammeltProsjekt.uwAnsvarlig);
                            else if (key === 'produksjonsansvarligId' && gammeltProsjekt.produksjonsansvarlig) gammelAnsvarligNavn = getUserDisplayName(gammeltProsjekt.produksjonsansvarlig);
                            else if (originalVerdiDb) gammelAnsvarligNavn = `ID: ${originalVerdiDb}`;

                            let nyAnsvarligNavn = 'ikke satt';
                            if (nyId) {
                                // For å få navnet på den nye ansvarlige for loggen, må vi hente brukeren.
                                // Dette er en ekstra DB-operasjon, men nødvendig for god logging.
                                const nyBruker = await prisma.userV2.findUnique({ where: { id: nyId }, select: { navn: true, email: true, id: true } });
                                if (nyBruker) nyAnsvarligNavn = getUserDisplayName(nyBruker);
                                else nyAnsvarligNavn = `ID: ${nyId} (bruker ikke funnet)`;
                            }
                            endringerForLogg.push(`${getProsjektFeltVisningsnavn(key)} endret fra '${gammelAnsvarligNavn}' til '${nyAnsvarligNavn}'`);
                        }
                    } else if (originalVerdiDb !== nyVerdiFraInput) {
                        validData[key] = nyVerdiFraInput;
                        let ovForLog = key === 'status' ? getStatusDisplayName(originalVerdiDb) : originalVerdiDb;
                        let nvForLog = key === 'status' ? getStatusDisplayName(nyVerdiFraInput) : nyVerdiFraInput;
                        endringerForLogg.push(
                            `${getProsjektFeltVisningsnavn(key)} endret fra '${ovForLog || 'ikke satt'}' til '${nvForLog || 'ikke satt'}'`
                        );
                    }
                }
            }

            if (validData.hasOwnProperty('ansvarligRaadgiverId') && validData.ansvarligRaadgiverId !== null && gammelStatusVerdi === GarantiProsjektStatus.Ny) {
                if (!validData.status || validData.status === GarantiProsjektStatus.Ny) {
                    if (gammelStatusVerdi !== GarantiProsjektStatus.Tildelt) {
                        validData.status = GarantiProsjektStatus.Tildelt;
                        // Legg til i loggen bare hvis status ikke allerede ble endret manuelt til Tildelt
                        if (!endringerForLogg.some(e => e.startsWith('Status endret fra') && e.includes('til ' + getStatusDisplayName(GarantiProsjektStatus.Tildelt)))) {
                            endringerForLogg.push(`Status automatisk endret fra '${getStatusDisplayName(gammelStatusVerdi)}' til '${getStatusDisplayName(GarantiProsjektStatus.Tildelt)}' pga. tildelt rådgiver.`);
                        }
                    }
                }
            }

            if (Object.keys(validData).length === 0 && endringerForLogg.every(e => !e.startsWith("Status automatisk endret"))) {
                if (!endringerForLogg.some(e => e.startsWith("Status endret fra"))) { // Også hvis det var en manuell statusendring som var den eneste endringen
                    electronLog.info(`Ingen faktiske dataendringer for prosjekt ${prosjektId}.`);
                    return this.getProsjektById(idForQuery);
                }
            }

            // Bygg dataForUpdate for Prisma, bruk connect for relasjoner hvis IDer er i validData
            const prismaUpdateData = { ...validData }; // Start med skalarverdier
            if (validData.ansvarligRaadgiverId !== undefined) {
                prismaUpdateData.ansvarligRaadgiver = validData.ansvarligRaadgiverId ? { connect: { id: validData.ansvarligRaadgiverId } } : { disconnect: true };
                delete prismaUpdateData.ansvarligRaadgiverId; // Fjern ID-feltet, bruk relasjon
            }
            if (validData.uwAnsvarligId !== undefined) {
                prismaUpdateData.uwAnsvarlig = validData.uwAnsvarligId ? { connect: { id: validData.uwAnsvarligId } } : { disconnect: true };
                delete prismaUpdateData.uwAnsvarligId;
            }
            if (validData.produksjonsansvarligId !== undefined) {
                prismaUpdateData.produksjonsansvarlig = validData.produksjonsansvarligId ? { connect: { id: validData.produksjonsansvarligId } } : { disconnect: true };
                delete prismaUpdateData.produksjonsansvarligId;
            }

            if (Object.keys(prismaUpdateData).length > 0) { // Bare oppdater hvis det er noe å oppdatere
                await prisma.garantiProsjekt.update({
                    where: { id: idForQuery },
                    data: prismaUpdateData,
                });
            } else if (endringerForLogg.length === 0) { // Hvis ingen skalarer OG ingen endringer i ansvarlige (som ville gitt logg)
                electronLog.info(`Ingen endringer å lagre for prosjekt ${prosjektId}.`);
                return this.getProsjektById(idForQuery);
            }

            if (endringerForLogg.length > 0) {
                const beskrivelse = 'Prosjektopplysninger oppdatert. Endringer: ' + endringerForLogg.join('; ') + '.';
                await prisma.garantiSakHendelse.create({
                    data: {
                        hendelseType: 'PROSJEKT_OPPDATERT',
                        beskrivelse: beskrivelse,
                        utfoertAvId: numEndretAvBrukerId, // Bruk validert ID
                        prosjektId: idForQuery,
                    },
                });
            }
            electronLog.info(`Prosjekt ${prosjektId} oppdatert. Logget endringer: ${endringerForLogg.join('; ')}`);
            return this.getProsjektById(idForQuery);
        } catch (error) {
            electronLog.error(`Feil ved oppdatering av prosjekt ${prosjektId}:`, error);
            if (error.code === 'P2025') {
                throw new Error(`Kunne ikke oppdatere prosjekt: Prosjekt med ID ${prosjektId} eller en relatert ansvarlig bruker finnes ikke.`);
            }
            throw new Error(`Kunne ikke oppdatere prosjekt: ${error.message}`);
        }
    }

    async addInternKommentar(entityContext, kommentarTekst, brukerId_UserV2) {
        // VALIDER BRUKER-ID
        const numBrukerId = parseInt(brukerId_UserV2);
        if (isNaN(numBrukerId)) {
            throw new Error('Ugyldig bruker-ID (må være et tall).');
        }
        if (!entityContext || !entityContext.id || !entityContext.type || !kommentarTekst /* numBrukerId er validert */) {
            throw new Error("EntityContext (type, id), kommentartekst og bruker-ID er påkrevd.");
        }
        if (!['sak', 'selskap', 'prosjekt'].includes(entityContext.type)) {
            throw new Error('Ugyldig entityContext.type. Må være en av: sak, selskap, prosjekt.');
        }

        const { id: entityId, type: entityType } = entityContext;

        try {
            const kommentarData = {
                kommentar: kommentarTekst,
                opprettet_av_id: numBrukerId, // Bruk validert ID
            };

            if (entityType === 'sak') {
                kommentarData.garanti_sak_id = entityId;
            } else if (entityType === 'selskap') {
                kommentarData.selskapId = entityId;
            } else if (entityType === 'prosjekt') {
                kommentarData.prosjektId = entityId;
            }

            const nyKommentar = await prisma.garantiSakInternKommentar.create({
                data: kommentarData,
                include: {
                    opprettetAv: { select: { id: true, navn: true, email: true } }
                }
            });

            const hendelseData = {
                hendelseType: 'INTERN_KOMMENTAR_LAGT_TIL',
                beskrivelse: `Ny intern kommentar lagt til ${entityType}.`,
                utfoertAvId: numBrukerId, // Bruk validert ID
            };

            if (entityType === 'sak') {
                hendelseData.sakId = entityId;
            } else if (entityType === 'selskap') {
                hendelseData.selskapId = entityId;
            } else if (entityType === 'prosjekt') {
                hendelseData.prosjektId = entityId;
            }

            await prisma.garantiSakHendelse.create({ data: hendelseData });

            electronLog.info(`Ny intern kommentar lagt til ${entityType} ${entityId} av bruker ${numBrukerId}`);
            return nyKommentar;

        } catch (error) {
            electronLog.error(`Feil ved lagring av intern kommentar for ${entityType} ${entityId}:`, error);
            if (error.code === 'P2003') {
                throw new Error(`Kunne ikke lagre kommentar: Den tilknyttede ${entityType} med ID ${entityId} finnes ikke, eller en annen nøkkelreferanse feilet.`);
            }
            throw new Error(`Kunne ikke lagre intern kommentar: ${error.message}`);
        }
    }

    async getProsjekter(filterParams = {}) {
        electronLog.info('GarantiService: Henter prosjekter med filter:', filterParams);

        const {
            searchTerm,
            opprettetEtter, opprettetFor,
            endretEtter, endretFor,
            status,
            ansvarligRaadgiverId,
            uwAnsvarligId,
            produksjonsansvarligId,
            sortBy, // f.eks. 'opprettetDato', 'updated_at', 'navn'
            sortOrder, // 'asc' eller 'desc'
            take // antall resultater å hente
        } = filterParams;

        const whereClause = {};

        // Fritekstsøk
        if (searchTerm && searchTerm.trim()) {
            whereClause.OR = [
                {
                    navn: {
                        contains: searchTerm.trim(),
                        mode: 'insensitive',
                    },
                },
                {
                    selskap: {
                        selskapsnavn: {
                            contains: searchTerm.trim(),
                            mode: 'insensitive',
                        },
                    },
                },
                {
                    selskap: {
                        organisasjonsnummer: {
                            contains: searchTerm.trim(),
                            mode: 'insensitive',
                        },
                    },
                },
            ];
        }

        // Dato-filtre for opprettelse
        if (opprettetEtter || opprettetFor) {
            whereClause.opprettetDato = {};
            if (opprettetEtter) whereClause.opprettetDato.gte = new Date(opprettetEtter);
            if (opprettetFor) {
                const forDato = new Date(opprettetFor);
                forDato.setHours(23, 59, 59, 999);
                whereClause.opprettetDato.lte = forDato;
            }
        }

        // Dato-filtre for endring
        if (endretEtter || endretFor) {
            whereClause.updated_at = {};
            if (endretEtter) whereClause.updated_at.gte = new Date(endretEtter);
            if (endretFor) {
                const forDato = new Date(endretFor);
                forDato.setHours(23, 59, 59, 999);
                whereClause.updated_at.lte = forDato;
            }
        }

        // Status-filter
        if (status) {
            whereClause.status = status;
        }

        // Person-filtre
        if (ansvarligRaadgiverId) {
            whereClause.ansvarligRaadgiverId = parseInt(ansvarligRaadgiverId);
        }
        if (uwAnsvarligId) {
            whereClause.uwAnsvarligId = parseInt(uwAnsvarligId);
        }
        if (produksjonsansvarligId) {
            whereClause.produksjonsansvarligId = parseInt(produksjonsansvarligId);
        }

        // Sortering
        const orderByClause = [];
        if (sortBy && sortOrder) {
            const validSortByFields = {
                'opprettetDato': 'opprettetDato',
                'updated_at': 'updated_at',
                'navn': 'navn',
                'status': 'status'
            };
            if (validSortByFields[sortBy]) {
                orderByClause.push({ [validSortByFields[sortBy]]: sortOrder.toLowerCase() });
            }
        }
        // Fallback/default sortering
        if (orderByClause.length === 0) {
            orderByClause.push({ updated_at: 'desc' });
        }

        const queryOptions = {
            where: whereClause,
            include: {
                selskap: {
                    select: {
                        id: true,
                        selskapsnavn: true,
                        organisasjonsnummer: true,
                    },
                },
                ansvarligRaadgiver: {
                    select: {
                        id: true,
                        navn: true,
                        email: true
                    },
                },
                uwAnsvarlig: {
                    select: {
                        id: true,
                        navn: true,
                        email: true
                    },
                },
                produksjonsansvarlig: {
                    select: {
                        id: true,
                        navn: true,
                        email: true
                    },
                },
                _count: {
                    select: {
                        dokumenter: true,
                        hendelser: true,
                        interneKommentarer: true
                    },
                },
            },
            orderBy: orderByClause,
        };

        if (take && !isNaN(parseInt(take))) {
            queryOptions.take = parseInt(take);
        }

        try {
            const prosjekter = await prisma.garantiProsjekt.findMany(queryOptions);

            electronLog.info(`Hentet ${prosjekter.length} prosjekter med gjeldende filtre/opsjoner.`);
            return prosjekter;
        } catch (error) {
            electronLog.error('Feil i GarantiService.getProsjekter:', error);
            throw new Error(`Kunne ikke hente garantiprosjekter: ${error.message}`);
        }
    }

    async getAnsvarligePersoner() {
        try {
            electronLog.info('GarantiService: Henter tilgjengelige ansvarlige personer for filtrering');

            // Hent unike rådgivere som har vært tildelt prosjekter
            const raadgivere = await prisma.userV2.findMany({
                where: {
                    is_active: true,
                    AND: {
                        OR: [
                            {
                                prosjektAnsvarligRaadgiver: {
                                    some: {}
                                }
                            },
                            // Inkluder også brukere med relevante roller selv om de ikke har prosjekter ennå
                            {
                                roller: {
                                    some: {
                                        role: {
                                            role_name: {
                                                in: ['RAADGIVER', 'ADMIN', 'SUPER_USER']
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                },
                select: {
                    id: true,
                    navn: true,
                    email: true
                },
                orderBy: {
                    navn: 'asc'
                }
            });

            // Hent unike UW ansvarlige
            const uwAnsvarlige = await prisma.userV2.findMany({
                where: {
                    is_active: true,
                    AND: {
                        OR: [
                            {
                                prosjektUwAnsvarlig: {
                                    some: {}
                                }
                            },
                            // Inkluder også brukere med UW-roller
                            {
                                roller: {
                                    some: {
                                        role: {
                                            role_name: {
                                                in: ['UW', 'UNDERWRITER', 'ADMIN', 'SUPER_USER']
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                },
                select: {
                    id: true,
                    navn: true,
                    email: true
                },
                orderBy: {
                    navn: 'asc'
                }
            });

            // Hent unike produksjonsansvarlige
            const produksjonsansvarlige = await prisma.userV2.findMany({
                where: {
                    is_active: true,
                    AND: {
                        OR: [
                            {
                                prosjektProduksjonsansvarlig: {
                                    some: {}
                                }
                            },
                            // Inkluder også brukere med produksjonsroller
                            {
                                roller: {
                                    some: {
                                        role: {
                                            role_name: {
                                                in: ['PRODUKSJON', 'ADMIN', 'SUPER_USER']
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                },
                select: {
                    id: true,
                    navn: true,
                    email: true
                },
                orderBy: {
                    navn: 'asc'
                }
            });

            electronLog.info(`Hentet ${raadgivere.length} rådgivere, ${uwAnsvarlige.length} UW ansvarlige, ${produksjonsansvarlige.length} produksjonsansvarlige`);

            return {
                raadgivere: raadgivere,
                uwAnsvarlige: uwAnsvarlige,
                produksjonsansvarlige: produksjonsansvarlige
            };

        } catch (error) {
            electronLog.error('Feil i GarantiService.getAnsvarligePersoner:', error);
            throw new Error(`Kunne ikke hente ansvarlige personer: ${error.message}`);
        }
    }

    async getSelskaper(filterParams = {}) {
        electronLog.info('GarantiService: Henter selskaper med filter:', filterParams);
        const {
            opprettetEtter, opprettetFor,
            endretEtter, endretFor,
            ansvarligId, /* Foreløpig ikke implementert */
            sortBy, // Ny: f.eks. 'opprettetDato', 'updated_at', 'selskapsnavn'
            sortOrder, // Ny: 'asc' eller 'desc'
            take // Ny: antall resultater å hente (for "siste X")
        } = filterParams;

        const whereClause = {};

        if (opprettetEtter || opprettetFor) {
            whereClause.opprettetDato = {};
            if (opprettetEtter) whereClause.opprettetDato.gte = new Date(opprettetEtter);
            if (opprettetFor) {
                const forDato = new Date(opprettetFor);
                forDato.setHours(23, 59, 59, 999);
                whereClause.opprettetDato.lte = forDato;
            }
        }

        if (endretEtter || endretFor) {
            whereClause.updated_at = {};
            if (endretEtter) whereClause.updated_at.gte = new Date(endretEtter);
            if (endretFor) {
                const forDato = new Date(endretFor);
                forDato.setHours(23, 59, 59, 999);
                whereClause.updated_at.lte = forDato;
            }
        }

        // TODO: Implementer filtrering på ansvarligId

        const orderByClause = [];
        if (sortBy && sortOrder) {
            const validSortByFields = {
                'opprettetDato': 'opprettetDato',
                'updated_at': 'updated_at',
                'selskapsnavn': 'selskapsnavn'
            };
            if (validSortByFields[sortBy]) {
                orderByClause.push({ [validSortByFields[sortBy]]: sortOrder.toLowerCase() });
            }
        }
        // Fallback/default sortering hvis ingenting er spesifisert eller ugyldig
        if (orderByClause.length === 0) {
            orderByClause.push({ updated_at: 'desc' });
            orderByClause.push({ selskapsnavn: 'asc' });
        }

        const queryOptions = {
            where: whereClause,
            select: {
                id: true,
                organisasjonsnummer: true,
                selskapsnavn: true,
                kundenummerWims: true,
                poststed: true,
                opprettetDato: true,
                updated_at: true,
                _count: {
                    select: { prosjekter: true },
                },
            },
            orderBy: orderByClause,
        };

        if (take && !isNaN(parseInt(take))) {
            queryOptions.take = parseInt(take);
        }

        try {
            const selskaper = await prisma.selskap.findMany(queryOptions);
            electronLog.info(`Hentet ${selskaper.length} selskaper med gjeldende filtre/opsjoner.`);
            return selskaper;
        } catch (error) {
            electronLog.error('Feil i GarantiService.getSelskaper:', error);
            throw new Error(`Kunne ikke hente selskaper: ${error.message}`);
        }
    }
}

module.exports = new GarantiService(); 