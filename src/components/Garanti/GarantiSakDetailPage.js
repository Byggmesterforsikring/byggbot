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
import GarantiKontaktpersonEditModal from './GarantiKontaktpersonEditModal';
import GarantiInternKommentarEditModal from './GarantiInternKommentarEditModal';
import GarantiNyInternKommentarModal from './GarantiNyInternKommentarModal';
import GarantiSelskapInfoEditModal from './GarantiSelskapInfoEditModal';
import authManager from '../../auth/AuthManager';
import { useToast } from "~/hooks/use-toast";
import { Badge } from "~/components/ui/badge";

// Definerer statusverdier for Select-listen
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

// Hjelpefunksjon for å få visningsnavn for en status
const getStatusDisplayName = (statusValue) => {
    const option = GARANTI_STATUS_OPTIONS.find(opt => opt.value === statusValue);
    return option ? option.label : statusValue; // Fallback til rå verdi hvis ikke funnet
};

const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return 'Ikke satt';
    try {
        const date = new Date(dateString);
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        let formattedDate = date.toLocaleDateString('nb-NO', options);
        if (includeTime) {
            const timeString = date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
            const datePart = date.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
            return `${datePart} kl. ${timeString}`;
        } else {
            return date.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
        }
    } catch (error) {
        return 'Ugyldig dato';
    }
};

const DetailField = ({ label, value, fullWidth = false, children, actionIcon: ActionIcon, onAction }) => (
    <Grid item xs={12} sm={fullWidth ? 12 : 6} sx={{ mb: 1.5, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="caption" color="textSecondary" component="div" sx={{ lineHeight: 1.2, fontSize: '0.75rem', display: 'block', color: '#64748b' }}>
            {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '1.5rem' /* Sikrer litt høyde */ }}>
            {children || (
                <Typography
                    variant="body1"
                    component="div"
                    sx={{
                        fontWeight: 500,
                        wordBreak: 'break-word',
                        color: '#0f172a',
                        mr: ActionIcon ? 0.5 : 0, // Litt marg hvis ikon finnes
                    }}
                >
                    {(typeof value === 'string' && value.trim() !== '')
                        ? value
                        : (value !== null && value !== undefined && value !== '')
                            ? String(value)
                            : <span style={{ color: '#64748b' }}>Ikke satt</span>}
                </Typography>
            )}
            {ActionIcon && onAction && (
                <Tooltip title="Kopier" placement="top">
                    <IconButton onClick={onAction} size="small" sx={{ p: '2px' }}>
                        <ActionIcon size={14} className="text-muted-foreground hover:text-primary" />
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    </Grid>
);

const INITIALT_ANTALL_VISTE_ELEMENTER = 5;

const HENDELSE_IKON_OG_NAVN_MAP = {
    SAK_OPPRETTET: { ikon: FilePlus2, navn: "Sak opprettet", fargeClassName: "text-green-600 dark:text-green-500" },
    RAADGIVER_TILDELT: { ikon: UserCheck, navn: "Rådgiver tildelt", fargeClassName: "text-blue-600 dark:text-blue-500" },
    STATUS_ENDRET: { ikon: Replace, navn: "Status endret", fargeClassName: "text-indigo-600 dark:text-indigo-500" },
    DOKUMENT_LASTET_OPP: { ikon: Paperclip, navn: "Dokument lastet opp", fargeClassName: "text-sky-600 dark:text-sky-500" },
    INTERN_KOMMENTAR_LAGT_TIL: { ikon: MessageSquare, navn: "Kommentar", fargeClassName: "text-gray-700 dark:text-gray-400" },
    SAK_OPPDATERT: { ikon: Edit2, navn: "Sak oppdatert", fargeClassName: "text-amber-600 dark:text-amber-500" },
    DEFAULT: { ikon: History, navn: "Generell hendelse", fargeClassName: "text-slate-500 dark:text-slate-400" }
};

// Hjelpefunksjon for å parse SAK_OPPDATERT beskrivelse
const parseSakOppdatertBeskrivelse = (beskrivelse) => {
    const prefix = "Saksopplysninger oppdatert. Endringer: ";
    const suffix = ".";
    if (!beskrivelse || !beskrivelse.startsWith(prefix)) {
        // Hvis det bare er en enkel statusendring fra den gamle logikken i updateSak
        const enkelStatusMatch = beskrivelse.match(/^Status endret fra (.*) til (.*)\.$/);
        if (enkelStatusMatch) {
            return [{ field: 'Status', oldValue: enkelStatusMatch[1], newValue: enkelStatusMatch[2] }];
        }
        return [{ type: 'raw', content: beskrivelse }];
    }

    let endringsDel = beskrivelse.substring(prefix.length);
    if (endringsDel.endsWith(suffix)) {
        endringsDel = endringsDel.slice(0, -suffix.length);
    }

    const endringer = endringsDel.split('; ').map(endring => endring.trim()).filter(e => e);

    if (endringer.length === 0 && beskrivelse.includes("Ingen faktiske dataendringer")) {
        return [{ type: 'info', content: "Ingen reelle dataendringer ble lagret." }]
    }
    // For å fange opp den automatiske statusendringen som kan være en del av endringsDel
    // "Status automatisk endret til Tildelt pga. tildelt rådgiver"
    // Og den generelle "Status er nå [NyStatus]"

    return endringer.map(str => {
        const feltEndretMatch = str.match(/(.+?) endret fra '?(.*?)'? til '?(.*?)'?$/i);
        if (feltEndretMatch) {
            return {
                field: feltEndretMatch[1].trim(),
                oldValue: feltEndretMatch[2] === 'ikke satt' || feltEndretMatch[2] === 'null' ? null : feltEndretMatch[2],
                newValue: feltEndretMatch[3] === 'ikke satt' || feltEndretMatch[3] === 'null' ? null : feltEndretMatch[3]
            };
        }
        const autoStatusMatch = str.match(/^Status automatisk endret til (\w+)(?: pga\. tildelt rådgiver)?\.?$/i);
        if (autoStatusMatch) {
            return { field: "Status (auto)", newValue: autoStatusMatch[1], oldValue: "Ny" }; // Antar at den gikk fra Ny
        }
        const bareStatusEndretMatch = str.match(/^Status er nå (\w+)\.?$/i);
        if (bareStatusEndretMatch) {
            return { field: "Status", newValue: bareStatusEndretMatch[1], oldValue: "(forrige ukjent)" };
        }
        return { type: 'raw', content: str };
    });
};

const getFileIcon = (fileName) => {
    if (!fileName) return Paperclip; // Fallback hvis filnavn mangler
    const extension = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) return FileImageIcon;
    if (['pdf'].includes(extension)) return FileTextIcon;
    if (['doc', 'docx', 'odt'].includes(extension)) return FileTextIcon; // Word-lignende
    if (['xls', 'xlsx', 'ods'].includes(extension)) return FileSpreadsheetIcon; // Excel-lignende
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension)) return FileArchiveIcon;
    return Paperclip; // Standard fallback for ukjente typer
};

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
    DEFAULT: { variant: "secondary", className: "bg-gray-400 hover:bg-gray-500 text-white border-gray-500" }
};

