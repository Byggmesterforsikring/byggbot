import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ArrowLeft, BarChart, Building2, MessageCircle, Users, Calendar, Clock, FileText as FileTextIcon, History, Receipt } from 'lucide-react';
import { useToast } from "~/hooks/use-toast";
import authManager from '../../auth/AuthManager';

// Importer nye sub-komponenter
import ProsjektDetailHeader from './ProsjektDetail/ProsjektDetailHeader';
import ProsjektStatusSection from './ProsjektDetail/ProsjektStatusSection';
import ProsjektProduktOkonomiSection from './ProsjektDetail/ProsjektProduktOkonomiSection';
import IsolatedProsjektInfoWrapper from './ProsjektDetail/IsolatedProsjektInfoWrapper';
import ProsjektSelskapSection from './ProsjektDetail/ProsjektSelskapSection';

import ProsjektAnsvarligeSection from './ProsjektDetail/ProsjektAnsvarligeSection';
import ProsjektRelasjonerSection from './ProsjektDetail/ProsjektRelasjonerSection';
import ProsjektDokumenterSection from './ProsjektDetail/ProsjektDokumenterSection';
import ProsjektKommentarSection from './ProsjektDetail/ProsjektKommentarSection';
import ProsjektHendelserSection from './ProsjektDetail/ProsjektHendelserSection';
import TilbudTab from './TilbudTab';
import RammeOvervakning from './Tilbud/RammeOvervakning';
import { INITIALT_ANTALL_VISTE_ELEMENTER, getFileType } from './ProsjektDetail/ProsjektDetailUtils';

// Importer eksisterende modaler
import GarantiDokumentUploadModal from './GarantiDokumentUploadModal';
import GarantiNyInternKommentarModal from './GarantiNyInternKommentarModal';

const TAB_STRUKTUR = [
    { key: 'oversikt', label: 'Oversikt', icon: BarChart },
    { key: 'ansvarlige', label: 'Ansvarlige', icon: Users },
    { key: 'relasjoner', label: 'Relasjoner', icon: Building2 },
    { key: 'tilbud', label: 'Tilbud', icon: Receipt },
    { key: 'dokumenter', label: 'Dokumenter', icon: FileTextIcon },
    { key: 'kommentarer', label: 'Kommentarer', icon: MessageCircle },
    { key: 'hendelser', label: 'Hendelser', icon: History },
];

