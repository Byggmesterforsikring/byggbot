import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ArrowLeft, User, Clock, FileText, ChevronRight, RefreshCw, CheckCircle, AlertCircle, Wrench, PlayCircle, PauseCircle, Send, UserCheck, Settings } from 'lucide-react';
import { Skeleton } from "~/components/ui/skeleton";
import { useToast } from "~/hooks/use-toast";
import { format, subWeeks } from 'date-fns';

// Nye tab-grupper med to-kolonne layout
const TAB_GRUPPER = [
    {
        key: 'mine_aktive',
        title: 'Mine aktive',
        fullTitle: 'Mine aktive saker',
        icon: FileText,
        kolonner: [
            {
                key: 'tildelt',
                title: 'Tildelt',
                description: 'Saker plukket, ikke startet',
                statuser: ['Tildelt'],
                color: 'bg-blue-100 text-blue-800 border-blue-200',
                filterLogic: 'ansvarligRaadgiver',
                ikon: PauseCircle,
                bakgrunn: 'bg-blue-50/50'
            },
            {
                key: 'behandles',
                title: 'Behandles',
                description: 'Pågående arbeid',
                statuser: ['Behandles'],
                color: 'bg-orange-100 text-orange-800 border-orange-200',
                filterLogic: 'ansvarligRaadgiver',
                ikon: PlayCircle,
                bakgrunn: 'bg-orange-50/50'
            }
        ]
    },
    {
        key: 'uw_godkjenning',
        title: 'UW-godkjenning',
        fullTitle: 'UW-godkjenning',
        icon: Clock,
        kolonner: [
            {
                key: 'mine_til_uw',
                title: 'Mine saker til UW',
                description: 'Mine saker sendt til UW-godkjenning',
                statuser: ['AvventerGodkjenningUW'],
                color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                filterLogic: 'ansvarligRaadgiver',
                visSomPrimær: true,
                ikon: Send,
                bakgrunn: 'bg-yellow-50/50'
            },
            {
                key: 'jeg_skal_godkjenne',
                title: 'Saker jeg skal godkjenne',
                description: 'Saker som venter på min UW-godkjenning',
                statuser: ['AvventerGodkjenningUW'],
                color: 'bg-red-100 text-red-800 border-red-200',
                filterLogic: 'alle_uw_saker',
                kunForRolle: 'Garantileder_UW',
                ikon: UserCheck,
                bakgrunn: 'bg-red-50/50'
            }
        ]
    },
    {
        key: 'produksjon',
        title: 'Produksjon',
        fullTitle: 'Produksjon',
        icon: Wrench,
        kolonner: [
            {
                key: 'sendt_til_produksjon',
                title: 'Sendt til produksjon',
                description: 'Mine saker som rådgiver sendt til produksjon',
                statuser: ['KlarTilProduksjon'],
                color: 'bg-purple-100 text-purple-800 border-purple-200',
                filterLogic: 'ansvarligRaadgiver',
                visSomPrimær: true,
                ikon: Send,
                bakgrunn: 'bg-purple-50/50'
            },
            {
                key: 'jeg_skal_produsere',
                title: 'Jeg skal produsere',
                description: 'Saker jeg er tildelt for produksjon',
                statuser: ['KlarTilProduksjon'],
                color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                filterLogic: 'produksjonsansvarlig',
                ikon: Settings,
                bakgrunn: 'bg-indigo-50/50'
            }
        ]
    },
    {
        key: 'godkjent',
        title: 'Godkjent',
        fullTitle: 'Godkjent - klar for arbeid',
        icon: CheckCircle,
        enkeltKolonne: true,
        kolonner: [
            {
                key: 'godkjent_fortsett',
                title: 'Godkjent av UW',
                description: 'Mine saker godkjent av UW, klar for videre arbeid',
                statuser: ['Godkjent'],
                color: 'bg-green-100 text-green-800 border-green-200',
                filterLogic: 'ansvarligRaadgiver',
                ikon: CheckCircle,
                bakgrunn: 'bg-green-50/50'
            }
        ]
    },
    {
        key: 'nye_saker',
        title: 'Nye saker',
        fullTitle: 'Nye saker',
        icon: FileText,
        enkeltKolonne: true,
        kolonner: [
            {
                key: 'nye',
                title: 'Kan plukkes',
                description: 'Saker som kan plukkes av alle',
                statuser: ['Ny'],
                color: 'bg-blue-100 text-blue-800 border-blue-200',
                filterLogic: 'alle',
                ikon: FileText,
                bakgrunn: 'bg-blue-50/50'
            }
        ]
    },
    {
        key: 'avsluttet',
        title: 'Avsluttet',
        fullTitle: 'Nylig avsluttet',
        icon: CheckCircle,
        enkeltKolonne: true,
        kolonner: [
            {
                key: 'nylig_avsluttet',
                title: 'Siste 2 uker',
                description: 'Ferdigstilte saker (siste 2 uker)',
                statuser: ['Produsert', 'Avslaatt'],
                color: 'bg-gray-100 text-gray-800 border-gray-200',
                filterLogic: 'any_involvement',
                dateFilter: true,
                ikon: CheckCircle,
                bakgrunn: 'bg-gray-50/50'
            }
        ]
    }
];

