import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../../ui/dialog';
import { Button } from '../../../../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../ui/select';
import { Label } from '../../../../../ui/label';
import { Input } from '../../../../../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../ui/card';
import { Settings, Info } from 'lucide-react';

const AnalysisConfigDialog = ({
    isOpen,
    onClose,
    analysisPlugin,
    data,
    chartLabels,
    onExecute,
    isLoading
}) => {
    const [config, setConfig] = useState({});
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (analysisPlugin && data) {
            // Initialize with smart defaults
            const initialConfig = getDefaultConfig(analysisPlugin, data, chartLabels);

            setConfig(initialConfig);
            setErrors({});
        }
    }, [analysisPlugin, data, chartLabels]);

    const getDefaultConfig = (plugin, data, chartLabels) => {
        const config = {};

        // Get available fields
        const allFields = data && data.length > 0 ? Object.keys(data[0]) : [];
        const numericFields = allFields.filter(field => {
            const value = data[0][field];
            return typeof value === 'number' && value !== null;
        });
        const textFields = allFields.filter(field => {
            const value = data[0][field];
            return typeof value === 'string' &&
                !field.toLowerCase().includes('date') &&
                !field.toLowerCase().includes('sum') &&
                !field.toLowerCase().includes('count');
        });

        // Set smart defaults based on analysis type
        switch (plugin.id) {
            case 'topMovers':
                config.selectedMetric = chartLabels?.valueFieldName || numericFields[0];
                config.groupField = chartLabels?.groupFieldName || textFields[0];
                config.topN = 10;
                break;
            case 'pareto':
                config.selectedMetric = chartLabels?.valueFieldName || numericFields[0];
                config.groupField = chartLabels?.groupFieldName || textFields[0];
                config.includeOthers = true;
                break;
            case 'changeRates':
                config.selectedMetric = chartLabels?.valueFieldName || numericFields[0];
                const timeField = allFields.find(field =>
                    field.toLowerCase().includes('date') ||
                    field.toLowerCase().includes('month') ||
                    /^(Jan|Feb|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Des)\s\d{4}$/.test(data[0][field])
                );
                config.timeField = timeField || allFields[0];
                break;
            case 'skadeprosent':
                // Smart configuration for skadeprosent (loss ratio) analysis
                const damageFields = allFields.filter(field =>
                    field.includes('SumUtbetalt') || field.includes('SumSkadereserve') ||
                    field.includes('SumEgenandel') || field.toLowerCase().includes('utbetalt')
                );
                const premieFields = allFields.filter(field =>
                    field.includes('SumNettoPremie') || field.toLowerCase().includes('premie')
                );

                config.damageField = damageFields[0] || 'SumUtbetalt';
                config.exposureField = premieFields[0] || null;
                config.categoryField = 'Bedriftsnavn'; // Default to most useful business view
                config.analysisType = premieFields.length > 0 ? 'lossratio' : 'distribution';
                break;
            case 'skadefrekvens':
                // Smart configuration for true claim frequency analysis
                const frequencyExposureFields = allFields.filter(field =>
                    field.includes('SumForsikringssum') || field.includes('AntallForsikrede') ||
                    field.toLowerCase().includes('forsikringssum') || field.toLowerCase().includes('antall') ||
                    field.includes('SumNettoPremie') || field.toLowerCase().includes('premie')
                );

                config.exposureField = frequencyExposureFields[0] || null;
                config.categoryField = 'Produktnavn'; // Default for frequency analysis
                config.exposureType = 'value'; // Default to value-based frequency
                break;
            default:
                config.selectedMetric = numericFields[0];
                config.groupField = textFields[0];
        }

        return config;
    };

    const getAvailableFields = () => {
        if (!data || data.length === 0) return { numeric: [], text: [], all: [] };

        const allFields = Object.keys(data[0]);
        const numericFields = allFields.filter(field => {
            const value = data[0][field];
            return typeof value === 'number' && value !== null;
        });
        const textFields = allFields.filter(field => {
            const value = data[0][field];
            return typeof value === 'string';
        });

        return { numeric: numericFields, text: textFields, all: allFields };
    };

    const validateConfig = () => {
        const newErrors = {};

        if (analysisPlugin?.id === 'skadeprosent') {
            if (!config.categoryField) {
                newErrors.categoryField = 'Du må velge en gruppering';
            }
            if (!config.damageField) {
                newErrors.damageField = 'Du må velge et skademål';
            }
            if (!config.analysisType) {
                newErrors.analysisType = 'Du må velge analysetype';
            }
        } else if (analysisPlugin?.id === 'skadefrekvens') {
            if (!config.categoryField) {
                newErrors.categoryField = 'Du må velge en gruppering';
            }
            if (!config.exposureField) {
                newErrors.exposureField = 'Du må velge eksponeringsdata';
            }
            if (!config.exposureType) {
                newErrors.exposureType = 'Du må velge eksponeringstype';
            }
        } else {
            if (!config.selectedMetric) {
                newErrors.selectedMetric = 'Du må velge en verdi å analysere';
            }

            if (!config.groupField && analysisPlugin?.id !== 'changeRates') {
                newErrors.groupField = 'Du må velge et felt å gruppere etter';
            }

            if (analysisPlugin?.id === 'changeRates' && !config.timeField) {
                newErrors.timeField = 'Du må velge et tidsfelt';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleExecute = () => {
        if (validateConfig()) {
            onExecute(config);
            onClose();
        }
    };

    const fields = getAvailableFields();

    if (!analysisPlugin) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Konfigurer {analysisPlugin.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Analysis Description */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Hva denne analysen gjør</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-2">
                                {analysisPlugin.description}
                            </p>
                            {analysisPlugin.userExplanation && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs text-blue-800">
                                        {analysisPlugin.userExplanation}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Configuration Fields */}
                    <div className="space-y-4">
                        {analysisPlugin.id === 'skadefrekvens' ? (
                            /* Skadefrekvens Configuration */
                            <>
                                <h3 className="font-medium">Velg data å analysere</h3>

                                {/* Analysis Type */}
                                <div className="space-y-2">
                                    <Label>Hva vil du se på? *</Label>
                                    <Select
                                        value={config.analysisType || ''}
                                        onValueChange={(value) => setConfig(prev => ({ ...prev, analysisType: value }))}
                                    >
                                        <SelectTrigger className={errors.analysisType ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Velg analysetype..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {config.exposureField && (
                                                <SelectItem value="frequency">
                                                    <span>Skadefrekvens (lønnsomhet)</span>
                                                </SelectItem>
                                            )}
                                            <SelectItem value="distribution">
                                                <span>Skadefordeling</span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.analysisType && (
                                        <p className="text-xs text-red-600">{errors.analysisType}</p>
                                    )}
                                </div>

                                {/* Category Field */}
                                <div className="space-y-2">
                                    <Label>Hvordan vil du gruppere dataene? *</Label>
                                    <Select
                                        value={config.categoryField || ''}
                                        onValueChange={(value) => setConfig(prev => ({ ...prev, categoryField: value }))}
                                    >
                                        <SelectTrigger className={errors.categoryField ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Velg gruppering..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Bedriftsnavn">Per bedrift/kunde</SelectItem>
                                            <SelectItem value="Skadetype">Per skadetype</SelectItem>
                                            <SelectItem value="SkadekodeNivå1">Per skadeårsak</SelectItem>
                                            <SelectItem value="Produktnavn">Per produkt</SelectItem>
                                            <SelectItem value="Produksjonsansvarlig">Per ansvarlig</SelectItem>
                                            <SelectItem value="Poststed">Per poststed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.categoryField && (
                                        <p className="text-xs text-red-600">{errors.categoryField}</p>
                                    )}
                                </div>

                                {/* Damage Field */}
                                <div className="space-y-2">
                                    <Label>Hvilket skademål vil du bruke? *</Label>
                                    <Select
                                        value={config.damageField || ''}
                                        onValueChange={(value) => setConfig(prev => ({ ...prev, damageField: value }))}
                                    >
                                        <SelectTrigger className={errors.damageField ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Velg skademål..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SumUtbetalt">Utbetalt beløp</SelectItem>
                                            <SelectItem value="SumSkadereserve">Reservert beløp</SelectItem>
                                            <SelectItem value="SumEgenandel">Egenandel</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.damageField && (
                                        <p className="text-xs text-red-600">{errors.damageField}</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Standard Configuration */
                            <>
                                <h3 className="font-medium">Velg data å analysere</h3>

                                {/* Metric Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="selectedMetric">
                                        Hvilken verdi vil du analysere? *
                                        <span className="text-xs text-muted-foreground ml-2">
                                            (f.eks. salgsbeløp, antall, premie)
                                        </span>
                                    </Label>
                                    <Select
                                        value={config.selectedMetric || ''}
                                        onValueChange={(value) => setConfig(prev => ({ ...prev, selectedMetric: value }))}
                                    >
                                        <SelectTrigger className={errors.selectedMetric ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Velg et tall-felt..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {fields.numeric.map(field => (
                                                <SelectItem key={field} value={field}>
                                                    <div className="flex flex-col">
                                                        <span>{field}</span>
                                                        {field.includes('Sum') && <span className="text-xs text-muted-foreground">Sum-verdi</span>}
                                                        {field.includes('Count') && <span className="text-xs text-muted-foreground">Antall</span>}
                                                        {field.includes('Premium') && <span className="text-xs text-muted-foreground">Premie-beløp</span>}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.selectedMetric && (
                                        <p className="text-xs text-red-600">{errors.selectedMetric}</p>
                                    )}
                                </div>

                                {/* Group Field (not for changeRates) */}
                                {analysisPlugin.id !== 'changeRates' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="groupField">
                                            Hvordan vil du gruppere dataene? *
                                            <span className="text-xs text-muted-foreground ml-2">
                                                (f.eks. etter selger, kunde, produkt)
                                            </span>
                                        </Label>
                                        <Select
                                            value={config.groupField || ''}
                                            onValueChange={(value) => setConfig(prev => ({ ...prev, groupField: value }))}
                                        >
                                            <SelectTrigger className={errors.groupField ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Velg et gruppe-felt..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {fields.text.map(field => (
                                                    <SelectItem key={field} value={field}>
                                                        {field}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.groupField && (
                                            <p className="text-xs text-red-600">{errors.groupField}</p>
                                        )}
                                    </div>
                                )}

                                {/* Time Field (for changeRates) */}
                                {analysisPlugin.id === 'changeRates' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="timeField">
                                            Hvilket felt inneholder tid/dato? *
                                        </Label>
                                        <Select
                                            value={config.timeField || ''}
                                            onValueChange={(value) => setConfig(prev => ({ ...prev, timeField: value }))}
                                        >
                                            <SelectTrigger className={errors.timeField ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Velg et tidsfelt..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {fields.all.map(field => (
                                                    <SelectItem key={field} value={field}>
                                                        {field}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.timeField && (
                                            <p className="text-xs text-red-600">{errors.timeField}</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Top N (for relevant analyses) */}
                        {(analysisPlugin.id === 'topMovers' || analysisPlugin.id === 'pareto') && (
                            <div className="space-y-2">
                                <Label htmlFor="topN">
                                    Hvor mange resultater vil du se?
                                </Label>
                                <Input
                                    type="number"
                                    min="3"
                                    max="50"
                                    value={config.topN || 10}
                                    onChange={(e) => setConfig(prev => ({ ...prev, topN: parseInt(e.target.value) || 10 }))}
                                    className="w-24"
                                />
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    {((config.selectedMetric && config.groupField) || (analysisPlugin.id === 'skadefrekvens' && config.categoryField && config.damageField)) && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    Forhåndsvisning
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    {analysisPlugin.id === 'pareto' &&
                                        `Analysen vil vise hvilke "${config.groupField}" som gir mesteparten av "${config.selectedMetric}"`
                                    }
                                    {analysisPlugin.id === 'topMovers' &&
                                        `Analysen vil sammenligne "${config.selectedMetric}" per "${config.groupField}" mellom periodene`
                                    }
                                    {analysisPlugin.id === 'changeRates' &&
                                        `Analysen vil vise månedlig og årlig endring i "${config.selectedMetric}" over tid`
                                    }
                                    {analysisPlugin.id === 'skadefrekvens' && config.analysisType === 'frequency' &&
                                        `Analysen vil vise skadefrekvens (hvor mye av premien som går til skader) per "${config.categoryField}"`
                                    }
                                    {analysisPlugin.id === 'skadefrekvens' && config.analysisType === 'distribution' &&
                                        `Analysen vil vise gjennomsnittlig skadestørrelse per "${config.categoryField}"`
                                    }
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                    <Button
                        onClick={handleExecute}
                        disabled={isLoading || (analysisPlugin?.id === 'skadefrekvens' ? (!config.categoryField || !config.damageField || !config.analysisType) : !config.selectedMetric)}
                        className="flex-1"
                    >
                        {isLoading ? 'Kjører analyse...' : 'Start Analyse'}
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        Avbryt
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AnalysisConfigDialog;