function GarantiSakDetailPage() {
    const { saksId } = useParams();
    const navigate = useNavigate();
    const [sak, setSak] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isSavingStatus, setIsSavingStatus] = useState(false);
    const [usersV2, setUsersV2] = useState([]);
    const [isEditAnsvarligeModalOpen, setIsEditAnsvarligeModalOpen] = useState(false);
    const [isEditOkonomiModalOpen, setIsEditOkonomiModalOpen] = useState(false);
    const [isEditKontaktpersonModalOpen, setIsEditKontaktpersonModalOpen] = useState(false);
    const [isEditInternKommentarModalOpen, setIsEditInternKommentarModalOpen] = useState(false);
    const [isNyInternKommentarModalOpen, setIsNyInternKommentarModalOpen] = useState(false);
    const [isEditSelskapInfoModalOpen, setIsEditSelskapInfoModalOpen] = useState(false);
    const { toast } = useToast();
    const [antallVisteHendelser, setAntallVisteHendelser] = useState(INITIALT_ANTALL_VISTE_ELEMENTER);
    const [antallVisteInterneKommentarer, setAntallVisteInterneKommentarer] = useState(INITIALT_ANTALL_VISTE_ELEMENTER);

    useEffect(() => {
        const fetchAllV2Users = async () => {
            try {
                if (window.electron && window.electron.garanti && window.electron.garanti.getUsersV2) {
                    const result = await window.electron.garanti.getUsersV2();
                    if (result.success && Array.isArray(result.data)) {
                        setUsersV2(result.data);
                    } else {
                        console.error("Kunne ikke hente V2-brukere for detaljside:", result);
                    }
                }
            } catch (e) {
                console.error("Feil ved henting av V2-brukere for detaljside:", e);
            }
        };
        fetchAllV2Users();
    }, []);

    const fetchSakData = useCallback(async () => {
        if (saksId) {
            setIsLoading(true);
            setError(null);
            try {
                if (window.electron && window.electron.garanti && window.electron.garanti.getSakById) {
                    const result = await window.electron.garanti.getSakById(saksId);
                    if (result.success) {
                        setSak(result.data);
                    } else {
                        throw new Error(result.error || `Ukjent feil ved henting av sak med ID ${saksId}`);
                    }
                } else {
                    throw new Error('Garanti API (getSakById) er ikke tilgjengelig.');
                }
            } catch (err) {
                console.error(`Feil ved henting av garantisak ${saksId}:`, err);
                setError(err.message);
                setSak(null);
            } finally {
                setIsLoading(false);
            }
        }
    }, [saksId]);

    useEffect(() => {
        fetchSakData();
    }, [fetchSakData]);

    const getAnsvarligDisplay = (ansvarlig) => {
        if (!ansvarlig) return 'Ikke tildelt';
        return ansvarlig.navn || ansvarlig.email || `Bruker ID: ${ansvarlig.id}`;
    };

    const handleSakBleOppdatert = (oppdatertSaksdata, suksessTittel = "Sak Oppdatert", suksessBeskrivelse = "Endringene er lagret.") => {
        setSak(oppdatertSaksdata);
        toast({ title: suksessTittel, description: suksessBeskrivelse });
    };

    const handleStatusChange = async (newStatus) => {
        if (!sak || newStatus === sak.status || isSavingStatus) return;
        setIsSavingStatus(true);
        const endretAvId = getCurrentUserV2Id();
        try {
            const result = await window.electron.garanti.updateSak({
                saksId: sak.id,
                dataToUpdate: { status: newStatus },
                endretAvBrukerId_UserV2: endretAvId
            });
            if (result.success) {
                handleSakBleOppdatert(result.data, "Status Oppdatert", `Status for saken er endret til ${getStatusDisplayName(newStatus)}.`);
            } else { throw new Error(result.error || "Ukjent feil ved oppdatering av status."); }
        } catch (err) {
            console.error("Feil ved endring av status:", err);
            toast({ title: "Feil ved Statusendring", description: err.message || "En ukjent feil oppstod.", variant: "destructive" });
        } finally {
            setIsSavingStatus(false);
        }
    };

    const handleUploadSuccess = (oppdatertSakEtterUpload) => {
        handleSakBleOppdatert(oppdatertSakEtterUpload, "Dokument Lastet Opp", "Nytt dokument er lagt til saken.");
    };

    const handleNyInternKommentarLagtTil = (oppdatertSakEtterKommentar) => {
        handleSakBleOppdatert(oppdatertSakEtterKommentar, "Ny Intern Kommentar Lagret", "Kommentaren er lagt til saken.");
    };

    const handleAnsvarligeEllerAnnetOppdatert = (oppdatertSak) => {
        handleSakBleOppdatert(oppdatertSak, "Saksinformasjon Oppdatert", "Endringene i saksinformasjonen er lagret.");
    };

    const handleOpenDocument = async (doc) => {
        if (!doc || !doc.containerNavn || !doc.blobNavn) {
            console.error("Ufullstendig dokumentinformasjon for å generere SAS URL:", doc);
            alert("Kunne ikke åpne dokument: Manglende informasjon.");
            return;
        }
        try {
            if (window.electron && window.electron.garanti && window.electron.garanti.getDokumentSasUrl && window.electron.shell) {
                console.log("Ber om SAS URL for:", doc.containerNavn, doc.blobNavn);
                const result = await window.electron.garanti.getDokumentSasUrl({
                    containerName: doc.containerNavn,
                    blobName: doc.blobNavn
                });
                if (result.success && result.data) {
                    console.log("Mottatt SAS URL, åpner eksternt:", result.data.substring(0, 100) + "...");
                    window.electron.shell.openExternal(result.data);
                } else {
                    throw new Error(result.error || "Kunne ikke hente sikker URL for dokumentet.");
                }
            } else {
                throw new Error("Nødvendig API for å åpne dokument er ikke tilgjengelig (getDokumentSasUrl eller shell).");
            }
        } catch (err) {
            console.error("Feil ved åpning av dokument med SAS URL:", err);
            alert(`Kunne ikke åpne dokument: ${err.message}`);
        }
    };

    const getCurrentUserV2Id = useCallback(() => {
        const currentUserAccount = authManager.getCurrentAccount();
        if (currentUserAccount && currentUserAccount.username && usersV2.length > 0) {
            const loggedInUserEmail = currentUserAccount.username.toLowerCase();
            const matchedUser = usersV2.find(u => u.email && u.email.toLowerCase() === loggedInUserEmail);
            if (matchedUser) return matchedUser.id;
            console.warn('Kunne ikke mappe innlogget bruker til UserV2 ID.');
        }
        return 1;
    }, [usersV2]);

    const handleCopyToClipboard = (textToCopy, fieldName) => {
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    toast({ title: "Kopiert!", description: `${fieldName} er kopiert til utklippstavlen.` });
                })
                .catch(err => {
                    console.error('Kunne ikke kopiere tekst: ', err);
                    toast({ title: "Feil", description: `Kunne ikke kopiere ${fieldName}.`, variant: "destructive" });
                });
        } else {
            toast({ title: "Ingenting å kopiere", description: `${fieldName} er tomt.`, variant: "secondary" });
        }
    };

    if (isLoading && !sak) {
        return (
            <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
                <Skeleton className="h-9 w-48 mb-6" />

                <Box className="flex justify-between items-start mb-6">
                    <div>
                        <Skeleton className="h-8 w-64 mb-1" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </Box>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={7}>
                        {[...Array(3)].map((_, i) => (
                            <Card key={i} className="mb-4">
                                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                                <CardContent className="space-y-3">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-5/6" />
                                    <Skeleton className="h-4 w-4/6" />
                                </CardContent>
                            </Card>
                        ))}
                    </Grid>
                    <Grid item xs={12} md={5}>
                        {[...Array(3)].map((_, i) => (
                            <Card key={i} className="mb-4">
                                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                                <CardContent className="space-y-3">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-5/6" />
                                </CardContent>
                            </Card>
                        ))}
                    </Grid>
                </Grid>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <MuiButton variant="outlined" startIcon={<ArrowLeft size={18} />} onClick={() => navigate('/garanti/saker')} sx={{ mb: 2 }}>Tilbake til oversikten</MuiButton>
                <MuiAlert severity="error" sx={{ mt: 2 }}><strong>Feil:</strong> {error}</MuiAlert>
            </Box>
        );
    }

    if (!sak && !isLoading && !error) {
        return (
            <Box sx={{ p: 3 }}>
                <MuiButton variant="outlined" startIcon={<ArrowLeft size={18} />} onClick={() => navigate('/garanti/saker')} sx={{ mb: 2 }}>Tilbake til oversikten</MuiButton>
                <MuiAlert severity="warning" sx={{ mt: 2 }}>Fant ingen sak med ID: {saksId}</MuiAlert>
            </Box>
        );
    }
    if (!sak) return null;

    const synligeHendelser = sak.hendelser ? sak.hendelser.slice(0, antallVisteHendelser) : [];
    const alleHendelserVises = sak.hendelser ? antallVisteHendelser >= sak.hendelser.length : true;

    const synligeInterneKommentarer = sak.interneKommentarer ? sak.interneKommentarer.slice(0, antallVisteInterneKommentarer) : [];
    const alleInterneKommentarerVises = sak.interneKommentarer ? antallVisteInterneKommentarer >= sak.interneKommentarer.length : true;

    return (
        <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
            <Button variant="outline" onClick={() => navigate('/garanti/saker')} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake til oversikten
            </Button>

            <Box className="flex justify-between items-baseline mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                <Box>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600, fontSize: '1.75rem', mb: 0.25 }}>
                        {sak.selskapsnavn}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                        Garantisak ID: {sak.id}
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'right', alignSelf: 'flex-end' }}>
                    <Typography variant="caption" display="block" color="textSecondary" sx={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
                        Opprettet: {formatDate(sak.opprettetDato)}
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary" sx={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
                        Sist Endret: {formatDate(sak.updated_at)}
                    </Typography>
                </Box>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                    <Card className="mb-4">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg">Selskapsinformasjon</CardTitle>
                            <IconButton size="small" onClick={() => setIsEditSelskapInfoModalOpen(true)} title="Rediger selskapsinformasjon">
                                <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </IconButton>
                        </CardHeader>
                        <CardContent><Grid container spacing={0.5}>
                            <DetailField label="Organisasjonsnummer" value={sak.organisasjonsnummer} actionIcon={Copy} onAction={() => handleCopyToClipboard(sak.organisasjonsnummer, 'Organisasjonsnummer')} />
                            <DetailField label="Selskapsnavn" value={sak.selskapsnavn} />
                            <DetailField label="Kundenummer Wims" value={sak.kundenummerWims} actionIcon={Copy} onAction={() => handleCopyToClipboard(sak.kundenummerWims, 'Kundenummer Wims')} />
                            <DetailField label="Gateadresse" value={sak.gateadresse} />
                            <DetailField label="Postnummer" value={sak.postnummer} />
                            <DetailField label="Poststed" value={sak.poststed} />
                        </Grid></CardContent>
                    </Card>

                    <Card className="mb-4">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg">Kontaktperson</CardTitle>
                            <IconButton size="small" onClick={() => setIsEditKontaktpersonModalOpen(true)} title="Rediger kontaktperson">
                                <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </IconButton>
                        </CardHeader>
                        <CardContent><Grid container spacing={0.5}>
                            <DetailField label="Navn" value={sak.kontaktpersonNavn} />
                            <DetailField label="Telefon" value={sak.kontaktpersonTelefon} />
                        </Grid></CardContent>
                    </Card>

                    <Card className="mb-4">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg">Produkt og Ramme</CardTitle>
                            <IconButton size="small" onClick={() => setIsEditOkonomiModalOpen(true)} title="Rediger produkt/ramme">
                                <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </IconButton>
                        </CardHeader>
                        <CardContent><Grid container spacing={0.5}>
                            <DetailField label="Produkt" value={sak.produkt} />
                            <DetailField label="Ramme" value={sak.ramme} />
                        </Grid></CardContent>
                    </Card>

                    <Card className="mb-4">
                        <CardHeader><CardTitle className="text-lg">Kommentar fra Kunde</CardTitle></CardHeader>
                        <CardContent>
                            <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap', minHeight: '2.5em' /* Litt høyde selv om tom */ }}>
                                {sak.kommentarKunde || <span style={{ fontStyle: 'italic', color: '#64748b' }}>Ingen kommentar fra kunde registrert.</span>}
                            </Typography>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg">Interne Kommentarer</CardTitle>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => setIsNyInternKommentarModalOpen(true)}
                                className="h-8 px-3 text-xs"
                            >
                                <MessageSquarePlus className="mr-1.5 h-4 w-4" /> Legg til ny
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Box>
                                {sak.interneKommentarer && sak.interneKommentarer.length > 0 ? (
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
                                    <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>Ingen interne kommentarer registrert.</Typography>
                                )}
                                {sak.interneKommentarer && sak.interneKommentarer.length > INITIALT_ANTALL_VISTE_ELEMENTER && (
                                    <Button variant="link" size="sm" className="mt-2 p-0 h-auto" onClick={() => setAntallVisteInterneKommentarer(alleInterneKommentarerVises ? INITIALT_ANTALL_VISTE_ELEMENTER : sak.interneKommentarer.length)}>
                                        {alleInterneKommentarerVises ? 'Vis færre' : `Vis alle ${sak.interneKommentarer.length} kommentarer`}
                                    </Button>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Card className="mb-4">
                        <CardHeader><CardTitle className="text-lg">Status</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-1.5">
                                <Select
                                    value={sak.status}
                                    onValueChange={handleStatusChange}
                                    disabled={isSavingStatus}
                                >
                                    <SelectTrigger id="statusSelect" className="w-full">
                                        {isSavingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        <SelectValue placeholder="Velg status...">
                                            {getStatusDisplayName(sak.status)}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GARANTI_STATUS_OPTIONS.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isSavingStatus && <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>Lagrer...</Typography>}
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
                            <DetailField label="Ansvarlig Rådgiver" value={getAnsvarligDisplay(sak.ansvarligRaadgiver)} fullWidth />
                            <DetailField label="UW Ansvarlig" value={getAnsvarligDisplay(sak.uwAnsvarlig)} fullWidth />
                            <DetailField label="Produksjonsansvarlig" value={getAnsvarligDisplay(sak.produksjonsansvarlig)} fullWidth />
                        </CardContent>
                    </Card>

                    <Card className="mb-4">
                        <CardHeader><CardTitle className="text-lg">Dokumenter ({sak.dokumenter?.length || 0})</CardTitle></CardHeader>
                        <CardContent>
                            {sak.dokumenter && sak.dokumenter.length > 0 ? (
                                <div className="space-y-2.5">
                                    {sak.dokumenter.map(doc => {
                                        const FileIkon = getFileIcon(doc.filnavn);
                                        const badgeStyle = DOKUMENT_TYPE_BADGE_STYLING[doc.dokumentType] || DOKUMENT_TYPE_BADGE_STYLING.DEFAULT;
                                        return (
                                            <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-md border bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800">
                                                <div className="flex items-center space-x-3 overflow-hidden flex-grow">
                                                    <FileIkon className="h-8 w-8 text-primary flex-shrink-0" />
                                                    <div className="truncate">
                                                        <button
                                                            onClick={() => handleOpenDocument(doc)}
                                                            className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate hover:underline text-left p-0 bg-transparent border-none cursor-pointer"
                                                            title={`Åpne ${doc.filnavn}`}
                                                        >
                                                            {doc.filnavn}
                                                        </button>
                                                        <div className="flex items-center space-x-1.5 mt-0.5">
                                                            <Badge
                                                                variant={badgeStyle.variant}
                                                                className={`text-xs px-1.5 py-0.5 font-medium ${badgeStyle.className}`}
                                                            >
                                                                {doc.dokumentType}
                                                            </Badge>
                                                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                                                                {formatDate(doc.opplastetDato, false)}
                                                            </Typography>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Tooltip title="Åpne dokument">
                                                    <IconButton onClick={() => handleOpenDocument(doc)} size="small" sx={{ p: '4px' }} className="ml-2 flex-shrink-0">
                                                        <ArrowRightCircle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                                                    </IconButton>
                                                </Tooltip>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3, border: '1px dashed #e2e8f0', borderRadius: '0.375rem' }}>
                                    Ingen dokumenter lastet opp.
                                </Typography>
                            )}
                            <Button
                                variant="default"
                                size="sm"
                                className="mt-4 w-full"
                                onClick={() => setIsUploadModalOpen(true)}
                            >
                                <Paperclip className="mr-2 h-4 w-4" /> Last opp nytt dokument
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">Hendelseslogg ({sak.hendelser?.length || 0})</CardTitle>
                            <History className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="pt-2" sx={{ pr: 2 }}>
                            {sak.hendelser && sak.hendelser.length > 0 ? (
                                <div className="space-y-1 text-sm relative">
                                    {synligeHendelser.length > 0 && <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700 -z-10"></div>}
                                    {synligeHendelser.map((event, index) => {
                                        const hendelseInfo = HENDELSE_IKON_OG_NAVN_MAP[event.hendelseType] || HENDELSE_IKON_OG_NAVN_MAP.DEFAULT;
                                        const Ikon = hendelseInfo.ikon;

                                        let beskrivelseInnhold;
                                        if (event.hendelseType === 'DOKUMENT_LASTET_OPP') {
                                            const parts = event.beskrivelse.split(' | Type: ');
                                            const filMelding = parts[0] || 'Dokument lastet opp';
                                            const type = parts[1];
                                            // Bruk DOKUMENT_TYPE_BADGE_STYLING her
                                            const badgeStyle = type ? (DOKUMENT_TYPE_BADGE_STYLING[type] || DOKUMENT_TYPE_BADGE_STYLING.DEFAULT) : DOKUMENT_TYPE_BADGE_STYLING.DEFAULT;
                                            beskrivelseInnhold = (
                                                <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <Typography component="span" variant="body2" sx={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.4, mr: 0.5 }}>
                                                        {filMelding}
                                                    </Typography>
                                                    {type && (
                                                        <Badge
                                                            variant={badgeStyle.variant}
                                                            className={`text-xs px-1.5 py-0.5 font-medium ${badgeStyle.className}`}
                                                        >
                                                            {type}
                                                        </Badge>
                                                    )}
                                                </Box>
                                            );
                                        } else if (event.hendelseType === 'SAK_OPPDATERT') {
                                            const parsedBeskrivelse = parseSakOppdatertBeskrivelse(event.beskrivelse);
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
                                            beskrivelseInnhold = (
                                                <Typography variant="body2" sx={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.4, mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                    {event.beskrivelse}
                                                </Typography>
                                            );
                                        }

                                        return (
                                            <div key={event.id} className="flex items-start space-x-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                                                <div className="flex-shrink-0 pt-0.5">
                                                    <Ikon size={18} className={hendelseInfo.fargeClassName || 'text-slate-500'} />
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-baseline justify-between flex-wrap">
                                                        <Typography component="h4" sx={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem', lineHeight: 1.4, mr: 1, mb: 0.25 }}>
                                                            {hendelseInfo.navn}
                                                        </Typography>
                                                        <Typography component="span" variant="caption" display="block" color="textSecondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2, whiteSpace: 'nowrap', pl: 1 }}>
                                                            {formatDate(event.dato)}
                                                        </Typography>
                                                    </div>
                                                    <Typography variant="caption" display="block" color="textSecondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                                                        av {getAnsvarligDisplay(event.utfoertAv) || 'System'}
                                                    </Typography>
                                                    {beskrivelseInnhold}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (<Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>Ingen hendelser registrert.</Typography>)}
                            {sak.hendelser && sak.hendelser.length > INITIALT_ANTALL_VISTE_ELEMENTER && (
                                <Button variant="link" size="sm" className="mt-2 p-0 h-auto text-xs" onClick={() => setAntallVisteHendelser(alleHendelserVises ? INITIALT_ANTALL_VISTE_ELEMENTER : sak.hendelser.length)}>
                                    {alleHendelserVises ? 'Vis færre hendelser' : `Vis alle ${sak.hendelser.length} hendelser`}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <GarantiDokumentUploadModal
                isOpen={isUploadModalOpen}
                setIsOpen={setIsUploadModalOpen}
                sakId={saksId}
                onUploadSuccess={handleUploadSuccess}
            />
            {sak && (
                <GarantiAnsvarligeEditModal
                    isOpen={isEditAnsvarligeModalOpen}
                    setIsOpen={setIsEditAnsvarligeModalOpen}
                    currentSakData={sak}
                    onUpdate={handleAnsvarligeEllerAnnetOppdatert}
                />
            )}
            {sak && (
                <GarantiOkonomiProduktEditModal
                    isOpen={isEditOkonomiModalOpen}
                    setIsOpen={setIsEditOkonomiModalOpen}
                    currentSakData={sak}
                    onUpdate={handleAnsvarligeEllerAnnetOppdatert}
                />
            )}
            {sak && (
                <GarantiKontaktpersonEditModal
                    isOpen={isEditKontaktpersonModalOpen}
                    setIsOpen={setIsEditKontaktpersonModalOpen}
                    currentSakData={sak}
                    onUpdate={handleAnsvarligeEllerAnnetOppdatert}
                />
            )}
            {sak && (
                <GarantiInternKommentarEditModal
                    isOpen={isEditInternKommentarModalOpen}
                    setIsOpen={setIsEditInternKommentarModalOpen}
                    currentSakData={sak}
                    onUpdate={handleAnsvarligeEllerAnnetOppdatert}
                />
            )}
            {sak && (
                <GarantiNyInternKommentarModal
                    isOpen={isNyInternKommentarModalOpen}
                    setIsOpen={setIsNyInternKommentarModalOpen}
                    saksId={saksId}
                    onKommentarLagtTil={handleNyInternKommentarLagtTil}
                />
            )}
            {sak && (
                <GarantiSelskapInfoEditModal
                    isOpen={isEditSelskapInfoModalOpen}
                    setIsOpen={setIsEditSelskapInfoModalOpen}
                    currentSakData={sak}
                    onUpdate={handleAnsvarligeEllerAnnetOppdatert}
                />
            )}
        </Box>
    );
}

export default GarantiSakDetailPage; 