function GarantiProsjektDetailPage() {
    const { prosjektId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [antallVisteHendelser, setAntallVisteHendelser] = useState(INITIALT_ANTALL_VISTE_ELEMENTER);
    const [antallVisteInterneKommentarer, setAntallVisteInterneKommentarer] = useState(INITIALT_ANTALL_VISTE_ELEMENTER);
    const [activeTab, setActiveTab] = useState('oversikt');

    // Loading og error states
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Data states
    const [prosjekt, setProsjekt] = useState(null);
    const [hendelser, setHendelser] = useState([]);
    const [interneKommentarer, setInterneKommentarer] = useState([]);
    const [kundeKommentarer, setKundeKommentarer] = useState([]);
    const [dokumenter, setDokumenter] = useState([]);

    // Modal states
    const [isNewKommentarModalOpen, setIsNewKommentarModalOpen] = useState(false);
    const [isDokumentUploadModalOpen, setIsDokumentUploadModalOpen] = useState(false);
    const [openingDokumentId, setOpeningDokumentId] = useState(null);

    // Status change states
    const [isSavingStatus, setIsSavingStatus] = useState(false);

    // Ansvarlige editing states
    const [allUsersV2, setAllUsersV2] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isUpdatingAnsvarlige, setIsUpdatingAnsvarlige] = useState({});

    // Hjelpefunksjon for å hente current user ID
    const getCurrentUserV2Id = useCallback(() => {
        const currentUserDetails = authManager.getCurrentUserDetails();
        return currentUserDetails ? currentUserDetails.id : 1;
    }, []);

    // Hjelpefunksjon for å hente fullstendige selskap-data
    const enrichProsjektWithSelskapData = useCallback(async (prosjektData) => {
        if (prosjektData.selskapId && window.electron.garanti.getSelskapById) {
            try {
                const selskapResult = await window.electron.garanti.getSelskapById(prosjektData.selskapId);
                if (selskapResult.success) {
                    return {
                        ...prosjektData,
                        selskap: selskapResult.data
                    };
                }
            } catch (selskapError) {
                console.warn('Kunne ikke hente fullstendige selskap-data:', selskapError);
            }
        }
        return prosjektData;
    }, []);

    // Hent prosjektdata
    const fetchProsjektData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (window.electron && window.electron.garanti && window.electron.garanti.getProsjektById) {
                const result = await window.electron.garanti.getProsjektById(prosjektId);
                if (result.success) {
                    const enrichedProsjektData = await enrichProsjektWithSelskapData(result.data);
                    setProsjekt(enrichedProsjektData);
                    setInterneKommentarer(enrichedProsjektData.interneKommentarer || []);
                    setHendelser(enrichedProsjektData.hendelser || []);
                    setDokumenter(enrichedProsjektData.dokumenter || []);
                } else {
                    throw new Error(result.error || 'Ukjent feil ved henting av prosjekt');
                }
            } else {
                throw new Error('API for å hente prosjekt er ikke tilgjengelig.');
            }
        } catch (err) {
            console.error("Feil ved henting av prosjekt:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [prosjektId, enrichProsjektWithSelskapData]);

    // Hent brukere for ansvarlige dropdown
    const fetchUsers = useCallback(async () => {
        setIsLoadingUsers(true);
        try {
            if (window.electron && window.electron.garanti && window.electron.garanti.getUsersV2) {
                const result = await window.electron.garanti.getUsersV2();
                if (result.success && Array.isArray(result.data)) {
                    setAllUsersV2(result.data);
                }
            }
        } catch (err) {
            console.error("Feil ved henting av brukere:", err);
        } finally {
            setIsLoadingUsers(false);
        }
    }, []);

    // Save-funksjon for prosjektinfo
    const handleSaveProsjektInfo = async (formData) => {
        const endretAvBrukerId = getCurrentUserV2Id();

        // Map feltnavnene til de som brukes i backend
        const dataToUpdate = {
            navn: formData.navn,
            prosjektGateadresse: formData.gateadresse,
            prosjektPostnummer: formData.postnummer,
            prosjektPoststed: formData.poststed,
            prosjektKommune: formData.kommune
        };

        const result = await window.electron.garanti.updateProsjekt({
            prosjektId: prosjekt.id,
            dataToUpdate: dataToUpdate,
            endretAvBrukerId_UserV2: endretAvBrukerId
        });

        if (result.success) {
            const enrichedProsjektData = await enrichProsjektWithSelskapData(result.data);
            setProsjekt(enrichedProsjektData);
            setHendelser(enrichedProsjektData.hendelser || []);
            setInterneKommentarer(enrichedProsjektData.interneKommentarer || []);
            setDokumenter(enrichedProsjektData.dokumenter || []);
        } else {
            throw new Error(result.error || 'Ukjent feil ved oppdatering.');
        }
    };

    // Save-funksjon for produkt og økonomi
    const handleSaveProduktOkonomi = async (formData) => {
        const endretAvBrukerId = getCurrentUserV2Id();

        // For prosjekt-nivå er kun 'produkt' støttet i backend
        // ramme og kundenummerWims hører til selskap/sak-nivå
        const dataToUpdate = {
            produkt: formData.produkt
        };

        const result = await window.electron.garanti.updateProsjekt({
            prosjektId: prosjekt.id,
            dataToUpdate: dataToUpdate,
            endretAvBrukerId_UserV2: endretAvBrukerId
        });

        if (result.success) {
            setProsjekt(result.data);
            setHendelser(result.data.hendelser || []);
            setInterneKommentarer(result.data.interneKommentarer || []);
            setDokumenter(result.data.dokumenter || []);
            toast({
                title: "Produkt Oppdatert",
                description: "Produktinformasjonen er lagret."
            });
        } else {
            throw new Error(result.error || 'Ukjent feil ved oppdatering.');
        }
    };

    // Håndter oppdatering av ansvarlige
    const handleUpdateAnsvarlig = async (field, newUserId) => {
        if (!prosjekt) return;

        const actualUserId = newUserId === 'unassigned' || newUserId === null || newUserId === '' ? null : parseInt(newUserId);

        setIsUpdatingAnsvarlige(prev => ({ ...prev, [field]: true }));

        try {
            const endretAvBrukerId = getCurrentUserV2Id();
            const updateData = { [field]: actualUserId };

            if (window.electron && window.electron.garanti && window.electron.garanti.updateProsjekt) {
                const result = await window.electron.garanti.updateProsjekt({
                    prosjektId: prosjekt.id,
                    dataToUpdate: updateData,
                    endretAvBrukerId_UserV2: endretAvBrukerId
                });

                if (result.success) {
                    const enrichedProsjektData = await enrichProsjektWithSelskapData(result.data);
                    setProsjekt(enrichedProsjektData);
                    setHendelser(enrichedProsjektData.hendelser || []);
                    toast({
                        title: "Ansvarlig Oppdatert",
                        description: `${field === 'ansvarligRaadgiverId' ? 'Ansvarlig rådgiver' :
                            field === 'uwAnsvarligId' ? 'UW ansvarlig' : 'Produksjonsansvarlig'} er oppdatert.`
                    });
                } else {
                    throw new Error(result.error || 'Ukjent feil ved oppdatering av ansvarlig.');
                }
            }
        } catch (err) {
            console.error("Feil ved oppdatering av ansvarlig:", err);
            toast({ title: "Feil ved Oppdatering", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdatingAnsvarlige(prev => ({ ...prev, [field]: false }));
        }
    };

    // Kjør alle data-hentinger ved innlasting
    useEffect(() => {
        if (prosjektId) {
            fetchProsjektData();
            fetchUsers();
        }
    }, [prosjektId, fetchProsjektData, fetchUsers]);

    // Håndter status-endring
    const handleStatusChange = async (nyStatus) => {
        if (!prosjekt || nyStatus === prosjekt.status || isSavingStatus) return;

        setIsSavingStatus(true);
        const endretAvId = getCurrentUserV2Id();

        try {
            const result = await window.electron.garanti.updateProsjekt({
                prosjektId: prosjekt.id,
                dataToUpdate: { status: nyStatus },
                endretAvBrukerId_UserV2: endretAvId
            });

            if (result.success) {
                const enrichedProsjektData = await enrichProsjektWithSelskapData(result.data);
                setProsjekt(enrichedProsjektData);
                toast({
                    title: "Status Oppdatert",
                    description: `Status endret til "${nyStatus}".`
                });
                setHendelser(enrichedProsjektData.hendelser || []);
            } else {
                throw new Error(result.error || 'Ukjent feil ved oppdatering av status.');
            }
        } catch (err) {
            console.error("Feil ved statusendring:", err);
            toast({
                title: "Feil ved Statusendring",
                description: err.message || "En ukjent feil oppstod.",
                variant: "destructive"
            });
        } finally {
            setIsSavingStatus(false);
        }
    };

    // Håndter når ny kommentar legges til
    const handleKommentarLagtTil = () => {
        fetchProsjektData();
    };

    // Håndter når dokument lastes opp
    const handleDokumentOpplastet = () => {
        fetchProsjektData();
    };

    // Håndter åpning av dokument
    const handleOpenDokument = async (dokument) => {
        setOpeningDokumentId(dokument.id);

        try {
            console.log('Åpner dokument:', dokument.filnavn);

            if (window.electron?.garanti?.openDokument) {
                const result = await window.electron.garanti.openDokument({
                    containerName: dokument.containerNavn,
                    blobName: dokument.blobNavn,
                    fileName: dokument.filnavn
                });

                if (result.success) {
                    toast({
                        title: "Dokument åpnet",
                        description: `${dokument.filnavn} er åpnet`
                    });
                } else {
                    throw new Error(result.error || 'Kunne ikke åpne dokument');
                }
            } else {
                // Fallback til den gamle metoden
                const sasResult = await window.electron.garanti.getDokumentSasUrl({
                    containerName: dokument.containerNavn,
                    blobName: dokument.blobNavn
                });

                if (!sasResult.success) {
                    throw new Error(sasResult.error || 'Kunne ikke hente tilgangs-URL for dokument');
                }

                const response = await fetch(sasResult.data, {
                    method: 'GET',
                    headers: { 'Accept': '*/*' },
                    mode: 'cors'
                });

                if (!response.ok) {
                    throw new Error(`Kunne ikke laste ned dokument: ${response.status} ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                const isPdf = dokument.filnavn.toLowerCase().endsWith('.pdf');

                if (isPdf && window.electron?.pdf?.openPdf) {
                    const result = await window.electron.pdf.openPdf({
                        arrayBuffer,
                        fileName: dokument.filnavn
                    });

                    if (result.success) {
                        toast({
                            title: "Dokument åpnet",
                            description: `${dokument.filnavn} er åpnet i ekstern leser`
                        });
                    } else {
                        throw new Error(result.error || 'Kunne ikke åpne PDF');
                    }
                } else {
                    const blob = new Blob([arrayBuffer], {
                        type: getFileType(dokument.filnavn)
                    });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    setTimeout(() => URL.revokeObjectURL(url), 10000);

                    toast({
                        title: "Dokument åpnet",
                        description: `${dokument.filnavn} er åpnet i ny fane`
                    });
                }
            }
        } catch (error) {
            console.error('Detaljert feil ved åpning av dokument:', error);
            toast({
                title: "Feil ved åpning",
                description: `Kunne ikke åpne ${dokument.filnavn}: ${error.message}`,
                variant: "destructive"
            });
        } finally {
            setOpeningDokumentId(null);
        }
    };

    // Event handlers for sub-components
    const handleNavigateBack = () => navigate(-1);
    const handleNavigateToSelskap = (selskapId) => navigate(`/garanti/selskap/${selskapId}`);
    const handleShowMoreComments = () => setAntallVisteInterneKommentarer(prev => prev + INITIALT_ANTALL_VISTE_ELEMENTER);
    const handleToggleShowAllEvents = () => {
        const alleHendelserVises = antallVisteHendelser >= hendelser.length;
        setAntallVisteHendelser(alleHendelserVises ? INITIALT_ANTALL_VISTE_ELEMENTER : hendelser.length);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className='flex-grow'>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96 mt-2" />
                    </div>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-1/4" />
                                    <Skeleton className="h-6 w-3/4" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <Button variant="outline" size="icon" onClick={handleNavigateBack} className="h-9 w-9 flex-shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className='flex-grow'>
                        <h1 className="text-2xl font-semibold text-foreground">Garantiprosjekt</h1>
                    </div>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-red-600 mb-4">Feil ved lasting av prosjekt: {error}</p>
                            <Button onClick={fetchProsjektData}>Prøv på nytt</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Not found state
    if (!prosjekt) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <Button variant="outline" size="icon" onClick={handleNavigateBack} className="h-9 w-9 flex-shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className='flex-grow'>
                        <h1 className="text-2xl font-semibold text-foreground">Garantiprosjekt</h1>
                    </div>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center">Prosjekt ikke funnet.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <ProsjektDetailHeader
                prosjekt={prosjekt}
                onNavigateBack={handleNavigateBack}
                onNavigateToSelskap={handleNavigateToSelskap}
            />

            {/* Tab-basert layout */}
            <Card>
                <CardContent className="p-0">
                    <Tabs
                        value={activeTab}
                        onValueChange={(newValue) => {
                            // VIKTIG: Kun aksepter strings som gyldige tab-verdier
                            // Dette forhindrer at input-events trigger tab-endringer
                            if (typeof newValue === 'string') {
                                setActiveTab(newValue);
                            }
                        }}
                        className="w-full"
                    >
                        <TabsList className="w-full justify-start h-auto p-1 bg-muted/10 border-b">
                            {TAB_STRUKTUR.map((tab) => (
                                <TabsTrigger
                                    key={tab.key}
                                    value={tab.key}
                                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:border-primary data-[state=active]:border-b-2 hover:bg-muted/20 flex items-center gap-2 px-3 py-2 transition-all duration-200 border border-transparent relative"
                                >
                                    <tab.icon className="h-4 w-4" />
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {/* Tab: Oversikt */}
                        <TabsContent key="oversikt-tab" value="oversikt" className="p-6 space-y-6">
                            <ProsjektStatusSection
                                key="status-section"
                                prosjekt={prosjekt}
                                onStatusChange={handleStatusChange}
                                isSaving={isSavingStatus}
                            />
                            {/* Rammeovervåking */}
                            {prosjekt?.selskapId && (
                                <RammeOvervakning
                                    key="ramme-section"
                                    selskapId={prosjekt.selskapId}
                                    navarendeProsjektId={prosjekt.id}
                                />
                            )}
                            <ProsjektProduktOkonomiSection
                                key="produkt-section"
                                prosjekt={prosjekt}
                                onSave={handleSaveProduktOkonomi}
                            />
                            <IsolatedProsjektInfoWrapper
                                key={`prosjekt-info-${prosjekt?.id}`}
                                prosjekt={prosjekt}
                                onSave={handleSaveProsjektInfo}
                            />
                            <ProsjektSelskapSection key="selskap-section" prosjekt={prosjekt} />
                        </TabsContent>

                        {/* Tab: Ansvarlige */}
                        <TabsContent key="ansvarlige-tab" value="ansvarlige" className="p-6">
                            <ProsjektAnsvarligeSection
                                key="ansvarlige-section"
                                prosjekt={prosjekt}
                                allUsersV2={allUsersV2}
                                isLoadingUsers={isLoadingUsers}
                                isUpdatingAnsvarlige={isUpdatingAnsvarlige}
                                onUpdateAnsvarlig={handleUpdateAnsvarlig}
                            />
                        </TabsContent>

                        {/* Tab: Relasjoner */}
                        <TabsContent key="relasjoner-tab" value="relasjoner" className="p-6">
                            <ProsjektRelasjonerSection key="relasjoner-section" />
                        </TabsContent>

                        {/* Tab: Tilbud */}
                        <TabsContent key="tilbud-tab" value="tilbud" className="p-6">
                            <TilbudTab prosjekt={prosjekt} />
                        </TabsContent>

                        {/* Tab: Dokumenter */}
                        <TabsContent key="dokumenter-tab" value="dokumenter" className="p-6">
                            <ProsjektDokumenterSection
                                key="dokumenter-section"
                                dokumenter={dokumenter}
                                onOpenDokumentUpload={() => setIsDokumentUploadModalOpen(true)}
                                onOpenDokument={handleOpenDokument}
                                openingDokumentId={openingDokumentId}
                            />
                        </TabsContent>

                        {/* Tab: Kommentarer */}
                        <TabsContent key="kommentarer-tab" value="kommentarer" className="p-6">
                            <ProsjektKommentarSection
                                key="kommentarer-section"
                                kundeKommentarer={kundeKommentarer}
                                interneKommentarer={interneKommentarer}
                                antallVisteInterneKommentarer={antallVisteInterneKommentarer}
                                onOpenNewKommentar={() => setIsNewKommentarModalOpen(true)}
                                onShowMoreComments={handleShowMoreComments}
                            />
                        </TabsContent>

                        {/* Tab: Hendelser */}
                        <TabsContent key="hendelser-tab" value="hendelser" className="p-6">
                            <ProsjektHendelserSection
                                key="hendelser-section"
                                hendelser={hendelser}
                                antallVisteHendelser={antallVisteHendelser}
                                onToggleShowAllEvents={handleToggleShowAllEvents}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Modaler */}
            <GarantiDokumentUploadModal
                isOpen={isDokumentUploadModalOpen}
                setIsOpen={setIsDokumentUploadModalOpen}
                entityContext={{ type: 'prosjekt', id: prosjekt?.id }}
                onUploadSuccess={handleDokumentOpplastet}
            />

            <GarantiNyInternKommentarModal
                isOpen={isNewKommentarModalOpen}
                setIsOpen={setIsNewKommentarModalOpen}
                entityContext={{ type: 'prosjekt', id: prosjekt?.id }}
                onKommentarLagtTil={handleKommentarLagtTil}
            />
        </div>
    );
}

export default GarantiProsjektDetailPage; 