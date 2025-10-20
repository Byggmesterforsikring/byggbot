import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../ui/card';

const SeriesDimensionSelector = ({ 
    seriesDimensionOptions,
    seriesDimension,
    seriesTopN,
    onSeriesDimensionChange,
    onSeriesTopNChange
}) => {
    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium">Flere linjer per kategori (valgfritt)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        className="border rounded px-2 py-1 text-sm"
                        value={seriesDimension || ''}
                        onChange={(e) => onSeriesDimensionChange(e.target.value || null)}
                    >
                        <option value="">(Ingen)</option>
                        {seriesDimensionOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                    {seriesDimension && (
                        <>
                            <span className="text-xs text-muted-foreground">Antall serier</span>
                            <input 
                                type="number" 
                                min={1} 
                                max={12} 
                                className="w-16 border rounded px-2 py-1 text-sm" 
                                value={seriesTopN} 
                                onChange={(e) => onSeriesTopNChange(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} 
                            />
                        </>
                    )}
                    <span className="text-xs text-muted-foreground ml-2">
                        Viser de {seriesTopN} største kategoriene (sum av valgt metrikk i den valgte perioden).
                    </span>
                </div>
            </CardContent>
        </Card>
    );
};

export default SeriesDimensionSelector;
