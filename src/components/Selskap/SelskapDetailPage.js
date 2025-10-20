import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button as MuiButton, CircularProgress, Alert as MuiAlert, Grid, Divider, IconButton } from '@mui/material';
import {
    ArrowLeft, Edit2, PlusCircle, Paperclip, MessageSquare, Building2,
    MapPin, Phone, User, CreditCard, Banknote, Calendar, Users,
    Globe, Factory, Hash, Building, RefreshCw, History, FilePlus2,
    UserCheck, Replace
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import GarantiSelskapInfoEditModal from '~/components/Garanti/GarantiSelskapInfoEditModal';
import { useToast } from '~/hooks/use-toast';
import authManager from '../../auth/AuthManager';

// Hjelpefunksjon for formatering (kan flyttes til utils)
const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return 'Ikke satt';
    try {
        const date = new Date(dateString);
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return date.toLocaleDateString('nb-NO', options) + (includeTime ? ' ' + date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : '');
    } catch (error) {
        return 'Ugyldig dato';
    }
};

// Hjelpefunksjon for formatering av beløp
const formatAmount = (amount) => {
    if (!amount || amount === '' || amount === '0') return 'Ikke satt';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return 'Ugyldig beløp';
    return `Kr. ${numAmount.toLocaleString('nb-NO')}`;
};

// Hjelpefunksjon for formatering av telefonnummer
const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber || phoneNumber === '') return 'Ikke satt';

    // Fjern alle mellomrom og spesialtegn, behold bare tall og +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // Håndter norske nummer med landkode (+47)
    if (cleaned.startsWith('+47')) {
        const number = cleaned.substring(3);
        if (number.length === 8) {
            return `+47 ${number.substring(0, 2)} ${number.substring(2, 4)} ${number.substring(4, 6)} ${number.substring(6, 8)}`;
        }
        return cleaned; // Returner uendret hvis ikke 8 siffer etter +47
    }

    // Håndter norske nummer uten landkode
    if (cleaned.length === 8 && !cleaned.startsWith('+')) {
        return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6, 8)}`;
    }

    // Håndter gamle norske nummer (7 siffer)
    if (cleaned.length === 7 && !cleaned.startsWith('+')) {
        return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 5)} ${cleaned.substring(5, 7)}`;
    }

    // For utenlandske nummer eller andre formater, returner som det er
    if (cleaned.startsWith('+')) {
        return cleaned;
    }

    // Hvis ikke noe av over passer, returner original
    return phoneNumber;
};

// Hjelpefunksjon for å beregne år i drift
const calculateYearsInOperation = (foundingDate) => {
    if (!foundingDate) return null;
    const today = new Date();
    const founding = new Date(foundingDate);
    const yearsDiff = today.getFullYear() - founding.getFullYear();
    const monthDiff = today.getMonth() - founding.getMonth();

    // Juster hvis vi ikke har passert stiftelsesdato i år
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < founding.getDate())) {
        return yearsDiff - 1;
    }
    return yearsDiff;
};

// Konstanter for hendelseslogg
const INITIALT_ANTALL_VISTE_ELEMENTER = 5;

const HENDELSE_IKON_OG_NAVN_MAP = {
    SELSKAP_OPPRETTET: { ikon: FilePlus2, navn: "Selskap opprettet", fargeClassName: "text-green-600 dark:text-green-500" },
    SELSKAP_OPPRETTET_BRREG: { ikon: FilePlus2, navn: "Selskap opprettet", fargeClassName: "text-green-600 dark:text-green-500" },
    SELSKAP_OPPDATERT: { ikon: Edit2, navn: "Selskap oppdatert", fargeClassName: "text-amber-600 dark:text-amber-500" },
    BRREG_DATA_OPPDATERT: { ikon: RefreshCw, navn: "Oppdatert fra Brønnøysund", fargeClassName: "text-blue-600 dark:text-blue-500" },
    PROSJEKT_OPPRETTET: { ikon: FilePlus2, navn: "Prosjekt opprettet", fargeClassName: "text-blue-600 dark:text-blue-500" },
    DOKUMENT_LASTET_OPP: { ikon: Paperclip, navn: "Dokument lastet opp", fargeClassName: "text-sky-600 dark:text-sky-500" },
    INTERN_KOMMENTAR_LAGT_TIL: { ikon: MessageSquare, navn: "Kommentar", fargeClassName: "text-gray-700 dark:text-gray-400" },
    DEFAULT: { ikon: History, navn: "Generell hendelse", fargeClassName: "text-slate-500 dark:text-slate-400" }
};

