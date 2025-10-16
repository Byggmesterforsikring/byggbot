export const parseNumeric = (val) => {
    if (typeof val === 'number') return val;
    const n = Number(String(val || '')
        .replace(/kr\s*/gi, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.')
    );
    return isNaN(n) ? 0 : n;
};

export const toRaw = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') return String(val);
    const s = String(val);
    const cleaned = s.replace(/kr\s*/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
    const num = Number(cleaned);
    if (!isNaN(num)) return String(num);
    return s;
};

export const formatValue = (value, key) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number' && (
        key?.toLowerCase?.().includes('utbetalt') ||
        key?.toLowerCase?.().includes('premie') ||
        key?.toLowerCase?.().includes('beløp') ||
        key?.toLowerCase?.().includes('total')
    )) {
        return new Intl.NumberFormat('nb-NO', {
            style: 'currency', currency: 'NOK', minimumFractionDigits: 0, maximumFractionDigits: 0,
        }).format(value);
    }
    if (typeof value === 'number') return new Intl.NumberFormat('nb-NO').format(value);
    if (typeof value === 'string' && value.includes('T') && value.includes(':')) {
        try { return new Date(value).toLocaleDateString('nb-NO'); } catch { return value; }
    }
    return String(value);
};


