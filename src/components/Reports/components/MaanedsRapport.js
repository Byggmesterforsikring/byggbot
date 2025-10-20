import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Alert, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { ToggleGroup, ToggleGroupItem } from '../../ui/toggle-group';
import {
    Calendar,
    FileText,
    PieChart as PieChartIcon,
    BarChart3,
    Copy,
    Download,
    CheckCircle,
    Plus,
    Minus,
    AlertTriangle,
    RefreshCw,
    Building2,
    Users,
    List,
    Grid3x3
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { formatNumber, getMonthName } from '../../../utils/formatUtils';

const MaanedsRapport = () => {
    const chartRef = useRef(null);

    // State for report data
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [klagesakerData, setKlagesakerData] = useState(null);
    const [error, setError] = useState(null);

    // State for manual inputs
    const [annet, setAnnet] = useState('');

    // State for insurance company filter
    const [selectedInsurer, setSelectedInsurer] = useState('alle');
    const [availableInsurers, setAvailableInsurers] = useState([]);

    // State for report format
    const [reportFormat, setReportFormat] = useState('detaljert');

    // State for period calculation
    const [reportPeriod, setReportPeriod] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // State for copy feedback
    const [copySuccess, setCopySuccess] = useState(false);
    const [tableCopySuccess, setTableCopySuccess] = useState(false);
    const [chartCopySuccess, setChartCopySuccess] = useState(false);

    // Normalize insurer names to handle encoding issues
    const normalizeInsurerName = (name) => {
        if (!name) return '';

        return name
            .replace(/Förs��kring/g, 'Försäkring')     // Fix encoding issue 1
            .replace(/Förs\?\?kring/g, 'Försäkring')   // Fix encoding issue 2
            .replace(/F��rsäkring/g, 'Försäkring')     // Fix encoding issue 3
            .replace(/F\?\?rsäkring/g, 'Försäkring')   // Fix encoding issue 4
            .replace(/F\uFFFDrsäkring/g, 'Försäkring') // Fix replacement character
            .replace(/F\uFFFD\uFFFDrsäkring/g, 'Försäkring') // Fix double replacement characters
            .trim();
    };

    // Check if two insurer names match (with normalization)
    const insurersMatch = (name1, name2) => {
        return normalizeInsurerName(name1) === normalizeInsurerName(name2);
    };

    // Calculate previous month dates on component mount
    useEffect(() => {
        const calculatePreviousMonth = () => {
            const today = new Date();



            // Calculate previous month - we want August 2025 if we're in September 2025
            let previousMonth = today.getMonth() - 1; // September (8) - 1 = August (7)
            let year = today.getFullYear();

            // Handle January case (month 0 - 1 = -1, should become December of previous year)
            if (previousMonth < 0) {
                previousMonth = 11; // December
                year = year - 1;
            }

            // Create first day of previous month
            const firstDayOfPreviousMonth = new Date(year, previousMonth, 1);
            // Create last day of previous month  
            const lastDayOfPreviousMonth = new Date(year, previousMonth + 1, 0);

            // Format dates correctly for local timezone to avoid UTC conversion issues
            const startDateStr = `${firstDayOfPreviousMonth.getFullYear()}-${String(firstDayOfPreviousMonth.getMonth() + 1).padStart(2, '0')}-${String(firstDayOfPreviousMonth.getDate()).padStart(2, '0')}`;
            const endDateStr = `${lastDayOfPreviousMonth.getFullYear()}-${String(lastDayOfPreviousMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfPreviousMonth.getDate()).padStart(2, '0')}`;

            setStartDate(startDateStr);
            setEndDate(endDateStr);

            const monthName = getMonthName(previousMonth + 1); // getMonthName expects 1-based month
            setReportPeriod(`${monthName} ${year}`);
        };

        calculatePreviousMonth();
    }, []);

    // Fetch report data
    const fetchReportData = async () => {
        if (!startDate || !endDate) {
            setError('Datoer er ikke satt');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Calculate extended period for complaints (last 12 months to catch all relevant complaints)
            const startDateObj = new Date(startDate);
            const extendedStartDateObj = new Date(startDateObj.getFullYear() - 1, startDateObj.getMonth(), 1);
            const extendedStartDate = `${extendedStartDateObj.getFullYear()}-${String(extendedStartDateObj.getMonth() + 1).padStart(2, '0')}-${String(extendedStartDateObj.getDate()).padStart(2, '0')}`;



            // Fetch both damage report and complaints data in parallel
            const [skadeResult, klageResult] = await Promise.all([
                window.electron.dashboard.fetchStats({
                    reportName: 'API_Byggbot_skaderapport',
                    StartDate: startDate,
                    EndDate: endDate
                }),
                window.electron.dashboard.fetchStats({
                    reportName: 'API_Byggbot_klagesaker',
                    StartDate: extendedStartDate,  // Extended period for complaints
                    EndDate: endDate
                })
            ]);

            if (skadeResult.error) {
                setError('Feil ved henting av skadedata: ' + skadeResult.error);
            } else if (klageResult.error) {
                setError('Feil ved henting av klagesaksdata: ' + klageResult.error);
            } else {
                // Handle different API response formats
                let processedKlageData = null;
                if (Array.isArray(klageResult)) {
                    // API returned array format - need to process it
                    const detaljertListe = klageResult.filter(item => item.skadenummer);

                    // Extract summary statistics from the array
                    const totaltAntall = detaljertListe.length;
                    const medholdInternt = klageResult.find(item => item.klageResultat === 'Klager medhold internt')?.antallSaker || 0;
                    const medholdEksternt = klageResult.filter(item =>
                        item.klageResultat?.includes('medhold') && !item.klageResultat?.includes('internt')
                    ).reduce((sum, item) => sum + (item.antallSaker || 0), 0);
                    const trukket = klageResult.find(item => item.klageResultat === 'Trukket ')?.antallSaker || 0;

                    processedKlageData = {
                        totaltAntallKlagesaker: totaltAntall,
                        klagerMedholdInternt: medholdInternt,
                        selskabMedholdEksternt: medholdEksternt,
                        klagerTrukket: trukket,
                        detaljertKlagesaksliste: detaljertListe
                    };
                } else {
                    // API returned object format
                    processedKlageData = klageResult;
                }

                setReportData(skadeResult);
                setKlagesakerData(processedKlageData);

                // Extract unique insurance companies and normalize encoding issues
                if (skadeResult.SkadeDetaljer) {
                    const rawInsurers = skadeResult.SkadeDetaljer
                        .map(skade => skade.Forsikringsselskap)
                        .filter(Boolean);

                    // Normalize and deduplicate insurers (handle encoding issues)
                    const normalizedInsurers = new Map();
                    rawInsurers.forEach(insurer => {
                        const normalized = normalizeInsurerName(insurer);
                        // Use the normalized name as both key and value to ensure consistency
                        if (!normalizedInsurers.has(normalized) && normalized) {
                            normalizedInsurers.set(normalized, normalized);
                        }
                    });

                    const insurers = Array.from(normalizedInsurers.values()).sort();
                    setAvailableInsurers(insurers);
                }
            }
        } catch (err) {
            setError('Feil ved henting av rapportdata: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter data by selected insurance company
    const getFilteredData = () => {
        if (!reportData || selectedInsurer === 'alle') {
            return reportData;
        }

        // Filter SkadeDetaljer by insurance company
        const filteredSkadeDetaljer = reportData.SkadeDetaljer.filter(
            skade => normalizeInsurerName(skade.Forsikringsselskap) === selectedInsurer
        );

        // Recalculate statistics based on filtered data
        const filteredData = { ...reportData };
        filteredData.SkadeDetaljer = filteredSkadeDetaljer;
        filteredData.TotaltAntallSkader = filteredSkadeDetaljer.length;

        // Recalculate customer type statistics
        const bedriftskunder = filteredSkadeDetaljer.filter(s => s.ErBedriftskunde).length;
        const privatkunder = filteredSkadeDetaljer.filter(s => !s.ErBedriftskunde).length;

        filteredData.AntallBedriftskunder = bedriftskunder;
        filteredData.AntallPrivatkunder = privatkunder;

        // Recalculate damage type statistics
        const skadetypeStats = {};
        filteredSkadeDetaljer.forEach(skade => {
            const type = skade.Skadetype || 'Ukjent';
            skadetypeStats[type] = (skadetypeStats[type] || 0) + 1;
        });

        filteredData.SkadetypeStatistikk = Object.keys(skadetypeStats).map(type => ({
            ClaimType: type,
            AntallSkader: skadetypeStats[type]
        }));

        return filteredData;
    };

    // Extract registration date from complaint comment
    const extractRegistrationDate = (kommentar) => {
        if (!kommentar) return null;

        // Look for various date patterns for complaint registration
        const patterns = [
            /^(\d{2}\.\d{2}\.(\d{4}|\d{2})):\s*[Mm]ottatt\s+klage/,     // "01.09.2025: Mottatt klage" or "01.09.25: Mottatt klage"
            /^(\d{2}\.\d{2}\.(\d{4}|\d{2})):\s*[Kk]lage\s+mottatt/,     // "15.07.2025: Klage mottatt" or "15.07.25: Klage mottatt"
            /^(\d{2}\.\d{2}\.(\d{4}|\d{2})):\s*[Kk]lage\s+fra/,        // "19.09.24: Klage fra FT"
            /^(\d{2}\.\d{2}\.(\d{4}|\d{2})):\s*[Vv]arsel\s+om/,        // "18.12.2024: Varsel om Forliksklage"
            /^(\d{2}\.\d{2}\.(\d{4}|\d{2})):\s*[Ff]orliksklage\s+mottatt/, // "08.01.2025: Forliksklage mottatt"
            /(\d{2}\.\d{2}\.(\d{4}|\d{2})):\s*[Mm]ottatt\s+klage/,      // Anywhere in text
            /(\d{2}\.\d{2}\.(\d{4}|\d{2})):\s*[Kk]lage\s+mottatt/       // Anywhere in text
        ];

        for (const pattern of patterns) {
            const match = kommentar.match(pattern);
            if (match) {
                const dateStr = match[1];
                const [day, month, yearStr] = dateStr.split('.');

                // Handle 2-digit vs 4-digit years
                let year = parseInt(yearStr);
                if (year < 100) {
                    year = year < 50 ? 2000 + year : 1900 + year; // 24 -> 2024, 25 -> 2025
                }

                const date = new Date(year, parseInt(month) - 1, parseInt(day));
                return date;
            }
        }

        return null;
    };

    // Check if a date is within the report period
    const isDateInPeriod = (date) => {
        if (!date || !startDate || !endDate) return false;

        const periodStart = new Date(startDate);
        const periodEnd = new Date(endDate);

        return date >= periodStart && date <= periodEnd;
    };

    // Filter complaints data by selected insurance company and report period
    const getFilteredKlagesakerData = () => {
        if (!klagesakerData) {
            return klagesakerData;
        }

        let filteredKlagesaker = klagesakerData.detaljertKlagesaksliste || [];

        // Filter by insurance company if selected
        if (selectedInsurer !== 'alle') {
            filteredKlagesaker = filteredKlagesaker.filter(
                klage => normalizeInsurerName(klage.forsikringsgiver) === selectedInsurer
            );
        }

        // Filter by registration date within report period
        const complaintsWithDates = [];
        const complaintsWithoutDates = [];

        filteredKlagesaker.forEach(klage => {
            const registrationDate = extractRegistrationDate(klage.klagekommentar);

            if (registrationDate && isDateInPeriod(registrationDate)) {
                complaintsWithDates.push(klage);
            } else if (!registrationDate) {
                complaintsWithoutDates.push(klage);
            }
        });

        // Only show complaints with valid registration dates in the period
        filteredKlagesaker = complaintsWithDates;

        // Recalculate statistics based on filtered complaints
        const filteredKlageData = { ...klagesakerData };
        filteredKlageData.detaljertKlagesaksliste = filteredKlagesaker;
        filteredKlageData.totaltAntallKlagesaker = filteredKlagesaker.length;

        // Recalculate other statistics
        const medholdInternt = filteredKlagesaker.filter(k => k.klageResultat?.includes('medhold internt')).length;
        const medholdEksternt = filteredKlagesaker.filter(k => k.klageResultat?.includes('medhold') && !k.klageResultat?.includes('internt')).length;
        const trukket = filteredKlagesaker.filter(k => k.klageResultat?.toLowerCase().includes('trukket')).length;

        filteredKlageData.klagerMedholdInternt = medholdInternt;
        filteredKlageData.selskabMedholdEksternt = medholdEksternt;
        filteredKlageData.klagerTrukket = trukket;

        return filteredKlageData;
    };

    // Generate the monthly report text
    const generateReportText = () => {
        if (!reportData) return '';

        const filteredData = getFilteredData();
        const filteredKlager = getFilteredKlagesakerData();
        const totalSkader = filteredData.TotaltAntallSkader || 0;
        const skadeTypeStats = filteredData.SkadetypeStatistikk || [];

        // Find specific damage types
        const glassStats = skadeTypeStats.find(s => s.ClaimType?.toLowerCase().includes('glass')) || { AntallSkader: 0 };
        const tyveriStats = skadeTypeStats.find(s => s.ClaimType?.toLowerCase().includes('tyveri')) || { AntallSkader: 0 };
        const redningStats = skadeTypeStats.find(s => s.ClaimType?.toLowerCase().includes('redning') || s.ClaimType?.toLowerCase().includes('berging')) || { AntallSkader: 0 };
        const ansvarKaskoStats = skadeTypeStats.find(s => s.ClaimType?.toLowerCase().includes('ansvar') || s.ClaimType?.toLowerCase().includes('kasko')) || { AntallSkader: 0 };

        // Create detailed breakdown table
        let detailedBreakdown = '';
        skadeTypeStats.forEach(stat => {
            detailedBreakdown += `${stat.ClaimType}\t${stat.AntallSkader}\n`;
        });

        // Generate complaints text automatically from API data (filtered by insurer)
        let klagesakerText = '';
        if (!filteredKlager || filteredKlager.totaltAntallKlagesaker === 0) {
            klagesakerText = selectedInsurer !== 'alle'
                ? `Det er ikke mottatt klagesaker for ${selectedInsurer} i perioden.`
                : 'Det er ikke mottatt klagesaker i perioden.';
        } else {
            const eksempelSaker = filteredKlager.detaljertKlagesaksliste?.slice(0, 3) || [];

            if (eksempelSaker.length > 0) {
                klagesakerText = eksempelSaker.map(sak => {
                    const kommentar = sak.klagekommentar || 'Under behandling.';

                    // Format the comment to preserve line breaks and structure
                    const formattertKommentar = kommentar
                        .replace(/\r\n/g, '\n')  // Normalize line breaks
                        .replace(/\r/g, '\n')    // Handle old Mac line breaks
                        .split('\n')             // Split into lines
                        .map(line => line.trim()) // Trim each line
                        .filter(line => line)    // Remove empty lines
                        .join('\n');             // Rejoin with clean line breaks

                    return `${sak.skadenummer}: ${formattertKommentar}`;
                }).join('\n\n');
            } else {
                const insurerSuffix = selectedInsurer !== 'alle' ? ` for ${selectedInsurer}` : '';
                klagesakerText = `Det er mottatt ${filteredKlager.totaltAntallKlagesaker} klagesaker${insurerSuffix} i perioden. ${filteredKlager.klagerMedholdInternt} klager fikk medhold internt. ${filteredKlager.selskabMedholdEksternt} saker ble avgjort til selskapets fordel eksternt.`;
            }
        }

        const annetText = annet || 'Ingen spesielle forhold å rapportere.';

        const insurerText = selectedInsurer !== 'alle' ? ` for ${selectedInsurer}` : '';

        // Generate report based on selected format
        if (reportFormat === 'detaljert') {
            // Detailed format with full product breakdown
            return `MÅNEDSRAPPORT${insurerText.toUpperCase()}

GJENNOMFØRTE KONTROLLER
Det er foretatt kontroll av alle saker med utbetalinger. Herunder kontrolleres utbetalingen, avsetting, koding, at hvitvaskingsrutinen er oppfylt og oppfølging/fremdrift i saken. Oversikt følger vedlagt.

Saker med utbetalinger over kr 100 000 er underlagt utvidet intern fagkontroll der eget kontrollskjema fylles ut. Tilbakemeldinger gis den enkelte saksbehandler ved behov.

Gjennomgang av løpende saker er under arbeid.

Det er ikke avdekket gjentagende eller grove feil ifm kontrollene.

KLAGESAKER
${klagesakerText}

ANNET
${annetText}

Det er meldt ${totalSkader} skadesaker${insurerText} i ${reportPeriod.toLowerCase()} (til og med ${new Date(endDate).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit' })}. da rapporten er utarbeidet).

De innmeldte skadene er fordelt slik ift produkt:

${detailedBreakdown}Totalt\t${totalSkader}

Det er som tidligere flest motorskader og av disse er det flest frekvensskader:

${glassStats.AntallSkader > 0 ? `Glass\t${glassStats.AntallSkader}\n` : ''}${tyveriStats.AntallSkader > 0 ? `Tyveri\t${tyveriStats.AntallSkader}\n` : ''}${redningStats.AntallSkader > 0 ? `Redning\t${redningStats.AntallSkader}\n` : ''}${ansvarKaskoStats.AntallSkader > 0 ? `Ansvar/Kasko\t${ansvarKaskoStats.AntallSkader}` : ''}`;
        } else {
            // Simplified format with grouped products
            const bilTotalt = skadeTypeStats.filter(s =>
                s.ClaimType?.toLowerCase().includes('bil') ||
                s.ClaimType?.toLowerCase().includes('motor') ||
                s.ClaimType?.toLowerCase().includes('auto')
            ).reduce((sum, stat) => sum + stat.AntallSkader, 0);

            const tingskade = totalSkader - bilTotalt;

            return `MÅNEDSRAPPORT${insurerText.toUpperCase()}

GJENNOMFØRTE KONTROLLER
Det er foretatt kontroll av alle saker med utbetalinger. Herunder kontrolleres utbetalingen, avsetting, koding, at hvitvaskingsrutinen er oppfylt og oppfølging/fremdrift i saken. Oversikt følger vedlagt.

Saker med utbetalinger over kr 100 000 er underlagt utvidet intern fagkontroll der eget kontrollskjema fylles ut. Tilbakemeldinger gis den enkelte saksbehandler ved behov.

Det er ikke avdekket gjentagende eller grove feil ifm kontrollene.

KLAGESAKER
${klagesakerText}

ANNET
${annetText}

Det er meldt ${totalSkader} skadesaker${insurerText} i ${reportPeriod.toLowerCase()}.

De innmeldte skadene er fordelt slik ift produkt:

${bilTotalt > 0 ? `Bil totalt\t${bilTotalt}\n` : ''}${tingskade > 0 ? `Tingskade (ansvar, bygg- og anlegg, reise osv)\t${tingskade}\n` : ''}Totalt\t${totalSkader}

Det er som tidligere flest motorskader og av disse er det flest frekvensskader.`;
        }
    };

    // Generate table data for Word
    const generateTableData = () => {
        if (!reportData) return '';

        const filteredData = getFilteredData();
        const skadeTypeStats = filteredData.SkadetypeStatistikk || [];
        const totalSkader = filteredData.TotaltAntallSkader || 0;

        if (reportFormat === 'detaljert') {
            // Detailed table format
            let tableData = 'Produkttype\tAntall skader\n';
            skadeTypeStats.forEach(stat => {
                tableData += `${stat.ClaimType}\t${stat.AntallSkader}\n`;
            });
            tableData += `Totalt\t${totalSkader}\n\n`;

            // Add frequency damage breakdown
            const glassStats = skadeTypeStats.find(s => s.ClaimType?.toLowerCase().includes('glass')) || { AntallSkader: 0 };
            const tyveriStats = skadeTypeStats.find(s => s.ClaimType?.toLowerCase().includes('tyveri')) || { AntallSkader: 0 };
            const redningStats = skadeTypeStats.find(s => s.ClaimType?.toLowerCase().includes('redning') || s.ClaimType?.toLowerCase().includes('berging')) || { AntallSkader: 0 };
            const ansvarKaskoStats = skadeTypeStats.find(s => s.ClaimType?.toLowerCase().includes('ansvar') || s.ClaimType?.toLowerCase().includes('kasko')) || { AntallSkader: 0 };

            tableData += 'Frekvensskader\tAntall\n';
            if (glassStats.AntallSkader > 0) tableData += `Glass\t${glassStats.AntallSkader}\n`;
            if (tyveriStats.AntallSkader > 0) tableData += `Tyveri\t${tyveriStats.AntallSkader}\n`;
            if (redningStats.AntallSkader > 0) tableData += `Redning\t${redningStats.AntallSkader}\n`;
            if (ansvarKaskoStats.AntallSkader > 0) tableData += `Ansvar/Kasko\t${ansvarKaskoStats.AntallSkader}\n`;

            return tableData;
        } else {
            // Simplified table format
            const bilTotalt = skadeTypeStats.filter(s =>
                s.ClaimType?.toLowerCase().includes('bil') ||
                s.ClaimType?.toLowerCase().includes('motor') ||
                s.ClaimType?.toLowerCase().includes('auto')
            ).reduce((sum, stat) => sum + stat.AntallSkader, 0);

            const tingskade = totalSkader - bilTotalt;

            let tableData = 'Produkttype\tAntall skader\n';
            if (bilTotalt > 0) tableData += `Bil totalt\t${bilTotalt}\n`;
            if (tingskade > 0) tableData += `Tingskade (ansvar, bygg- og anlegg, reise osv)\t${tingskade}\n`;
            tableData += `Totalt\t${totalSkader}\n`;

            return tableData;
        }
    };

    // Copy table data to clipboard
    const copyTableToClipboard = async () => {
        const tableData = generateTableData();

        try {
            await navigator.clipboard.writeText(tableData);
            setTableCopySuccess(true);
            setTimeout(() => setTableCopySuccess(false), 3000);
        } catch (err) {
            console.error('Feil ved kopiering av tabell:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = tableData;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setTableCopySuccess(true);
            setTimeout(() => setTableCopySuccess(false), 3000);
        }
    };



    // Copy report text to clipboard
    const copyReportToClipboard = async () => {
        const reportText = generateReportText();

        try {
            await navigator.clipboard.writeText(reportText);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 3000);
        } catch (err) {
            console.error('Feil ved kopiering:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = reportText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 3000);
        }
    };

    // Copy chart as image to clipboard
    const copyChartToClipboard = async () => {
        try {
            if (!chartRef.current) {
                console.error('Chart reference not found');
                return;
            }

            const svgElement = chartRef.current.querySelector('svg');
            if (!svgElement) {
                console.error('SVG element not found in chart');
                return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = async () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                try {
                    canvas.toBlob(async (blob) => {
                        if (blob) {
                            await navigator.clipboard.write([
                                new ClipboardItem({ 'image/png': blob })
                            ]);
                            setChartCopySuccess(true);
                            setTimeout(() => setChartCopySuccess(false), 3000);
                        }
                    });
                } catch (clipboardError) {
                    console.error('Clipboard API not supported, downloading instead');
                    const link = document.createElement('a');
                    link.download = `skadefordeling-${reportPeriod.replace(' ', '-')}.png`;
                    canvas.toBlob((blob) => {
                        link.href = URL.createObjectURL(blob);
                        link.click();
                    });
                }

                URL.revokeObjectURL(svgUrl);
            };

            img.src = svgUrl;
        } catch (err) {
            console.error('Feil ved kopiering av diagram:', err);
        }
    };

    // Prepare pie chart data
    const getPieChartData = () => {
        const filteredData = getFilteredData();
        if (!filteredData?.SkadetypeStatistikk) return [];

        return filteredData.SkadetypeStatistikk.map(item => ({
            name: item.ClaimType,
            value: item.AntallSkader
        }));
    };

    const COLORS = [
        '#8b5cf6', // primary purple
        '#10b981', // success green
        '#f59e0b', // warning yellow
        '#ef4444', // error red
        '#3b82f6', // info blue
        '#8b5cf6', // secondary purple
        '#A569BD',
        '#FF6B6B',
        '#4ECDC4',
        '#45B7D1'
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Calendar className="h-8 w-8 text-primary" />
                        Månedsrapport for skadesjefen
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Automatisk generering av månedlig skaderapport basert på systemdata
                    </p>
                </div>


            </div>

            {/* Period Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Rapportperiode
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Periode</Label>
                            <div className="text-lg font-semibold">{reportPeriod}</div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="startDate">Fra dato</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="endDate">Til dato</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        <Button
                            variant="outline"
                            onClick={() => {
                                const calculatePreviousMonth = () => {
                                    const today = new Date();

                                    // Calculate previous month - we want August 2025 if we're in September 2025
                                    let previousMonth = today.getMonth() - 1; // September (8) - 1 = August (7)
                                    let year = today.getFullYear();

                                    // Handle January case (month 0 - 1 = -1, should become December of previous year)
                                    if (previousMonth < 0) {
                                        previousMonth = 11; // December
                                        year = year - 1;
                                    }

                                    // Create first day of previous month
                                    const firstDayOfPreviousMonth = new Date(year, previousMonth, 1);
                                    // Create last day of previous month
                                    const lastDayOfPreviousMonth = new Date(year, previousMonth + 1, 0);

                                    // Format dates correctly for local timezone to avoid UTC conversion issues
                                    const startDateStr = `${firstDayOfPreviousMonth.getFullYear()}-${String(firstDayOfPreviousMonth.getMonth() + 1).padStart(2, '0')}-${String(firstDayOfPreviousMonth.getDate()).padStart(2, '0')}`;
                                    const endDateStr = `${lastDayOfPreviousMonth.getFullYear()}-${String(lastDayOfPreviousMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfPreviousMonth.getDate()).padStart(2, '0')}`;

                                    setStartDate(startDateStr);
                                    setEndDate(endDateStr);

                                    const monthName = getMonthName(previousMonth + 1); // getMonthName expects 1-based month
                                    setReportPeriod(`${monthName} ${year}`);
                                };
                                calculatePreviousMonth();
                            }}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Tilbakestill
                        </Button>
                    </div>

                    {/* Report Format and Insurance Company Filter */}
                    {reportData && (
                        <div className="mt-6 pt-4 border-t space-y-6">
                            {/* Report Format Selector */}
                            <div className="space-y-3">
                                <Label>Rapportformat</Label>
                                <ToggleGroup
                                    type="single"
                                    variant="outline"
                                    value={reportFormat}
                                    onValueChange={(value) => { if (value) setReportFormat(value); }}
                                    className="flex justify-start"
                                >
                                    <ToggleGroupItem
                                        value="detaljert"
                                        aria-label="Detaljert produktfordeling"
                                        className="flex items-center data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                    >
                                        <List className="h-4 w-4 mr-2" />
                                        Detaljert produktfordeling
                                    </ToggleGroupItem>
                                    <ToggleGroupItem
                                        value="forenklet"
                                        aria-label="Forenklet produktfordeling"
                                        className="flex items-center data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                    >
                                        <Grid3x3 className="h-4 w-4 mr-2" />
                                        Forenklet produktfordeling
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </div>

                            {/* Insurance Company Filter */}
                            {availableInsurers.length > 1 && (
                                <div className="space-y-3">
                                    <Label>Filtrer på forsikringsgiver</Label>
                                    <ToggleGroup
                                        type="single"
                                        variant="outline"
                                        value={selectedInsurer}
                                        onValueChange={(value) => { if (value) setSelectedInsurer(value); }}
                                        className="flex flex-wrap justify-start gap-2"
                                    >
                                        <ToggleGroupItem
                                            value="alle"
                                            aria-label="Alle forsikringsgivere"
                                            className="flex items-center data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                        >
                                            <Users className="h-4 w-4 mr-2" />
                                            Alle forsikringsgivere
                                        </ToggleGroupItem>
                                        {availableInsurers.map(insurer => {
                                            const normalizedName = normalizeInsurerName(insurer);
                                            return (
                                                <ToggleGroupItem
                                                    key={insurer}
                                                    value={insurer}
                                                    aria-label={normalizedName}
                                                    className="flex items-center data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                                >
                                                    <Building2 className="h-4 w-4 mr-2" />
                                                    {normalizedName}
                                                </ToggleGroupItem>
                                            );
                                        })}
                                    </ToggleGroup>
                                </div>
                            )}

                            {/* Filter indicators */}
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                    Format: {reportFormat === 'detaljert' ? 'Detaljert' : 'Forenklet'}
                                </Badge>
                                {selectedInsurer !== 'alle' && (
                                    <Badge variant="secondary">
                                        Forsikringsgiver: {normalizeInsurerName(selectedInsurer)}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!reportData && (
                <div className="text-center">
                    <Button
                        onClick={fetchReportData}
                        disabled={loading || !startDate || !endDate}
                        size="lg"
                        className="px-8 py-3"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Genererer rapport...
                            </>
                        ) : (
                            `Generer månedsrapport for ${reportPeriod}`
                        )}
                    </Button>
                </div>
            )}

            {reportData && (
                <div className="text-center">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setReportData(null);
                            setKlagesakerData(null);
                            setError(null);
                            setSelectedInsurer('alle');
                        }}
                        size="sm"
                    >
                        Generer ny rapport
                    </Button>
                </div>
            )}

            {reportData && (
                <>
                    {/* Manual Input Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Manuell input
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Complaints Section - Always automatic from API */}
                                <div className="space-y-4">
                                    <div className="text-sm font-medium">Klagesaker (automatisk fra API)</div>

                                    {klagesakerData ? (
                                        <div className="space-y-4">
                                            {selectedInsurer !== 'alle' && (
                                                <div className="mb-3">
                                                    <Badge variant="outline" className="text-xs">
                                                        Klagesaker for: {normalizeInsurerName(selectedInsurer)}
                                                    </Badge>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-3">
                                                <Card className="p-3">
                                                    <div className="text-2xl font-bold text-primary">
                                                        {getFilteredKlagesakerData()?.totaltAntallKlagesaker || 0}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">Totalt klagesaker</div>
                                                </Card>

                                                <Card className="p-3">
                                                    <div className="text-2xl font-bold text-green-600">
                                                        {getFilteredKlagesakerData()?.klagerMedholdInternt || 0}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">Medhold internt</div>
                                                </Card>

                                                <Card className="p-3">
                                                    <div className="text-2xl font-bold text-orange-600">
                                                        {getFilteredKlagesakerData()?.selskabMedholdEksternt || 0}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">Medhold eksternt</div>
                                                </Card>

                                                <Card className="p-3">
                                                    <div className="text-2xl font-bold text-blue-600">
                                                        {getFilteredKlagesakerData()?.klagerTrukket || 0}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">Trukket</div>
                                                </Card>
                                            </div>

                                            <p className="text-sm text-muted-foreground">
                                                Klagesakene genereres automatisk i rapporten basert på API-data{selectedInsurer !== 'alle' ? ` for ${normalizeInsurerName(selectedInsurer)}` : ''}.
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            Klagesaksdata vil vises etter at rapporten er generert.
                                        </p>
                                    )}
                                </div>

                                {/* Other Section */}
                                <div className="space-y-2">
                                    <Label htmlFor="other-info">Annet (tilleggsinformasjon)</Label>
                                    <textarea
                                        id="other-info"
                                        value={annet}
                                        onChange={(e) => setAnnet(e.target.value)}
                                        placeholder="Legg til annen relevant informasjon for rapporten. Hvis du ønsker å legge til manuell informasjon om klagesaker, kan du skrive det her..."
                                        rows={8}
                                        className="w-full p-3 border border-input rounded-md bg-background resize-none"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Statistics Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Skadestatistikk
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedInsurer !== 'alle' && (
                                <div className="mb-4">
                                    <Badge variant="outline" className="text-sm">
                                        Viser data for: {normalizeInsurerName(selectedInsurer)}
                                    </Badge>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card className="p-4 bg-primary/5">
                                    <div className="text-2xl font-bold text-primary">
                                        {formatNumber(getFilteredData()?.TotaltAntallSkader || 0)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Totalt antall skader</div>
                                </Card>

                                <Card className="p-4 bg-green-50">
                                    <div className="text-2xl font-bold text-green-600">
                                        {formatNumber(getFilteredData()?.AntallBedriftskunder || 0)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Bedriftskunder</div>
                                </Card>

                                <Card className="p-4 bg-orange-50">
                                    <div className="text-2xl font-bold text-orange-600">
                                        {formatNumber(getFilteredData()?.AntallPrivatkunder || 0)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Privatkunder</div>
                                </Card>

                                <Card className="p-4 bg-blue-50">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {formatNumber(getFilteredData()?.SkadeDetaljer?.filter(s => !s.Skadeavsluttetdato).length || 0)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Åpne saker</div>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pie Chart */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2">
                                    <PieChartIcon className="h-5 w-5" />
                                    Skadefordeling
                                </CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={copyChartToClipboard}
                                >
                                    {chartCopySuccess ? (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                            Kopiert!
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-4 w-4 mr-2" />
                                            Kopier diagram
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-96" ref={chartRef}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={getPieChartData()}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={true}
                                            label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                                            outerRadius={120}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {getPieChartData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            formatter={(value, name) => [`${formatNumber(value)} skader`, name]}
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Product Table for Word */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Produktfordeling (tabell for Word)
                                </CardTitle>
                                <Button
                                    onClick={copyTableToClipboard}
                                    variant="outline"
                                    className={tableCopySuccess ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                                >
                                    {tableCopySuccess ? (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Tabell kopiert!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Kopier tabell
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Table preview */}
                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium">Produkttype</th>
                                            <th className="px-4 py-2 text-right font-medium">Antall skader</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const filteredData = getFilteredData();
                                            const skadeTypeStats = filteredData.SkadetypeStatistikk || [];
                                            const totalSkader = filteredData.TotaltAntallSkader || 0;

                                            if (reportFormat === 'detaljert') {
                                                return skadeTypeStats.map((stat, index) => (
                                                    <tr key={index} className="border-t">
                                                        <td className="px-4 py-2">{stat.ClaimType}</td>
                                                        <td className="px-4 py-2 text-right">{stat.AntallSkader}</td>
                                                    </tr>
                                                ));
                                            } else {
                                                const bilTotalt = skadeTypeStats.filter(s =>
                                                    s.ClaimType?.toLowerCase().includes('bil') ||
                                                    s.ClaimType?.toLowerCase().includes('motor') ||
                                                    s.ClaimType?.toLowerCase().includes('auto')
                                                ).reduce((sum, stat) => sum + stat.AntallSkader, 0);

                                                const tingskade = totalSkader - bilTotalt;

                                                const rows = [];
                                                if (bilTotalt > 0) {
                                                    rows.push(
                                                        <tr key="bil" className="border-t">
                                                            <td className="px-4 py-2">Bil totalt</td>
                                                            <td className="px-4 py-2 text-right">{bilTotalt}</td>
                                                        </tr>
                                                    );
                                                }
                                                if (tingskade > 0) {
                                                    rows.push(
                                                        <tr key="tingskade" className="border-t">
                                                            <td className="px-4 py-2">Tingskade (ansvar, bygg- og anlegg, reise osv)</td>
                                                            <td className="px-4 py-2 text-right">{tingskade}</td>
                                                        </tr>
                                                    );
                                                }
                                                return rows;
                                            }
                                        })()}
                                        <tr className="border-t bg-muted font-semibold">
                                            <td className="px-4 py-2">Totalt</td>
                                            <td className="px-4 py-2 text-right">{getFilteredData()?.TotaltAntallSkader || 0}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <p className="text-sm text-muted-foreground mt-3">
                                Klikk "Kopier tabell" og lim inn i Word - det blir automatisk formatert som tabell.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Generated Report Preview */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Generert rapport (tekst)
                                </CardTitle>
                                <Button
                                    onClick={copyReportToClipboard}
                                    className={copySuccess ? 'bg-green-600 hover:bg-green-700' : ''}
                                >
                                    {copySuccess ? (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Tekst kopiert!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Kopier tekst
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-md max-h-96 overflow-auto">
                                {generateReportText()}
                            </pre>

                            {copySuccess && (
                                <Alert className="mt-4">
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Rapporten er kopiert til clipboard! Du kan nå lime den inn i Word.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};

export default MaanedsRapport;
