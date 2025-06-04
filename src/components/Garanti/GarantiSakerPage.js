import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { Button } from '~/components/ui/button';
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '~/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { PlusCircle, ArrowLeft, SearchIcon, ListFilter, XIcon, Filter } from 'lucide-react';
import { Skeleton } from "~/components/ui/skeleton";
import { format, startOfDay, endOfDay } from 'date-fns';
import { useToast } from "~/hooks/use-toast";

// Hurtigfilter for datoer
const HURTIGFILTER_VALG = [
    { value: 'siste30', label: 'Siste 30 dager (standard)' },
    { value: 'opprettetIDag', label: 'Opprettet i dag' },
    { value: 'endretIDag', label: 'Endret i dag' },
    { value: 'opprettetSiste30', label: 'Opprettet siste 30 dager' },
    { value: 'endretSiste30', label: 'Endret siste 30 dager' },
    { value: 'alle', label: 'Alle prosjekter' },
];

// Status-valg (tilpass til deres faktiske status-enum)
const STATUS_VALG = [
    { value: 'alle', label: 'Alle status' },
    { value: 'Ny', label: 'Ny' },
    { value: 'Tildelt', label: 'Tildelt' },
    { value: 'Behandles', label: 'Behandles' },
    { value: 'Avslaatt', label: 'Avslått' },
    { value: 'Godkjent', label: 'Godkjent' },
    { value: 'AvventerGodkjenningUW', label: 'Avventer UW' },
    { value: 'KlarTilProduksjon', label: 'Klar til produksjon' },
    { value: 'Produsert', label: 'Produsert' },
];

// Funksjon for å formatere dato
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('nb-NO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch (error) {
        return 'Ugyldig dato';
    }
};

