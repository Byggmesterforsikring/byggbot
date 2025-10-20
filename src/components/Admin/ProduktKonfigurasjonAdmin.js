import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    Settings,
    Package,
    AlertTriangle,
    CheckCircle,
    Info
} from 'lucide-react';
import { useToast } from "~/hooks/use-toast";

const ProduktKonfigurasjonAdmin = () => {
    const [produkter, setProdukter] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [nyProdukt, setNyProdukt] = useState(false);
    const [formData, setFormData] = useState({
        produktnavn: '',
        beskrivelse: '',
        rentesatsUtforelse: '',
        rentesatsGaranti: '',
        minKontraktssum: '',
        maxKontraktssum: '',
        standardGarantitid: '',
        aktiv: true
    });
    const { toast } = useToast();

    useEffect(() => {
        fetchProduktKonfigurasjoner();
    }, []);

    const fetchProduktKonfigurasjoner = async () => {
        setIsLoading(true);
        try {
            const result = await window.electron.tilbud.getProduktKonfigurasjoner();
            if (result.success) {
                setProdukter(result.data || []);
            } else {
                console.error('Feil ved henting av produktkonfigurasjoner:', result.error);
                toast({
                    title: "Feil ved henting",
                    description: result.error || "Kunne ikke hente produktkonfigurasjoner",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Feil ved henting av produktkonfigurasjoner:', error);
            toast({
                title: "Feil ved henting",
                description: "Kunne ikke hente produktkonfigurasjoner",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (produkt) => {
        setEditingId(produkt.id);
        setFormData({
            produktnavn: produkt.produktnavn || '',
            beskrivelse: produkt.beskrivelse || '',
            rentesatsUtforelse: produkt.rentesatsUtforelse ? (parseFloat(produkt.rentesatsUtforelse) * 100).toString() : '',
            rentesatsGaranti: produkt.rentesatsGaranti ? (parseFloat(produkt.rentesatsGaranti) * 100).toString() : '',
            minKontraktssum: produkt.minKontraktssum || '',
            maxKontraktssum: produkt.maxKontraktssum || '',
            standardGarantitid: produkt.standardGarantitid || '',
            aktiv: produkt.aktiv !== false
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setNyProdukt(false);
        setFormData({
            produktnavn: '',
            beskrivelse: '',
            rentesatsUtforelse: '',
            rentesatsGaranti: '',
            minKontraktssum: '',
            maxKontraktssum: '',
            standardGarantitid: '',
            aktiv: true
        });
    };

    const handleSave = async () => {
        try {
            // Validering
            if (!formData.produktnavn.trim()) {
                toast({
                    title: "Valideringsfeil",
                    description: "Produktnavn er påkrevd",
                    variant: "destructive"
                });
                return;
            }

            const produktData = {
                produktnavn: formData.produktnavn.trim(),
                beskrivelse: formData.beskrivelse.trim(),
                rentesatsUtforelse: formData.rentesatsUtforelse ? parseFloat(formData.rentesatsUtforelse) / 100 : null,
                rentesatsGaranti: formData.rentesatsGaranti ? parseFloat(formData.rentesatsGaranti) / 100 : null,
                minKontraktssum: formData.minKontraktssum ? parseFloat(formData.minKontraktssum) : null,
                maxKontraktssum: formData.maxKontraktssum ? parseFloat(formData.maxKontraktssum) : null,
                standardGarantitid: formData.standardGarantitid ? parseInt(formData.standardGarantitid) : null,
                aktiv: formData.aktiv
            };

            let result;
            if (nyProdukt) {
                // Opprett ny produktkonfigurasjon
                // Siden vi ikke har implementert create-funksjon ennå, viser vi en melding
                toast({
                    title: "Funksjon ikke implementert",
                    description: "Opprettelse av nye produktkonfigurasjoner er ikke implementert ennå",
                    variant: "destructive"
                });
                return;
            } else {
                // Oppdater eksisterende produktkonfigurasjon
                // Siden vi ikke har implementert update-funksjon ennå, viser vi en melding
                toast({
                    title: "Funksjon ikke implementert",
                    description: "Oppdatering av produktkonfigurasjoner er ikke implementert ennå",
                    variant: "destructive"
                });
                return;
            }

            if (result.success) {
                toast({
                    title: "Suksess",
                    description: nyProdukt ? "Produktkonfigurasjon opprettet" : "Produktkonfigurasjon oppdatert"
                });
                handleCancel();
                fetchProduktKonfigurasjoner();
            } else {
                throw new Error(result.error || 'Operasjon feilet');
            }
        } catch (error) {
            console.error('Feil ved lagring:', error);
            toast({
                title: "Lagringsfeil",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const formatCurrency = (value) => {
        if (!value) return 'N/A';
        return new Intl.NumberFormat('no-NO', {
            style: 'currency',
            currency: 'NOK',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatPercentage = (value) => {
        if (!value) return 'N/A';
        return `${(parseFloat(value) * 100).toFixed(2)}%`;
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Produktkonfigurasjon
                    </CardTitle>
                    <CardDescription>
                        Administrer produktkonfigurasjoner for tilbudsberegninger
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Produktkonfigurasjon
                        </CardTitle>
                        <CardDescription>
                            Administrer produktkonfigurasjoner for tilbudsberegninger
                        </CardDescription>
                    </div>
                    <Button
                        onClick={() => setNyProdukt(true)}
                        disabled={editingId || nyProdukt}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Ny produktkonfigurasjon
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Info-boks */}
                <Alert className="mb-6">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        Produktkonfigurasjoner definerer standard rentesatser og parametere som brukes ved automatisk beregning av tilbud.
                        Dette er backend-data som krever utvikling for full CRUD-funksjonalitet.
                    </AlertDescription>
                </Alert>

                {/* Ny produktkonfigurasjon skjema */}
                {nyProdukt && (
                    <Card className="mb-6 border-primary">
                        <CardHeader>
                            <CardTitle className="text-lg">Ny produktkonfigurasjon</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="produktnavn">Produktnavn *</Label>
                                    <Input
                                        id="produktnavn"
                                        value={formData.produktnavn}
                                        onChange={(e) => handleInputChange('produktnavn', e.target.value)}
                                        placeholder="F.eks. Byggeforsikring"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="beskrivelse">Beskrivelse</Label>
                                    <Input
                                        id="beskrivelse"
                                        value={formData.beskrivelse}
                                        onChange={(e) => handleInputChange('beskrivelse', e.target.value)}
                                        placeholder="Kort beskrivelse av produktet"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="rentesatsUtforelse">Rentesats utførelse (%)</Label>
                                    <Input
                                        id="rentesatsUtforelse"
                                        type="number"
                                        step="0.01"
                                        value={formData.rentesatsUtforelse}
                                        onChange={(e) => handleInputChange('rentesatsUtforelse', e.target.value)}
                                        placeholder="0.50"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="rentesatsGaranti">Rentesats garanti (%)</Label>
                                    <Input
                                        id="rentesatsGaranti"
                                        type="number"
                                        step="0.01"
                                        value={formData.rentesatsGaranti}
                                        onChange={(e) => handleInputChange('rentesatsGaranti', e.target.value)}
                                        placeholder="0.25"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="minKontraktssum">Min kontraktssum (NOK)</Label>
                                    <Input
                                        id="minKontraktssum"
                                        type="number"
                                        value={formData.minKontraktssum}
                                        onChange={(e) => handleInputChange('minKontraktssum', e.target.value)}
                                        placeholder="100000"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="maxKontraktssum">Max kontraktssum (NOK)</Label>
                                    <Input
                                        id="maxKontraktssum"
                                        type="number"
                                        value={formData.maxKontraktssum}
                                        onChange={(e) => handleInputChange('maxKontraktssum', e.target.value)}
                                        placeholder="500000000"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="standardGarantitid">Standard garantitid (måneder)</Label>
                                    <Input
                                        id="standardGarantitid"
                                        type="number"
                                        value={formData.standardGarantitid}
                                        onChange={(e) => handleInputChange('standardGarantitid', e.target.value)}
                                        placeholder="36"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={handleCancel}>
                                    <X className="h-4 w-4 mr-2" />
                                    Avbryt
                                </Button>
                                <Button onClick={handleSave}>
                                    <Save className="h-4 w-4 mr-2" />
                                    Lagre
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Produktkonfigurasjon tabell */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produktnavn</TableHead>
                                <TableHead>Beskrivelse</TableHead>
                                <TableHead>Rentesats utførelse</TableHead>
                                <TableHead>Rentesats garanti</TableHead>
                                <TableHead>Kontraktssum</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Handlinger</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {produkter.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        Ingen produktkonfigurasjoner funnet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                produkter.map((produkt) => (
                                    <TableRow key={produkt.id}>
                                        {editingId === produkt.id ? (
                                            // Redigeringsmodus
                                            <>
                                                <TableCell>
                                                    <Input
                                                        value={formData.produktnavn}
                                                        onChange={(e) => handleInputChange('produktnavn', e.target.value)}
                                                        className="min-w-[150px]"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={formData.beskrivelse}
                                                        onChange={(e) => handleInputChange('beskrivelse', e.target.value)}
                                                        className="min-w-[200px]"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.rentesatsUtforelse}
                                                        onChange={(e) => handleInputChange('rentesatsUtforelse', e.target.value)}
                                                        className="min-w-[100px]"
                                                        placeholder="%"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.rentesatsGaranti}
                                                        onChange={(e) => handleInputChange('rentesatsGaranti', e.target.value)}
                                                        className="min-w-[100px]"
                                                        placeholder="%"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <Input
                                                            type="number"
                                                            value={formData.minKontraktssum}
                                                            onChange={(e) => handleInputChange('minKontraktssum', e.target.value)}
                                                            placeholder="Min"
                                                            className="min-w-[120px]"
                                                        />
                                                        <Input
                                                            type="number"
                                                            value={formData.maxKontraktssum}
                                                            onChange={(e) => handleInputChange('maxKontraktssum', e.target.value)}
                                                            placeholder="Max"
                                                            className="min-w-[120px]"
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={formData.aktiv ? "default" : "secondary"}>
                                                        {formData.aktiv ? "Aktiv" : "Inaktiv"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={handleCancel}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={handleSave}
                                                        >
                                                            <Save className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </>
                                        ) : (
                                            // Visningsmodus
                                            <>
                                                <TableCell className="font-medium">
                                                    {produkt.produktnavn}
                                                </TableCell>
                                                <TableCell>{produkt.beskrivelse || '-'}</TableCell>
                                                <TableCell>{formatPercentage(produkt.rentesatsUtforelse)}</TableCell>
                                                <TableCell>{formatPercentage(produkt.rentesatsGaranti)}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <div>Min: {formatCurrency(produkt.minKontraktssum)}</div>
                                                        <div>Max: {formatCurrency(produkt.maxKontraktssum)}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={produkt.aktiv !== false ? "default" : "secondary"}>
                                                        {produkt.aktiv !== false ? "Aktiv" : "Inaktiv"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleEdit(produkt)}
                                                            disabled={editingId || nyProdukt}
                                                        >
                                                            <Edit2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {produkter.length > 0 && (
                    <div className="mt-4 text-sm text-muted-foreground">
                        Totalt {produkter.length} produktkonfigurasjon{produkter.length !== 1 ? 'er' : ''}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ProduktKonfigurasjonAdmin; 