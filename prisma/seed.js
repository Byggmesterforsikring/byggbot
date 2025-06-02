const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    await prisma.roleV2.upsert({
        where: { role_name: 'EDITOR' },
        update: { description: 'Redaktør med utvidede rettigheter' },
        create: { role_name: 'EDITOR', description: 'Redaktør med utvidede rettigheter' },
    });
    await prisma.roleV2.upsert({
        where: { role_name: 'USER' },
        update: { description: 'Standardbruker' },
        create: { role_name: 'USER', description: 'Standardbruker' },
    });
    await prisma.roleV2.upsert({
        where: { role_name: 'Garantisaksbehandler' },
        update: { description: 'Saksbehandler for garantier' },
        create: { role_name: 'Garantisaksbehandler', description: 'Saksbehandler for garantier' },
    });
    await prisma.roleV2.upsert({
        where: { role_name: 'Garantileder_UW' },
        update: { description: 'Leder for Underwriting Garanti' },
        create: { role_name: 'Garantileder_UW', description: 'Leder for Underwriting Garanti' },
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
    console.log('Moduler opprettet/oppdatert.');

    // 3. Opprett/Oppdater din Admin-bruker (UserV2)
    const adminUser = await prisma.userV2.upsert({
        where: { email: 'oyvind@bmf.no' },
        update: { navn: 'Øyvind H. Bergesen', is_active: true, user_type: 'INTERN' }, // Oppdater hvis den finnes
        create: {
            email: 'oyvind@bmf.no',
            navn: 'Øyvind H. Bergesen',
            user_type: 'INTERN',
            is_active: true,
            // entra_id_object_id kan settes hvis du har den
        },
    });
    console.log(`Opprettet/oppdatert adminbruker: ${adminUser.email} (ID: ${adminUser.id})`);

    // 4. Knytt admin-bruker til ADMIN-rollen (UserRoleV2)
    await prisma.userRoleV2.upsert({
        where: {
            user_id_role_id: {
                user_id: adminUser.id,
                role_id: adminRole.id,
            },
        },
        update: {},
        create: {
            user_id: adminUser.id,
            role_id: adminRole.id,
        },
    });
    console.log(`Knyttet bruker ${adminUser.email} til rolle ${adminRole.role_name}.`);

    // 5. Gi admin-bruker tilgang til spesifikke moduler (UserModulTilgang)
    const modulerForAdmin = [
        garantiModul.id,
        adminUserModul.id,
        adminModulModul.id,
        rapporterModul.id,
        skadeModul.id,
        kalkulatorerModul.id
    ];

    for (const modulId of modulerForAdmin) {
        await prisma.userModulTilgang.upsert({
            where: {
                userId_modulId: { // Merk: Prisma genererer feltnavn for @@id som `field1Name_field2Name`
                    userId: adminUser.id,
                    modulId: modulId,
                }
            },
            update: {},
            create: {
                userId: adminUser.id,
                modulId: modulId,
            }
        });
        console.log(`Ga bruker ${adminUser.email} tilgang til modul ID: ${modulId}`);
    }
    console.log('Adminbruker tildelt modultilganger.');

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