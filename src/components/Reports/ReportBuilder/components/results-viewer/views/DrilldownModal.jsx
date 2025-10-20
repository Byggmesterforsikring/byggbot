import React, { useState } from 'react';
import { formatValue } from '../../utils/formatters';
import { copyDrilldown } from '../../hooks/useClipboard';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../ui/card';
import { Button } from '../../../../../ui/button';
import { Badge } from '../../../../../ui/badge';
import {
    Eye,
    X,
    Columns,
    MoreHorizontal,
    Copy,
    CheckCircle2
} from 'lucide-react';

const DrilldownModal = ({ drillDownData, onClose }) => {
    const [showAllColumns, setShowAllColumns] = useState(false);
    const [showAllRows, setShowAllRows] = useState(false);
    const [copyStatus, setCopyStatus] = useState(null);

    // Copy drill-down data to clipboard
    const copyDrillDownData = async (includeAllColumns = false, includeAllRows = false) => {
        setCopyStatus('copying');
        try {
            await copyDrilldown(drillDownData, includeAllColumns, includeAllRows);
            setCopyStatus('success');
            setTimeout(() => setCopyStatus(null), 2000);
        } catch (error) {
            console.error('Failed to copy drill-down data:', error);
            setCopyStatus('error');
            setTimeout(() => setCopyStatus(null), 2000);
        }
    };

    const handleClose = () => {
        setShowAllColumns(false);
        setShowAllRows(false);
        setCopyStatus(null);
        onClose();
    };

    if (!drillDownData) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleClose}
        >
            <div
                className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Kildedata Detaljer
                    </h2>
                    <Button
                        onClick={handleClose}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="p-4 space-y-4 overflow-auto max-h-[calc(90vh-80px)]">
                    {/* Summary Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Sammendrag</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                {Object.entries(drillDownData.summary).map(([key, value]) => (
                                    <div key={key} className="p-3 bg-muted/30 rounded">
                                        <div className="font-medium text-muted-foreground text-xs mb-1">
                                            {key}
                                        </div>
                                        <div className="font-semibold">
                                            {formatValue(value, key)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Source Records */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center justify-between">
                                <span>Kildedata ({drillDownData.sourceRecords.length} poster)</span>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                        {showAllColumns ? 'Alle kolonner' : `${Math.min(10, Object.keys(drillDownData.sourceRecords[0] || {}).length)} av ${Object.keys(drillDownData.sourceRecords[0] || {}).length}`}
                                    </Badge>
                                    <Badge variant="outline">
                                        {showAllRows ? `Alle ${drillDownData.sourceRecords.length}` : `${Math.min(100, drillDownData.sourceRecords.length)} av ${drillDownData.sourceRecords.length}`} rader
                                    </Badge>
                                </div>
                            </CardTitle>

                            {/* Control Panel */}
                            <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
                                <Button
                                    onClick={() => setShowAllColumns(!showAllColumns)}
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2"
                                >
                                    <Columns className="h-4 w-4" />
                                    {showAllColumns ? 'Skjul kolonner' : 'Vis alle kolonner'}
                                </Button>

                                <Button
                                    onClick={() => setShowAllRows(!showAllRows)}
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                    {showAllRows ? 'Begrens rader' : 'Vis alle rader'}
                                </Button>

                                <div className="flex items-center gap-1 ml-auto">
                                    <Button
                                        onClick={() => copyDrillDownData(showAllColumns, showAllRows)}
                                        variant="default"
                                        size="sm"
                                        className="flex items-center gap-2"
                                        disabled={copyStatus === 'copying'}
                                    >
                                        {copyStatus === 'copying' ? (
                                            <>
                                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
                                                Kopierer...
                                            </>
                                        ) : copyStatus === 'success' ? (
                                            <>
                                                <CheckCircle2 className="h-4 w-4" />
                                                Kopiert!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-4 w-4" />
                                                Kopier data
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        onClick={() => copyDrillDownData(true, true)}
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center gap-2"
                                        disabled={copyStatus === 'copying'}
                                    >
                                        <Copy className="h-4 w-4" />
                                        Alt
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg overflow-hidden">
                                <div className="overflow-x-auto max-h-96">
                                    <table className="w-full border-collapse text-sm">
                                        <thead className="sticky top-0 bg-muted">
                                            <tr>
                                                {(() => {
                                                    const allColumns = Object.keys(drillDownData.sourceRecords[0] || {});
                                                    const displayColumns = showAllColumns ? allColumns : allColumns.slice(0, 10);
                                                    return displayColumns.map(column => (
                                                        <th key={column} className="text-left p-3 border-b font-medium whitespace-nowrap">
                                                            {column}
                                                        </th>
                                                    ));
                                                })()}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const allColumns = Object.keys(drillDownData.sourceRecords[0] || {});
                                                const displayColumns = showAllColumns ? allColumns : allColumns.slice(0, 10);
                                                const displayRecords = showAllRows ? drillDownData.sourceRecords : drillDownData.sourceRecords.slice(0, 100);

                                                return displayRecords.map((record, index) => (
                                                    <tr key={index} className="border-b hover:bg-muted/50">
                                                        {displayColumns.map(column => (
                                                            <td key={column} className="p-3 border-r">
                                                                <div className="max-w-[150px] truncate" title={formatValue(record[column], column)}>
                                                                    {formatValue(record[column], column)}
                                                                </div>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ));
                                            })()}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Dynamic status message */}
                                {(() => {
                                    const allColumns = Object.keys(drillDownData.sourceRecords[0] || {}).length;
                                    const displayColumns = showAllColumns ? allColumns : Math.min(10, allColumns);
                                    const displayRecords = showAllRows ? drillDownData.sourceRecords.length : Math.min(100, drillDownData.sourceRecords.length);

                                    const hasHiddenData = !showAllColumns || !showAllRows;

                                    if (hasHiddenData) {
                                        return (
                                            <div className="p-3 text-center text-muted-foreground bg-muted/30 border-t">
                                                Viser {displayRecords} av {drillDownData.sourceRecords.length} rader
                                                og {displayColumns} av {allColumns} kolonner.
                                                {!showAllRows && drillDownData.sourceRecords.length > 100 && (
                                                    <span className="block mt-1 text-xs">
                                                        Klikk "Vis alle rader" for å se {drillDownData.sourceRecords.length - 100} flere rader.
                                                    </span>
                                                )}
                                                {!showAllColumns && allColumns > 10 && (
                                                    <span className="block mt-1 text-xs">
                                                        Klikk "Vis alle kolonner" for å se {allColumns - 10} flere kolonner.
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    }

                                    return null;
                                })()}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DrilldownModal;
