export const getFieldDisplayName = (fieldName) => {
    const n = fieldName?.toLowerCase?.() || '';
    if (n.includes('saksbehandler')) return 'Saksbehandler';
    if (n.includes('status')) return 'Status';
    if (n.includes('type')) return 'Type';
    if (n.includes('produkt')) return 'Produkt';
    if (n.includes('kunde')) return 'Kunde';
    if (n.includes('ansvarlig')) return 'Ansvarlig';
    return fieldName;
};

export const getValueDisplayName = (fieldName) => {
    const n = fieldName?.toLowerCase?.() || '';
    if (n.includes('utbetalt')) return 'Utbetalt';
    if (n.includes('premie')) return 'Premie';
    if (n.includes('beløp')) return 'Beløp';
    if (n.includes('verdi')) return 'Verdi';
    if (n.includes('sum')) return fieldName.replace('Sum', '');
    if (fieldName === 'Antall') return 'Antall';
    return fieldName;
};


