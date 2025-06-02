import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button as MuiButton, CircularProgress, Alert as MuiAlert, Grid, Divider, IconButton, Tooltip } from '@mui/material';
import { ArrowLeft, Edit2, Paperclip, History, Loader2, MessageSquarePlus, Copy, FilePlus2, UserCheck, Replace, MessageSquare, FileText as FileTextIcon, FileImage as FileImageIcon, FileSpreadsheet as FileSpreadsheetIcon, FileArchive as FileArchiveIcon, ArrowRightCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Label } from "~/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import GarantiDokumentUploadModal from './GarantiDokumentUploadModal';
import GarantiAnsvarligeEditModal from './GarantiAnsvarligeEditModal';
import GarantiOkonomiProduktEditModal from './GarantiOkonomiProduktEditModal';
// import GarantiKontaktpersonEditModal from './GarantiKontaktpersonEditModal'; // Kontaktperson er nå på Selskap-nivå
// import GarantiSelskapInfoEditModal from './GarantiSelskapInfoEditModal'; // Selskapsinfo redigeres på SelskapDetailPage
import GarantiInternKommentarEditModal from './GarantiInternKommentarEditModal'; // Må tilpasses Prosjekt
import GarantiNyInternKommentarModal from './GarantiNyInternKommentarModal'; // Må tilpasses Prosjekt
import authManager from '../../auth/AuthManager';
import { useToast } from "~/hooks/use-toast";
import { Badge } from "~/components/ui/badge";

// Definerer statusverdier for Select-listen (kan gjenbrukes)
const GARANTI_STATUS_OPTIONS = [
    { value: "Ny", label: "Ny" },
    { value: "Tildelt", label: "Tildelt" },
    { value: "Behandles", label: "Behandles" },
    { value: "Avslaatt", label: "Avslått" },
    { value: "Godkjent", label: "Godkjent" },
    { value: "AvventerGodkjenningUW", label: "Avventer Godkjenning UW" },
    { value: "KlarTilProduksjon", label: "Klar til Produksjon" },
    { value: "Produsert", label: "Produsert" }
];

const getStatusDisplayName = (statusValue) => {
    const option = GARANTI_STATUS_OPTIONS.find(opt => opt.value === statusValue);
    return option ? option.label : statusValue;
};

const getAnsvarligDisplay = (ansvarlig) => {
    console.log('[getAnsvarligDisplay] Mottok:', JSON.parse(JSON.stringify(ansvarlig))); // Logg hva som faktisk mottas
    if (!ansvarlig) {
        console.log('[getAnsvarligDisplay] Returnerer: Ikke tildelt (fordi ansvarlig er falsy)');
        return 'Ikke tildelt';
    }
    const displayName = ansvarlig.navn || ansvarlig.email || `Bruker ID: ${ansvarlig.id}`;
    console.log('[getAnsvarligDisplay] Forsøker å returnere:', displayName);
    return displayName;
};

const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return 'Ikke satt';
    try {
        const date = new Date(dateString);
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        if (includeTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
        let formattedDate = date.toLocaleDateString('nb-NO', options);
        if (includeTime) {
            const timeString = date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
            const datePart = date.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
            return `${datePart} kl. ${timeString}`;
        } else {
            return date.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
        }
    } catch (error) { return 'Ugyldig dato'; }
};

