import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import {
    Database,
    Hash,
    Calendar,
    DollarSign,
    Tag,
    Type,
    BarChart3,
    Users,
    Clock
} from 'lucide-react';

const FieldsPalette = ({ schema, onFieldDrag }) => {
    if (!schema || !schema.fields) {
        return null;
    }

    // Get icon for field category
    const getFieldIcon = (field) => {
        switch (field.category) {
            case 'currency': return DollarSign;
            case 'date': return Calendar;
            case 'category': return Tag;
            case 'id': return Hash;
            default: return Type;
        }
    };

    // Get color scheme for field category
    const getFieldColors = (field) => {
        switch (field.category) {
            case 'currency':
                return 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100';
            case 'date':
                return 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100';
            case 'category':
                return 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100';
            case 'id':
                return 'text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100';
            default:
                return 'text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100';
        }
    };

    // Get badge text for field capabilities
    const getFieldBadges = (field) => {
        const badges = [];
        if (field.isGroupable) badges.push({ text: 'Grupper', color: 'bg-blue-100 text-blue-800' });
        if (field.isAggregatable) badges.push({ text: 'Beregn', color: 'bg-green-100 text-green-800' });
        if (field.category === 'currency') badges.push({ text: 'Valuta', color: 'bg-emerald-100 text-emerald-800' });
        if (field.category === 'date') badges.push({ text: 'Dato', color: 'bg-sky-100 text-sky-800' });
        return badges;
    };

    // Group fields by category for better organization
    const groupedFields = schema.fields.reduce((groups, field) => {
        const key = field.isGroupable ? 'groupable' :
            field.isAggregatable ? 'aggregatable' :
                field.category === 'date' ? 'dates' : 'other';

        if (!groups[key]) groups[key] = [];
        groups[key].push(field);
        return groups;
    }, {});

    const sections = [
        {
            id: 'groupable',
            title: 'Gruppering',
            icon: Users,
            description: 'Felt for å gruppere data',
            fields: groupedFields.groupable || []
        },
        {
            id: 'aggregatable',
            title: 'Beregninger',
            icon: BarChart3,
            description: 'Tall som kan summeres/beregnes',
            fields: groupedFields.aggregatable || []
        },
        {
            id: 'dates',
            title: 'Datoer',
            icon: Clock,
            description: 'Tidspunkt og perioder',
            fields: groupedFields.dates || []
        },
        {
            id: 'other',
            title: 'Andre felt',
            icon: Database,
            description: 'Øvrige datafelter',
            fields: groupedFields.other || []
        }
    ];

    const handleDragStart = (e, field) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'field',
            field: field
        }));

        if (onFieldDrag) {
            onFieldDrag(field);
        }
    };

    return (
        <div className="w-80 shrink-0 bg-background border-r border-border overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Datafelter
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {schema.totalRecords} poster analysert
                </p>
            </div>

            <div className="flex-1 overflow-y-auto">
                {sections.map(section => {
                    if (section.fields.length === 0) return null;

                    const SectionIcon = section.icon;

                    return (
                        <div key={section.id} className="p-4 border-b border-border">
                            <div className="flex items-center gap-2 mb-3">
                                <SectionIcon className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-medium text-sm">{section.title}</h3>
                                <Badge variant="outline" className="text-xs">
                                    {section.fields.length}
                                </Badge>
                            </div>

                            <div className="space-y-2">
                                {section.fields.map(field => {
                                    const FieldIcon = getFieldIcon(field);
                                    const colors = getFieldColors(field);
                                    const badges = getFieldBadges(field);

                                    return (
                                        <div
                                            key={field.name}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, field)}
                                            className={`
                                                p-3 rounded-lg border cursor-grab active:cursor-grabbing
                                                transition-colors duration-200 ${colors}
                                            `}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <FieldIcon className="h-4 w-4 flex-shrink-0" />
                                                    <span className="font-medium text-sm truncate">
                                                        {field.displayName}
                                                    </span>
                                                </div>
                                            </div>

                                            {badges.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {badges.map((badge, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}
                                                        >
                                                            {badge.text}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>{field.uniqueCount} unike verdier</span>
                                                {field.nullPercentage > 0 && (
                                                    <span>{field.nullPercentage.toFixed(1)}% tomme</span>
                                                )}
                                            </div>

                                            {/* Show sample values for categories */}
                                            {field.category === 'category' && field.sampleValues.length > 0 && (
                                                <div className="mt-2 text-xs text-muted-foreground">
                                                    <div className="truncate">
                                                        Eks: {field.sampleValues.slice(0, 3).join(', ')}
                                                        {field.sampleValues.length > 3 && '...'}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Help text */}
            <div className="p-4 bg-muted/50 border-t border-border">
                <p className="text-xs text-muted-foreground">
                    💡 Dra felt til arbeidsområdet for å bygge rapporten din
                </p>
            </div>
        </div>
    );
};

export default FieldsPalette;