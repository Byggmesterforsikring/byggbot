-- CreateEnum
CREATE TYPE "GarantiProsjektStatus" AS ENUM ('Ny', 'Tildelt', 'Behandles', 'Avslaatt', 'Godkjent', 'AvventerGodkjenningUW', 'KlarTilProduksjon', 'Produsert');

-- CreateTable
CREATE TABLE "Users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "navn" TEXT,
    "user_type" TEXT NOT NULL DEFAULT 'INTERN',
    "entra_id_object_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tilknyttetSelskapId" TEXT,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roles" (
    "id" SERIAL NOT NULL,
    "role_name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoles" (
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "UserRoles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "Moduler" (
    "id" SERIAL NOT NULL,
    "navn" TEXT NOT NULL,
    "beskrivelse" TEXT,

    CONSTRAINT "Moduler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserModulTilganger" (
    "user_id" INTEGER NOT NULL,
    "modul_id" INTEGER NOT NULL,

    CONSTRAINT "UserModulTilganger_pkey" PRIMARY KEY ("user_id","modul_id")
);

-- CreateTable
CREATE TABLE "Selskap" (
    "id" TEXT NOT NULL,
    "organisasjonsnummer" VARCHAR(9) NOT NULL,
    "selskapsnavn" TEXT NOT NULL,
    "gateadresse" TEXT,
    "postnummer" VARCHAR(4),
    "poststed" TEXT,
    "kontaktpersonNavn" TEXT,
    "kontaktpersonTelefon" TEXT,
    "kundenummerWims" TEXT,
    "ramme" TEXT,
    "opprettetDato" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Selskap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarantiProsjekt" (
    "id" TEXT NOT NULL,
    "navn" TEXT,
    "prosjektGateadresse" TEXT,
    "prosjektPostnummer" VARCHAR(4),
    "prosjektPoststed" TEXT,
    "prosjektKommune" TEXT,
    "prosjektKommunenummer" VARCHAR(4),
    "status" "GarantiProsjektStatus" NOT NULL DEFAULT 'Ny',
    "produkt" TEXT,
    "kommentarKunde" TEXT,
    "opprettetDato" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "selskapId" TEXT NOT NULL,
    "ansvarligRaadgiverId" INTEGER,
    "uwAnsvarligId" INTEGER,
    "produksjonsansvarligId" INTEGER,

    CONSTRAINT "GarantiProsjekt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarantiSakHendelse" (
    "id" TEXT NOT NULL,
    "selskapId" TEXT,
    "prosjektId" TEXT,
    "hendelseType" TEXT NOT NULL,
    "beskrivelse" TEXT NOT NULL,
    "utfoertAvId" INTEGER,
    "dato" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GarantiSakHendelse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarantiSakDokument" (
    "id" TEXT NOT NULL,
    "selskapId" TEXT,
    "prosjektId" TEXT,
    "dokumentType" TEXT NOT NULL,
    "filnavn" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "containerNavn" TEXT NOT NULL,
    "blobNavn" TEXT NOT NULL,
    "opplastetAvId" INTEGER NOT NULL,
    "opplastetDato" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GarantiSakDokument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarantiSakInterneKommentarer" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "selskap_id" TEXT,
    "prosjekt_id" TEXT,
    "kommentar" TEXT NOT NULL,
    "opprettet_av_id" INTEGER NOT NULL,
    "opprettet_dato" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GarantiSakInterneKommentarer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drawing_rules" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" INTEGER,
    "last_updated_by_user_id" INTEGER,

    CONSTRAINT "drawing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drawing_rule_versions" (
    "id" SERIAL NOT NULL,
    "ruleId" INTEGER NOT NULL,
    "version_number" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by_user_id" INTEGER,

    CONSTRAINT "drawing_rule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drawing_rule_images" (
    "id" SERIAL NOT NULL,
    "rule_version_id" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "file_data" BYTEA NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" INTEGER,

    CONSTRAINT "drawing_rule_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Users_entra_id_object_id_key" ON "Users"("entra_id_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "Roles_role_name_key" ON "Roles"("role_name");

-- CreateIndex
CREATE UNIQUE INDEX "Moduler_navn_key" ON "Moduler"("navn");

-- CreateIndex
CREATE UNIQUE INDEX "Selskap_organisasjonsnummer_key" ON "Selskap"("organisasjonsnummer");

-- CreateIndex
CREATE UNIQUE INDEX "GarantiSakDokument_blobUrl_key" ON "GarantiSakDokument"("blobUrl");

-- CreateIndex
CREATE UNIQUE INDEX "drawing_rules_slug_key" ON "drawing_rules"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "drawing_rule_versions_ruleId_version_number_key" ON "drawing_rule_versions"("ruleId", "version_number");

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_tilknyttetSelskapId_fkey" FOREIGN KEY ("tilknyttetSelskapId") REFERENCES "Selskap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoles" ADD CONSTRAINT "UserRoles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoles" ADD CONSTRAINT "UserRoles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModulTilganger" ADD CONSTRAINT "UserModulTilganger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModulTilganger" ADD CONSTRAINT "UserModulTilganger_modul_id_fkey" FOREIGN KEY ("modul_id") REFERENCES "Moduler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiProsjekt" ADD CONSTRAINT "GarantiProsjekt_selskapId_fkey" FOREIGN KEY ("selskapId") REFERENCES "Selskap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiProsjekt" ADD CONSTRAINT "GarantiProsjekt_ansvarligRaadgiverId_fkey" FOREIGN KEY ("ansvarligRaadgiverId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiProsjekt" ADD CONSTRAINT "GarantiProsjekt_uwAnsvarligId_fkey" FOREIGN KEY ("uwAnsvarligId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiProsjekt" ADD CONSTRAINT "GarantiProsjekt_produksjonsansvarligId_fkey" FOREIGN KEY ("produksjonsansvarligId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiSakHendelse" ADD CONSTRAINT "GarantiSakHendelse_selskapId_fkey" FOREIGN KEY ("selskapId") REFERENCES "Selskap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiSakHendelse" ADD CONSTRAINT "GarantiSakHendelse_prosjektId_fkey" FOREIGN KEY ("prosjektId") REFERENCES "GarantiProsjekt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiSakHendelse" ADD CONSTRAINT "GarantiSakHendelse_utfoertAvId_fkey" FOREIGN KEY ("utfoertAvId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiSakDokument" ADD CONSTRAINT "GarantiSakDokument_selskapId_fkey" FOREIGN KEY ("selskapId") REFERENCES "Selskap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiSakDokument" ADD CONSTRAINT "GarantiSakDokument_prosjektId_fkey" FOREIGN KEY ("prosjektId") REFERENCES "GarantiProsjekt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiSakDokument" ADD CONSTRAINT "GarantiSakDokument_opplastetAvId_fkey" FOREIGN KEY ("opplastetAvId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiSakInterneKommentarer" ADD CONSTRAINT "GarantiSakInterneKommentarer_selskap_id_fkey" FOREIGN KEY ("selskap_id") REFERENCES "Selskap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiSakInterneKommentarer" ADD CONSTRAINT "GarantiSakInterneKommentarer_prosjekt_id_fkey" FOREIGN KEY ("prosjekt_id") REFERENCES "GarantiProsjekt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiSakInterneKommentarer" ADD CONSTRAINT "GarantiSakInterneKommentarer_opprettet_av_id_fkey" FOREIGN KEY ("opprettet_av_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_rules" ADD CONSTRAINT "drawing_rules_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_rules" ADD CONSTRAINT "drawing_rules_last_updated_by_user_id_fkey" FOREIGN KEY ("last_updated_by_user_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_rule_versions" ADD CONSTRAINT "drawing_rule_versions_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "drawing_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_rule_versions" ADD CONSTRAINT "drawing_rule_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_rule_images" ADD CONSTRAINT "drawing_rule_images_rule_version_id_fkey" FOREIGN KEY ("rule_version_id") REFERENCES "drawing_rule_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_rule_images" ADD CONSTRAINT "drawing_rule_images_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

