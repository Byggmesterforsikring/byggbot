import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"; // For hurtigfiltre
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { ArrowLeft, SearchIcon, FilterIcon, ListFilter, XIcon, PlusCircleIcon } from 'lucide-react'; // Lagt til ListFilter, fjernet CalendarIcon, Trash2Icon, PlusCircleIcon
import { format, startOfDay, endOfDay, subDays } from 'date-fns'; // Trenger flere date-fns funksjoner
import { useToast } from "~/hooks/use-toast";
// import { cn } from "~/lib/utils"; // Ikke lenger nødvendig uten Popover for Calendar

const HURTIGFILTER_VALG = [
    { value: 'alle', label: 'Alle selskaper' },
    { value: 'opprettetIDag', label: 'Opprettet i dag' },
    { value: 'endretIDag', label: 'Endret i dag' },
    { value: 'siste30Opprettet', label: 'Siste 30 opprettet' },
    { value: 'siste30Endret', label: 'Siste 30 endret' },
];

function SelskaperOversiktSide() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [selskaper, setSelskaper] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [aktivtHurtigFilter, setAktivtHurtigFilter] = useState('alle'); // Default til 'alle'

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Debounce for søk
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); // 500ms forsinkelse
        return () => {
            clearTimeout(timerId);
        };
    }, [searchTerm]);


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        let result;

        try {
            if (debouncedSearchTerm) {
                // Fritekstsøk er aktivt
                if (window.electron && window.electron.garanti && window.electron.garanti.findSelskap) {
                    result = await window.electron.garanti.findSelskap(debouncedSearchTerm);
                } else {
                    throw new Error('API for å søke etter selskaper er ikke tilgjengelig.');
                }
            } else {
                // Hurtigfilter eller "Alle" er aktivt
                const apiFiltre = {};
                const todayStart = startOfDay(new Date());
                const todayEnd = endOfDay(new Date());

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
                    case 'siste30Opprettet':
                        // For "siste 30 opprettet", vi trenger ikke datofilter, kun sortering og take
                        apiFiltre.sortBy = 'opprettetDato';
                        apiFiltre.sortOrder = 'desc';
                        apiFiltre.take = 30;
                        break;
                    case 'siste30Endret':
                        apiFiltre.sortBy = 'updated_at';
                        apiFiltre.sortOrder = 'desc';
                        apiFiltre.take = 30;
                        break;
                    case 'alle':
                    default:
                        // Ingen spesifikke dato- eller take-filtre, default sortering i backend brukes (updated_at desc)
                        apiFiltre.sortBy = 'updated_at'; // Kan spesifiseres for klarhet
                        apiFiltre.sortOrder = 'desc';
                        break;
                }

                if (window.electron && window.electron.garanti && window.electron.garanti.getSelskaper) {
                    result = await window.electron.garanti.getSelskaper(apiFiltre);
                } else {
                    throw new Error('API for å hente selskaper er ikke tilgjengelig.');
                }
            }

            if (result.success) {
                setSelskaper(result.data || []);
            } else {
                throw new Error(result.error || 'Ukjent feil ved henting av selskaper.');
            }

        } catch (err) {
            console.error("Feil ved henting av selskaper:", err);
            setError(err.message);
            toast({ title: "Feil", description: err.message, variant: "destructive" });
            setSelskaper([]);
        } finally {
            setIsLoading(false);
        }
    }, [toast, aktivtHurtigFilter, debouncedSearchTerm]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        if (event.target.value !== '') {
            setAktivtHurtigFilter('alle'); // Nullstill hurtigfilter hvis bruker begynner å søke
        }
    };

    const handleHurtigFilterChange = (verdi) => {
        setSearchTerm(''); // Nullstill søketerm når hurtigfilter endres
        setDebouncedSearchTerm(''); // Også debounced for å trigge fetchData med filter
        setAktivtHurtigFilter(verdi);
    };

    const resetAll = () => {
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setAktivtHurtigFilter('alle');
        // fetchData kalles via useEffect pga. endring i debouncedSearchTerm og aktivtHurtigFilter
    };

    const aktivtSøkEllerFilter = debouncedSearchTerm || aktivtHurtigFilter !== 'alle';

    // --- JSX følger under --- 
    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 flex-shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Tilbake</span>
                </Button>
                <div className='flex-grow'>
                    <h1 className="text-2xl font-semibold text-foreground">Selskapsoversikt</h1>
                    <p className="text-sm text-muted-foreground">
                        Liste over registrerte selskaper i garantimodulen.
                    </p>
                </div>
                <Button onClick={() => navigate('/garanti/selskap/ny')}>
                    <PlusCircleIcon className="mr-2 h-4 w-4" />
                    Nytt Selskap
                </Button>
            </div>

            <Card>
                <CardHeader className="border-b px-6 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3 flex-grow w-full md:w-auto">
                            <SearchIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <Input
                                placeholder="Søk org.nr, navn, kundenr..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="w-full md:max-w-xs lg:max-w-sm"
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <ListFilter className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <Select value={aktivtHurtigFilter} onValueChange={handleHurtigFilterChange}>
                                <SelectTrigger className="w-full md:w-[240px]">
                                    <SelectValue placeholder="Velg hurtigfilter..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {HURTIGFILTER_VALG.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {aktivtSøkEllerFilter && (
                            <Button variant="ghost" onClick={resetAll} className="w-full md:w-auto text-muted-foreground hover:text-foreground">
                                <XIcon className="mr-1.5 h-3.5 w-3.5" />
                                Nullstill
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoading && <p className="text-muted-foreground text-center py-8">Laster selskaper...</p>}
                    {error && <p className="text-destructive text-center py-8">Feil: {error}</p>}
                    {!isLoading && !error && selskaper.length === 0 && (
                        <p className="text-muted-foreground text-center py-8">
                            {debouncedSearchTerm ? `Ingen selskaper funnet for "${debouncedSearchTerm}".` : 'Ingen selskaper funnet med gjeldende filter.'}
                        </p>
                    )}
                    {!isLoading && !error && selskaper.length > 0 && (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Selskapsnavn</TableHead>
                                        <TableHead>Org.nr.</TableHead>
                                        <TableHead className="text-center">Prosjekter</TableHead>
                                        <TableHead>Opprettet</TableHead>
                                        <TableHead>Sist Endret</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selskaper.map((selskap) => (
                                        <TableRow key={selskap.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/garanti/selskap/${selskap.id}`)}>
                                            <TableCell className="font-medium">{selskap.selskapsnavn}</TableCell>
                                            <TableCell>{selskap.organisasjonsnummer}</TableCell>
                                            <TableCell className="text-center">{selskap._count?.prosjekter || 0}</TableCell>
                                            <TableCell>{selskap.opprettetDato ? format(new Date(selskap.opprettetDato), 'dd.MM.yyyy') : '-'}</TableCell>
                                            <TableCell>{selskap.updated_at ? format(new Date(selskap.updated_at), 'dd.MM.yyyy HH:mm') : '-'}</TableCell>
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

export default SelskaperOversiktSide; 