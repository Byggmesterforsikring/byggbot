import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../ui/card';
import { Badge } from '../../../../../ui/badge';
import { Button } from '../../../../../ui/button';
import { Eye } from 'lucide-react';
import { formatValue } from '../../utils/formatters';

export default function TableView({
    data,
    dataB,
    hasCompare,
    periodLabels,
    onDrillDown,
}) {
    const filteredData = data || [];
    const columns = filteredData.length > 0 ? Object.keys(filteredData[0]) : [];
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Rapport Data
                    {hasCompare && (
                        <Badge variant="secondary" className="ml-2">Sammenligning</Badge>
                    )}
                    <Badge variant="outline">{filteredData.length} rader</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {hasCompare && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">Periode A {periodLabels?.a ? `(${periodLabels.a})` : ''}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-muted-foreground mb-2">{filteredData.length} rader</div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="border-b">
                                                    {Object.keys(filteredData[0] || {}).map((c) => (
                                                        <th key={c} className="text-left p-2 text-xs bg-muted/50">{c}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredData.slice(0, 50).map((row, idx) => (
                                                    <tr key={idx} className="border-b">
                                                        {Object.keys(filteredData[0] || {}).map((c) => (
                                                            <td key={c} className="p-2 text-xs">{formatValue(row[c], c)}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">Periode B {periodLabels?.b ? `(${periodLabels.b})` : ''}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-muted-foreground mb-2">{(dataB || []).length} rader</div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="border-b">
                                                    {Object.keys((dataB || [])[0] || {}).map((c) => (
                                                        <th key={c} className="text-left p-2 text-xs bg-muted/50">{c}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(dataB || []).slice(0, 50).map((row, idx) => (
                                                    <tr key={idx} className="border-b">
                                                        {Object.keys((dataB || [])[0] || {}).map((c) => (
                                                            <td key={c} className="p-2 text-xs">{formatValue(row[c], c)}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {!hasCompare && (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-3 font-medium text-sm bg-muted/50 w-8"></th>
                                        {columns.map(column => (
                                            <th key={column} className="text-left p-3 font-medium text-sm bg-muted/50 min-w-0">
                                                <div className="truncate max-w-[200px]" title={column}>{column}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.slice(0, 100).map((row, index) => (
                                        <tr key={index} className="border-b hover:bg-muted/50">
                                            <td className="p-3 text-sm">
                                                {onDrillDown && (
                                                    <Button onClick={() => onDrillDown(row)} variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                        <Eye className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </td>
                                            {columns.map(column => (
                                                <td key={column} className="p-3 text-sm min-w-0">
                                                    <div className="truncate max-w-[200px]" title={formatValue(row[column], column)}>
                                                        {formatValue(row[column], column)}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}


