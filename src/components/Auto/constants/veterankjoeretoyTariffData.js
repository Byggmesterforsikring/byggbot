// Tariffer for veterankjøretøy organisert etter årsmodell, forsikringssum og dekningstype
// Priser i kroner, inkludert fører- og passasjerulykke

// Beregner grensen for hva som regnes som veterankjøretøy (30 år og eldre)
const currentYear = new Date().getFullYear();
export const VETERANBIL_CUTOFF_YEAR = currentYear - 30;

// De originale tariffene beholdes, men de vises dynamisk basert på nåværende år
export const VETERANBIL_TARIFFER = {
    // Årsmodell t.o.m. 1950
    "<=1950": {
        "100000": { ANSVAR: 351, DELKASKO: 531, KASKO: 801 },
        "200000": { ANSVAR: 351, DELKASKO: 691, KASKO: 1201 },
        "300000": { ANSVAR: 351, DELKASKO: 771, KASKO: 1401 },
        "400000": { ANSVAR: 351, DELKASKO: 851, KASKO: 1601 },
        "500000": { ANSVAR: 351, DELKASKO: 931, KASKO: 1801 }
    },
    // Årsmodell 1951-1960
    "1951-1960": {
        "100000": { ANSVAR: 391, DELKASKO: 621, KASKO: 966 },
        "200000": { ANSVAR: 391, DELKASKO: 801, KASKO: 1331 },
        "300000": { ANSVAR: 391, DELKASKO: 891, KASKO: 1551 },
        "400000": { ANSVAR: 391, DELKASKO: 981, KASKO: 1771 },
        "500000": { ANSVAR: 391, DELKASKO: 1071, KASKO: 1991 }
    },
    // Årsmodell 1961-1970
    "1961-1970": {
        "100000": { ANSVAR: 431, DELKASKO: 721, KASKO: 1156 },
        "200000": { ANSVAR: 431, DELKASKO: 921, KASKO: 1636 },
        "300000": { ANSVAR: 431, DELKASKO: 1021, KASKO: 1876 },
        "400000": { ANSVAR: 431, DELKASKO: 1121, KASKO: 2116 },
        "500000": { ANSVAR: 431, DELKASKO: 1221, KASKO: 2356 }
    },
    // Årsmodell 1971-1980
    "1971-1980": {
        "100000": { ANSVAR: 501, DELKASKO: 851, KASKO: 1376 },
        "200000": { ANSVAR: 501, DELKASKO: 1071, KASKO: 1896 },
        "300000": { ANSVAR: 501, DELKASKO: 1181, KASKO: 2156 },
        "400000": { ANSVAR: 501, DELKASKO: 1291, KASKO: 2416 },
        "500000": { ANSVAR: 501, DELKASKO: 1401, KASKO: 2676 }
    },
    // Siste bracket (dynamisk basert på cutoff-året, men med samme priser som tidligere 1981-1992)
    [`1981-${VETERANBIL_CUTOFF_YEAR}`]: {
        "100000": { ANSVAR: 586, DELKASKO: 1006, KASKO: 1636 },
        "200000": { ANSVAR: 586, DELKASKO: 1246, KASKO: 2196 },
        "300000": { ANSVAR: 586, DELKASKO: 1366, KASKO: 2476 },
        "400000": { ANSVAR: 586, DELKASKO: 1486, KASKO: 2756 },
        "500000": { ANSVAR: 586, DELKASKO: 1606, KASKO: 3036 }
    }
};

// Dynamisk genererte årsmodellgrupper basert på nåværende år
export const AARSMODELL_GRUPPER = [
    { value: "<=1950", label: "Før 1951" },
    { value: "1951-1960", label: "1951-1960" },
    { value: "1961-1970", label: "1961-1970" },
    { value: "1971-1980", label: "1971-1980" },
    { value: `1981-${VETERANBIL_CUTOFF_YEAR}`, label: `1981-${VETERANBIL_CUTOFF_YEAR}` }
];

export const FORSIKRINGSSUMMER = [
    { value: "100000", label: "100 000 kr" },
    { value: "200000", label: "200 000 kr" },
    { value: "300000", label: "300 000 kr" },
    { value: "400000", label: "400 000 kr" },
    { value: "500000", label: "500 000 kr" }
];

export const DEKNINGSTYPER = {
    ANSVAR: "Ansvar",
    DELKASKO: "Ansvar/Delkasko",
    KASKO: "Ansvar/Kasko"
}; 