export const ALPHA_GRUNNPRIS = {
    ANSVAR: 5355,      // Grunnpris for Ansvar (inkl. Fører/Passasjerulykke)
    DELKASKO: 5405,   // Grunnpris for tilleggsdelen Delkasko
    KASKO: 8898,      // Grunnpris for tilleggsdelen Kasko
    FP_ULYKKE: 210,   // Separat verdi for Fører/Passasjerulykke
};

export const FAKTORER_KJOERETOEYTYPE = {
    SKAP_PLAN_LETT: { A: 1.05, D: 1.00, K: 1.05 },
    TREKKBIL: { A: 1.15, D: 1.00, K: 1.15 },
    SKAPBIL: { A: 0.96, D: 0.92, K: 0.96 },
    PLANBIL: { A: 0.96, D: 0.92, K: 0.96 },
    TIPP_KROK: { A: 1.00, D: 1.00, K: 1.00 },
    CONTAINERBIL: { A: 1.00, D: 1.00, K: 1.00 },
};

export const FAKTORER_EGENANDEL_KASKO = {
    '6000': { K: 1.20 },
    '10000': { K: 1.00 },
    '20000': { K: 0.85 },
    '50000': { K: 0.70 },
    '100000': { K: 0.55 },
};

export const FAKTORER_EGENANDEL_ANSVAR = {
    '5000': { A: 1.25 },
    '10000': { A: 1.00 },
};

export const FAKTORER_KJOERELENGDE = {
    '8000': { A: 0.47, D: 0.55, K: 0.47 },
    '12000': { A: 0.55, D: 0.60, K: 0.55 },
    '16000': { A: 0.60, D: 0.65, K: 0.60 },
    '20000': { A: 0.65, D: 0.65, K: 0.65 },
    '25000': { A: 0.70, D: 0.65, K: 0.70 },
    '30000': { A: 0.80, D: 0.80, K: 0.80 },
    '40000': { A: 0.90, D: 0.90, K: 0.90 },
    '60000': { A: 1.00, D: 1.00, K: 1.00 },
    '80000': { A: 1.20, D: 1.10, K: 1.20 },
    '100000': { A: 1.40, D: 1.20, K: 1.40 },
    '120000': { A: 1.50, D: 1.30, K: 1.50 },
    'UBEGRENSET': { A: 1.75, D: 1.40, K: 1.75 },
};

export const FAKTORER_KJOEREOMRAADE = {
    NORGE: { A: 1.00, D: 1.00, K: 1.00 },
    NORDEN: { A: 1.05, D: 1.05, K: 1.05 },
    EUROPA_MINUS: { A: 1.15, D: 1.15, K: 1.15 },
};

export const FAKTORER_TOTALVEKT = {
    "Inntil 7 500 kg": { A: 1.10, D: 1.10, K: 1.10 },
    "Inntil 10 000 kg": { A: 1.12, D: 1.12, K: 1.12 },
    "Inntil 13 000 kg": { A: 1.14, D: 1.14, K: 1.14 },
    "Inntil 17 000 kg": { A: 1.17, D: 1.17, K: 1.17 },
    "Inntil 21 000 kg": { A: 1.20, D: 1.20, K: 1.20 },
    "Inntil 27 000 kg": { A: 1.25, D: 1.25, K: 1.25 },
    "Inntil 36 000 kg": { A: 1.30, D: 1.30, K: 1.30 },
    "Inntil 43 000 kg": { A: 1.40, D: 1.40, K: 1.40 },
};