const DetailField = ({ label, value, fullWidth = false, children, actionIcon: ActionIcon, onAction }) => (
    <Grid item xs={12} sm={fullWidth ? 12 : 6} sx={{ mb: 1.5, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="caption" color="textSecondary" component="div" sx={{ lineHeight: 1.2, fontSize: '0.75rem', display: 'block', color: '#64748b' }}>
            {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '1.5rem' }}>
            {children || (
                <Typography variant="body1" component="div" sx={{ fontWeight: 500, wordBreak: 'break-word', color: '#0f172a', mr: ActionIcon ? 0.5 : 0 }}>
                    {(typeof value === 'string' && value.trim() !== '') ? value : (value !== null && value !== undefined && value !== '') ? String(value) : <span style={{ color: '#64748b' }}>Ikke satt</span>}
                </Typography>
            )}
            {ActionIcon && onAction && (
                <Tooltip title="Kopier" placement="top">
                    <IconButton onClick={onAction} size="small" sx={{ p: '2px' }}><ActionIcon size={14} className="text-muted-foreground hover:text-primary" /></IconButton>
                </Tooltip>
            )}
        </Box>
    </Grid>
);

const INITIALT_ANTALL_VISTE_ELEMENTER = 5;

// TODO: Oppdater HENDELSE_IKON_OG_NAVN_MAP for nye hendelsestyper (PROSJEKT_OPPRETTET, SELSKAP_OPPRETTET etc.)
const HENDELSE_IKON_OG_NAVN_MAP = {
    SAK_OPPRETTET: { ikon: FilePlus2, navn: "Sak opprettet", fargeClassName: "text-green-600 dark:text-green-500" }, // Blir PROSJEKT_OPPRETTET
    PROSJEKT_OPPRETTET: { ikon: FilePlus2, navn: "Prosjekt opprettet", fargeClassName: "text-green-600 dark:text-green-500" },
    SELSKAP_OPPRETTET: { ikon: FilePlus2, navn: "Selskap opprettet", fargeClassName: "text-green-600 dark:text-green-500" }, // Vises kanskje på selskapsnivå
    RAADGIVER_TILDELT: { ikon: UserCheck, navn: "Rådgiver tildelt", fargeClassName: "text-blue-600 dark:text-blue-500" },
    STATUS_ENDRET: { ikon: Replace, navn: "Status endret", fargeClassName: "text-indigo-600 dark:text-indigo-500" },
    DOKUMENT_LASTET_OPP: { ikon: Paperclip, navn: "Dokument lastet opp", fargeClassName: "text-sky-600 dark:text-sky-500" },
    INTERN_KOMMENTAR_LAGT_TIL: { ikon: MessageSquare, navn: "Kommentar", fargeClassName: "text-gray-700 dark:text-gray-400" },
    SAK_OPPDATERT: { ikon: Edit2, navn: "Sak oppdatert", fargeClassName: "text-amber-600 dark:text-amber-500" }, // Blir PROSJEKT_OPPDATERT / SELSKAP_OPPDATERT
    PROSJEKT_OPPDATERT: { ikon: Edit2, navn: "Prosjekt oppdatert", fargeClassName: "text-amber-600 dark:text-amber-500" },
    SELSKAP_OPPDATERT: { ikon: Edit2, navn: "Selskap oppdatert", fargeClassName: "text-amber-600 dark:text-amber-500" }, // Vises kanskje på selskapsnivå
    DEFAULT: { ikon: History, navn: "Generell hendelse", fargeClassName: "text-slate-500 dark:text-slate-400" }
};

// TODO: parseSakOppdatertBeskrivelse må tilpasses for PROSJEKT_OPPDATERT og SELSKAP_OPPDATERT
// eller så må service-laget sende en mer strukturert endringslogg.
// For nå, beholder vi den som den er, men den vil ikke parse nye hendelsestyper korrekt.
const parseEndringsBeskrivelse = (beskrivelse, hendelseType) => {
    let prefix = "";
    if (hendelseType === 'PROSJEKT_OPPDATERT') prefix = "Prosjektopplysninger oppdatert. Endringer: ";
    else if (hendelseType === 'SELSKAP_OPPDATERT') prefix = "Selskapsopplysninger oppdatert. Endringer: ";
    else if (hendelseType === 'SAK_OPPDATERT') prefix = "Saksopplysninger oppdatert. Endringer: "; // Gammel type
    else return [{ type: 'raw', content: beskrivelse }]; // For andre hendelsestyper

    const suffix = ".";
    if (!beskrivelse || !beskrivelse.startsWith(prefix)) {
        const enkelStatusMatch = beskrivelse.match(/^Status endret fra (.*) til (.*)\.$/);
        if (enkelStatusMatch) return [{ field: 'Status', oldValue: enkelStatusMatch[1], newValue: enkelStatusMatch[2] }];
        return [{ type: 'raw', content: beskrivelse }];
    }
    let endringsDel = beskrivelse.substring(prefix.length);
    if (endringsDel.endsWith(suffix)) endringsDel = endringsDel.slice(0, -suffix.length);
    const endringer = endringsDel.split('; ').map(endring => endring.trim()).filter(e => e);
    if (endringer.length === 0 && beskrivelse.includes("Ingen faktiske dataendringer")) {
        return [{ type: 'info', content: "Ingen reelle dataendringer ble lagret." }]
    }
    return endringer.map(str => {
        const feltEndretMatch = str.match(/(.+?) endret fra '?(.*?)'? til '?(.*?)'?$/i);
        if (feltEndretMatch) return { field: feltEndretMatch[1].trim(), oldValue: feltEndretMatch[2] === 'ikke satt' || feltEndretMatch[2] === 'null' ? null : feltEndretMatch[2], newValue: feltEndretMatch[3] === 'ikke satt' || feltEndretMatch[3] === 'null' ? null : feltEndretMatch[3] };
        const autoStatusMatch = str.match(/^Status automatisk endret til (\w+)(?: pga\. tildelt rådgiver)?\.?$/i);
        if (autoStatusMatch) return { field: "Status (auto)", newValue: autoStatusMatch[1], oldValue: "Ny" };
        const bareStatusEndretMatch = str.match(/^Status er nå (\w+)\.?$/i);
        if (bareStatusEndretMatch) return { field: "Status", newValue: bareStatusEndretMatch[1], oldValue: "(forrige ukjent)" };
        return { type: 'raw', content: str };
    });
};

const getFileIcon = (fileName) => { /* ... (uendret) ... */ };
const DOKUMENT_TYPE_BADGE_STYLING = {
    "Kontrakt": { variant: "default", className: "bg-blue-600 hover:bg-blue-700 text-white border-blue-700" },
    "Regnskap": { variant: "default", className: "bg-green-600 hover:bg-green-700 text-white border-green-700" },
    "Midlertidig regnskap": { variant: "default", className: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700" },
    "Balanserapport": { variant: "default", className: "bg-teal-600 hover:bg-teal-700 text-white border-teal-700" },
    "Budsjett": { variant: "default", className: "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-700" },
    "Likviditetsbudsjett": { variant: "default", className: "bg-sky-600 hover:bg-sky-700 text-white border-sky-700" },
    "Plantegninger": { variant: "default", className: "bg-purple-600 hover:bg-purple-700 text-white border-purple-700" },
    "E-post": { variant: "default", className: "bg-amber-500 hover:bg-amber-600 text-white border-amber-600" },
    "Annet": { variant: "secondary", className: "bg-slate-500 hover:bg-slate-600 text-white border-slate-600" },
    // Sørg for at DEFAULT er med og korrekt
    DEFAULT: { variant: "outline", className: "text-muted-foreground border-border" } // Endret til en mer nøytral default
};

function ProsjektDetailPage() { // OMDØPT
    const { prosjektId } = useParams(); // OMDØPT
    const navigate = useNavigate();
    const [prosjekt, setProsjekt] = useState(null); // OMDØPT
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isSavingStatus, setIsSavingStatus] = useState(false);
    const [usersV2, setUsersV2] = useState([]); // Brukes for ansvarlige-dropdowns
    const [isEditAnsvarligeModalOpen, setIsEditAnsvarligeModalOpen] = useState(false);
    const [isEditOkonomiModalOpen, setIsEditOkonomiModalOpen] = useState(false);
    // const [isEditKontaktpersonModalOpen, setIsEditKontaktpersonModalOpen] = useState(false); // FJERNES (kontaktperson på selskap)
    // const [isEditSelskapInfoModalOpen, setIsEditSelskapInfoModalOpen] = useState(false); // FJERNES (selskapsinfo på SelskapDetailPage)
    const [isEditInternKommentarModalOpen, setIsEditInternKommentarModalOpen] = useState(false); // TODO: Må tilpasses Prosjekt
    const [isNyInternKommentarModalOpen, setIsNyInternKommentarModalOpen] = useState(false);
    const { toast } = useToast();
    const [antallVisteHendelser, setAntallVisteHendelser] = useState(INITIALT_ANTALL_VISTE_ELEMENTER);
    const [antallVisteInterneKommentarer, setAntallVisteInterneKommentarer] = useState(INITIALT_ANTALL_VISTE_ELEMENTER);

    useEffect(() => { // Hent brukere for dropdowns (uendret)
        const fetchAllV2Users = async () => {
            try {
                if (window.electron && window.electron.garanti && window.electron.garanti.getUsersV2) {
                    const result = await window.electron.garanti.getUsersV2();
                    if (result.success && Array.isArray(result.data)) setUsersV2(result.data);
                    else console.error("Kunne ikke hente V2-brukere:", result);
                }
            } catch (e) { console.error("Feil ved henting av V2-brukere:", e); }
        };
        fetchAllV2Users();
    }, []);

    const fetchProsjektData = useCallback(async () => { // OMDØPT
        if (prosjektId) { // OMDØPT
            setIsLoading(true); setError(null);
            try {
                if (window.electron && window.electron.garanti && window.electron.garanti.getProsjektById) { // OMDØPT API-kall
                    const result = await window.electron.garanti.getProsjektById(prosjektId); // OMDØPT
                    if (result.success) setProsjekt(result.data); // OMDØPT
                    else throw new Error(result.error || `Ukjent feil ved henting av prosjekt med ID ${prosjektId}`);
                } else throw new Error('Garanti API (getProsjektById) er ikke tilgjengelig.');
            } catch (err) {
                console.error(`Feil ved henting av prosjekt ${prosjektId}:`, err); // OMDØPT
                setError(err.message); setProsjekt(null); // OMDØPT
            } finally { setIsLoading(false); }
        }
    }, [prosjektId]); // OMDØPT

    useEffect(() => {
        fetchProsjektData(); // OMDØPT
    }, [fetchProsjektData]); // OMDØPT

    const handleProsjektBleOppdatert = (oppdatertProsjektdata, suksessTittel = "Prosjekt Oppdatert", suksessBeskrivelse = "Endringene er lagret.") => {
        setProsjekt(oppdatertProsjektdata);
        toast({ title: suksessTittel, description: suksessBeskrivelse });
    };

    const handleStatusChange = async (newStatus) => {
        if (!prosjekt || newStatus === prosjekt.status || isSavingStatus) return;
        setIsSavingStatus(true);
        const endretAvId = getCurrentUserV2Id();
        try {
            const result = await window.electron.garanti.updateProsjekt({ // OMDØPT API-kall
                prosjektId: prosjekt.id, // Bruker prosjektId
                dataToUpdate: { status: newStatus },
                endretAvBrukerId_UserV2: endretAvId
            });
            if (result.success) handleProsjektBleOppdatert(result.data, "Status Oppdatert", `Status for prosjektet er endret til ${getStatusDisplayName(newStatus)}.`);
            else throw new Error(result.error || "Ukjent feil ved oppdatering av status.");
        } catch (err) {
            console.error("Feil ved endring av status:", err);
            toast({ title: "Feil ved Statusendring", description: err.message || "En ukjent feil oppstod.", variant: "destructive" });
        } finally { setIsSavingStatus(false); }
    };

    const handleUploadSuccess = (nyttDokument) => { // uploadDokument returnerer nå bare dokumentet
        // Vi må oppdatere prosjektet manuelt ved å legge til dokumentet i listen
        // eller hente prosjektdata på nytt for å få ferskeste versjon.
        // For enkelhets skyld, henter vi data på nytt.
        fetchProsjektData();
        toast({ title: "Dokument Lastet Opp", description: `Dokumentet "${nyttDokument.filnavn}" er lagt til.` });
    };

    const handleNyInternKommentarLagtTil = (nyKommentar) => { // addInternKommentar returnerer nå kommentaren
        // Henter prosjektdata på nytt for å inkludere ny kommentar
        fetchProsjektData();
        toast({ title: "Ny Intern Kommentar Lagret", description: "Kommentaren er lagt til prosjektet." });
    };

    // Denne generelle funksjonen kan fortsatt brukes hvis modalene returnerer hele det oppdaterte prosjektobjektet
    const handleProsjektDetaljerOppdatert = (oppdatertProsjekt) => {
        handleProsjektBleOppdatert(oppdatertProsjekt, "Prosjektinformasjon Oppdatert", "Endringene i prosjektinformasjonen er lagret.");
    };

    const handleOpenDocument = async (doc) => { /* ... (uendret, men bør sjekkes for kontekst) ... */ };
    const getCurrentUserV2Id = useCallback(() => { /* ... (uendret) ... */ }, [usersV2]);
    const handleCopyToClipboard = (textToCopy, fieldName) => { /* ... (uendret) ... */ };

    // Skeleton, feilmeldinger, og sjekk for !prosjekt (tidligere !sak)
    if (isLoading && !prosjekt) { /* ... (liknende skeleton som før) ... */
        return <Box sx={{ p: 3 }}>Laster prosjektdetaljer...</Box>; // Forenklet skeleton
    }
    if (error) {
        return <Box sx={{ p: 3 }}><MuiButton onClick={() => navigate('/garanti/saker')}>Tilbake</MuiButton><MuiAlert severity="error">Feil: {error}</MuiAlert></Box>;
    }
    if (!prosjekt) {
        return <Box sx={{ p: 3 }}><MuiButton onClick={() => navigate('/garanti/saker')}>Tilbake</MuiButton><MuiAlert severity="warning">Fant ikke prosjekt med ID: {prosjektId}</MuiAlert></Box>;
    }

    const synligeHendelser = prosjekt.hendelser ? prosjekt.hendelser.slice(0, antallVisteHendelser) : [];
    const alleHendelserVises = prosjekt.hendelser ? antallVisteHendelser >= prosjekt.hendelser.length : true;
    const synligeInterneKommentarer = prosjekt.interneKommentarer ? prosjekt.interneKommentarer.slice(0, antallVisteInterneKommentarer) : [];
    const alleInterneKommentarerVises = prosjekt.interneKommentarer ? antallVisteInterneKommentarer >= prosjekt.interneKommentarer.length : true;

    // For feilsøking av ansvarlige-visning
    if (prosjekt) {
        console.log('[ProsjektDetailPage] Prosjekt-objekt før render:', JSON.parse(JSON.stringify(prosjekt))); // Kloner for å unngå logging av proxy
        console.log('[ProsjektDetailPage] Ansvarlig Rådgiver Objekt:', prosjekt.ansvarligRaadgiver);
        console.log('[ProsjektDetailPage] Visningsverdi Rådgiver:', getAnsvarligDisplay(prosjekt.ansvarligRaadgiver));
        console.log('[ProsjektDetailPage] UW Ansvarlig Objekt:', prosjekt.uwAnsvarlig);
        console.log('[ProsjektDetailPage] Visningsverdi UW:', getAnsvarligDisplay(prosjekt.uwAnsvarlig));
        console.log('[ProsjektDetailPage] Produksjon Ansvarlig Objekt:', prosjekt.produksjonsansvarlig);
        console.log('[ProsjektDetailPage] Visningsverdi Produksjon:', getAnsvarligDisplay(prosjekt.produksjonsansvarlig));
    }

    // Hoved-return med JSX
    return (
        <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
            <Button variant="outline" onClick={() => navigate(prosjekt.selskap ? `/garanti/selskap/${prosjekt.selskap.id}` : '/garanti/saker')} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {prosjekt.selskap ? `Tilbake til ${prosjekt.selskap.selskapsnavn}` : 'Tilbake til prosjektoversikt'}
            </Button>

            <Box className="flex justify-between items-baseline mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                <Box>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600, fontSize: '1.75rem', mb: 0.25 }}>
                        {prosjekt.navn || 'Navnløst Prosjekt'}
                    </Typography>
                    <Typography variant="subtitle1" component="h2" sx={{ color: '#475569', fontSize: '1rem', mb: 0.25 }}>
                        Selskap: {prosjekt.selskap?.selskapsnavn} (Org.nr: {prosjekt.selskap?.organisasjonsnummer})
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                        Prosjekt ID: {prosjekt.id}
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'right', alignSelf: 'flex-end' }}>
                    <Typography variant="caption" display="block" color="textSecondary">Opprettet: {formatDate(prosjekt.opprettetDato)}</Typography>
                    <Typography variant="caption" display="block" color="textSecondary">Sist Endret: {formatDate(prosjekt.updated_at)}</Typography>
                </Box>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                    {/* Kort for Prosjektinfo (erstatter Selskapsinfo og Kontaktperson her) */}
                    <Card className="mb-4">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg">Prosjektdetaljer</CardTitle>
                            {/* TODO: Knapp for å redigere prosjektdetaljer (ikke økonomi/ansvarlig) */}
                            {/* <IconButton size="small" onClick={() => setIsEditProsjektInfoModalOpen(true)} title="Rediger prosjektdetaljer">
                                <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </IconButton> */}
                        </CardHeader>
                        <CardContent><Grid container spacing={0.5}>
                            <DetailField label="Prosjektnavn" value={prosjekt.navn} />
                            <DetailField label="Prosjektadresse" value={`${prosjekt.prosjektGateadresse || ''} ${prosjekt.prosjektPostnummer || ''} ${prosjekt.prosjektPoststed || ''}`.trim() || 'Ikke satt'} />
                            <DetailField label="Kommune" value={prosjekt.prosjektKommune} />
                            {/* <DetailField label="Kommunenr" value={prosjekt.prosjektKommunenummer} /> */}
                        </Grid></CardContent>
                    </Card>

                    <Card className="mb-4">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg">Produkt og Økonomi</CardTitle> {/* Gjenbruker "Okonomi" for prosjekt */}
                            <IconButton size="small" onClick={() => setIsEditOkonomiModalOpen(true)} title="Rediger produkt/økonomi">
                                <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </IconButton>
                        </CardHeader>
                        <CardContent><Grid container spacing={0.5}>
                            <DetailField label="Produkt" value={prosjekt.produkt} />
                            {/* <DetailField label="Ramme" value={prosjekt.ramme} /> Ramme er nå på selskap */}
                            {/* TODO: Andre økonomi-felter spesifikke for prosjekt kan legges her */}
                        </Grid></CardContent>
                    </Card>

                    <Card className="mb-4">
                        <CardHeader><CardTitle className="text-lg">Kommentar fra Kunde</CardTitle></CardHeader>
                        <CardContent>
                            <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap', minHeight: '2.5em' }}>
                                {prosjekt.kommentarKunde || <span style={{ fontStyle: 'italic', color: '#64748b' }}>Ingen kommentar fra kunde registrert.</span>}
                            </Typography>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg">Interne Kommentarer</CardTitle>
                            <Button variant="default" size="sm" onClick={() => setIsNyInternKommentarModalOpen(true)} className="h-8 px-3 text-xs">
                                <MessageSquarePlus className="mr-1.5 h-4 w-4" /> Legg til ny
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {prosjekt.interneKommentarer && prosjekt.interneKommentarer.length > 0 ? (
                                <div className="space-y-3 text-sm border-t border-border pt-3 mt-1">
                                    {synligeInterneKommentarer.map(kommentar => (
                                        <div key={kommentar.id} className="pb-3 border-b border-dashed border-border last:border-b-0 mb-2 last:mb-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <Typography variant="caption" display="block" color="textSecondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                                                    {getAnsvarligDisplay(kommentar.opprettetAv) || 'Ukjent'}
                                                </Typography>
                                                <Typography variant="caption" display="block" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                                                    {formatDate(kommentar.opprettet_dato)}
                                                </Typography>
                                            </div>
                                            <Typography variant="body2" sx={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{kommentar.kommentar}</Typography>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>Ingen interne kommentarer.</Typography>
                            )}
                            {prosjekt.interneKommentarer && prosjekt.interneKommentarer.length > INITIALT_ANTALL_VISTE_ELEMENTER && (
                                <Button variant="link" size="sm" className="mt-2 p-0 h-auto" onClick={() => setAntallVisteInterneKommentarer(alleInterneKommentarerVises ? INITIALT_ANTALL_VISTE_ELEMENTER : prosjekt.interneKommentarer.length)}>
                                    {alleInterneKommentarerVises ? 'Vis færre' : `Vis alle ${prosjekt.interneKommentarer.length} kommentarer`}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Card className="mb-4">
                        <CardHeader><CardTitle className="text-lg">Status</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-1.5">
                                <Select value={prosjekt.status} onValueChange={handleStatusChange} disabled={isSavingStatus}>
                                    <SelectTrigger id="statusSelect" className="w-full">
                                        {isSavingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        <SelectValue placeholder="Velg status...">{getStatusDisplayName(prosjekt.status)}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GARANTI_STATUS_OPTIONS.map(option => (
                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isSavingStatus && <Typography variant="caption">Lagrer...</Typography>}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="mb-4">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">Ansvarlige</CardTitle>
                            <IconButton size="small" onClick={() => setIsEditAnsvarligeModalOpen(true)} title="Endre ansvarlige">
                                <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </IconButton>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                            <DetailField label="Ansvarlig Rådgiver" value={getAnsvarligDisplay(prosjekt.ansvarligRaadgiver)} fullWidth />
                            <DetailField label="UW Ansvarlig" value={getAnsvarligDisplay(prosjekt.uwAnsvarlig)} fullWidth />
                            <DetailField label="Produksjonsansvarlig" value={getAnsvarligDisplay(prosjekt.produksjonsansvarlig)} fullWidth />
                        </CardContent>
                    </Card>

                    <Card className="mb-4">
                        <CardHeader><CardTitle className="text-lg">Dokumenter ({prosjekt.dokumenter?.length || 0})</CardTitle></CardHeader>
                        <CardContent>
                            {prosjekt.dokumenter && prosjekt.dokumenter.length > 0 ? (
                                <div className="space-y-2.5">
                                    {prosjekt.dokumenter.map(doc => {
                                        const FileIkon = getFileIcon(doc.filnavn);
                                        console.log('[ProsjektDetailPage] Dokument:', doc.filnavn, 'FileIkon:', FileIkon, 'OpplastetAv:', doc.opplastetAv);

                                        const resolvedBadgeStyle = DOKUMENT_TYPE_BADGE_STYLING[doc.dokumentType] ||
                                            DOKUMENT_TYPE_BADGE_STYLING.DEFAULT ||
                                            { variant: "outline", className: "text-muted-foreground border-border" };

                                        if (!resolvedBadgeStyle || typeof resolvedBadgeStyle.variant === 'undefined') {
                                            console.error('[ProsjektDetailPage] resolvedBadgeStyle er ugyldig for dokumentType:', doc.dokumentType, 'doc:', doc);
                                            // Sett en hardkodet, garantert gyldig stil for å unngå krasj
                                            const fallbackOnErrorStyle = { variant: "destructive", className: "bg-red-500 text-white" };
                                            return (
                                                <div key={doc.id} className="p-2 border rounded-md">
                                                    <p>Feil ved lasting av dokument: {doc.filnavn}</p>
                                                    <Badge variant={fallbackOnErrorStyle.variant} className={fallbackOnErrorStyle.className}>{doc.dokumentType || 'Feil type'}</Badge>
                                                </div>
                                            );
                                        }

                                        const opplastetAvBrukerNavn = doc.opplastetAv ? getAnsvarligDisplay(doc.opplastetAv) : 'Ukjent bruker';

                                        return (
                                            <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-md border bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800">
                                                <div className="flex items-center space-x-3 overflow-hidden flex-grow">
                                                    {FileIkon && <FileIkon className="h-8 w-8 text-primary flex-shrink-0" />}
                                                    {!FileIkon && <FileTextIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />}
                                                    <div className="truncate">
                                                        <button onClick={() => handleOpenDocument(doc)} className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate hover:underline text-left p-0 bg-transparent border-none cursor-pointer" title={`Åpne ${doc.filnavn}`}>
                                                            {doc.filnavn}
                                                        </button>
                                                        <div className="flex items-center space-x-1.5 mt-0.5">
                                                            <Badge
                                                                variant={resolvedBadgeStyle.variant}
                                                                className={`text-xs px-1.5 py-0.5 font-medium ${resolvedBadgeStyle.className}`}
                                                            >
                                                                {doc.dokumentType || 'Ukjent type'}
                                                            </Badge>
                                                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                                                                {formatDate(doc.opplastetDato, false)} av {opplastetAvBrukerNavn}
                                                            </Typography>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Tooltip title="Åpne dokument"><IconButton onClick={() => handleOpenDocument(doc)} size="small" sx={{ p: '4px' }} className="ml-2 flex-shrink-0"><ArrowRightCircle className="h-5 w-5 text-muted-foreground hover:text-primary" /></IconButton></Tooltip>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3, border: '1px dashed #e2e8f0', borderRadius: '0.375rem' }}>Ingen dokumenter.</Typography>
                            )}
                            <Button variant="default" size="sm" className="mt-4 w-full" onClick={() => setIsUploadModalOpen(true)}>
                                <Paperclip className="mr-2 h-4 w-4" /> Last opp nytt dokument
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">Hendelseslogg ({prosjekt.hendelser?.length || 0})</CardTitle>
                            <History className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="pt-2" sx={{ pr: 2 }}>
                            {prosjekt.hendelser && prosjekt.hendelser.length > 0 ? (
                                <div className="space-y-1 text-sm relative">
                                    {synligeHendelser.length > 0 && <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700 -z-10"></div>}
                                    {synligeHendelser.map((event) => {
                                        const hendelseInfo = HENDELSE_IKON_OG_NAVN_MAP[event.hendelseType] || HENDELSE_IKON_OG_NAVN_MAP.DEFAULT;
                                        const Ikon = hendelseInfo.ikon;
                                        let beskrivelseInnhold;
                                        if (event.hendelseType === 'DOKUMENT_LASTET_OPP') {
                                            const parts = event.beskrivelse.split(' | Type: ');
                                            const filMelding = parts[0] || 'Dokument lastet opp';
                                            const type = parts[1];
                                            const badgeStyle = type ? (DOKUMENT_TYPE_BADGE_STYLING[type] || DOKUMENT_TYPE_BADGE_STYLING.DEFAULT) : DOKUMENT_TYPE_BADGE_STYLING.DEFAULT;
                                            beskrivelseInnhold = (
                                                <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <Typography component="span" variant="body2" sx={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.4, mr: 0.5 }}>
                                                        {filMelding}
                                                    </Typography>
                                                    {type && (
                                                        <Badge variant={badgeStyle.variant} className={`text-xs px-1.5 py-0.5 font-medium ${badgeStyle.className}`}>
                                                            {type}
                                                        </Badge>
                                                    )}
                                                </Box>
                                            );
                                        } else if (event.hendelseType === 'PROSJEKT_OPPDATERT' || event.hendelseType === 'SAK_OPPDATERT' || event.hendelseType === 'SELSKAP_OPPDATERT') {
                                            const parsedBeskrivelse = parseEndringsBeskrivelse(event.beskrivelse, event.hendelseType);
                                            // Enkel visning av parsedBeskrivelse, kan gjøres mer avansert senere
                                            beskrivelseInnhold = (
                                                <Box component="ul" sx={{ listStyle: 'none', pl: 0, mt: 0.5, fontSize: '0.85rem', color: '#4b5563' }}>
                                                    {parsedBeskrivelse.map((endring, idx) => (
                                                        <li key={idx} className="mb-0.5">
                                                            {endring.field ? (
                                                                <>
                                                                    <span className="font-medium">{endring.field.charAt(0).toUpperCase() + endring.field.slice(1).replace(/([A-Z])/g, ' $1')}:</span>
                                                                    {' '}
                                                                    {endring.oldValue !== null && endring.oldValue !== undefined && endring.oldValue !== '(forrige ukjent)' && (
                                                                        <span className="line-through text-slate-400 dark:text-slate-500 mr-1">{getStatusDisplayName(endring.oldValue) || endring.oldValue}</span>
                                                                    )}
                                                                    {(endring.oldValue !== null && endring.oldValue !== undefined && endring.oldValue !== '(forrige ukjent)') && (endring.newValue !== null && endring.newValue !== undefined) && ' → '}
                                                                    <span className="font-semibold text-indigo-700 dark:text-indigo-400 ml-1">{getStatusDisplayName(endring.newValue) || endring.newValue}</span>
                                                                </>
                                                            ) : (
                                                                <span>{endring.content}</span>
                                                            )}
                                                        </li>
                                                    ))}
                                                </Box>
                                            );
                                        } else {
                                            beskrivelseInnhold = <Typography variant="body2" sx={{ fontSize: '0.85rem', color: '#4b5563', mt: 0.5, whiteSpace: 'pre-wrap' }}>{event.beskrivelse}</Typography>;
                                        }
                                        return (
                                            <div key={event.id} className="flex items-start space-x-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                                                <div className="flex-shrink-0 pt-0.5"><Ikon size={18} className={hendelseInfo.fargeClassName || 'text-slate-500'} /></div>
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-baseline justify-between flex-wrap">
                                                        <Typography component="h4" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{hendelseInfo.navn}</Typography>
                                                        <Typography component="span" variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{formatDate(event.dato)}</Typography>
                                                    </div>
                                                    <Typography variant="caption" display="block" color="textSecondary" sx={{ fontSize: '0.7rem' }}>av {getAnsvarligDisplay(event.utfoertAv) || 'System'}</Typography>
                                                    {beskrivelseInnhold}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (<Typography variant="body2" sx={{ textAlign: 'center', py: 2 }}>Ingen hendelser.</Typography>)}
                            {prosjekt.hendelser && prosjekt.hendelser.length > INITIALT_ANTALL_VISTE_ELEMENTER && (
                                <Button variant="link" size="sm" className="mt-2 p-0 h-auto text-xs" onClick={() => setAntallVisteHendelser(alleHendelserVises ? INITIALT_ANTALL_VISTE_ELEMENTER : prosjekt.hendelser.length)}>
                                    {alleHendelserVises ? 'Vis færre' : `Vis alle ${prosjekt.hendelser.length} hendelser`}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* MODALER - MÅ TILPASSES PROSJEKT */}
            <GarantiDokumentUploadModal
                isOpen={isUploadModalOpen}
                setIsOpen={setIsUploadModalOpen}
                entityContext={{ type: 'prosjekt', id: prosjektId }} // OPPDATERT
                onUploadSuccess={handleUploadSuccess}
            />
            {prosjekt && (
                <GarantiAnsvarligeEditModal
                    isOpen={isEditAnsvarligeModalOpen}
                    setIsOpen={setIsEditAnsvarligeModalOpen}
                    currentData={prosjekt} // OMDØPT prop, sender prosjekt
                    entityType="prosjekt" // Ny prop for å fortelle modalen hva den jobber med
                    onUpdate={handleProsjektDetaljerOppdatert} // Kaller generell oppdateringshandler
                />
            )}
            {prosjekt && (
                <GarantiOkonomiProduktEditModal
                    isOpen={isEditOkonomiModalOpen}
                    setIsOpen={setIsEditOkonomiModalOpen}
                    currentData={prosjekt} // OMDØPT prop
                    entityType="prosjekt"
                    onUpdate={handleProsjektDetaljerOppdatert}
                />
            )}
            {prosjekt && (
                <GarantiNyInternKommentarModal
                    isOpen={isNyInternKommentarModalOpen}
                    setIsOpen={setIsNyInternKommentarModalOpen}
                    entityContext={{ type: 'prosjekt', id: prosjektId }} // OPPDATERT
                    onKommentarLagtTil={handleNyInternKommentarLagtTil}
                />
            )}
            {/* GarantiInternKommentarEditModal - TODO: Hvis man skal redigere kommentarer */}
        </Box>
    );
}

export default ProsjektDetailPage; // OMDØPT 