const parseEndringsBeskrivelse = (beskrivelse, hendelseType) => {
    let prefix = "";
    if (hendelseType === 'SELSKAP_OPPDATERT') prefix = "Selskapsopplysninger oppdatert. Endringer: ";
    else return [{ type: 'raw', content: beskrivelse }];

    const suffix = ".";
    if (!beskrivelse || !beskrivelse.startsWith(prefix)) {
        return [{ type: 'raw', content: beskrivelse }];
    }
    let endringsDel = beskrivelse.substring(prefix.length);
    if (endringsDel.endsWith(suffix)) endringsDel = endringsDel.slice(0, -suffix.length);
    const endringer = endringsDel.split('; ').map(endring => endring.trim()).filter(e => e);

    return endringer.map(str => {
        const feltEndretMatch = str.match(/(.+?) endret fra '?(.*?)'? til '?(.*?)'?$/i);
        if (feltEndretMatch) {
            return {
                field: feltEndretMatch[1].trim(),
                oldValue: feltEndretMatch[2] === 'ikke satt' || feltEndretMatch[2] === 'null' ? null : feltEndretMatch[2],
                newValue: feltEndretMatch[3] === 'ikke satt' || feltEndretMatch[3] === 'null' ? null : feltEndretMatch[3]
            };
        }
        return { type: 'raw', content: str };
    });
};

// Hjelpefunksjon for å vise ansvarlig
const getAnsvarligDisplay = (ansvarlig) => {
    if (!ansvarlig) return null;
    if (typeof ansvarlig === 'string') return ansvarlig;
    if (ansvarlig.navn) return ansvarlig.navn;
    if (ansvarlig.email) return ansvarlig.email;
    if (ansvarlig.id) return `ID: ${ansvarlig.id}`;
    return null;
};

const DetailField = ({ label, value, icon: Icon, className = "" }) => (
    <div className={`flex items-center space-x-3 py-3 ${className}`}>
        {Icon && (
            <div className="flex-shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
        )}
        <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
                {value || <span className="text-muted-foreground font-normal">Ikke satt</span>}
            </p>
        </div>
    </div>
);

