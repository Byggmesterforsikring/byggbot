-- CreateEnum
CREATE TYPE "TilbudStatus" AS ENUM ('Utkast', 'TilBehandling', 'Godkjent', 'Avslatt', 'Produsert', 'Utlopt');

-- CreateEnum
CREATE TYPE "BenefisientType" AS ENUM ('Juridisk', 'Fysisk');

-- AlterTable
ALTER TABLE "Selskap" ADD COLUMN     "antallAnsatte" INTEGER,
ADD COLUMN     "forretningsKommune" TEXT,
ADD COLUMN     "forretningsKommunenummer" VARCHAR(4),
ADD COLUMN     "hjemmeside" TEXT,
ADD COLUMN     "naeringskode1Beskrivelse" TEXT,
ADD COLUMN     "organisasjonsformBeskrivelse" TEXT,
ADD COLUMN     "stiftelsesdato" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Tilbud" (
    "id" TEXT NOT NULL,
    "prosjektId" TEXT NOT NULL,
    "status" "TilbudStatus" NOT NULL DEFAULT 'Utkast',
    "produkttype" TEXT,
    "opprettetDato" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opprettetAv" INTEGER,
    "sistEndret" TIMESTAMP(3) NOT NULL,
    "endretAv" INTEGER,
    "versjonsnummer" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Tilbud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TilbudsBeregning" (
    "id" TEXT NOT NULL,
    "tilbudId" TEXT NOT NULL,
    "kontraktssum" DECIMAL(15,2),
    "startDato" TIMESTAMP(3),
    "sluttDato" TIMESTAMP(3),
    "utforelsestid" INTEGER,
    "garantitid" INTEGER,
    "rentesatsUtforelse" DECIMAL(5,4),
    "rentesatsGaranti" DECIMAL(5,4),
    "etableringsgebyr" DECIMAL(15,2),
    "totalPremie" DECIMAL(15,2),
    "manueltOverstyrt" BOOLEAN NOT NULL DEFAULT false,
    "opprettetDato" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sistEndret" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TilbudsBeregning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benefisienter" (
    "id" TEXT NOT NULL,
    "tilbudId" TEXT NOT NULL,
    "type" "BenefisientType" NOT NULL,
    "navn" TEXT NOT NULL,
    "organisasjonsnummer" VARCHAR(9),
    "personident" VARCHAR(11),
    "andel" DECIMAL(5,2) NOT NULL,
    "kontaktinformasjon" JSONB,
    "opprettetDato" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sistEndret" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Benefisienter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProduktKonfigurasjon" (
    "id" TEXT NOT NULL,
    "produktnavn" TEXT NOT NULL,
    "standardUtforelseProsent" DECIMAL(5,4) NOT NULL,
    "standardGarantiProsent" DECIMAL(5,4) NOT NULL,
    "standardGarantitid" INTEGER NOT NULL,
    "maksKontraktssum" DECIMAL(15,2),
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "opprettetDato" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sistEndret" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProduktKonfigurasjon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tilbud_prosjektId_key" ON "Tilbud"("prosjektId");

-- CreateIndex
CREATE UNIQUE INDEX "TilbudsBeregning_tilbudId_key" ON "TilbudsBeregning"("tilbudId");

-- CreateIndex
CREATE UNIQUE INDEX "ProduktKonfigurasjon_produktnavn_key" ON "ProduktKonfigurasjon"("produktnavn");

-- AddForeignKey
ALTER TABLE "Tilbud" ADD CONSTRAINT "Tilbud_prosjektId_fkey" FOREIGN KEY ("prosjektId") REFERENCES "GarantiProsjekt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tilbud" ADD CONSTRAINT "Tilbud_opprettetAv_fkey" FOREIGN KEY ("opprettetAv") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tilbud" ADD CONSTRAINT "Tilbud_endretAv_fkey" FOREIGN KEY ("endretAv") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TilbudsBeregning" ADD CONSTRAINT "TilbudsBeregning_tilbudId_fkey" FOREIGN KEY ("tilbudId") REFERENCES "Tilbud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Benefisienter" ADD CONSTRAINT "Benefisienter_tilbudId_fkey" FOREIGN KEY ("tilbudId") REFERENCES "Tilbud"("id") ON DELETE CASCADE ON UPDATE CASCADE;
