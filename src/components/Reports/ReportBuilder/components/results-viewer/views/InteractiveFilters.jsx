import React from 'react';
import { Button } from '../../../../../ui/button';
import { Badge } from '../../../../../ui/badge';
import { Filter, FilterX, X } from 'lucide-react';

export default function InteractiveFilters({
    visible,
    filterOptions,
    activeFilters,
    onToggleVisible,
    onUpdateFilter,
    onClearFilter,
    onClearAll,
    filteredCount,
    totalCount,
}) {
    if (!visible || Object.keys(filterOptions || {}).length === 0) return null;
    return (
        <div className="flex-shrink-0 p-4 bg-background border-b border-border">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Interaktive filtre
                    </h3>
                    {Object.keys(activeFilters || {}).length > 0 && (
                        <Button
                            onClick={onClearAll}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                        >
                            <FilterX className="h-4 w-4 mr-1" />
                            Fjern alle
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Object.entries(filterOptions).map(([field, options]) => (
                        <div key={field} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground">
                                    {field}
                                </label>
                                {activeFilters[field] && (
                                    <Button
                                        onClick={() => onClearFilter(field)}
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>

                            <div className="border rounded-md p-2 bg-muted/20 max-h-32 overflow-y-auto">
                                <div className="space-y-1">
                                    {options.map(value => (
                                        <label key={value} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1 rounded">
                                            <input
                                                type="checkbox"
                                                checked={activeFilters[field]?.includes(value) || false}
                                                onChange={(e) => {
                                                    const currentValues = activeFilters[field] || [];
                                                    const newValues = e.target.checked
                                                        ? [...currentValues, value]
                                                        : currentValues.filter(v => v !== value);
                                                    onUpdateFilter(field, newValues);
                                                }}
                                                className="rounded"
                                            />
                                            <span className="truncate flex-1" title={String(value)}>
                                                {String(value)}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {activeFilters[field] && (
                                <div className="text-xs text-muted-foreground">
                                    {activeFilters[field].length} av {options.length} valgt
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                        Viser {filteredCount} av {totalCount} poster
                    </div>
                    {filteredCount !== totalCount && (
                        <Badge variant="outline" className="text-xs">
                            {((filteredCount / totalCount) * 100).toFixed(0)}% av totalt
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
}


