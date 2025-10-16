// const { PrismaClient } = require('@prisma/client'); // Gammel import
const getPrismaInstance = require('./client.js'); // Bruk den sentraliserte instanshenteren
const prisma = getPrismaInstance();

// Definer prompt-teksten her slik at den er tilgjengelig i seed-scriptet
const DEFAULT_INVOICE_PROMPT_TEXT = `Dette er tekst ekstrahert fra en faktura:\n\n{{extracted_text}}\n\nEkstraher følgende felt og returner dem i JSON-format:\n- Skadenummer (Et 5-sifret nummer som starter med tallet 3. Returner null hvis ikke funnet.)\n- Registreringsnummer (Bilens registreringsnummer. Kan ha ulike formater som AB12345, DT98765 osv. Returner null hvis ikke funnet.)\n- KID (betalingsreferanse)\n- Kontonummer (bankkonto/IBAN)\n- Beløp (total sum å betale)\n- Mottaker navn (navn på leverandør/selskapet som har utstedt fakturaen)\n\nFor mottakerens adresse, finn den fullstendige adressen til SELSKAPET SOM HAR UTSTEDT FAKTURAEN (ikke adressen til betaleren).\nDel adressen opp slik:\n- Mottaker gateadresse (kun gate og husnummer)\n- Mottaker postnummer (kun postnummer)\n- Mottaker poststed (kun poststed)\n\nReturner data i følgende strenge JSON-format uten kommentarer:\n{\n  "skadenummer": "value or null",\n  "registreringsnummer": "value or null",\n  "kid": "value or null",\n  "kontonummer": "value or null",\n  "beloep": "value or null",\n  "mottaker_navn": "value or null",\n  "mottaker_gateadresse": "value or null",\n  "mottaker_postnummer": "value or null",\n  "mottaker_poststed": "value or null"\n}`;

