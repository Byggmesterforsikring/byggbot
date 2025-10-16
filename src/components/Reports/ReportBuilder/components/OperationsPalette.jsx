import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import {
    Filter,
    Group,
    Calculator,
    SortAsc,
    GitBranch,
    Settings
} from 'lucide-react';

const OperationsPalette = ({ onOperationDrag }) => {
    const operations = [
        {
            id: 'filter',
            name: 'Filtrer',
            description: 'Filtrer data basert på betingelser',
            icon: Filter,
            color: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100',
            examples: ['Status = "Åpen"', 'Utbetalt > 10000', 'Dato innen siste måned']
        },
        {
            id: 'groupBy',
            name: 'Gruppér',
            description: 'Gruppér data og beregn aggregeringer',
            icon: Group,
            color: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
            examples: ['Gruppér etter Saksbehandler', 'Summer utbetalinger', 'Tell antall saker']
        },
        {
            id: 'calculate',
            name: 'Beregn',
            description: 'Lag nye felt med beregninger',
            icon: Calculator,
            color: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100',
            examples: ['Utbetalt / Antall', 'Hvis > 50000 så "Stor"', 'Dager mellom datoer']
        },
        {
            id: 'sort',
            name: 'Sortér',
            description: 'Sortér resultater',
            icon: SortAsc,
            color: 'text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100',
            examples: ['Høyest utbetaling først', 'Alfabetisk på navn', 'Nyeste dato først']
        },
        {
            id: 'conditional',
            name: 'Betinget',
            description: 'Lag felt basert på betingelser',
            icon: GitBranch,
            color: 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
            examples: ['Hvis/Ellers logikk', 'Kategorisering', 'Flagging av data']
        }
    ];

    const handleDragStart = (e, operation) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'operation',
            operation: {
                type: operation.id,
                title: operation.name,
                icon: operation.icon,
                color: operation.color,
                config: {}
            }
        }));

        if (onOperationDrag) {
            onOperationDrag(operation);
        }
    };

    return (
        <div className="w-80 bg-background border-r border-border overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Operasjoner
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Dra operasjoner til pipeline
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {operations.map(operation => {
                    const OperationIcon = operation.icon;

                    return (
                        <div
                            key={operation.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, operation)}
                            className={`
                                p-4 rounded-lg border cursor-grab active:cursor-grabbing
                                transition-colors duration-200 ${operation.color}
                            `}
                        >
                            <div className="flex items-start gap-3 mb-3">
                                <OperationIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-medium text-sm mb-1">{operation.name}</h3>
                                    <p className="text-xs opacity-75 leading-relaxed">
                                        {operation.description}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="text-xs font-medium opacity-75">Eksempler:</div>
                                {operation.examples.map((example, idx) => (
                                    <div key={idx} className="text-xs opacity-60 truncate">
                                        • {example}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Help text */}
            <div className="p-4 bg-muted/50 border-t border-border">
                <p className="text-xs text-muted-foreground">
                    💡 Kombiner operasjoner for å lage kraftige rapporter
                </p>
            </div>
        </div>
    );
};

export default OperationsPalette;