// Tilbudsstatus konstanter
export const TILBUD_STATUS = {
    UTKAST: 'Utkast',
    TIL_BEHANDLING: 'TilBehandling',
    GODKJENT: 'Godkjent',
    AVSLATT: 'Avslatt',
    PRODUSERT: 'Produsert',
    UTLOPT: 'Utlopt'
};

// Status labels for display
export const TILBUD_STATUS_LABELS = {
    [TILBUD_STATUS.UTKAST]: 'Utkast',
    [TILBUD_STATUS.TIL_BEHANDLING]: 'Til behandling',
    [TILBUD_STATUS.GODKJENT]: 'Godkjent',
    [TILBUD_STATUS.AVSLATT]: 'Avslått',
    [TILBUD_STATUS.PRODUSERT]: 'Produsert',
    [TILBUD_STATUS.UTLOPT]: 'Utløpt'
};

// Benefisient typer
export const BENEFISIENT_TYPE = {
    JURIDISK: 'Juridisk',
    FYSISK: 'Fysisk'
};

// Benefisient type labels
export const BENEFISIENT_TYPE_LABELS = {
    [BENEFISIENT_TYPE.JURIDISK]: 'Juridisk person',
    [BENEFISIENT_TYPE.FYSISK]: 'Fysisk person'
};

// Produkttyper (matches seed data)
export const PRODUKTTYPER = {
    UTFORINGSGARANTI: 'Utføringsgaranti',
    VEDLIKEHOLDSGARANTI: 'Vedlikeholdsgaranti',
    ANBUDSGARANTI: 'Anbudsgaranti',
    FORSKUDDSGARANTI: 'Forskuddsgaranti',
    LEVERANSEGARANTI: 'Leveransegaranti',
    KONTRAKTSGARANTI: 'Kontraktsgaranti',
    REKLAMASJONSSIKKERHET: 'Reklamasjonssikkerhet',
    BETALINGSGARANTI: 'Betalingsgaranti'
};

// Standardverdier for beregninger
export const STANDARD_VERDIER = {
    ETABLERINGSGEBYR: 5000, // Standard etableringsgebyr i NOK
    MIN_KONTRAKTSSUM: 100000, // Minimum kontraktssum i NOK
    MAX_KONTRAKTSSUM: 500000000, // Maksimum kontraktssum i NOK
    MIN_GARANTITID: 1, // Minimum garantitid i måneder
    MAX_GARANTITID: 240, // Maksimum garantitid i måneder (20 år)
    MIN_UTFORELSESTID: 1, // Minimum utførelsestid i måneder
    MAX_UTFORELSESTID: 120 // Maksimum utførelsestid i måneder (10 år)
};

// Ramme fargekoding
export const RAMME_FARGEKODER = {
    GRONN: 'grønn', // Under 70% forbruk
    GUL: 'gul',     // 70-89% forbruk
    ROD: 'rød'      // Over 90% forbruk
};

// Ramme grenseverdier (prosent)
export const RAMME_GRENSER = {
    ADVARSEL_TERSKEL: 70, // Gul advarsel ved 70%
    KRITISK_TERSKEL: 90   // Rød advarsel ved 90%
};

// Valideringsregler
export const VALIDERING = {
    MAX_BENEFISIENT_ANDEL: 100, // Total andel kan ikke overstige 100%
    MIN_BENEFISIENT_ANDEL: 0.01, // Minimum andel per benefisient
    ORGNR_LENGDE: 9, // Organisasjonsnummer må være 9 siffer
    PERSONIDENT_LENGDE: 11 // Personident må være 11 siffer
};

// Standard valuta formatting
export const VALUTA_FORMAT = {
    LOCALE: 'nb-NO',
    CURRENCY: 'NOK',
    OPTIONS: {
        style: 'currency',
        currency: 'NOK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }
};

// Dato formatting
export const DATO_FORMAT = {
    LOCALE: 'nb-NO',
    OPTIONS: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }
};

// Status som tillater redigering
export const REDIGERBARE_STATUSER = [
    TILBUD_STATUS.UTKAST,
    TILBUD_STATUS.TIL_BEHANDLING
];

// Status som tillater sletting
export const SLETTBARE_STATUSER = [
    TILBUD_STATUS.UTKAST,
    TILBUD_STATUS.AVSLATT
];

// Status som krever ny versjon ved endring
export const VERSJON_KREVER_STATUSER = [
    TILBUD_STATUS.TIL_BEHANDLING,
    TILBUD_STATUS.GODKJENT,
    TILBUD_STATUS.PRODUSERT
];

// Hjelpefunksjoner
export const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return parseFloat(amount).toLocaleString(VALUTA_FORMAT.LOCALE, VALUTA_FORMAT.OPTIONS);
};

export const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(DATO_FORMAT.LOCALE, DATO_FORMAT.OPTIONS);
};

export const formatPercentage = (value, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return `${parseFloat(value).toFixed(decimals)}%`;
};

export const getRammeStatus = (forbruksProsent) => {
    if (forbruksProsent >= RAMME_GRENSER.KRITISK_TERSKEL) {
        return { farge: RAMME_FARGEKODER.ROD, label: 'Kritisk' };
    } else if (forbruksProsent >= RAMME_GRENSER.ADVARSEL_TERSKEL) {
        return { farge: RAMME_FARGEKODER.GUL, label: 'Advarsel' };
    } else {
        return { farge: RAMME_FARGEKODER.GRONN, label: 'Normal' };
    }
};

export const kanRedigeres = (status) => {
    return REDIGERBARE_STATUSER.includes(status);
};

export const kanSlettes = (status) => {
    return SLETTBARE_STATUSER.includes(status);
};

export const kreverNyVersjon = (status) => {
    return VERSJON_KREVER_STATUSER.includes(status);
}; 