// Faktor basert på alder (Alder = Nåværende År - Registreringsår)
export const FAKTORER_ALDER = [
    { alder: -1, A: 1.00, D: 1.00, K: 1.00 }, // For nye/kommende biler?
    { alder: 0, A: 1.00, D: 1.00, K: 1.00 },
    { alder: 1, A: 1.00, D: 1.00, K: 0.98 },
    { alder: 2, A: 1.00, D: 1.00, K: 0.97 },
    { alder: 3, A: 1.00, D: 0.99, K: 0.96 },
    { alder: 4, A: 1.00, D: 0.99, K: 0.95 },
    { alder: 5, A: 1.00, D: 0.98, K: 0.94 },
    { alder: 6, A: 1.00, D: 0.98, K: 0.93 },
    { alder: 7, A: 1.00, D: 0.98, K: 0.92 },
    { alder: 8, A: 1.00, D: 0.97, K: 0.91 },
    { alder: 9, A: 1.00, D: 0.97, K: 0.90 },
    { alder: 10, A: 1.00, D: 0.96, K: 0.89 },
    { alder: 11, A: 1.00, D: 0.96, K: 0.88 },
    { alder: 12, A: 1.00, D: 0.95, K: 0.80 }, // Ser ut som et hopp her? Dobbeltsjekk gjerne excel.
    { alder: 13, A: 1.00, D: 0.95, K: 0.86 },
    { alder: 14, A: 1.00, D: 0.94, K: 0.85 },
    { alder: 15, A: 1.00, D: 0.94, K: 0.84 },
    { alder: 16, A: 1.00, D: 0.93, K: 0.83 },
    { alder: 17, A: 1.00, D: 0.93, K: 0.82 },
    { alder: 18, A: 1.00, D: 0.93, K: 0.81 },
    { alder: 19, A: 1.00, D: 0.92, K: 0.80 },
    { alder: 20, A: 1.00, D: 0.92, K: 0.80 },
    { alder: 21, A: 1.00, D: 0.91, K: 0.80 },
    { alder: 22, A: 1.00, D: 0.91, K: 0.80 },
    { alder: 23, A: 1.00, D: 0.90, K: 0.80 },
    { alder: 24, A: 1.00, D: 0.90, K: 0.80 },
    { alder: 25, A: 1.00, D: 0.89, K: 0.80 },
    { alder: 26, A: 1.00, D: 0.88, K: 0.80 },
    { alder: 27, A: 1.00, D: 0.87, K: 0.80 },
    { alder: 28, A: 1.00, D: 0.86, K: 0.80 },
    { alder: 29, A: 1.00, D: 0.85, K: 0.80 },
    { alder: 30, A: 1.00, D: 0.85, K: 0.80 },
    { alder: 31, A: 1.00, D: 0.85, K: 0.79 },
    { alder: 32, A: 1.00, D: 0.85, K: 0.78 },
    { alder: 33, A: 1.00, D: 0.85, K: 0.77 },
    { alder: 34, A: 1.00, D: 0.85, K: 0.76 },
    { alder: 35, A: 1.00, D: 0.85, K: 0.75 },
    { alder: 36, A: 1.00, D: 0.85, K: 0.74 },
    { alder: 37, A: 1.00, D: 0.85, K: 0.73 },
    { alder: 38, A: 1.00, D: 0.85, K: 0.72 },
    { alder: 39, A: 1.00, D: 0.85, K: 0.71 },
    { alder: 40, A: 1.00, D: 0.85, K: 0.70 },
    { alder: 41, A: 1.00, D: 0.85, K: 0.69 },
    { alder: 42, A: 1.00, D: 0.85, K: 0.68 },
    { alder: 43, A: 1.00, D: 0.85, K: 0.67 },
    { alder: 44, A: 1.00, D: 0.85, K: 0.66 },
    { alder: 45, A: 1.00, D: 0.85, K: 0.65 },
    { alder: 46, A: 1.00, D: 0.85, K: 0.64 },
    { alder: 47, A: 1.00, D: 0.85, K: 0.63 },
    { alder: 48, A: 1.00, D: 0.85, K: 0.62 },
    { alder: 49, A: 1.00, D: 0.85, K: 0.61 },
    { alder: 50, A: 1.00, D: 0.85, K: 0.60 },
    // For alder > 50, bruk faktorene for 50
];

export const TILLEGG_PRISER = {
    // Faste kronebeløp (legges til totalen)
    begrensetIdent: { type: 'fixed', value: 300, label: 'Begrenset identifikasjon' },
    // godsansvar: { type: 'fixed', value: 1800, label: 'Godsansvar' },
    annetAnsvar: { type: 'fixed', value: 1700, label: 'Kranansvar' },
    yrkesloesoereVarer: { type: 'fixed', value: 1500, label: 'Yrkesløsøre og varer' },
    forsikringsattest: { type: 'fixed', value: 100, label: 'Forsikringsattest (Panthaver/Leasing)' },
    // Spesialtilfeller (krever egen logikk)
    avbrudd: { type: 'special', factor: 1.5, label: 'Avbrudd' }, // Pris = Dagsbeløp * 1.5
}; 