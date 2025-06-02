-- Sikrer at ENUM for GarantiSakStatus opprettes hvis den ikke finnes
DO $$
BEGIN
    -- Sjekker om typen "GarantiSakStatus" (case-sensitiv) i public schema eksisterer.
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_catalog.pg_type typ 
        JOIN pg_catalog.pg_namespace nsp ON nsp.oid = typ.typnamespace 
        WHERE typ.typname = 'GarantiSakStatus' AND nsp.nspname = 'public'
    ) THEN
        -- Hvis den ikke finnes, prøv å droppe den hvis den finnes som lowercase (legacy/feil)
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'garantisakstatus') THEN
                DROP TYPE public.garantisakstatus CASCADE; -- CASCADE for å fjerne avhengigheter hvis mulig
                RAISE NOTICE 'Dropped legacy lowercase garantisakstatus type.';
            END IF;
        EXCEPTION
            WHEN dependent_objects_still_exist THEN
                RAISE WARNING 'Type garantisakstatus could not be dropped due to dependent objects. Manual check needed if GarantiSak table exists with this type.';
                -- Hvis GarantiSak-tabellen allerede bruker lowercase-typen, vil dette feile.
                -- I så fall må tabellen endres eller droppes og gjenopprettes ETTER at riktig type er laget.
        END;

        -- Opprett med korrekt case for Prisma
        CREATE TYPE "GarantiSakStatus" AS ENUM (
            'Ny',
            'Tildelt',
            'Behandles',
            'Avslaatt',
            'Godkjent',
            'AvventerGodkjenningUW',
            'KlarTilProduksjon',
            'Produsert'
        );
        RAISE NOTICE 'Created "GarantiSakStatus" type.';
    ELSE
        RAISE NOTICE 'Type "GarantiSakStatus" already exists.';
    END IF;
END $$;

-- Opprett tabell for Garantisaker
CREATE TABLE IF NOT EXISTS "GarantiSak" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisasjonsnummer" VARCHAR(9) NOT NULL UNIQUE,
    "selskapsnavn" TEXT NOT NULL,
    "gateadresse" TEXT,
    "postnummer" VARCHAR(4),
    "poststed" TEXT,
    "kontaktpersonNavn" TEXT,
    "kontaktpersonTelefon" TEXT,
    "ansvarligRaadgiverId" INTEGER,
    "uwAnsvarligId" INTEGER,
    "produksjonsansvarligId" INTEGER,
    "kommentarKunde" TEXT,
    "kommentarIntern" TEXT,
    "kundenummerWims" TEXT,
    "ramme" TEXT,
    "produkt" TEXT,
    "status" "GarantiSakStatus" NOT NULL DEFAULT 'Ny', -- Bruker den case-sensitive typen
    "opprettetDato" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sistEndretDato" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GarantiSak_ansvarligRaadgiverId_fkey" FOREIGN KEY ("ansvarligRaadgiverId") REFERENCES "user_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GarantiSak_uwAnsvarligId_fkey" FOREIGN KEY ("uwAnsvarligId") REFERENCES "user_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GarantiSak_produksjonsansvarligId_fkey" FOREIGN KEY ("produksjonsansvarligId") REFERENCES "user_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Opprett tabell for hendelseslogg
CREATE TABLE IF NOT EXISTS "GarantiSakHendelse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sakId" TEXT NOT NULL,
    "hendelseType" TEXT NOT NULL,
    "beskrivelse" TEXT NOT NULL,
    "utfoertAvId" INTEGER,
    "dato" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GarantiSakHendelse_sakId_fkey" FOREIGN KEY ("sakId") REFERENCES "GarantiSak"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GarantiSakHendelse_utfoertAvId_fkey" FOREIGN KEY ("utfoertAvId") REFERENCES "user_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Opprett tabell for generelle dokumenter (koblet til Azure Blob Storage)
CREATE TABLE IF NOT EXISTS "GarantiSakDokument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sakId" TEXT NOT NULL,
    "dokumentType" TEXT NOT NULL, -- F.eks. "Kontrakt", "Regnskap", "Epost", "Vedlegg"
    "filnavn" TEXT NOT NULL,      -- Originalt filnavn for visning
    "blobUrl" TEXT NOT NULL,      -- Full URL til filen i Azure Blob Storage
    "containerNavn" TEXT NOT NULL, -- Navn på Azure container
    "blobNavn" TEXT NOT NULL,     -- Navn på blob i containeren
    "opplastetAvId" INTEGER NOT NULL,
    "opplastetDato" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GarantiSakDokument_sakId_fkey" FOREIGN KEY ("sakId") REFERENCES "GarantiSak"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GarantiSakDokument_opplastetAvId_fkey" FOREIGN KEY ("opplastetAvId") REFERENCES "user_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Opprett en trigger for å automatisk oppdatere sistEndretDato på GarantiSak-tabellen
-- Antar at funksjonen update_updated_at_column() allerede eksisterer fra init.sql
CREATE TRIGGER update_garantisak_sistendret
    BEFORE UPDATE ON "GarantiSak"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 