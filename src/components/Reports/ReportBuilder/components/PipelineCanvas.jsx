import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '../../../ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Input } from '../../../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../../ui/dialog';
import {
    ArrowRight,
    Database,
    Filter,
    Group,
    Calculator,
    SortAsc,
    BarChart3,
    Play,
    Trash2,
    Plus,
    Settings,
    Calendar,
    Tag,
    DollarSign,
    Hash,
    Type,
    Save,
    FolderOpen,
    FileText,
    Check,
    Pencil,
    AlertTriangle
} from 'lucide-react';
import { PipelineProcessor } from './PipelineProcessor';
import { useToast } from './ui/toast-context';

const PipelineCanvas = ({ schema, rawData, rawDataCompare, compareMode, onExecutePipeline, operations: externalOperations, onOperationsChange, reportType, dateRange, onLoadTemplate }) => {
    const { toast } = useToast();
    const [operations, setOperations] = useState(externalOperations || []);
    const [draggedOver, setDraggedOver] = useState(false);
    const [addPopoverOpen, setAddPopoverOpen] = useState(false);
    const [quickAddMode, setQuickAddMode] = useState(null); // 'groupBy' | 'trend' | 'sum' | 'filter' | 'sort'
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [loadDialogOpen, setLoadDialogOpen] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [editingTemplateId, setEditingTemplateId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [aggregationFunction, setAggregationFunction] = useState('SUM');
    const [aliasEditOpen, setAliasEditOpen] = useState({}); // key: `${opId}-${idx}` -> bool
    const [previewExpanded, setPreviewExpanded] = useState(true);

    // Helpers for group field instances
    const createInstanceId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const createGroupFieldInstance = (field, opts = {}) => {
        return {
            instanceId: createInstanceId(),
            name: field.name,
            displayName: field.displayName,
            timeGranularity: opts.timeGranularity,
            alias: opts.alias || (opts.timeGranularity ? `${field.displayName} (${opts.timeGranularity})` : field.displayName),
        };
    };

    // Sync internal state when parent-provided operations change (e.g., when loading a template)
    useEffect(() => {
        setOperations(externalOperations || []);
    }, [externalOperations]);

    const templatesKey = 'report_builder_templates_v1';
    const refreshTemplates = () => {
        try {
            const list = JSON.parse(localStorage.getItem(templatesKey) || '[]');
            setTemplates(Array.isArray(list) ? list : []);
        } catch {
            setTemplates([]);
        }
    };

    useEffect(() => {
        if (loadDialogOpen) {
            refreshTemplates();
        } else {
            // reset editing state when dialog closes
            setEditingTemplateId(null);
            setEditingName('');
        }
    }, [loadDialogOpen]);

    // Handle drop of fields and operations
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDraggedOver(false);

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));

            if (data.type === 'field') {
                // When a field is dropped, suggest operations based on field type
                suggestOperationsForField(data.field);
            } else if (data.type === 'operation') {
                // Add operation to pipeline
                addOperation(data.operation);
            }
        } catch (error) {
            console.error('Invalid drop data:', error);
        }
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDraggedOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setDraggedOver(false);
    }, []);

    // Suggest operations when a field is dropped
    const suggestOperationsForField = (field) => {
        console.log('🎯 suggestOperationsForField called with:', field);
        console.log('📋 Current operations in pipeline:', operations);
        console.log('📊 Operations count:', operations.length);

        const suggestions = [];

        if (field.isGroupable) {
            // Check if there's already a groupBy operation to extend
            const existingGroupBy = operations.find(op => op.type === 'groupBy' && op.config.groupByFields && op.config.groupByFields.length > 0);

            console.log(`🎯 GROUPABLE FIELD: ${field.name}`);
            console.log(`🔍 Looking for existing groupBy in ${operations.length} operations`);
            console.log(`📋 Operations:`, operations.map(op => ({ id: op.id, title: op.title, type: op.type })));

            if (existingGroupBy) {
                // Add field to existing groupBy (multi-field grouping for cross-tabulation)
                console.log('🔗 Found existing groupBy, adding field for cross-tabulation:', existingGroupBy);

                const updatedOp = {
                    ...existingGroupBy,
                    title: `${existingGroupBy.title} × ${field.displayName}`,
                    config: {
                        ...existingGroupBy.config,
                        groupByFields: [
                            ...existingGroupBy.config.groupByFields,
                            createGroupFieldInstance(field)
                        ]
                    }
                };

                console.log('🔄 Updated groupBy with additional field:', updatedOp.config);

                setOperations(prevOps => {
                    const newOps = prevOps.map(op =>
                        op.id === existingGroupBy.id ? updatedOp : op
                    );
                    if (onOperationsChange) setTimeout(() => onOperationsChange(newOps), 0);
                    console.log('✅ Multi-field groupBy updated:', newOps.length, 'operations');
                    console.log('✅ New operation title:', updatedOp.title);
                    return newOps;
                });

                console.log('✅ Added field to existing groupBy - EARLY RETURN');
                return; // Exit early, don't add new operation
            } else {
                // No existing groupBy, create new one
                suggestions.push({
                    type: 'groupBy',
                    title: `Gruppér etter ${field.displayName}`,
                    config: {
                        groupByFields: [createGroupFieldInstance(field)],
                        aggregations: []
                    },
                    icon: Group,
                    color: 'bg-blue-50 border-blue-200 text-blue-700'
                });
            }
        }

        if (field.isAggregatable) {
            // Check if there's already a groupBy operation in the pipeline
            const existingGroupBy = operations.find(op => op.type === 'groupBy');

            console.log(`💰 Processing aggregatable field: ${field.name}`);
            console.log(`🔍 Looking for existing groupBy operations...`);
            console.log(`📋 Found existing groupBy:`, existingGroupBy ? existingGroupBy.title : 'None');

            if (existingGroupBy) {
                // Add aggregation to existing groupBy instead of creating new operation
                console.log('🔗 Found existing groupBy, adding aggregation to it:', existingGroupBy);
                console.log('🔧 Current operations before update:', operations.length);

                const updatedOp = {
                    ...existingGroupBy,
                    title: `${existingGroupBy.title} + Beregning ${field.displayName}`,
                    config: {
                        ...existingGroupBy.config,
                        aggregations: [
                            ...(existingGroupBy.config.aggregations || []),
                            (() => {
                                const { fn, aliasPrefix } = getDefaultAggregationForFieldName(field.name);
                                return { field: { name: field.name }, function: fn, alias: `${aliasPrefix}${field.displayName}` };
                            })()
                        ]
                    }
                };

                console.log('🔄 Updated operation config:', updatedOp.config);

                // Replace the existing operation using functional update to ensure React sees the change
                setOperations(prevOps => {
                    const newOps = prevOps.map(op =>
                        op.id === existingGroupBy.id ? updatedOp : op
                    );
                    if (onOperationsChange) setTimeout(() => onOperationsChange(newOps), 0);
                    console.log('✅ Operations updated:', newOps.length, 'operations');
                    console.log('✅ New operation titles:', newOps.map(op => op.title));
                    return newOps;
                });

                console.log('✅ Updated existing groupBy with new aggregation - EARLY RETURN');
                return; // Exit early, don't add new operation
            } else {
                // No existing groupBy, create a simple aggregation without grouping
                suggestions.push({
                    type: 'groupBy',
                    title: `Beregning ${field.displayName}`,
                    config: {
                        groupByFields: [],
                        aggregations: [
                            (() => {
                                const { fn, aliasPrefix } = getDefaultAggregationForFieldName(field.name);
                                return { field: { name: field.name }, function: fn, alias: `${aliasPrefix}${field.displayName}` };
                            })()
                        ]
                    },
                    icon: Calculator,
                    color: 'bg-green-50 border-green-200 text-green-700'
                });
            }
        }

        // Special handling for ID fields (CustomerNumber, PolicyNumber, etc)
        if (field.name.toLowerCase().includes('number') ||
            field.name.toLowerCase().includes('id') ||
            field.name.toLowerCase().includes('customer') ||
            field.name.toLowerCase().includes('kunde') ||
            field.name.toLowerCase().includes('policy')) {

            const existingGroupBy = operations.find(op => op.type === 'groupBy');

            if (existingGroupBy) {
                // Add DISTINCT count to existing groupBy
                const updatedOp = {
                    ...existingGroupBy,
                    title: `${existingGroupBy.title} + Tell unike ${field.displayName}`,
                    config: {
                        ...existingGroupBy.config,
                        aggregations: [
                            ...(existingGroupBy.config.aggregations || []),
                            { field: { name: field.name }, function: 'DISTINCT_COUNT', alias: `Unike${field.displayName}` }
                        ]
                    }
                };

                setOperations(prevOps => {
                    const newOps = prevOps.map(op =>
                        op.id === existingGroupBy.id ? updatedOp : op
                    );
                    if (onOperationsChange) setTimeout(() => onOperationsChange(newOps), 0);
                    return newOps;
                });
                return; // Exit early
            } else {
                // Create standalone DISTINCT count
                suggestions.push({
                    type: 'groupBy',
                    title: `Tell unike ${field.displayName}`,
                    config: {
                        groupByFields: [],
                        aggregations: [
                            { field: { name: field.name }, function: 'DISTINCT_COUNT', alias: `Unike${field.displayName}` }
                        ]
                    },
                    icon: Database,
                    color: 'bg-orange-50 border-orange-200 text-orange-700'
                });
            }
        }

        // Handle DATE fields - PRIORITIZE GROUPING OVER FILTERING for better insights
        if (field.category === 'date') {
            const existingGroupBy = operations.find(op => op.type === 'groupBy');

            if (existingGroupBy) {
                // Add date grouping to existing groupBy for trend analysis
                console.log('🗓️ Adding date dimension to existing groupBy for timeline analysis');

                const updatedOp = {
                    ...existingGroupBy,
                    title: `${existingGroupBy.title} × ${field.displayName} (månedlig)`,
                    config: {
                        ...existingGroupBy.config,
                        groupByFields: [
                            ...existingGroupBy.config.groupByFields,
                            createGroupFieldInstance(field, { timeGranularity: 'month' })
                        ]
                    }
                };

                setOperations(prevOps => {
                    const newOps = prevOps.map(op =>
                        op.id === existingGroupBy.id ? updatedOp : op
                    );
                    if (onOperationsChange) setTimeout(() => onOperationsChange(newOps), 0);
                    return newOps;
                });
                return; // Exit early
            } else {
                // Create new time-based grouping - DEFAULT to monthly analysis
                suggestions.push({
                    type: 'groupBy',
                    title: `Trend over tid (${field.displayName})`,
                    config: {
                        groupByFields: [createGroupFieldInstance(field, { timeGranularity: 'month' })],
                        aggregations: []
                    },
                    icon: Calendar,
                    color: 'bg-blue-50 border-blue-200 text-blue-700'
                });
            }
        }

        // Handle CATEGORY fields
        if (field.category === 'category') {
            suggestions.push({
                type: 'filter',
                title: `Filtrer ${field.displayName}`,
                config: {
                    field: { name: field.name, displayName: field.displayName },
                    operator: 'equals',
                    value: '' // User needs to set this
                },
                icon: Filter,
                color: 'bg-purple-50 border-purple-200 text-purple-700'
            });
        }

        // Handle TEXT fields (general fallback)
        if ((field.category === 'text' || field.category === 'id') && !field.isAggregatable) {
            // "Andre felt" (tekst/id) skal legges til i eksisterende groupBy om mulig
            const existingGroupBy = operations.find(op => op.type === 'groupBy' && op.config.groupByFields && op.config.groupByFields.length > 0);
            if (existingGroupBy) {
                const updatedOp = {
                    ...existingGroupBy,
                    title: `${existingGroupBy.title} × ${field.displayName}`,
                    config: {
                        ...existingGroupBy.config,
                        groupByFields: [
                            ...existingGroupBy.config.groupByFields,
                            createGroupFieldInstance(field)
                        ]
                    }
                };

                setOperations(prevOps => {
                    const next = prevOps.map(op => op.id === existingGroupBy.id ? updatedOp : op);
                    if (onOperationsChange) setTimeout(() => onOperationsChange(next), 0);
                    return next;
                });
                return;
            }

            // Hvis ingen eksisterende groupBy, opprett en ny
            suggestions.push({
                type: 'groupBy',
                title: `Gruppér etter ${field.displayName}`,
                config: {
                    groupByFields: [{ name: field.name, displayName: field.displayName }],
                    aggregations: []
                },
                icon: Group,
                color: 'bg-gray-50 border-gray-200 text-gray-700'
            });
        }

        // Show suggestion dialog or add first suggestion automatically
        if (suggestions.length > 0) {
            addOperation(suggestions[0]);
        } else {
            // Fallback for fields without specific handlers
            console.log('⚠️ No suggestions found for field:', field);
            console.log('⚠️ Field properties:', {
                category: field.category,
                isGroupable: field.isGroupable,
                isAggregatable: field.isAggregatable,
                type: field.type
            });

            // Add a generic filter as fallback
            addOperation({
                type: 'filter',
                title: `Filtrer ${field.displayName}`,
                config: {
                    field: { name: field.name, displayName: field.displayName },
                    operator: 'equals',
                    value: ''
                },
                icon: Filter,
                color: 'bg-slate-50 border-slate-200 text-slate-700'
            });
        }
    };

    const addOperation = (operation) => {
        const newOperation = {
            id: Date.now().toString(),
            ...operation,
            timestamp: Date.now()
        };

        setOperations(prevOps => {
            const updatedOps = [...prevOps, newOperation];
            if (onOperationsChange) setTimeout(() => onOperationsChange(updatedOps), 0);

            // 🔧 POST-ADD SMART COMBINING: Check if we can combine operations after adding
            console.log('🔧 POST-ADD: Checking for smart combining opportunities...');
            console.log('📋 Operations after add:', updatedOps.map(op => ({ id: op.id, title: op.title, type: op.type })));

            // If we just added a groupBy operation, check if we can combine with existing groupBy
            if (newOperation.type === 'groupBy' && newOperation.config.groupByFields && newOperation.config.groupByFields.length > 0) {
                const otherGroupBy = updatedOps.find(op =>
                    op.type === 'groupBy' &&
                    op.id !== newOperation.id &&
                    op.config.groupByFields &&
                    op.config.groupByFields.length > 0
                );

                if (otherGroupBy) {
                    console.log('🔗 POST-ADD: Found existing groupBy to combine with:', otherGroupBy.title);

                    // Combine the groupBy operations
                    const combinedOp = {
                        ...otherGroupBy,
                        title: `${otherGroupBy.title} × ${newOperation.config.groupByFields[0].displayName}`,
                        config: {
                            ...otherGroupBy.config,
                            groupByFields: [
                                ...otherGroupBy.config.groupByFields,
                                ...newOperation.config.groupByFields
                            ]
                        }
                    };

                    console.log('✅ POST-ADD: Combined operations into:', combinedOp.title);

                    // Return array with combined operation, removing both separate ones
                    const finalOps = updatedOps
                        .filter(op => op.id !== otherGroupBy.id && op.id !== newOperation.id)
                        .concat([combinedOp]);
                    if (onOperationsChange) setTimeout(() => onOperationsChange(finalOps), 0);
                    return finalOps;
                }
            }

            // If we just added an aggregation-only operation (pure aggregation), combine with existing groupBy
            if (newOperation.type === 'groupBy' &&
                (!newOperation.config.groupByFields || newOperation.config.groupByFields.length === 0) &&
                newOperation.config.aggregations && newOperation.config.aggregations.length > 0) {

                const existingGroupBy = updatedOps.find(op =>
                    op.type === 'groupBy' &&
                    op.id !== newOperation.id &&
                    op.config.groupByFields &&
                    op.config.groupByFields.length > 0
                );

                if (existingGroupBy) {
                    console.log('🔗 POST-ADD: Found existing groupBy to add aggregation to:', existingGroupBy.title);

                    // Add aggregation to existing groupBy
                    const combinedOp = {
                        ...existingGroupBy,
                        title: `${existingGroupBy.title} + ${newOperation.title}`,
                        config: {
                            ...existingGroupBy.config,
                            aggregations: [
                                ...(existingGroupBy.config.aggregations || []),
                                ...newOperation.config.aggregations
                            ]
                        }
                    };

                    console.log('✅ POST-ADD: Added aggregation to groupBy:', combinedOp.title);

                    // Return array with combined operation, removing both separate ones
                    const finalOps = updatedOps
                        .filter(op => op.id !== existingGroupBy.id && op.id !== newOperation.id)
                        .concat([combinedOp]);
                    if (onOperationsChange) setTimeout(() => onOperationsChange(finalOps), 0);
                    return finalOps;
                }
            }

            if (onOperationsChange) setTimeout(() => onOperationsChange(updatedOps), 0);
            return updatedOps;
        });
    };

    const removeOperation = (operationId) => {
        setOperations(prev => {
            const next = prev.filter(op => op.id !== operationId);
            if (onOperationsChange) setTimeout(() => onOperationsChange(next), 0);
            return next;
        });
    };

    const executePipeline = () => {
        if (operations.length === 0) {
            alert('Legg til minst én operasjon før du kjører pipeline');
            return;
        }

        console.log('🚀 ============ PIPELINE EXECUTION START ============');
        console.log('🚀 Executing pipeline with', operations.length, 'operations');
        console.log('🚀 Operations to execute:', operations);
        console.log('🚀 Raw data available:', rawData ? rawData.length : 'NONE', 'records');
        console.log('🚀 Sample raw data:', rawData?.[0]);

        try {
            const processorA = new PipelineProcessor(rawData);
            console.log('🔄 PipelineProcessor A created, executing...');
            const resultA = processorA.execute(operations);

            let packagedResult = resultA;

            if (compareMode && Array.isArray(rawDataCompare)) {
                const processorB = new PipelineProcessor(rawDataCompare);
                console.log('🔄 PipelineProcessor B created, executing...');
                const resultB = processorB.execute(operations);
                packagedResult = { primary: resultA, compare: resultB };
            }

            console.log('🔄 Pipeline execution complete');

            const success = compareMode ? (packagedResult.primary?.success && packagedResult.compare?.success) : resultA.success;

            if (success) {
                console.log('✅ Pipeline executed successfully!');
                if (onExecutePipeline) {
                    console.log('📤 Sending result(s) to parent component...');
                    onExecutePipeline(packagedResult);
                } else {
                    console.warn('⚠️ No onExecutePipeline callback provided');
                }
            } else {
                const errMsg = compareMode ? (packagedResult.primary?.error || packagedResult.compare?.error || 'Ukjent feil') : (resultA.error || 'Ukjent feil');
                console.error('❌ Pipeline execution failed:', errMsg);
                toast.error('Pipeline kjøring feilet: ' + errMsg);
            }
        } catch (error) {
            console.error('❌ Pipeline execution error:', error);
            console.error('❌ Error stack:', error.stack);
            toast.error('Pipeline kjøring feil: ' + error.message);
        }

        console.log('🚀 ============ PIPELINE EXECUTION END ============');
    };

    // Quick add helpers for "Legg til" knapp
    const quickAddGroupBy = (field) => {
        if (!field) return;
        addOperation({
            type: 'groupBy',
            title: `Gruppér etter ${field.displayName}`,
            config: {
                groupByFields: [createGroupFieldInstance(field)],
                aggregations: [{ field: { name: '_any' }, function: 'COUNT', alias: 'Antall' }]
            },
            icon: Group,
            color: 'bg-blue-50 border-blue-200 text-blue-700'
        });
    };

    const quickAddTrend = (field) => {
        if (!field) return;
        addOperation({
            type: 'groupBy',
            title: `Trend over tid (${field.displayName})`,
            config: {
                groupByFields: [{ name: field.name, displayName: field.displayName, timeGranularity: 'month' }],
                aggregations: [{ field: { name: '_any' }, function: 'COUNT', alias: 'Antall' }]
            },
            icon: Calendar,
            color: 'bg-blue-50 border-blue-200 text-blue-700'
        });
    };

    const quickAddSum = (field) => {
        if (!field) return;
        const fn = aggregationFunction || 'SUM';
        const defaultAliasMap = {
            SUM: `Sum${field.displayName}`,
            COUNT: 'Antall',
            DISTINCT_COUNT: `Unike${field.displayName}`,
            AVG: `Snitt${field.displayName}`,
            MIN: `Min${field.displayName}`,
            MAX: `Max${field.displayName}`,
            MEDIAN: `Median${field.displayName}`,
            COUNT_TRUE: `AndelTrue${field.displayName}`,
            COUNT_FALSE: `AndelFalse${field.displayName}`,
            PERCENT_TRUE: `AndelTrue${field.displayName}`,
            PERCENT_FALSE: `AndelFalse${field.displayName}`,
            ANY: `Any${field.displayName}`,
        };
        addOperation({
            type: 'groupBy',
            title: `${fn === 'SUM' ? 'Summer' : fn === 'COUNT' ? 'Tell' : fn === 'DISTINCT_COUNT' ? 'Tell unike' : fn === 'AVG' ? 'Snitt' : fn === 'MIN' ? 'Min' : fn === 'MAX' ? 'Max' : fn === 'MEDIAN' ? 'Median' : (fn || '').includes('PERCENT') ? 'Andel' : 'Aggregér'} ${field.displayName}`,
            config: {
                groupByFields: [],
                aggregations: [
                    { field: { name: field.name }, function: fn, alias: defaultAliasMap[fn] || `Agg_${field.displayName}` }
                ]
            },
            icon: Calculator,
            color: 'bg-green-50 border-green-200 text-green-700'
        });
    };

    const quickAddFilter = (field) => {
        if (!field) return;
        addOperation({
            type: 'filter',
            title: `Filtrer ${field.displayName}`,
            config: {
                field: { name: field.name, displayName: field.displayName },
                operator: 'equals',
                value: ''
            },
            icon: Filter,
            color: 'bg-purple-50 border-purple-200 text-purple-700'
        });
    };

    const quickAddSort = (field) => {
        if (!field) return;
        addOperation({
            type: 'sort',
            title: `Sortér etter ${field.displayName}`,
            config: {
                field: { name: field.name, displayName: field.displayName, type: field.type },
                direction: 'DESC'
            },
            icon: SortAsc,
            color: 'bg-orange-50 border-orange-200 text-orange-700'
        });
    };

    const getEligibleFields = (mode) => {
        const fields = schema?.fields || [];
        switch (mode) {
            case 'groupBy':
                return fields.filter(f => f.isGroupable || f.category === 'category' || f.category === 'id' || f.category === 'text');
            case 'trend':
                return fields.filter(f => f.category === 'date');
            case 'sum':
                return fields.filter(f => f.isAggregatable || f.category === 'currency' || f.type === 'number');
            case 'filter':
                return fields.filter(f => f.category === 'category' || f.isGroupable || f.category === 'id');
            case 'sort': {
                // Om det finnes en groupBy, begrens sortering til utdata-felt (groupBy-felter + aggregater)
                const lastGroupBy = [...operations].reverse().find(op => op.type === 'groupBy');
                if (lastGroupBy) {
                    const groupFields = (lastGroupBy.config?.groupByFields || []).map(f => ({ ...f }));
                    const aggs = (lastGroupBy.config?.aggregations || []).map(a => ({ name: a.alias, displayName: a.alias, type: 'number', _isAggregation: true }));
                    return [...groupFields, ...aggs];
                }
                return fields.filter(f => f.isAggregatable || f.type === 'number' || f.category === 'currency' || f.category === 'date');
            }
            default:
                return fields;
        }
    };

    const handleChooseField = (field) => {
        if (!quickAddMode || !field) return;
        // Defer state updates to avoid setState during render warnings
        setTimeout(() => {
            if (quickAddMode === 'groupBy') quickAddGroupBy(field);
            if (quickAddMode === 'trend') quickAddTrend(field);
            if (quickAddMode === 'sum') quickAddSum(field);
            if (quickAddMode === 'filter') quickAddFilter(field);
            if (quickAddMode === 'sort') quickAddSort(field);
            setAddPopoverOpen(false);
            setQuickAddMode(null);
        }, 0);
    };

    // Get icon for operation type
    const getOperationIcon = (type) => {
        switch (type) {
            case 'filter': return Filter;
            case 'groupBy': return Group;
            case 'aggregate': return Calculator;
            case 'sort': return SortAsc;
            default: return Database;
        }
    };

    // Helpers to update a specific operation and sync upwards
    const updateOperation = (operationId, updater) => {
        setOperations(prev => {
            const next = prev.map(op => (op.id === operationId ? (typeof updater === 'function' ? updater(op) : updater) : op));
            if (onOperationsChange) setTimeout(() => onOperationsChange(next), 0);
            return next;
        });
    };

    const removeGroupField = (operationId, instanceId) => {
        updateOperation(operationId, (op) => ({
            ...op,
            config: {
                ...op.config,
                groupByFields: (op.config?.groupByFields || []).filter(f => f.instanceId !== instanceId)
            },
            title: `${op.title}`
        }));
    };

    const changeDateGranularity = (operationId, instanceId, granularity) => {
        updateOperation(operationId, (op) => ({
            ...op,
            config: {
                ...op.config,
                groupByFields: (op.config?.groupByFields || []).map(f => f.instanceId === instanceId ? { ...f, timeGranularity: granularity } : f)
            }
        }));
    };

    const updateAggregation = (operationId, aggIndex, newFn, newAlias) => {
        updateOperation(operationId, (op) => {
            const aggs = (op.config?.aggregations || []).map((a, i) => {
                if (i !== aggIndex) return a;
                // Hvis aggregasjonen mangler funksjon eller ikke er gyldig for feltet, sett en gyldig default
                const allowed = getAllowedFunctionsForField(a.field?.name);
                const nextFn = newFn || (allowed.includes(a.function) ? a.function : getDefaultAggregationForFieldName(a.field?.name).fn);
                let nextAlias = a.alias;
                if (newAlias !== undefined) {
                    nextAlias = newAlias;
                } else if (newFn && a.field?.name) {
                    // auto alias when function changes
                    const base = a.field.name;
                    const fnPrefix = nextFn === 'SUM' ? 'Sum' :
                        nextFn === 'COUNT' ? 'Count' :
                            nextFn === 'DISTINCT_COUNT' ? 'Unike' :
                                nextFn === 'AVG' ? 'Avg' :
                                    nextFn === 'MIN' ? 'Min' :
                                        nextFn === 'MAX' ? 'Max' :
                                            nextFn === 'MEDIAN' ? 'Median' :
                                                nextFn === 'COUNT_TRUE' ? 'CountTrue' :
                                                    nextFn === 'COUNT_FALSE' ? 'CountFalse' :
                                                        nextFn === 'PERCENT_TRUE' ? 'AndelTrue' :
                                                            nextFn === 'PERCENT_FALSE' ? 'AndelFalse' :
                                                                nextFn === 'ANY' ? 'Any' : 'Agg';
                    nextAlias = `${fnPrefix}${base}`;
                }
                return { ...a, function: nextFn, alias: nextAlias };
            });
            return {
                ...op,
                config: { ...op.config, aggregations: aggs }
            };
        });
    };

    const removeAggregation = (operationId, aggIndex) => {
        updateOperation(operationId, (op) => ({
            ...op,
            config: {
                ...op.config,
                aggregations: (op.config?.aggregations || []).filter((_, i) => i !== aggIndex)
            }
        }));
    };

    const addAggregationToGroup = (operationId, field, fn) => {
        if (!field) return;
        const defaultAliasMap = {
            SUM: `Sum${field.displayName}`,
            COUNT: 'Antall',
            DISTINCT_COUNT: `Unike${field.displayName}`,
            AVG: `Snitt${field.displayName}`,
            MIN: `Min${field.displayName}`,
            MAX: `Max${field.displayName}`,
            MEDIAN: `Median${field.displayName}`,
        };
        updateOperation(operationId, (op) => ({
            ...op,
            config: {
                ...op.config,
                aggregations: [
                    ...(op.config?.aggregations || []),
                    { field: { name: field.name }, function: fn || 'SUM', alias: defaultAliasMap[fn || 'SUM'] }
                ]
            }
        }));
    };

    const updateAggregationField = (operationId, aggIndex, fieldName) => {
        updateOperation(operationId, (op) => {
            const aggs = (op.config?.aggregations || []).map((a, i) => {
                if (i !== aggIndex) return a;
                const allowed = getAllowedFunctionsForField(fieldName);
                const chosen = allowed.includes(a.function) ? a.function : getDefaultAggregationForFieldName(fieldName).fn;
                const fn = chosen;
                const fnPrefix = fn === 'SUM' ? 'Sum' : fn === 'COUNT' ? 'Count' : fn === 'DISTINCT_COUNT' ? 'Unike' : fn === 'AVG' ? 'Avg' : fn === 'MIN' ? 'Min' : fn === 'MAX' ? 'Max' : fn === 'MEDIAN' ? 'Median' : 'Agg';
                return { ...a, field: { name: fieldName }, function: fn, alias: `${fnPrefix}${fieldName}` };
            });
            return { ...op, config: { ...op.config, aggregations: aggs } };
        });
    };

    const updateAggregationAlias = (operationId, aggIndex, alias) => {
        updateAggregation(operationId, aggIndex, undefined, alias);
    };

    const getAggregatableFields = () => (schema?.fields || []).filter(f => f.isAggregatable || f.type === 'number' || f.category === 'currency' || f.category === 'text');
    const aggFunctionOptions = ['SUM', 'COUNT', 'DISTINCT_COUNT', 'AVG', 'MIN', 'MAX', 'MEDIAN', 'COUNT_TRUE', 'COUNT_FALSE', 'PERCENT_TRUE', 'PERCENT_FALSE', 'ANY'];

    const getFieldMeta = (fieldName) => (schema?.fields || []).find(f => f.name === fieldName);

    const isBooleanLikeField = (meta) => {
        if (!meta) return false;
        const nameBool = /^is[A-Z_]/i.test(meta.name);
        const samples = (meta.sampleValues || []).slice(0, 10);
        const numericBool = samples.length > 0 && samples.every(v => v === 0 || v === 1 || v === '0' || v === '1');
        const stringBool = samples.length > 0 && samples.every(v => String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'false');
        return nameBool || numericBool || stringBool || meta.category === 'boolean';
    };

    const getAllowedFunctionsForField = (fieldName) => {
        const meta = getFieldMeta(fieldName);
        if (!meta) return ['COUNT', 'DISTINCT_COUNT', 'ANY'];
        if (isBooleanLikeField(meta)) {
            return ['COUNT', 'COUNT_TRUE', 'COUNT_FALSE', 'PERCENT_TRUE', 'PERCENT_FALSE', 'DISTINCT_COUNT', 'ANY'];
        }
        if (meta.category === 'date') {
            return ['COUNT', 'DISTINCT_COUNT', 'ANY'];
        }
        if (meta.type === 'number' || meta.category === 'currency') {
            return ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX', 'MEDIAN', 'DISTINCT_COUNT', 'ANY'];
        }
        // text/category/id
        return ['COUNT', 'DISTINCT_COUNT', 'ANY'];
    };

    // Velg en gyldig standardfunksjon for et felt
    const getDefaultAggregationForFieldName = (fieldName) => {
        const meta = getFieldMeta(fieldName);
        if (!meta) return { fn: 'COUNT', aliasPrefix: 'Antall' };
        if (isBooleanLikeField(meta)) return { fn: 'COUNT_TRUE', aliasPrefix: 'CountTrue' };
        if (meta.type === 'number' || meta.category === 'currency') return { fn: 'SUM', aliasPrefix: 'Sum' };
        return { fn: 'COUNT', aliasPrefix: 'Antall' };
    };

    const getFieldIconFor = (field) => {
        if (!field) return Type;
        if (field._isAggregation) return Calculator;
        switch (field.category) {
            case 'currency': return DollarSign;
            case 'date': return Calendar;
            case 'category': return Tag;
            case 'id': return Hash;
            default:
                return field.type === 'number' ? Calculator : Type;
        }
    };

    // Live preview av de 5 første radene
    const preview = useMemo(() => {
        if (!rawData || operations.length === 0) return null;
        try {
            const processor = new PipelineProcessor(rawData);
            const result = processor.execute(operations);
            const rows = Array.isArray(result.data) ? result.data.slice(0, 5) : [];
            let compare = null;
            if (compareMode && Array.isArray(rawDataCompare)) {
                const processorB = new PipelineProcessor(rawDataCompare);
                const resultB = processorB.execute(operations);
                compare = { rows: Array.isArray(resultB.data) ? resultB.data.slice(0, 5) : [], total: resultB.data?.length || 0 };
            }
            return { rows, total: result.data?.length || 0, compare };
        } catch (e) {
            return null;
        }
    }, [rawData, rawDataCompare, compareMode, operations, aliasEditOpen]);

    return (
        <div className="flex-1 flex flex-col min-w-0">
            {/* Pipeline Header */}
            <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Rapport Pipeline
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Bygg din rapport ved å dra felt og operasjoner hit
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline">
                            {operations.length} operasjon{operations.length !== 1 ? 'er' : ''}
                        </Badge>
                        <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    <FolderOpen className="h-4 w-4" />
                                    Last mal
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <FolderOpen className="h-5 w-5" />
                                        Last lagret mal
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-2 max-h-80 overflow-y-auto mt-2">
                                    {templates.length === 0 ? (
                                        <div className="text-sm text-muted-foreground">Ingen maler lagret ennå.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {templates.map((t) => (
                                                <div
                                                    key={t.id}
                                                    className="flex items-center justify-between border rounded p-3 bg-background hover:bg-muted/50 transition-colors cursor-pointer"
                                                    onClick={() => {
                                                        if (onOperationsChange) setTimeout(() => onOperationsChange(t.operations || []), 0);
                                                        if (onLoadTemplate) onLoadTemplate(t);
                                                        setLoadDialogOpen(false);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="h-5 w-5 text-muted-foreground" />
                                                        <div>
                                                            {editingTemplateId === t.id ? (
                                                                <input
                                                                    className="text-sm border rounded px-2 py-1"
                                                                    value={editingName}
                                                                    onChange={(e) => setEditingName(e.target.value)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <div className="font-medium text-sm">{t.name}</div>
                                                            )}
                                                            <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString('nb-NO')}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                        {editingTemplateId === t.id ? (
                                                            <>
                                                                <Button size="icon" className="h-8 w-8" onClick={() => {
                                                                    const updated = templates.map(x => x.id === t.id ? { ...x, name: editingName || x.name } : x);
                                                                    localStorage.setItem(templatesKey, JSON.stringify(updated));
                                                                    refreshTemplates();
                                                                    setEditingTemplateId(null);
                                                                    setEditingName('');
                                                                }}>
                                                                    <Check className="h-4 w-4" />
                                                                </Button>
                                                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { setEditingTemplateId(null); setEditingName(''); }}>
                                                                    ✕
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { setEditingTemplateId(t.id); setEditingName(t.name); }}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => {
                                                            const updated = templates.filter(x => x.id !== t.id);
                                                            localStorage.setItem(templatesKey, JSON.stringify(updated));
                                                            refreshTemplates();
                                                        }}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    disabled={!operations || operations.length === 0}
                                    title={(!operations || operations.length === 0) ? 'Legg til minst én operasjon for å kunne lagre som mal' : 'Lagre som mal'}
                                >
                                    <Save className="h-4 w-4" />
                                    Lagre som mal
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Save className="h-5 w-5" />
                                        Lagre rapport-mal
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-2 mt-2">
                                    <input
                                        type="text"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="Navn på mal"
                                        className="w-full px-3 py-2 border rounded"
                                    />
                                    <div className="text-xs text-muted-foreground">Malen lagres lokalt i nettleseren din og kan lastes inn senere.</div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        onClick={() => {
                                            if (!operations || operations.length === 0) return;
                                            const key = 'report_builder_templates_v1';
                                            const existing = JSON.parse(localStorage.getItem(key) || '[]');
                                            existing.push({
                                                id: Date.now(),
                                                name: templateName || `Mal ${new Date().toLocaleString('nb-NO')}`,
                                                reportType: reportType || null,
                                                dateRange: dateRange || null,
                                                operations,
                                                createdAt: new Date().toISOString(),
                                            });
                                            localStorage.setItem(key, JSON.stringify(existing));
                                            setSaveDialogOpen(false);
                                            setTemplateName('');
                                        }}
                                        disabled={!operations || operations.length === 0}
                                    >
                                        <Save className="h-4 w-4 mr-1" /> Lagre
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button onClick={executePipeline} className="flex items-center gap-2" disabled={operations.length === 0}>
                            <Play className="h-4 w-4" />
                            Kjør pipeline
                        </Button>
                    </div>
                </div>
            </div>

            {/* Pipeline Canvas */}
            <div
                className={`
                    flex-1 p-6 overflow-y-auto overflow-x-hidden
                    ${draggedOver ? 'bg-blue-50/40' : 'bg-slate-50'}
                    transition-colors duration-200
                `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {operations.length === 0 ? (
                    // Empty state with Add button available
                    <div className="h-full flex items-center justify-center">
                        <Card className="w-full max-w-lg">
                            <CardContent className="p-8 text-center space-y-4">
                                <Database className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                                <h3 className="text-lg font-medium">Start å bygge din rapport</h3>
                                <p className="text-muted-foreground">Dra felt fra venstre – eller legg til en operasjon:</p>
                                <div className="flex justify-center">
                                    <Popover open={addPopoverOpen} onOpenChange={(open) => { setAddPopoverOpen(open); if (!open) setQuickAddMode(null); }}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="gap-2">
                                                <Plus className="h-4 w-4" />
                                                Legg til operasjon
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80" align="center">
                                            {!quickAddMode ? (
                                                <>
                                                    <div className="text-sm font-medium mb-2">Legg til operasjon</div>
                                                    <div className="space-y-1">
                                                        <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setQuickAddMode('groupBy')}>
                                                            <Group className="h-4 w-4" /> Gruppér etter felt
                                                        </Button>
                                                        <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setQuickAddMode('trend')}>
                                                            <Calendar className="h-4 w-4" /> Trend over tid (dato)
                                                        </Button>
                                                        <div className="border rounded p-2">
                                                            <div className="text-xs mb-2 opacity-70">Beregning</div>
                                                            <div className="flex flex-wrap gap-2 mb-2">
                                                                {['SUM', 'COUNT', 'DISTINCT_COUNT', 'AVG', 'MIN', 'MAX', 'MEDIAN', 'COUNT_TRUE', 'COUNT_FALSE', 'PERCENT_TRUE', 'PERCENT_FALSE', 'ANY'].map(fn => (
                                                                    <Button key={fn} size="sm" variant={aggregationFunction === fn ? 'default' : 'outline'} onClick={() => setAggregationFunction(fn)}>{fn}</Button>
                                                                ))}
                                                            </div>
                                                            <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setQuickAddMode('sum')}>
                                                                <Calculator className="h-4 w-4" /> Legg til beregning med valgt funksjon
                                                            </Button>
                                                        </div>
                                                        <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setQuickAddMode('filter')}>
                                                            <Filter className="h-4 w-4" /> Filtrer på felt
                                                        </Button>
                                                        <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setQuickAddMode('sort')}>
                                                            <SortAsc className="h-4 w-4" /> Sortér etter felt
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="text-sm font-medium">Velg felt</div>
                                                        <Button size="sm" variant="ghost" onClick={() => setQuickAddMode(null)}>Tilbake</Button>
                                                    </div>
                                                    <div className="max-h-64 overflow-y-auto">
                                                        {getEligibleFields(quickAddMode).length === 0 && (
                                                            <div className="text-xs text-muted-foreground">Ingen passende felt tilgjengelig</div>
                                                        )}
                                                        <div className="space-y-1">
                                                            {getEligibleFields(quickAddMode).map((f) => {
                                                                const Icon = getFieldIconFor(f);
                                                                return (
                                                                    <Button key={f.name} variant="ghost" className="w-full justify-start gap-2" onClick={() => handleChooseField(f)}>
                                                                        <Icon className="h-4 w-4" /> {f.displayName}
                                                                    </Button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    // Pipeline with operations
                    <div className="space-y-4">
                        {/* Drop zone visual */}
                        <div className={`rounded-md p-4 border-2 ${draggedOver ? 'border-primary ring-2 ring-primary/30 bg-white' : 'border-dashed border-slate-300 bg-white/70'}`}>
                            <div className="text-xs text-slate-500 mb-2">Dra felt hit for å bygge pipeline</div>
                            {/* Operations chain */}
                            <div className="flex items-center gap-4 flex-wrap">
                                {operations.map((operation, index) => {
                                    const OperationIcon = getOperationIcon(operation.type);

                                    return (
                                        <React.Fragment key={operation.id}>
                                            <Card className="min-w-0 bg-white border shadow-sm">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <OperationIcon className="h-4 w-4 flex-shrink-0" />
                                                            <span className="font-medium text-sm truncate text-slate-800">
                                                                {operation.title}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeOperation(operation.id)}
                                                            className="h-6 w-6 p-0 hover:bg-red-100"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>

                                                    {/* Operation details */}
                                                    <div className="mt-3 text-xs space-y-4">
                                                        {operation.type === 'groupBy' && (
                                                            <>
                                                                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">Grupper</div>
                                                                {operation.config?.groupByFields?.length > 0 && (
                                                                    <div className="flex flex-wrap gap-2 bg-primary/5 border border-primary/10 rounded-md p-2">
                                                                        {operation.config.groupByFields.map((f, idx) => {
                                                                            // Finn duplikater av samme felt med identisk granularitet (om dato)
                                                                            const duplicates = (operation.config.groupByFields || []).filter(other =>
                                                                                other.name === f.name && (other.timeGranularity || 'none') === (f.timeGranularity || 'none')
                                                                            );
                                                                            const isDuplicate = duplicates.length > 1;
                                                                            return (
                                                                                <div key={idx} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-primary/5 text-primary text-xs ${isDuplicate ? 'ring-2 ring-amber-300' : ''}`} title={isDuplicate ? 'Duplikat av samme felt/granularitet' : undefined}>
                                                                                    <span className="font-medium truncate" title={f.alias || f.displayName}>{f.alias || f.displayName}</span>
                                                                                    {typeof f.timeGranularity !== 'undefined' && (
                                                                                        <Popover>
                                                                                            <PopoverTrigger asChild>
                                                                                                <Button size="xs" variant="outline" className="h-7 rounded-full px-3">
                                                                                                    Tid: {f.timeGranularity}
                                                                                                </Button>
                                                                                            </PopoverTrigger>
                                                                                            <PopoverContent className="w-44 p-2" align="start">
                                                                                                {['day', 'month', 'quarter', 'year'].map(g => (
                                                                                                    <Button
                                                                                                        key={g}
                                                                                                        variant={f.timeGranularity === g ? 'default' : 'ghost'}
                                                                                                        size="sm"
                                                                                                        className="w-full justify-start gap-2"
                                                                                                        onClick={() => changeDateGranularity(operation.id, f.instanceId, g)}
                                                                                                    >
                                                                                                        {f.timeGranularity === g && <Check className="h-3 w-3" />} {g}
                                                                                                    </Button>
                                                                                                ))}
                                                                                                <div className="border-t my-2" />
                                                                                                <div className="text-xs text-slate-600 mb-1">Alias</div>
                                                                                                <Input
                                                                                                    defaultValue={f.alias || ''}
                                                                                                    className="h-8"
                                                                                                    onKeyDown={(e) => {
                                                                                                        if (e.key === 'Enter') {
                                                                                                            const alias = e.currentTarget.value;
                                                                                                            updateOperation(operation.id, (op) => ({
                                                                                                                ...op,
                                                                                                                config: {
                                                                                                                    ...op.config,
                                                                                                                    groupByFields: (op.config?.groupByFields || []).map(x => x.instanceId === f.instanceId ? { ...x, alias } : x)
                                                                                                                }
                                                                                                            }));
                                                                                                        }
                                                                                                    }}
                                                                                                    onBlur={(e) => {
                                                                                                        const alias = e.currentTarget.value;
                                                                                                        updateOperation(operation.id, (op) => ({
                                                                                                            ...op,
                                                                                                            config: {
                                                                                                                ...op.config,
                                                                                                                groupByFields: (op.config?.groupByFields || []).map(x => x.instanceId === f.instanceId ? { ...x, alias } : x)
                                                                                                            }
                                                                                                        }));
                                                                                                    }}
                                                                                                />
                                                                                            </PopoverContent>
                                                                                        </Popover>
                                                                                    )}
                                                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-primary/70 hover:text-primary" onClick={() => removeGroupField(operation.id, f.instanceId)}>
                                                                                        <Trash2 className="h-3 w-3" />
                                                                                    </Button>
                                                                                    {isDuplicate && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                                <div className="border-t my-3" />
                                                                <div className="space-y-2">
                                                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Beregninger</div>
                                                                    <div className="grid grid-cols-12 gap-2 text-[11px] text-slate-500">
                                                                        <div className="col-span-3">Funksjon</div>
                                                                        <div className="col-span-4">Felt</div>
                                                                        <div className="col-span-4">Alias</div>
                                                                        <div className="col-span-1" />
                                                                    </div>
                                                                    {(operation.config?.aggregations || []).map((a, idx) => {
                                                                        const key = `${operation.id}-${idx}`;
                                                                        const isOpen = !!aliasEditOpen[key];
                                                                        return (
                                                                            <div key={idx} className="grid grid-cols-12 gap-2 items-center rounded-md p-2 bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors">
                                                                                <div className="col-span-3">
                                                                                    <Select value={a.function} onValueChange={(val) => updateAggregation(operation.id, idx, val)}>
                                                                                        <SelectTrigger className="h-8 bg-white border-slate-300 focus:ring-2 focus:ring-primary/30 focus:border-primary">
                                                                                            <SelectValue />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {getAllowedFunctionsForField(a.field?.name).map(fn => (
                                                                                                <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                                <div className="col-span-4">
                                                                                    <Select value={a.field?.name} onValueChange={(val) => updateAggregationField(operation.id, idx, val)}>
                                                                                        <SelectTrigger className="h-8 bg-white border-slate-300 focus:ring-2 focus:ring-primary/30 focus:border-primary">
                                                                                            <SelectValue />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {getAggregatableFields().map(f => (
                                                                                                <SelectItem key={f.name} value={f.name}>{f.displayName}</SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                                <div className="col-span-4 flex items-center gap-2">
                                                                                    <span className="text-slate-700 truncate">{a.alias || '(auto)'}</span>
                                                                                    <Popover open={isOpen} onOpenChange={(o) => setAliasEditOpen(prev => ({ ...prev, [key]: o }))}>
                                                                                        <PopoverTrigger asChild>
                                                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary">
                                                                                                <Pencil className="h-3 w-3" />
                                                                                            </Button>
                                                                                        </PopoverTrigger>
                                                                                        <PopoverContent className="w-56" align="start">
                                                                                            <div className="space-y-2">
                                                                                                <div className="text-xs text-slate-600">Alias</div>
                                                                                                <Input
                                                                                                    defaultValue={a.alias || ''}
                                                                                                    className="h-8"
                                                                                                    onKeyDown={(e) => {
                                                                                                        if (e.key === 'Enter') {
                                                                                                            updateAggregationAlias(operation.id, idx, e.currentTarget.value);
                                                                                                            setAliasEditOpen(prev => ({ ...prev, [key]: false }));
                                                                                                        }
                                                                                                    }}
                                                                                                    onBlur={(e) => { updateAggregationAlias(operation.id, idx, e.currentTarget.value); }}
                                                                                                />
                                                                                                <div className="flex justify-end">
                                                                                                    <Button size="sm" onClick={() => setAliasEditOpen(prev => ({ ...prev, [key]: false }))}>Lukk</Button>
                                                                                                </div>
                                                                                            </div>
                                                                                        </PopoverContent>
                                                                                    </Popover>
                                                                                </div>
                                                                                <div className="col-span-1 text-right">
                                                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-primary/70 hover:text-primary" onClick={() => removeAggregation(operation.id, idx)}>
                                                                                        <Trash2 className="h-3 w-3" />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    <div>
                                                                        <Button size="sm" variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => addAggregationToGroup(operation.id, getAggregatableFields()[0], 'SUM')}>+ Legg til beregning</Button>
                                                                    </div>
                                                                </div>
                                                                <div className="border-t my-3" />
                                                                <div className="text-[11px] text-slate-500">Tips: Dra inn flere felt for å legge til flere grupper. Bruk “Legg til beregning” for flere kolonner.</div>
                                                            </>
                                                        )}

                                                        {operation.type === 'filter' && operation.config?.field && (
                                                            <div>Felt: {operation.config.field.displayName} · Operator: {operation.config.operator}</div>
                                                        )}

                                                        {operation.type === 'sort' && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="opacity-80">Retning:</span>
                                                                <Button size="sm" variant={operation.config?.direction === 'ASC' ? 'default' : 'outline'} onClick={() => setOperations(prev => { const next = prev.map(op => op.id === operation.id ? { ...op, config: { ...op.config, direction: 'ASC' } } : op); if (onOperationsChange) setTimeout(() => onOperationsChange(next), 0); return next; })}>ASC</Button>
                                                                <Button size="sm" variant={operation.config?.direction === 'DESC' ? 'default' : 'outline'} onClick={() => setOperations(prev => { const next = prev.map(op => op.id === operation.id ? { ...op, config: { ...op.config, direction: 'DESC' } } : op); if (onOperationsChange) setTimeout(() => onOperationsChange(next), 0); return next; })}>DESC</Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {index < operations.length - 1 && (
                                                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {/* Add operation button with quick actions */}
                                <Popover open={addPopoverOpen} onOpenChange={(open) => { setAddPopoverOpen(open); if (!open) setQuickAddMode(null); }}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="h-16 min-w-[4rem] border-dashed flex flex-col items-center gap-1 text-xs"
                                            title="Legg til operasjon"
                                        >
                                            <Plus className="h-4 w-4" />
                                            <span>Legg til</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80" align="start">
                                        {!quickAddMode ? (
                                            <>
                                                <div className="text-sm font-medium mb-2">Legg til operasjon</div>
                                                <div className="space-y-1">
                                                    <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setQuickAddMode('groupBy')}>
                                                        <Group className="h-4 w-4" /> Gruppér etter felt
                                                    </Button>
                                                    <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setQuickAddMode('trend')}>
                                                        <Calendar className="h-4 w-4" /> Trend over tid (dato)
                                                    </Button>
                                                    <div className="border rounded p-2">
                                                        <div className="text-xs mb-2 opacity-70">Beregning</div>
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {['SUM', 'COUNT', 'DISTINCT_COUNT', 'AVG', 'MIN', 'MAX', 'MEDIAN'].map(fn => (
                                                                <Button key={fn} size="sm" variant={aggregationFunction === fn ? 'default' : 'outline'} onClick={() => setAggregationFunction(fn)}>{fn}</Button>
                                                            ))}
                                                        </div>
                                                        <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setQuickAddMode('sum')}>
                                                            <Calculator className="h-4 w-4" /> Legg til beregning med valgt funksjon
                                                        </Button>
                                                    </div>
                                                    <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setQuickAddMode('filter')}>
                                                        <Filter className="h-4 w-4" /> Filtrer på felt
                                                    </Button>
                                                    <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setQuickAddMode('sort')}>
                                                        <SortAsc className="h-4 w-4" /> Sortér etter felt
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-sm font-medium">Velg felt</div>
                                                    <Button size="sm" variant="ghost" onClick={() => setQuickAddMode(null)}>Tilbake</Button>
                                                </div>
                                                <div className="max-h-64 overflow-y-auto">
                                                    {getEligibleFields(quickAddMode).length === 0 && (
                                                        <div className="text-xs text-muted-foreground">Ingen passende felt tilgjengelig</div>
                                                    )}
                                                    <div className="space-y-1">
                                                        {getEligibleFields(quickAddMode).map((f) => {
                                                            const Icon = getFieldIconFor(f);
                                                            return (
                                                                <Button key={f.name} variant="ghost" className="w-full justify-start gap-2" onClick={() => handleChooseField(f)}>
                                                                    <Icon className="h-4 w-4" /> {f.displayName}
                                                                </Button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {preview && (
                            <div className="mt-6">
                                <div className="text-sm text-muted-foreground mb-2">Forhåndsvisning (de 5 første radene) · {preview.total} rader totalt</div>
                                <div className="rounded-md border bg-white overflow-x-auto w-full max-w-full">
                                    <Table className="min-w-[800px] w-max">
                                        <TableHeader>
                                            <TableRow>
                                                {Object.keys(preview.rows[0] || {}).map((col) => (
                                                    <TableHead key={col}>{col}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {preview.rows.map((row, idx) => (
                                                <TableRow key={idx}>
                                                    {Object.keys(preview.rows[0] || {}).map((col) => {
                                                        const val = row[col];
                                                        const isPercent = typeof val === 'number' && (col.toLowerCase().includes('percent') || col.toLowerCase().includes('andel'));
                                                        return (
                                                            <TableCell key={col}>
                                                                {isPercent ? `${val.toFixed(2)} %` : String(val)}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};

export default PipelineCanvas;