function SelskapDetailPage() {
    const { selskapId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [selskap, setSelskap] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdatingFromBrreg, setIsUpdatingFromBrreg] = useState(false);
    const [antallVisteHendelser, setAntallVisteHendelser] = useState(INITIALT_ANTALL_VISTE_ELEMENTER);

    const fetchSelskapData = useCallback(async () => {
        if (selskapId) {
            setIsLoading(true);
            setError(null);
            try {
                if (window.electron && window.electron.garanti && window.electron.garanti.getSelskapById) {
                    const result = await window.electron.garanti.getSelskapById(selskapId);
                    if (result.success) {
                        setSelskap(result.data);
                    } else {
                        throw new Error(result.error || `Ukjent feil ved henting av selskap med ID ${selskapId}`);
                    }
                } else {
                    throw new Error('Garanti API (getSelskapById) er ikke tilgjengelig.');
                }
            } catch (err) {
                console.error(`Feil ved henting av selskap ${selskapId}:`, err);
                setError(err.message);
                setSelskap(null);
            } finally {
                setIsLoading(false);
            }
        }
    }, [selskapId]);

    useEffect(() => {
        fetchSelskapData();
    }, [fetchSelskapData]);

    const handleEditSelskap = () => setIsEditModalOpen(true);

    const handleUpdateFromBrreg = async () => {
        if (!selskap?.organisasjonsnummer) {
            toast({
                title: "Kan ikke hente data",
                description: "Organisasjonsnummer mangler",
                variant: "destructive"
            });
            return;
        }

        setIsUpdatingFromBrreg(true);
        try {
            // Hent data fra Brønnøysund
            const brregResult = await window.electron.brreg.getEnhetInfo(selskap.organisasjonsnummer);

            if (!brregResult.success) {
                throw new Error(brregResult.error || 'Kunne ikke hente data fra Brønnøysund');
            }

            const brregData = brregResult.data;

            // Hent gjeldende brukerdetaljer
            const userDetails = authManager.getCurrentUserDetails();
            if (!userDetails || !userDetails.id) {
                throw new Error('Kunne ikke identifisere bruker');
            }

            // Oppdater selskap med ny data fra Brønnøysund
            const updateResult = await window.electron.garanti.updateSelskap({
                selskapId: selskap.id,
                dataToUpdate: {
                    selskapsnavn: brregData.navn,
                    gateadresse: brregData.forretningsadresse?.adresse?.[0] || null,
                    postnummer: brregData.forretningsadresse?.postnummer || null,
                    poststed: brregData.forretningsadresse?.poststed || null,
                    // Merk: Disse feltene kan ikke oppdateres gjennom updateSelskap, men de er i DB
                    // organisasjonsformBeskrivelse, stiftelsesdato, antallAnsatte, naeringskode1Beskrivelse, hjemmeside
                },
                brukerId: userDetails.id
            });

            if (!updateResult.success) {
                throw new Error(updateResult.error || 'Kunne ikke oppdatere selskap');
            }

            // Hent oppdaterte data
            await fetchSelskapData();
            toast({
                title: "Selskapsinformasjon oppdatert",
                description: "Data hentet fra Brønnøysund",
                duration: 2000
            });
        } catch (error) {
            console.error('Feil ved oppdatering fra Brønnøysund:', error);
            toast({
                title: "Feil ved oppdatering",
                description: error.message || "Kunne ikke oppdatere fra Brønnøysund",
                variant: "destructive"
            });
        } finally {
            setIsUpdatingFromBrreg(false);
        }
    };

    const handleNyttProsjektForSelskap = () => {
        if (selskapId) {
            navigate(`/garanti/prosjekt/ny?selskapId=${selskapId}`);
        } else {
            console.error("SelskapId er ikke tilgjengelig for å opprette nytt prosjekt.");
        }
    };

    const handleSelskapUpdated = async (updatedSelskapData) => {
        setSelskap(updatedSelskapData);
        setIsEditModalOpen(false);
        await fetchSelskapData();
    };

    if (isLoading && !selskap) {
        return (
            <div className="p-6 max-w-6xl mx-auto space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-1/3" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 flex-shrink-0 mb-4">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Tilbake</span>
                </Button>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <p className="text-destructive font-medium">Feil: {error}</p>
                </div>
            </div>
        );
    }

    if (!selskap) {
        return (
            <div className="p-6">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 flex-shrink-0 mb-4">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Tilbake</span>
                </Button>
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                    <p className="text-warning-foreground">Fant ikke selskap med ID: {selskapId}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 flex-shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Tilbake</span>
                </Button>
                <Button onClick={handleEditSelskap} className="gap-2">
                    <Edit2 className="h-4 w-4" /> Rediger Selskap
                </Button>
            </div>

            {/* Selskapsheader */}
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{selskap.selskapsnavn}</h1>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                Org.nr: {selskap.organisasjonsnummer}
                            </span>
                            {selskap.organisasjonsformBeskrivelse && (
                                <Badge variant="secondary">{selskap.organisasjonsformBeskrivelse}</Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Hovedinnhold */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Venstre kolonne - Selskapsinformasjon */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Kontakt & Økonomi */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Kontakt & Økonomi
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 divide-y md:divide-y-0 md:divide-x">
                                {/* Kontakt */}
                                <div className="space-y-1">
                                    <DetailField label="Kontaktperson" value={selskap.kontaktpersonNavn} icon={User} />
                                    <DetailField label="Telefon" value={formatPhoneNumber(selskap.kontaktpersonTelefon)} icon={Phone} />
                                    {selskap.hjemmeside && (
                                        <DetailField label="Hjemmeside" value={selskap.hjemmeside} icon={Globe} />
                                    )}
                                </div>

                                {/* Økonomi */}
                                <div className="space-y-1 md:pl-8 pt-6 md:pt-0">
                                    <DetailField label="Kundenummer WIMS" value={selskap.kundenummerWims} icon={CreditCard} />
                                    <DetailField label="Ramme" value={formatAmount(selskap.ramme)} icon={Banknote} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Selskapsdetaljer fra Brønnøysund */}
                    <Card key="bronnysund-details">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Building className="h-5 w-5" />
                                    Detaljer fra Brønnøysund
                                </CardTitle>
                                <div className="flex items-center gap-4">
                                    <p className="text-xs text-muted-foreground">
                                        Sist oppdatert: {formatDate(selskap.updated_at, false)}
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleUpdateFromBrreg}
                                        disabled={isUpdatingFromBrreg}
                                    >
                                        <RefreshCw className={`h-4 w-4 mr-1 ${isUpdatingFromBrreg ? 'animate-spin' : ''}`} />
                                        {isUpdatingFromBrreg ? 'Oppdaterer...' : 'Oppdater'}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Adresse - separat øverst */}
                            <DetailField
                                label="Adresse"
                                value={selskap.gateadresse ? `${selskap.gateadresse}, ${selskap.postnummer || ''} ${selskap.poststed || ''}`.trim() : null}
                                icon={MapPin}
                            />

                            <Separator className="my-4" />

                            {/* To-kolonne layout som Kontakt & Økonomi */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 divide-y md:divide-y-0 md:divide-x">
                                {/* Venstre kolonne */}
                                <div className="space-y-1">
                                    {selskap.stiftelsesdato && calculateYearsInOperation(selskap.stiftelsesdato) !== null && (
                                        <DetailField
                                            label="Tid i drift"
                                            value={`${calculateYearsInOperation(selskap.stiftelsesdato)} år`}
                                            icon={Calendar}
                                        />
                                    )}
                                    {selskap.stiftelsesdato && (
                                        <DetailField
                                            label="Stiftelsesdato"
                                            value={formatDate(selskap.stiftelsesdato, false)}
                                            icon={Calendar}
                                        />
                                    )}
                                </div>

                                {/* Høyre kolonne */}
                                <div className="space-y-1 md:pl-8 pt-6 md:pt-0">
                                    {selskap.antallAnsatte && (
                                        <DetailField
                                            label="Antall ansatte"
                                            value={selskap.antallAnsatte.toString()}
                                            icon={Users}
                                        />
                                    )}
                                    {selskap.naeringskode1Beskrivelse && (
                                        <DetailField
                                            label="Bransje"
                                            value={selskap.naeringskode1Beskrivelse}
                                            icon={Factory}
                                        />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Høyre kolonne - Prosjekter */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <PlusCircle className="h-5 w-5" />
                                    Prosjekter ({selskap.prosjekter?.length || 0})
                                </CardTitle>
                                <Button onClick={handleNyttProsjektForSelskap} size="sm" variant="outline">
                                    <PlusCircle className="h-4 w-4 mr-1" /> Nytt
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {selskap.prosjekter && selskap.prosjekter.length > 0 ? (
                                <div className="space-y-3">
                                    {selskap.prosjekter.map(p => (
                                        <div
                                            key={p.id}
                                            className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                            onClick={() => navigate(`/garanti/prosjekt/${p.id}`)}
                                        >
                                            <h4 className="font-medium text-sm">{p.navn || 'Navnløst Prosjekt'}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs">
                                                    {p.status}
                                                </Badge>
                                                {p.produkt && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {p.produkt}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Sist endret: {formatDate(p.updated_at, false)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    Ingen prosjekter registrert for dette selskapet.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Hendelseslogg */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">Hendelseslogg ({selskap.hendelser?.length || 0})</CardTitle>
                            <History className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="pt-2">
                            {selskap.hendelser && selskap.hendelser.length > 0 ? (
                                <div className="space-y-1 text-sm relative">
                                    {(() => {
                                        const synligeHendelser = selskap.hendelser.slice(0, antallVisteHendelser);
                                        const alleHendelserVises = antallVisteHendelser >= selskap.hendelser.length;

                                        return (
                                            <>
                                                {synligeHendelser.length > 0 && (
                                                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700 -z-10"></div>
                                                )}
                                                {synligeHendelser.map((event) => {
                                                    const hendelseInfo = HENDELSE_IKON_OG_NAVN_MAP[event.hendelseType] || HENDELSE_IKON_OG_NAVN_MAP.DEFAULT;
                                                    const Ikon = hendelseInfo.ikon;
                                                    let beskrivelseInnhold;

                                                    if (event.hendelseType === 'SELSKAP_OPPDATERT') {
                                                        const parsedBeskrivelse = parseEndringsBeskrivelse(event.beskrivelse, event.hendelseType);
                                                        beskrivelseInnhold = (
                                                            <ul className="list-none pl-0 mt-0.5 text-xs text-muted-foreground">
                                                                {parsedBeskrivelse.map((endring, idx) => (
                                                                    <li key={idx} className="mb-0.5">
                                                                        {endring.field ? (
                                                                            <>
                                                                                <span className="font-medium">{endring.field}:</span>
                                                                                {' '}
                                                                                {endring.oldValue !== null && (
                                                                                    <span className="line-through text-slate-400 dark:text-slate-500 mr-1">
                                                                                        {endring.oldValue}
                                                                                    </span>
                                                                                )}
                                                                                {endring.oldValue !== null && endring.newValue !== null && ' → '}
                                                                                <span className="font-semibold text-indigo-700 dark:text-indigo-400 ml-1">
                                                                                    {endring.newValue || 'ikke satt'}
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <span>{endring.content}</span>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        );
                                                    } else {
                                                        beskrivelseInnhold = (
                                                            <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                                                                {event.beskrivelse}
                                                            </p>
                                                        );
                                                    }

                                                    return (
                                                        <div key={event.id} className="flex items-start space-x-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                                                            <div className="flex-shrink-0 pt-0.5">
                                                                <Ikon size={18} className={hendelseInfo.fargeClassName || 'text-slate-500'} />
                                                            </div>
                                                            <div className="flex-grow min-w-0">
                                                                <div className="flex items-baseline justify-between flex-wrap">
                                                                    <h4 className="font-semibold text-sm text-foreground">
                                                                        {hendelseInfo.navn}
                                                                    </h4>
                                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                        {formatDate(event.dato)}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground">
                                                                    av {getAnsvarligDisplay(event.utfoertAv) || 'System'}
                                                                </p>
                                                                {beskrivelseInnhold}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {selskap.hendelser.length > INITIALT_ANTALL_VISTE_ELEMENTER && (
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        className="mt-2 p-0 h-auto text-xs"
                                                        onClick={() => setAntallVisteHendelser(
                                                            alleHendelserVises ? INITIALT_ANTALL_VISTE_ELEMENTER : selskap.hendelser.length
                                                        )}
                                                    >
                                                        {alleHendelserVises ? 'Vis færre' : `Vis alle ${selskap.hendelser.length} hendelser`}
                                                    </Button>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    Ingen hendelser registrert.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modal */}
            {selskap && (
                <GarantiSelskapInfoEditModal
                    isOpen={isEditModalOpen}
                    setIsOpen={setIsEditModalOpen}
                    currentSakData={selskap}
                    onUpdate={handleSelskapUpdated}
                />
            )}
        </div>
    );
}

export default SelskapDetailPage; 