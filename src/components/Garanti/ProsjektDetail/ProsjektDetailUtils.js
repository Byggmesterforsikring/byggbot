import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
    FilePlus2, Edit2, Replace, UserCheck, Paperclip, MessageSquare, History,
    FileText as FileTextIcon, FileImage as FileImageIcon,
    FileSpreadsheet as FileSpreadsheetIcon, FileArchive as FileArchiveIcon
} from 'lucide-react';

export const INITIALT_ANTALL_VISTE_ELEMENTER = 5;

// Funksjon for å formatere datoer
export const formatDato = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return format(date, 'dd.MM.yyyy HH:mm', { locale: nb });
    } catch (error) {
        return 'Ugyldig dato';
    }
};

// Utility for å formatere ansvarlig visning
export const getAnsvarligDisplay = (ansvarligData) => {
    if (!ansvarligData) {
        return 'Ikke tildelt';
    }
    const displayValue = ansvarligData.navn || ansvarligData.email || 'Ukjent';
    return displayValue;
};

// Status badge styling
export const getStatusStyle = (status) => {
    switch (status) {
        case 'Ny':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'Tildelt':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'Behandles':
            return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'AvventerGodkjenningUW':
            return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'Godkjent':
            return 'bg-green-100 text-green-800 border-green-200';
        case 'Avslaatt':
            return 'bg-red-100 text-red-800 border-red-200';
        case 'KlarTilProduksjon':
            return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        case 'Produsert':
            return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

// Dokument type badge styling
export const DOKUMENT_TYPE_BADGE_STYLING = {
    "Kontrakt": { variant: "default", className: "bg-blue-600 hover:bg-blue-700 text-white border-blue-700" },
    "Regnskap": { variant: "default", className: "bg-green-600 hover:bg-green-700 text-white border-green-700" },
    "Midlertidig regnskap": { variant: "default", className: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700" },
    "Balanserapport": { variant: "default", className: "bg-teal-600 hover:bg-teal-700 text-white border-teal-700" },
    "Budsjett": { variant: "default", className: "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-700" },
    "Likviditetsbudsjett": { variant: "default", className: "bg-sky-600 hover:bg-sky-700 text-white border-sky-700" },
    "Plantegninger": { variant: "default", className: "bg-violet-600 hover:bg-violet-700 text-white border-violet-700" },
    "Garantibrev": { variant: "default", className: "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700" },
    "Byggetillatelse": { variant: "default", className: "bg-amber-600 hover:bg-amber-700 text-white border-amber-700" },
    "Ferdigattest": { variant: "default", className: "bg-orange-600 hover:bg-orange-700 text-white border-orange-700" },
    "Dokumentliste": { variant: "default", className: "bg-pink-600 hover:bg-pink-700 text-white border-pink-700" },
    "Annet": { variant: "secondary", className: "bg-gray-500 hover:bg-gray-600 text-white border-gray-600" },
};

// Hendelse ikon og fargemapping
export const HENDELSE_IKON_OG_NAVN_MAP = {
    PROSJEKT_OPPRETTET: { ikon: FilePlus2, navn: "Prosjekt opprettet", fargeClassName: "text-green-600 dark:text-green-500" },
    PROSJEKT_OPPDATERT: { ikon: Edit2, navn: "Prosjekt oppdatert", fargeClassName: "text-amber-600 dark:text-amber-500" },
    STATUS_ENDRET: { ikon: Replace, navn: "Status endret", fargeClassName: "text-blue-600 dark:text-blue-500" },
    ANSVARLIG_ENDRET: { ikon: UserCheck, navn: "Ansvarlig endret", fargeClassName: "text-purple-600 dark:text-purple-500" },
    DOKUMENT_LASTET_OPP: { ikon: Paperclip, navn: "Dokument lastet opp", fargeClassName: "text-sky-600 dark:text-sky-500" },
    INTERN_KOMMENTAR_LAGT_TIL: { ikon: MessageSquare, navn: "Kommentar", fargeClassName: "text-gray-700 dark:text-gray-400" },
    DEFAULT: { ikon: History, navn: "Generell hendelse", fargeClassName: "text-slate-500 dark:text-slate-400" }
};

// Parse endringsbeskrivelse for hendelser
export const parseEndringsBeskrivelse = (beskrivelse, hendelseType) => {
    // Sjekk for dokumentopplasting først
    const dokumentMatch = beskrivelse?.match(/^Fil:\s*(.+?)\s*\|\s*Type:\s*(.+)$/);
    if (dokumentMatch) {
        return [{
            type: 'document',
            filename: dokumentMatch[1].trim(),
            documentType: dokumentMatch[2].trim()
        }];
    }

    // Sjekk for ulike typer prefix-er som kan komme fra backend
    let prefix = "";
    if (beskrivelse?.includes("Prosjektopplysninger oppdatert. Endringer:")) {
        prefix = "Prosjektopplysninger oppdatert. Endringer: ";
    } else if (beskrivelse?.includes("Prosjekt oppdatert. Endringer:")) {
        prefix = "Prosjekt oppdatert. Endringer: ";
    } else if (beskrivelse?.includes("Status endret.")) {
        prefix = "Status endret. ";
    } else if (beskrivelse?.includes("Ansvarlig endret.")) {
        prefix = "Ansvarlig endret. ";
    } else {
        return [{ type: 'raw', content: beskrivelse }];
    }

    if (!beskrivelse || !beskrivelse.includes(prefix.trim())) {
        return [{ type: 'raw', content: beskrivelse }];
    }

    let endringsDel = beskrivelse.substring(prefix.length);
    const suffix = ".";
    if (endringsDel.endsWith(suffix)) endringsDel = endringsDel.slice(0, -suffix.length);
    const endringer = endringsDel.split('; ').map(endring => endring.trim()).filter(e => e);

    return endringer.map(str => {
        // Først prøv å matche "felt endret fra X til Y" format
        const feltEndretMatch = str.match(/(.+?) endret fra '?(.*?)'? til '?(.*?)'?$/i);
        if (feltEndretMatch) {
            return {
                field: feltEndretMatch[1].trim(),
                oldValue: feltEndretMatch[2] === 'ikke satt' || feltEndretMatch[2] === 'null' ? null : feltEndretMatch[2],
                newValue: feltEndretMatch[3] === 'ikke satt' || feltEndretMatch[3] === 'null' ? null : feltEndretMatch[3]
            };
        }

        // Deretter prøv å matche "felt: verdi" format (for nye verdier)
        const nyVerdiMatch = str.match(/(.+?):\s*(.+)$/);
        if (nyVerdiMatch) {
            return {
                field: nyVerdiMatch[1].trim(),
                oldValue: null, // Ingen gammel verdi
                newValue: nyVerdiMatch[2].trim()
            };
        }

        return { type: 'raw', content: str };
    });
};

// Hjelpefunksjon for å få MIME-type basert på filnavn
export const getFileType = (filename) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pdf': return 'application/pdf';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        case 'gif': return 'image/gif';
        case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case 'xls': return 'application/vnd.ms-excel';
        case 'doc': return 'application/msword';
        case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'txt': return 'text/plain';
        default: return 'application/octet-stream';
    }
};

// Render av filikon basert på filtype
export const getFileIcon = (filename) => {
    if (!filename) return FileTextIcon;
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
        case 'svg':
            return FileImageIcon;
        case 'xls':
        case 'xlsx':
        case 'csv':
            return FileSpreadsheetIcon;
        case 'zip':
        case 'rar':
        case '7z':
        case 'tar':
        case 'gz':
            return FileArchiveIcon;
        default:
            return FileTextIcon;
    }
};

// Status-valg
export const statusValg = [
    'Ny',
    'Tildelt',
    'Behandles',
    'AvventerGodkjenningUW',
    'Godkjent',
    'Avslaatt',
    'KlarTilProduksjon',
    'Produsert',
];

// Funksjon for å formatere status-tekst til lesbar visning
export const formatStatusDisplay = (status) => {
    switch (status) {
        case 'AvventerGodkjenningUW':
            return 'Avventer Godkjenning UW';
        case 'Avslaatt':
            return 'Avslått';
        case 'KlarTilProduksjon':
            return 'Klar til Produksjon';
        default:
            return status;
    }
}; 