async function main() {
    console.log(`Start seeding ...`);

    // 1. Opprett/Oppdater Roller (RoleV2)
    const adminRole = await prisma.roleV2.upsert({
        where: { role_name: 'ADMIN' },
        update: { description: 'Systemadministrator med alle rettigheter' },
        create: { role_name: 'ADMIN', description: 'Systemadministrator med alle rettigheter' },
    });
    console.log(`Created/updated role: ${adminRole.role_name} (ID: ${adminRole.id})`);

    const editorRole = await prisma.roleV2.upsert({
        where: { role_name: 'EDITOR' },
        update: { description: 'Redaktør med utvidede rettigheter' },
        create: { role_name: 'EDITOR', description: 'Redaktør med utvidede rettigheter' },
    });
    const userRole = await prisma.roleV2.upsert({
        where: { role_name: 'USER' },
        update: { description: 'Standardbruker' },
        create: { role_name: 'USER', description: 'Standardbruker' },
    });
    const garantiUserRole = await prisma.roleV2.upsert({
        where: { role_name: 'GARANTI_USER' },
        update: { description: 'Saksbehandler for garantier' },
        create: { role_name: 'GARANTI_USER', description: 'Saksbehandler for garantier' },
    });
    const skadeUserRole = await prisma.roleV2.upsert({
        where: { role_name: 'SKADE_USER' },
        update: { description: 'Saksbehandler for skader' },
        create: { role_name: 'SKADE_USER', description: 'Saksbehandler for skader' },
    });
    console.log('Roller opprettet/oppdatert.');

    // 2. Opprett/Oppdater Moduler
    const garantiModul = await prisma.modul.upsert({
        where: { navn: 'Garanti' },
        update: { beskrivelse: 'Tilgang til Garanti-modulen (Prosjekter, Selskaper)' },
        create: { navn: 'Garanti', beskrivelse: 'Tilgang til Garanti-modulen (Prosjekter, Selskaper)' },
    });
    const adminUserModul = await prisma.modul.upsert({
        where: { navn: 'AdminUserManagement' },
        update: { beskrivelse: 'Tilgang til å administrere brukere, roller og modultilganger' }, // Utvidet beskrivelse
        create: { navn: 'AdminUserManagement', beskrivelse: 'Tilgang til å administrere brukere, roller og modultilganger' },
    });
    const adminModulModul = await prisma.modul.upsert({
        where: { navn: 'AdminModulManagement' },
        update: { beskrivelse: 'Tilgang til å administrere applikasjonsmoduler' },
        create: { navn: 'AdminModulManagement', beskrivelse: 'Tilgang til å administrere applikasjonsmoduler' },
    });
    const rapporterModul = await prisma.modul.upsert({
        where: { navn: 'Rapporter' },
        update: { beskrivelse: 'Tilgang til rapporteringsmodulen' },
        create: { navn: 'Rapporter', beskrivelse: 'Tilgang til rapporteringsmodulen' },
    });
    const skadeModul = await prisma.modul.upsert({
        where: { navn: 'Skade' },
        update: { beskrivelse: 'Tilgang til skademodulen' },
        create: { navn: 'Skade', beskrivelse: 'Tilgang til skademodulen' },
    });
    const kalkulatorerModul = await prisma.modul.upsert({
        where: { navn: 'Kalkulatorer' },
        update: { beskrivelse: 'Tilgang til alle kalkulatorer' },
        create: { navn: 'Kalkulatorer', beskrivelse: 'Tilgang til alle kalkulatorer' },
    });
    const customReportsModul = await prisma.modul.upsert({
        where: { navn: 'CustomReports' },
        update: { beskrivelse: 'Tilgang til rapport-bygger for fleksible rapporter' },
        create: { navn: 'CustomReports', beskrivelse: 'Tilgang til rapport-bygger for fleksible rapporter' },
    });

    // Legg til de manglende modulene
    const dashboardModul = await prisma.modul.upsert({
        where: { navn: 'Dashboard' },
        update: { beskrivelse: 'Tilgang til dashboard og oversikt' },
        create: { navn: 'Dashboard', beskrivelse: 'Tilgang til dashboard og oversikt' },
    });
    const kundeanalyseModul = await prisma.modul.upsert({
        where: { navn: 'Kundeanalyse' },
        update: { beskrivelse: 'Tilgang til kundeanalyse og prediksjoner' },
        create: { navn: 'Kundeanalyse', beskrivelse: 'Tilgang til kundeanalyse og prediksjoner' },
    });
    const tegningsreglerModul = await prisma.modul.upsert({
        where: { navn: 'Tegningsregler' },
        update: { beskrivelse: 'Tilgang til tegningsregler og dokumentasjon' },
        create: { navn: 'Tegningsregler', beskrivelse: 'Tilgang til tegningsregler og dokumentasjon' },
    });
    const aiChatModul = await prisma.modul.upsert({
        where: { navn: 'AIChat' },
        update: { beskrivelse: 'Tilgang til ByggBot AI-assistent' },
        create: { navn: 'AIChat', beskrivelse: 'Tilgang til ByggBot AI-assistent' },
    });

    console.log('Moduler opprettet/oppdatert (inkludert nye moduler).');

    // 3. Opprett/Oppdater alle BMF brukere
    const brukere = [
        // ADMIN brukere - IT/Ledelse
        { email: 'oyvind@bmf.no', navn: 'Øyvind Håheim Bergesen', avdeling: 'IT/Forretningsutvikling', tittel: 'IT Manager', rolle: 'ADMIN' },
        { email: 'jostein.i@bmf.no', navn: 'Jostein Iversen', avdeling: 'Ledergruppen', tittel: 'COO', rolle: 'ADMIN' },
        { email: 'daniel@bmf.no', navn: 'Daniel Witting Johnsrud', avdeling: 'IT/Forretningsutvikling', tittel: 'Utvikler', rolle: 'ADMIN' },

        // Garanti-avdeling - EDITOR rolle (avdelingsleder)
        { email: 'cathrine@bmf.no', navn: 'Cathrine Lier Øygarden', avdeling: 'Garanti', tittel: 'Avdelingsleder', rolle: 'EDITOR' },
        { email: 'patrik@bmf.no', navn: 'Patrik Olsen Holmerud', avdeling: 'Garanti', tittel: 'Seniorrådgiver/Kredittanalytiker', rolle: 'GARANTI_USER' },

        // Skade-avdeling - SKADE_USER rolle  
        { email: 'ejh@bmf.no', navn: 'Eirik Jarle Holmlund', avdeling: 'Skade', tittel: 'Skadebehandler/Jurist', rolle: 'SKADE_USER' },
        { email: 'julianne@bmf.no', navn: 'Julianne N. Høgøy', avdeling: 'Skade', tittel: 'Skadebehandler', rolle: 'SKADE_USER' },

        // Forsikring/Faglig - EDITOR rolle
        { email: 'trond@bmf.no', navn: 'Trond Bystrøm', avdeling: 'Forsikring', tittel: 'Fagleder forsikring', rolle: 'EDITOR' },
        { email: 'nicolai@bmf.no', navn: 'Nicolai Dammyr', avdeling: 'Jus', tittel: 'Advokat MNA', rolle: 'EDITOR' },
        { email: 'jens@bmf.no', navn: 'Jens Christian Sundem', avdeling: 'Salg', tittel: 'Senior Selger', rolle: 'EDITOR' },

        // Ledelse/Senior - EDITOR rolle
        { email: 'kolbjorn@bmf.no', navn: 'Kolbjørn Røstelien', avdeling: 'Ledelse', tittel: 'Leder', rolle: 'EDITOR' },
        { email: 'kjell.aage@bmf.no', navn: 'Kjell Åge Krukhaug', avdeling: 'Salg', tittel: 'Senior Selger', rolle: 'EDITOR' },
        { email: 'simen@bmf.no', navn: 'Simen Gustav Haugvik', avdeling: 'Salg', tittel: 'Senior Selger', rolle: 'EDITOR' },

        // Generelle brukere - USER rolle
        { email: 'andreas@bmf.no', navn: 'Andreas Ringlund Hansen', avdeling: 'Salg', tittel: 'Selger', rolle: 'USER' },
        { email: 'eivind@bmf.no', navn: 'Eivind Killingmo', avdeling: 'Salg', tittel: 'Selger', rolle: 'USER' },
        { email: 'fredrik@bmf.no', navn: 'Fredrik Holberg', avdeling: 'Salg', tittel: 'Selger', rolle: 'USER' },
        { email: 'gro@bmf.no', navn: 'Gro Haug', avdeling: 'Administrasjon', tittel: 'Administrasjon', rolle: 'USER' },
        { email: 'jan.kaare@bmf.no', navn: 'Jan Kåre Tangen', avdeling: 'Salg', tittel: 'Selger', rolle: 'USER' },
        { email: 'kristian@bmf.no', navn: 'Kristian Jeksrud', avdeling: 'Salg', tittel: 'Selger', rolle: 'USER' },
        { email: 'Kurt@bmf.no', navn: 'Kurt Øystein Eikså', avdeling: 'Salg', tittel: 'Selger', rolle: 'USER' },
        { email: 'Martin@bmf.no', navn: 'Martin Whist', avdeling: 'Salg', tittel: 'Selger', rolle: 'USER' },
        { email: 'martine@bmf.no', navn: 'Martine Krukhaug', avdeling: 'Salg', tittel: 'Selger', rolle: 'USER' },
        { email: 'mona@bmf.no', navn: 'Mona Irene Smedbøl', avdeling: 'Administrasjon', tittel: 'Administrasjon', rolle: 'USER' },
        { email: 'nicolai.t@bmf.no', navn: 'Nicolai Tangen', avdeling: 'Salg', tittel: 'Selger', rolle: 'USER' },
        { email: 'ronny@bmf.no', navn: 'Ronny Dervo-Lehn', avdeling: 'Salg', tittel: 'Selger', rolle: 'USER' },
        { email: 'sivert@bmf.no', navn: 'Sivert Skog Røstelien', avdeling: 'Salg', tittel: 'Selger', rolle: 'USER' },
        { email: 'orjan@bmf.no', navn: 'Ørjan Tangen', avdeling: 'Salg', tittel: 'Selger', rolle: 'USER' },

        // Ekstern konsulent - EKSTERN brukertype
        { email: 'pkl@bmf.no', navn: 'Per Kristian Lundkvist', avdeling: 'Skade', tittel: 'Konsulent', rolle: 'USER', userType: 'EKSTERN' }
    ];

    console.log('Oppretter/oppdaterer alle BMF brukere...');
    const opprettedebrukere = [];

    for (const brukerData of brukere) {
        const bruker = await prisma.userV2.upsert({
            where: { email: brukerData.email },
            update: {
                navn: brukerData.navn,
                is_active: true,
                user_type: brukerData.userType || 'INTERN'
            },
            create: {
                email: brukerData.email,
                navn: brukerData.navn,
                is_active: true,
                user_type: brukerData.userType || 'INTERN'
            },
        });
        opprettedebrukere.push({ ...bruker, rolle: brukerData.rolle, avdeling: brukerData.avdeling });
        console.log(`Opprettet/oppdatert bruker: ${bruker.email} (ID: ${bruker.id}) - ${brukerData.rolle}`);
    }
    console.log(`Totalt opprettet/oppdatert ${opprettedebrukere.length} brukere.`);

    // 4. Knytt brukere til deres respektive roller
    console.log('Knytter brukere til roller...');
    for (const brukerInfo of opprettedebrukere) {
        let rolle;
        switch (brukerInfo.rolle) {
            case 'ADMIN':
                rolle = adminRole;
                break;
            case 'EDITOR':
                rolle = editorRole;
                break;
            case 'GARANTI_USER':
                rolle = garantiUserRole;
                break;
            case 'SKADE_USER':
                rolle = skadeUserRole;
                break;
            default:
                rolle = userRole;
        }

        await prisma.userRoleV2.upsert({
            where: {
                user_id_role_id: {
                    user_id: brukerInfo.id,
                    role_id: rolle.id,
                },
            },
            update: {},
            create: {
                user_id: brukerInfo.id,
                role_id: rolle.id,
            },
        });
        console.log(`Knyttet bruker ${brukerInfo.email} til rolle ${rolle.role_name}.`);
    }

    // 5. Gi brukere tilgang til moduler basert på deres roller
    console.log('Tildeler modultilganger basert på roller...');

    // Definer moduler for hver rolle
    const modulerPerRolle = {
        'ADMIN': [
            garantiModul.id,
            adminUserModul.id,
            adminModulModul.id,
            rapporterModul.id,
            skadeModul.id,
            kalkulatorerModul.id,
            customReportsModul.id,
            dashboardModul.id,
            kundeanalyseModul.id,
            tegningsreglerModul.id,
            aiChatModul.id
        ],
        'EDITOR': [
            garantiModul.id,
            rapporterModul.id,
            kalkulatorerModul.id,
            customReportsModul.id,
            dashboardModul.id,
            kundeanalyseModul.id,
            tegningsreglerModul.id,
            aiChatModul.id
        ],
        'GARANTI_USER': [
            garantiModul.id,
            rapporterModul.id,
            kalkulatorerModul.id,
            dashboardModul.id,
            aiChatModul.id
        ],
        'SKADE_USER': [
            skadeModul.id,
            rapporterModul.id,
            kalkulatorerModul.id,
            dashboardModul.id,
            aiChatModul.id
        ],
        'USER': [
            rapporterModul.id,
            kalkulatorerModul.id,
            dashboardModul.id,
            aiChatModul.id
        ]
    };

    // Optimaliser ved å samle alle modultilganger og opprette dem i batch
    const alleModulTilganger = [];

    for (const brukerInfo of opprettedebrukere) {
        const modulerForBruker = modulerPerRolle[brukerInfo.rolle] || modulerPerRolle['USER'];

        for (const modulId of modulerForBruker) {
            alleModulTilganger.push({
                userId: brukerInfo.id,
                modulId: modulId,
            });
        }
        console.log(`Planlegger ${modulerForBruker.length} modultilganger for ${brukerInfo.email} (${brukerInfo.rolle})`);
    }

    // Slett eksisterende tilganger først for å unngå konflikter
    console.log('Sletter eksisterende modultilganger...');
    await prisma.userModulTilgang.deleteMany({});

    // Opprett alle modultilganger i en batch
    console.log(`Oppretter ${alleModulTilganger.length} modultilganger i batch...`);
    await prisma.userModulTilgang.createMany({
        data: alleModulTilganger,
        skipDuplicates: true
    });
    console.log('Alle brukere tildelt modultilganger basert på roller.');

    // 6. Opprett/Oppdater System Prompts
    const existingInvoicePrompt = await prisma.systemPrompts.findFirst({
        where: { prompt_type: 'invoice_extraction', is_active: true }
    });
    if (!existingInvoicePrompt) {
        await prisma.systemPrompts.create({
            data: {
                prompt_type: 'invoice_extraction',
                prompt_text: DEFAULT_INVOICE_PROMPT_TEXT, // Bruker konstanten definert øverst
                is_active: true,
                created_by_user_id: adminUser.id, // Kobler til admin-brukeren
            }
        });
        console.log('Default invoice_extraction prompt opprettet og knyttet til admin.');
    } else {
        console.log('Aktiv invoice_extraction prompt finnes allerede.');
        // Valgfritt: Oppdater den eksisterende hvis teksten er annerledes
        if (existingInvoicePrompt.prompt_text !== DEFAULT_INVOICE_PROMPT_TEXT) {
            await prisma.systemPrompts.update({
                where: { id: existingInvoicePrompt.id },
                data: { prompt_text: DEFAULT_INVOICE_PROMPT_TEXT, updated_at: new Date() }
            });
            console.log('Eksisterende invoice_extraction prompt oppdatert.');
        }
    }

    // 7. Opprett/Oppdater ProduktKonfigurasjon med standardverdier for 8 produkttyper
    const produktKonfigurasjoner = [
        {
            produktnavn: 'Utføringsgaranti',
            standardUtforelseProsent: 0.0050, // 0.5%
            standardGarantiProsent: 0.0025, // 0.25%
            standardGarantitid: 24, // 24 måneder
            maksKontraktssum: 100000000.00, // 100 millioner
        },
        {
            produktnavn: 'Vedlikeholdsgaranti',
            standardUtforelseProsent: 0.0025, // 0.25%
            standardGarantiProsent: 0.0050, // 0.5%
            standardGarantitid: 60, // 60 måneder
            maksKontraktssum: 50000000.00, // 50 millioner
        },
        {
            produktnavn: 'Anbudsgaranti',
            standardUtforelseProsent: 0.0010, // 0.1%
            standardGarantiProsent: 0.0010, // 0.1%
            standardGarantitid: 6, // 6 måneder
            maksKontraktssum: 200000000.00, // 200 millioner
        },
        {
            produktnavn: 'Forskuddsgaranti',
            standardUtforelseProsent: 0.0075, // 0.75%
            standardGarantiProsent: 0.0050, // 0.5%
            standardGarantitid: 36, // 36 måneder
            maksKontraktssum: 75000000.00, // 75 millioner
        },
        {
            produktnavn: 'Leveransegaranti',
            standardUtforelseProsent: 0.0040, // 0.4%
            standardGarantiProsent: 0.0030, // 0.3%
            standardGarantitid: 12, // 12 måneder
            maksKontraktssum: 80000000.00, // 80 millioner
        },
        {
            produktnavn: 'Kontraktsgaranti',
            standardUtforelseProsent: 0.0060, // 0.6%
            standardGarantiProsent: 0.0040, // 0.4%
            standardGarantitid: 48, // 48 måneder
            maksKontraktssum: 120000000.00, // 120 millioner
        },
        {
            produktnavn: 'Reklamasjonssikkerhet',
            standardUtforelseProsent: 0.0030, // 0.3%
            standardGarantiProsent: 0.0060, // 0.6%
            standardGarantitid: 120, // 120 måneder (10 år)
            maksKontraktssum: 40000000.00, // 40 millioner
        },
        {
            produktnavn: 'Betalingsgaranti',
            standardUtforelseProsent: 0.0080, // 0.8%
            standardGarantiProsent: 0.0040, // 0.4%
            standardGarantitid: 18, // 18 måneder
            maksKontraktssum: 60000000.00, // 60 millioner
        }
    ];

    for (const produktConfig of produktKonfigurasjoner) {
        await prisma.produktKonfigurasjon.upsert({
            where: { produktnavn: produktConfig.produktnavn },
            update: {
                standardUtforelseProsent: produktConfig.standardUtforelseProsent,
                standardGarantiProsent: produktConfig.standardGarantiProsent,
                standardGarantitid: produktConfig.standardGarantitid,
                maksKontraktssum: produktConfig.maksKontraktssum,
                aktiv: true,
            },
            create: produktConfig,
        });
        console.log(`Opprettet/oppdatert produktkonfigurasjon: ${produktConfig.produktnavn}`);
    }
    console.log('ProduktKonfigurasjon seeding fullført.');

    console.log(`Seeding finished.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 