function GarantiSakerPage() {
    const navigate = useNavigate();
    const { toast } = useToast();

    // State for data
    const [prosjekter, setProsjekter] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for filtrering og søk
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [aktivtHurtigFilter, setAktivtHurtigFilter] = useState('siste30'); // Standard til siste 30 dager
    const [valgtStatus, setValgtStatus] = useState('alle');
    const [valgtAnsvarligRaadgiver, setValgtAnsvarligRaadgiver] = useState('alle');
    const [valgtUwAnsvarlig, setValgtUwAnsvarlig] = useState('alle');
    const [valgtProduksjonsansvarlig, setValgtProduksjonsansvarlig] = useState('alle');

    // State for tilgjengelige personer (hentes fra API)
    const [tilgjengeligeRaadgivere, setTilgjengeligeRaadgivere] = useState([]);
    const [tilgjengeligeUwAnsvarlige, setTilgjengeligeUwAnsvarlige] = useState([]);
    const [tilgjengeligeProduksjonsansvarlige, setTilgjengeligeProduksjonsansvarlige] = useState([]);

    // Debounce for søk
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => {
            clearTimeout(timerId);
        };
    }, [searchTerm]);

    // Hent tilgjengelige personer for filtre
    useEffect(() => {
        const fetchPersoner = async () => {
            try {
                // Hent liste over ansvarlige personer for filtrering
                if (window.electron && window.electron.garanti && window.electron.garanti.getAnsvarligePersoner) {
                    const result = await window.electron.garanti.getAnsvarligePersoner();
                    if (result.success) {
                        setTilgjengeligeRaadgivere(result.data.raadgivere || []);
                        setTilgjengeligeUwAnsvarlige(result.data.uwAnsvarlige || []);
                        setTilgjengeligeProduksjonsansvarlige(result.data.produksjonsansvarlige || []);
                    }
                }
            } catch (err) {
                console.error("Feil ved henting av ansvarlige personer:", err);
            }
        };

        fetchPersoner();
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        let result;

        try {
            const apiFiltre = {};
            const todayStart = startOfDay(new Date());
            const todayEnd = endOfDay(new Date());

            // Søketerm
            if (debouncedSearchTerm) {
                apiFiltre.searchTerm = debouncedSearchTerm;
            }

            // Dato-filtre
            switch (aktivtHurtigFilter) {
                case 'opprettetIDag':
                    apiFiltre.opprettetEtter = format(todayStart, 'yyyy-MM-dd');
                    apiFiltre.opprettetFor = format(todayEnd, 'yyyy-MM-dd');
                    apiFiltre.sortBy = 'opprettetDato';
                    apiFiltre.sortOrder = 'desc';
                    break;
                case 'endretIDag':
                    apiFiltre.endretEtter = format(todayStart, 'yyyy-MM-dd');
                    apiFiltre.endretFor = format(todayEnd, 'yyyy-MM-dd');
                    apiFiltre.sortBy = 'updated_at';
                    apiFiltre.sortOrder = 'desc';
                    break;
                case 'opprettetSiste30':
                    const trettidagerSiden = new Date();
                    trettidagerSiden.setDate(trettidagerSiden.getDate() - 30);
                    apiFiltre.opprettetEtter = format(trettidagerSiden, 'yyyy-MM-dd');
                    apiFiltre.sortBy = 'opprettetDato';
                    apiFiltre.sortOrder = 'desc';
                    break;
                case 'endretSiste30':
                case 'siste30':
                    const trettidagerSidenEndret = new Date();
                    trettidagerSidenEndret.setDate(trettidagerSidenEndret.getDate() - 30);
                    apiFiltre.endretEtter = format(trettidagerSidenEndret, 'yyyy-MM-dd');
                    apiFiltre.sortBy = 'updated_at';
                    apiFiltre.sortOrder = 'desc';
                    break;
                case 'alle':
                default:
                    apiFiltre.sortBy = 'updated_at';
                    apiFiltre.sortOrder = 'desc';
                    break;
            }

            // Status-filter
            if (valgtStatus !== 'alle') {
                apiFiltre.status = valgtStatus;
            }

            // Person-filtre
            if (valgtAnsvarligRaadgiver !== 'alle') {
                apiFiltre.ansvarligRaadgiverId = valgtAnsvarligRaadgiver;
            }
            if (valgtUwAnsvarlig !== 'alle') {
                apiFiltre.uwAnsvarligId = valgtUwAnsvarlig;
            }
            if (valgtProduksjonsansvarlig !== 'alle') {
                apiFiltre.produksjonsansvarligId = valgtProduksjonsansvarlig;
            }

            if (window.electron && window.electron.garanti && window.electron.garanti.getProsjekter) {
                result = await window.electron.garanti.getProsjekter(apiFiltre);
            } else {
                throw new Error('Garanti API (getProsjekter) er ikke tilgjengelig.');
            }

            if (result.success) {
                setProsjekter(result.data || []);
            } else {
                throw new Error(result.error || 'Ukjent feil ved henting av prosjekter');
            }

        } catch (err) {
            console.error("Feil ved henting av garantiprosjekter:", err);
            setError(err.message);
            toast({ title: "Feil", description: err.message, variant: "destructive" });
            setProsjekter([]);
        } finally {
            setIsLoading(false);
        }
    }, [toast, aktivtHurtigFilter, debouncedSearchTerm, valgtStatus, valgtAnsvarligRaadgiver, valgtUwAnsvarlig, valgtProduksjonsansvarlig]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleHurtigFilterChange = (verdi) => {
        setAktivtHurtigFilter(verdi);
    };

    const resetAllFilters = () => {
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setAktivtHurtigFilter('siste30');
        setValgtStatus('alle');
        setValgtAnsvarligRaadgiver('alle');
        setValgtUwAnsvarlig('alle');
        setValgtProduksjonsansvarlig('alle');
    };

    const handleNyttProsjekt = () => {
        navigate('/garanti/prosjekt/ny');
    };

    const handleVisProsjekt = (prosjektId) => {
        navigate(`/garanti/prosjekt/${prosjektId}`);
    };

    const harAktiveFiltre = debouncedSearchTerm || aktivtHurtigFilter !== 'siste30' || valgtStatus !== 'alle' ||
        valgtAnsvarligRaadgiver !== 'alle' || valgtUwAnsvarlig !== 'alle' || valgtProduksjonsansvarlig !== 'alle';

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 flex-shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className='flex-grow'>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96 mt-2" />
                    </div>
                    <Skeleton className="h-10 w-40" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-20 w-full" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center space-x-4 p-4 border rounded-md">
                                    <div className="space-y-2 flex-grow">
                                        <Skeleton className="h-4 w-4/5" />
                                        <Skeleton className="h-4 w-3/5" />
                                    </div>
                                    <Skeleton className="h-8 w-20" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3, color: 'red' }}>
                <Typography variant="h6">Feil ved lasting av prosjekter</Typography>
                <Typography>{error}</Typography>
            </Box>
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
                    <h1 className="text-2xl font-semibold text-foreground">Prosjektoversikt</h1>
                    <p className="text-sm text-muted-foreground">
                        Oversikt over garantiprosjekter med avansert filtrering og søk.
                    </p>
                </div>
                <Button onClick={handleNyttProsjekt}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Opprett Nytt Prosjekt
                </Button>
            </div>

            <Card>
                <CardHeader className="border-b px-6 py-4">
                    <div className="space-y-4">
                        {/* Søk og hurtigfilter rad */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-3 flex-grow w-full md:w-auto">
                                <SearchIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                <Input
                                    placeholder="Søk prosjektnavn, selskapsnavn..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    className="w-full md:max-w-xs lg:max-w-sm"
                                />
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <ListFilter className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                <Select value={aktivtHurtigFilter} onValueChange={handleHurtigFilterChange}>
                                    <SelectTrigger className="w-full md:w-[240px]">
                                        <SelectValue placeholder="Velg tidsperiode..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {HURTIGFILTER_VALG.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Avanserte filtre rad */}
                        <div className="flex flex-col lg:flex-row gap-4 pt-4 border-t">
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Filtre:</span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 flex-grow">
                                <Select value={valgtStatus} onValueChange={setValgtStatus}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Status..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_VALG.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={valgtAnsvarligRaadgiver} onValueChange={setValgtAnsvarligRaadgiver}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Ansvarlig rådgiver..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="alle">Alle rådgivere</SelectItem>
                                        {tilgjengeligeRaadgivere.map(person => (
                                            <SelectItem key={person.id} value={person.id.toString()}>
                                                {person.navn || person.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={valgtUwAnsvarlig} onValueChange={setValgtUwAnsvarlig}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="UW ansvarlig..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="alle">Alle UW</SelectItem>
                                        {tilgjengeligeUwAnsvarlige.map(person => (
                                            <SelectItem key={person.id} value={person.id.toString()}>
                                                {person.navn || person.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={valgtProduksjonsansvarlig} onValueChange={setValgtProduksjonsansvarlig}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Produksjonsansvarlig..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="alle">Alle produksjon</SelectItem>
                                        {tilgjengeligeProduksjonsansvarlige.map(person => (
                                            <SelectItem key={person.id} value={person.id.toString()}>
                                                {person.navn || person.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {harAktiveFiltre && (
                                <Button variant="ghost" onClick={resetAllFilters} className="w-full sm:w-auto text-muted-foreground hover:text-foreground flex-shrink-0">
                                    <XIcon className="mr-1.5 h-3.5 w-3.5" />
                                    Nullstill alle
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    {!isLoading && !error && prosjekter.length === 0 && (
                        <p className="text-muted-foreground text-center py-8">
                            {debouncedSearchTerm ? `Ingen prosjekter funnet for "${debouncedSearchTerm}".` : 'Ingen prosjekter funnet med gjeldende filtre.'}
                        </p>
                    )}
                    {!isLoading && !error && prosjekter.length > 0 && (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableCaption>
                                    Viser {prosjekter.length} prosjekt{prosjekter.length !== 1 ? 'er' : ''}
                                    {harAktiveFiltre && ' (filtrert)'}
                                </TableCaption>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[200px]">Prosjektnavn</TableHead>
                                        <TableHead className="w-[250px]">Selskapsnavn</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Ansvarlig Rådgiver</TableHead>
                                        <TableHead>UW Ansvarlig</TableHead>
                                        <TableHead>Produksjonsansvarlig</TableHead>
                                        <TableHead>Sist Endret</TableHead>
                                        <TableHead className="text-right">Handlinger</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {prosjekter.map((prosjekt) => (
                                        <TableRow key={prosjekt.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleVisProsjekt(prosjekt.id)}>
                                            <TableCell className="font-medium">{prosjekt.navn || 'Navnløst prosjekt'}</TableCell>
                                            <TableCell>{prosjekt.selskap?.selskapsnavn || 'N/A'}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${prosjekt.status === 'Ny' ? 'bg-blue-100 text-blue-800' :
                                                        prosjekt.status === 'Godkjent' ? 'bg-green-100 text-green-800' :
                                                            prosjekt.status === 'Avslaatt' ? 'bg-red-100 text-red-800' :
                                                                prosjekt.status === 'Produsert' ? 'bg-purple-100 text-purple-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {prosjekt.status || 'N/A'}
                                                </span>
                                            </TableCell>
                                            <TableCell>{prosjekt.ansvarligRaadgiver?.navn || prosjekt.ansvarligRaadgiver?.email || 'Ikke tildelt'}</TableCell>
                                            <TableCell>{prosjekt.uwAnsvarlig?.navn || prosjekt.uwAnsvarlig?.email || 'Ikke tildelt'}</TableCell>
                                            <TableCell>{prosjekt.produksjonsansvarlig?.navn || prosjekt.produksjonsansvarlig?.email || 'Ikke tildelt'}</TableCell>
                                            <TableCell>{formatDate(prosjekt.updated_at)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleVisProsjekt(prosjekt.id); }}>
                                                    Vis
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default GarantiSakerPage; 