// Standardantall saker per kategori
const STANDARD_ANTALL_PER_STATUS = 30;

function MineSakerPage() {
    const navigate = useNavigate();
    const { toast } = useToast();

    // State for data
    const [sakerData, setSakerData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState({});
    const [error, setError] = useState(null);
    const [antallVisning, setAntallVisning] = useState({});

    // Tab-relatert state
    const [aktivTab, setAktivTab] = useState('mine_aktive');

    // Bruker og rolle-informasjon
    const [innloggetBrukerId, setInnloggetBrukerId] = useState(null);
    const [brukerRoller, setBrukerRoller] = useState([]);
    const [synligeTabGrupper, setSynligeTabGrupper] = useState([]);

    // Sjekk om bruker har UW-lederrolle (kan godkjenne saker)
    const erGarantiLederUW = brukerRoller.some(rolle =>
        rolle === 'Garantileder_UW'
    );

    // Bestem synlige tab-grupper basert på rolle
    useEffect(() => {
        const filtrerteGrupper = TAB_GRUPPER.map(gruppe => {
            // Filtrer kolonner basert på rolle
            const synligeKolonner = gruppe.kolonner.filter(kolonne => {
                if (kolonne.kunForRolle) {
                    return erGarantiLederUW; // Kun for Garantileder_UW
                }
                return true; // Alle andre kolonner er synlige
            });

            return {
                ...gruppe,
                kolonner: synligeKolonner
            };
        }).filter(gruppe => gruppe.kolonner.length > 0); // Fjern grupper uten synlige kolonner

        setSynligeTabGrupper(filtrerteGrupper);

        // Initalisér antall visning for hver kolonne
        const initialAntall = {};
        filtrerteGrupper.forEach(gruppe => {
            gruppe.kolonner.forEach(kolonne => {
                initialAntall[kolonne.key] = STANDARD_ANTALL_PER_STATUS;
            });
        });
        setAntallVisning(initialAntall);

        // Sett aktiv tab til første synlige gruppe hvis nåværende ikke er synlig
        if (filtrerteGrupper.length > 0 && !filtrerteGrupper.find(g => g.key === aktivTab)) {
            setAktivTab(filtrerteGrupper[0].key);
        }
    }, [erGarantiLederUW, aktivTab]);

    // Hent bruker-ID og rolle-informasjon
    useEffect(() => {
        const getCurrentUser = async () => {
            try {
                // TODO: Implementer henting av innlogget bruker og roller
                console.warn('[MineSakerPage] Bruker hardkodet bruker-ID. Implementer riktig auth-logikk!');
                setInnloggetBrukerId(1);

                try {
                    const userResult = await window.electron.userV2.getUserById(1);
                    if (userResult.success && userResult.data) {
                        // Håndter roller uavhengig av struktur
                        const roller = userResult.data.roller || [];
                        let rolleNavn = [];

                        if (Array.isArray(roller)) {
                            roller.forEach((rolle) => {
                                if (typeof rolle === 'string') {
                                    rolleNavn.push(rolle);
                                } else if (rolle && rolle.role_name) {
                                    rolleNavn.push(rolle.role_name);
                                } else if (rolle && rolle.roleName) {
                                    rolleNavn.push(rolle.roleName);
                                } else if (rolle && rolle.name) {
                                    rolleNavn.push(rolle.name);
                                }
                            });
                        }

                        setBrukerRoller(rolleNavn);
                    }
                } catch (error) {
                    console.warn('Kunne ikke hente roller fra UserV2, bruker tom liste:', error);
                    setBrukerRoller([]);
                }

            } catch (error) {
                console.error("Feil ved henting av innlogget bruker:", error);
                toast({
                    title: "Autentiseringsfeil",
                    description: "Kunne ikke identifisere innlogget bruker",
                    variant: "destructive"
                });
                navigate('/');
            }
        };

        getCurrentUser();
    }, [toast, navigate]);

    const fetchSakerForKolonne = useCallback(async (kolonne, antall = STANDARD_ANTALL_PER_STATUS) => {
        if (!innloggetBrukerId) return [];

        try {
            const apiFiltre = {
                sortBy: 'updated_at',
                sortOrder: 'desc',
                take: antall
            };

            // Statusfilter
            if (kolonne.statuser.length === 1) {
                apiFiltre.status = kolonne.statuser[0];
            } else {
                apiFiltre.status = { in: kolonne.statuser };
            }

            // Datofilter for "nylig avsluttet"
            if (kolonne.dateFilter) {
                const twoWeeksAgo = subWeeks(new Date(), 2);
                apiFiltre.endretEtter = format(twoWeeksAgo, 'yyyy-MM-dd');
            }

            let promises = [];

            // Bestem hvilke API-kall som skal gjøres basert på filterLogic
            switch (kolonne.filterLogic) {
                case 'ansvarligRaadgiver':
                    promises = [
                        window.electron.garanti.getProsjekter({
                            ...apiFiltre,
                            ansvarligRaadgiverId: innloggetBrukerId
                        })
                    ];
                    break;

                case 'uwAnsvarlig':
                    promises = [
                        window.electron.garanti.getProsjekter({
                            ...apiFiltre,
                            uwAnsvarligId: innloggetBrukerId
                        })
                    ];
                    break;

                case 'alle_uw_saker':
                    // For UW-godkjenning: Vis alle saker med AvventerGodkjenningUW status
                    // MEN filtrer bort saker hvor jeg selv er ansvarligRaadgiver (kan ikke godkjenne egne saker)
                    promises = [
                        window.electron.garanti.getProsjekter(apiFiltre)
                    ];
                    break;

                case 'produksjonsansvarlig':
                    promises = [
                        window.electron.garanti.getProsjekter({
                            ...apiFiltre,
                            produksjonsansvarligId: innloggetBrukerId
                        })
                    ];
                    break;

                case 'any_involvement':
                    // For "nylig avsluttet" - alt jeg har vært involvert i
                    promises = [
                        window.electron.garanti.getProsjekter({
                            ...apiFiltre,
                            ansvarligRaadgiverId: innloggetBrukerId
                        }),
                        window.electron.garanti.getProsjekter({
                            ...apiFiltre,
                            uwAnsvarligId: innloggetBrukerId
                        }),
                        window.electron.garanti.getProsjekter({
                            ...apiFiltre,
                            produksjonsansvarligId: innloggetBrukerId
                        })
                    ];
                    break;

                case 'alle':
                default:
                    // For "nye saker" - alle kan se
                    promises = [
                        window.electron.garanti.getProsjekter(apiFiltre)
                    ];
                    break;
            }

            const results = await Promise.all(promises);

            // Kombiner resultater og fjern duplikater
            const allSaker = [];
            const seenIds = new Set();

            results.forEach(result => {
                if (result.success && result.data) {
                    result.data.forEach(prosjekt => {
                        if (!seenIds.has(prosjekt.id)) {
                            seenIds.add(prosjekt.id);
                            allSaker.push(prosjekt);
                        }
                    });
                }
            });

            // Spesiell filtrering for UW-godkjenning: Fjern saker hvor jeg selv er ansvarligRaadgiver
            let filteredSaker = allSaker;
            if (kolonne.filterLogic === 'alle_uw_saker') {
                filteredSaker = allSaker.filter(prosjekt => {
                    // Fjern saker hvor jeg selv er ansvarligRaadgiver (kan ikke godkjenne egne saker)
                    return prosjekt.ansvarligRaadgiver?.id !== innloggetBrukerId;
                });
            }

            // Sorter resultatene etter updated_at (nyeste først)
            filteredSaker.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

            // Begrens til ønsket antall
            return filteredSaker.slice(0, antall);

        } catch (error) {
            console.error(`Feil ved henting av saker for kolonne ${kolonne.key}:`, error);
            return [];
        }
    }, [innloggetBrukerId]);

    const fetchAlleSaker = useCallback(async () => {
        if (!innloggetBrukerId || synligeTabGrupper.length === 0) return;

        setIsLoading(true);
        setError(null);

        try {
            const nySakerData = {};

            // Hent saker for hver kolonne parallelt
            const promises = [];
            synligeTabGrupper.forEach(gruppe => {
                gruppe.kolonner.forEach(kolonne => {
                    const antall = antallVisning[kolonne.key] || STANDARD_ANTALL_PER_STATUS;
                    promises.push(
                        fetchSakerForKolonne(kolonne, antall).then(saker => ({
                            key: kolonne.key,
                            saker
                        }))
                    );
                });
            });

            const resultater = await Promise.all(promises);

            resultater.forEach(({ key, saker }) => {
                nySakerData[key] = saker;
            });

            setSakerData(nySakerData);
        } catch (error) {
            console.error("Feil ved henting av alle saker:", error);
            setError(error.message);
            toast({ title: "Feil", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [innloggetBrukerId, synligeTabGrupper, antallVisning, fetchSakerForKolonne, toast]);

    useEffect(() => {
        if (innloggetBrukerId && synligeTabGrupper.length > 0 && Object.keys(antallVisning).length > 0) {
            fetchAlleSaker();
        }
    }, [innloggetBrukerId, synligeTabGrupper, antallVisning, fetchAlleSaker]);

    const handleLastFlereSaker = async (kolonne) => {
        setLoadingMore(prev => ({ ...prev, [kolonne.key]: true }));

        try {
            const nyttAntall = (antallVisning[kolonne.key] || STANDARD_ANTALL_PER_STATUS) + STANDARD_ANTALL_PER_STATUS;
            const saker = await fetchSakerForKolonne(kolonne, nyttAntall);

            setSakerData(prev => ({
                ...prev,
                [kolonne.key]: saker
            }));

            setAntallVisning(prev => ({
                ...prev,
                [kolonne.key]: nyttAntall
            }));
        } catch (error) {
            toast({ title: "Feil", description: "Kunne ikke laste flere saker", variant: "destructive" });
        } finally {
            setLoadingMore(prev => ({ ...prev, [kolonne.key]: false }));
        }
    };

    const handleVisProsjekt = (prosjektId) => {
        navigate(`/garanti/prosjekt/${prosjektId}`);
    };

    const handleOppdater = () => {
        fetchAlleSaker();
    };

    const formatDato = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'dd.MM.yyyy HH:mm');
        } catch (error) {
            return 'Ugyldig dato';
        }
    };

    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'Ny': return 'bg-blue-100 text-blue-800';
            case 'Tildelt': return 'bg-orange-100 text-orange-800';
            case 'Behandles': return 'bg-yellow-100 text-yellow-800';
            case 'AvventerGodkjenningUW': return 'bg-amber-100 text-amber-800';
            case 'Godkjent': return 'bg-green-100 text-green-800';
            case 'KlarTilProduksjon': return 'bg-purple-100 text-purple-800';
            case 'Produsert': return 'bg-emerald-100 text-emerald-800';
            case 'Avslaatt': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getTotalAntallSaker = () => {
        return Object.values(sakerData).reduce((total, saker) => total + saker.length, 0);
    };

    const getTotalForTab = (gruppe) => {
        return gruppe.kolonner.reduce((total, kolonne) => {
            return total + (sakerData[kolonne.key]?.length || 0);
        }, 0);
    };

    if (!innloggetBrukerId) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">Laster brukerinformasjon...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 flex-shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className='flex-grow'>
                        <h1 className="text-2xl font-semibold text-foreground">Mine saker</h1>
                    </div>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-red-600 mb-4">Feil ved lasting av saker: {error}</p>
                            <Button onClick={handleOppdater}>Prøv igjen</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 flex-shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Tilbake</span>
                </Button>
                <div className='flex-grow'>
                    <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                        <User className="h-6 w-6" />
                        Mine saker
                        {erGarantiLederUW && <Badge variant="secondary" className="bg-blue-100 text-blue-800">UW</Badge>}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Din personlige arbeidsliste - {getTotalAntallSaker()} saker totalt
                    </p>
                </div>
                <Button onClick={handleOppdater} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Oppdater
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Tabs value={aktivTab} onValueChange={setAktivTab} className="w-full">
                        <TabsList className="w-full justify-start h-auto p-1 bg-muted/10 border-b">
                            {synligeTabGrupper.map((gruppe) => {
                                const totalSaker = getTotalForTab(gruppe);
                                const erAktiv = aktivTab === gruppe.key;
                                return (
                                    <TabsTrigger
                                        key={gruppe.key}
                                        value={gruppe.key}
                                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:border-primary data-[state=active]:border-b-2 hover:bg-muted/20 flex items-center gap-2 px-3 py-2 transition-all duration-200 border border-transparent relative"
                                    >
                                        <gruppe.icon className="h-4 w-4" />
                                        {gruppe.title}
                                        {totalSaker > 0 && (
                                            <Badge
                                                variant="secondary"
                                                className={`ml-1 text-xs ${erAktiv ? 'bg-primary-foreground text-primary' : 'bg-gray-100 text-gray-800'}`}
                                            >
                                                {totalSaker}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>

                        {synligeTabGrupper.map((gruppe) => (
                            <TabsContent key={gruppe.key} value={gruppe.key} className="m-0">
                                <div className="p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                                <gruppe.icon className="h-5 w-5" />
                                                {gruppe.fullTitle}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {gruppe.enkeltKolonne ? gruppe.kolonner[0].description : 'Organisert i kategorier for bedre oversikt'}
                                            </p>
                                        </div>
                                        <Badge className="bg-gray-100 text-gray-800">
                                            {getTotalForTab(gruppe)} saker totalt
                                        </Badge>
                                    </div>

                                    <div className={`grid gap-6 ${gruppe.enkeltKolonne ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                                        {gruppe.kolonner.map((kolonne) => {
                                            const saker = sakerData[kolonne.key] || [];
                                            const antallVist = antallVisning[kolonne.key] || STANDARD_ANTALL_PER_STATUS;
                                            const kanLasteFler = saker.length >= antallVist;

                                            return (
                                                <Card key={kolonne.key} className={`${kolonne.bakgrunn} border-2 ${kolonne.color.split(' ')[2]} transition-all hover:shadow-md`}>
                                                    <CardHeader className="pb-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <kolonne.ikon className="h-4 w-4 text-muted-foreground" />
                                                                <h4 className="font-semibold text-sm">{kolonne.title}</h4>
                                                            </div>
                                                            <Badge className={kolonne.color}>
                                                                {saker.length}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">{kolonne.description}</p>
                                                    </CardHeader>
                                                    <CardContent className="pt-0">
                                                        <div className="space-y-2">
                                                            {isLoading ? (
                                                                <div className="space-y-2">
                                                                    {[...Array(3)].map((_, i) => (
                                                                        <div key={i} className="flex items-center space-x-4 p-3 border rounded-md bg-background/60">
                                                                            <div className="space-y-2 flex-grow">
                                                                                <Skeleton className="h-3 w-4/5" />
                                                                                <Skeleton className="h-3 w-3/5" />
                                                                            </div>
                                                                            <Skeleton className="h-6 w-16" />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : saker.length === 0 ? (
                                                                <div className="text-center py-8 border rounded-md bg-background/60 border-dashed">
                                                                    <kolonne.ikon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Ingen saker
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {saker.map((prosjekt) => (
                                                                        <div
                                                                            key={prosjekt.id}
                                                                            className="flex items-center justify-between p-3 border rounded-md hover:bg-background/80 cursor-pointer transition-colors text-sm bg-background/60"
                                                                            onClick={() => handleVisProsjekt(prosjekt.id)}
                                                                        >
                                                                            <div className="flex-grow min-w-0">
                                                                                <div className="flex items-center gap-2 mb-1">
                                                                                    <h5 className="font-medium text-xs truncate">
                                                                                        {prosjekt.navn || 'Navnløst prosjekt'}
                                                                                    </h5>
                                                                                    <Badge variant="outline" className={`text-xs ${getStatusBadgeColor(prosjekt.status)}`}>
                                                                                        {prosjekt.status}
                                                                                    </Badge>
                                                                                </div>
                                                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                                    <span className="truncate">
                                                                                        {prosjekt.selskap?.selskapsnavn || 'Ukjent selskap'}
                                                                                    </span>
                                                                                    <span className="flex items-center gap-1 flex-shrink-0">
                                                                                        <Clock className="h-3 w-3" />
                                                                                        {formatDato(prosjekt.updated_at)}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-2" />
                                                                        </div>
                                                                    ))}

                                                                    {kanLasteFler && (
                                                                        <div className="pt-2">
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="w-full text-xs bg-background/60 hover:bg-background/80"
                                                                                onClick={() => handleLastFlereSaker(kolonne)}
                                                                                disabled={loadingMore[kolonne.key]}
                                                                            >
                                                                                {loadingMore[kolonne.key] ? (
                                                                                    <>
                                                                                        <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                                                                                        Laster...
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <FileText className="mr-1 h-3 w-3" />
                                                                                        Last {STANDARD_ANTALL_PER_STATUS} til
                                                                                    </>
                                                                                )}
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

export default MineSakerPage; 