export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

export const getOrderKey = (label) => {
    if (typeof label !== 'string') return label || '';
    let m;
    if (m = label.match(/^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s(\d{4})$/)) {
        const year = parseInt(m[2], 10);
        const month = MONTHS.indexOf(m[1]);
        return `${year}-${String(month + 1).padStart(2, '0')}`;
    }
    if (m = label.match(/^Q([1-4])\s(\d{4})$/)) {
        const year = parseInt(m[2], 10);
        const q = parseInt(m[1], 10);
        return `${year}-Q${q}`;
    }
    if (/^\d{4}-\d{2}$/.test(label)) return label;
    if (m = label.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)) {
        return `${m[3]}-${m[2]}-${m[1]}`;
    }
    if (m = label.match(/^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)$/)) {
        const idx = MONTHS.indexOf(m[1]);
        return `M-${String(idx).padStart(2, '0')}`;
    }
    return label;
};

export const normalizeTimeLabelSimple = (label) => {
    if (typeof label !== 'string') return label;
    let m;
    if (m = label.match(/^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s\d{4}$/)) return m[1];
    if (m = label.match(/^(\d{4})-(\d{2})$/)) return MONTHS[parseInt(m[2], 10) - 1] || label;
    if (m = label.match(/^Q([1-4])\s\d{4}$/)) return `Q${m[1]}`;
    if (m = label.match(/^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)$/)) return m[1];
    if (m = label.match(/^Q([1-4])$/)) return `Q${m[1]}`;
    return label;
};

export const sortCanonicalLabels = (labels) => {
    const hasQuarter = labels.some(l => /^Q[1-4]$/.test(l));
    if (hasQuarter) {
        const order = ['Q1', 'Q2', 'Q3', 'Q4'];
        return order.filter(q => labels.includes(q));
    }
    const monthOrder = MONTHS;
    const monthIdxs = labels.map(l => monthOrder.indexOf(l)).filter(i => i >= 0);
    if (monthIdxs.length > 0) {
        const minIdx = Math.min(...monthIdxs);
        const maxIdx = Math.max(...monthIdxs);
        return monthOrder.slice(Math.max(0, minIdx), Math.min(monthOrder.length, maxIdx + 1)).filter(m => labels.includes(m));
    }
    return labels.sort((a, b) => (getOrderKey(a) > getOrderKey(b) ? 1 : -1));
};


