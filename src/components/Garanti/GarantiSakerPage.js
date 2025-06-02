import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material'; // Beholdt for generell layout om ønskelig
import { Button } from '~/components/ui/button'; // ShadCN Button
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableCaption, // Valgfri
} from '~/components/ui/table'; // ShadCN Table
import { PlusCircle } from 'lucide-react'; // Ikon for "Ny sak"-knapp
import { Skeleton } from "~/components/ui/skeleton"; // Importer Skeleton

// Funksjon for å formatere dato (kan flyttes til en utils-fil senere)
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        // Vurder å legge til klokkeslett hvis updated_at brukes ofte
        return date.toLocaleDateString('nb-NO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch (error) {
        return 'Ugyldig dato';
    }
};

function GarantiProsjekterPage() { // Omdøpt komponentnavn for klarhet
    const [prosjekter, setProsjekter] = useState([]); // Endret fra saker til prosjekter
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProsjekter = async () => { // Omdøpt funksjon
            setIsLoading(true);
            setError(null);
            try {
                // Endret API-kall til getProsjekter
                if (window.electron && window.electron.garanti && window.electron.garanti.getProsjekter) {
                    const result = await window.electron.garanti.getProsjekter();
                    if (result.success) {
                        setProsjekter(result.data || []); // Oppdatert state-setter
                    } else {
                        throw new Error(result.error || 'Ukjent feil ved henting av prosjekter');
                    }
                } else {
                    throw new Error('Garanti API (getProsjekter) er ikke tilgjengelig.');
                }
            } catch (err) {
                console.error("Feil ved henting av garantiprosjekter:", err);
                setError(err.message);
                setProsjekter([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProsjekter();
    }, []);

    const handleNyttProsjekt = () => { // Omdøpt funksjon
        navigate('/garanti/prosjekt/ny'); // ENDRE DENNE STIEN til ny opprettelses-side/flyt
    };

    const handleVisProsjekt = (prosjektId) => { // Omdøpt funksjon, tar prosjektId
        navigate(`/garanti/prosjekt/${prosjektId}`); // ENDRE DENNE STIEN til prosjektdetaljside
    };

    if (isLoading) {
        return (
            <Box sx={{ p: 3 }} className="w-full">
                <Box className="flex justify-between items-center mb-6">
                    {/* <Skeleton className="h-8 w-1/3" /> Kan tilpasses ny tittel */}
                    <Typography variant="h4" component="h1" className="text-2xl font-semibold">
                        Laster prosjektoversikt...
                    </Typography>
                    <Skeleton className="h-10 w-40" /> {/* "Opprett Nytt Prosjekt"-knapp placeholder */}
                </Box>
                {/* Skeleton for tabellrader kan beholdes og justeres om nødvendig */}
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 border rounded-md bg-card">
                            <div className="space-y-2 flex-grow">
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="h-4 w-3/5" />
                            </div>
                            <Skeleton className="h-8 w-20" />
                        </div>
                    ))}
                </div>
            </Box>
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
        <Box sx={{ p: 3 }} className="w-full">
            <Box className="flex justify-between items-center mb-6">
                <Typography variant="h4" component="h1" className="text-2xl font-semibold">
                    Prosjektoversikt {/* Endret tittel */}
                </Typography>
                <Button onClick={handleNyttProsjekt}> {/* Kaller omdøpt funksjon */}
                    <PlusCircle className="mr-2 h-4 w-4" /> Opprett Nytt Prosjekt {/* Endret knappetekst */}
                </Button>
            </Box>

            {prosjekter.length === 0 && !isLoading ? (
                <Typography>Ingen prosjekter funnet.</Typography>
            ) : (
                <Table>
                    <TableCaption>En liste over garantiprosjekter.</TableCaption> {/* Endret caption */}
                    <TableHeader>
                        <TableRow>
                            {/* Nye/endrede kolonner kommer her */}
                            <TableHead className="w-[200px]">Prosjektnavn</TableHead>
                            <TableHead className="w-[250px]">Selskapsnavn</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ansvarlig Rådgiver</TableHead>
                            <TableHead>Sist Endret</TableHead>
                            <TableHead className="text-right">Handlinger</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {prosjekter.map((prosjekt) => (
                            <TableRow key={prosjekt.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleVisProsjekt(prosjekt.id)}>
                                <TableCell className="font-medium">{prosjekt.navn || 'Navnløst prosjekt'}</TableCell>
                                <TableCell>{prosjekt.selskap?.selskapsnavn || 'N/A'}</TableCell>
                                <TableCell>{prosjekt.status || 'N/A'}</TableCell>
                                <TableCell>{prosjekt.ansvarligRaadgiver?.navn || prosjekt.ansvarligRaadgiver?.email || 'Ikke tildelt'}</TableCell>
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
            )}
        </Box>
    );
}

export default GarantiProsjekterPage; // Eksporterer med nytt navn 