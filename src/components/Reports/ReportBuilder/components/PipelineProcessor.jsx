// Pipeline execution engine for processing JSON data through operations
export class PipelineProcessor {
    constructor(rawData) {
        this.rawData = rawData || [];
        this.currentData = [...this.rawData];
        this.operations = [];
        this.results = [];
    }

    // Execute the full pipeline
    execute(operations) {
        this.operations = operations;
        this.currentData = [...this.rawData];
        this.results = [];

        console.log('🔄 Pipeline executing:', operations.length, 'operations on', this.currentData.length, 'records');

        try {
            // Process each operation in sequence
            for (let i = 0; i < operations.length; i++) {
                const operation = operations[i];
                console.log(`⚙️ Step ${i + 1}: ${operation.title}`);

                const beforeCount = this.currentData.length;
                const beforeSample = this.currentData[0];
                this.currentData = this.executeOperation(operation, this.currentData);
                const afterCount = this.currentData.length;
                const afterSample = this.currentData[0];

                console.log(`✅ Step ${i + 1} complete:`, beforeCount, '→', afterCount, 'records');

                // Store intermediate result
                this.results.push({
                    operation: operation,
                    data: [...this.currentData],
                    recordCount: afterCount
                });
            }

            console.log('🎉 Pipeline execution complete!');
            return {
                success: true,
                data: this.currentData,
                steps: this.results,
                totalRecords: this.currentData.length
            };

        } catch (error) {
            console.error('❌ Pipeline execution failed:', error);
            return {
                success: false,
                error: error.message,
                data: [],
                steps: this.results
            };
        }
    }

    // Execute a single operation
    executeOperation(operation, data) {

        switch (operation.type) {
            case 'filter':
                return this.executeFilter(operation, data);
            case 'groupBy':
                return this.executeGroupBy(operation, data);
            case 'aggregate':
                console.log('⚠️ "aggregate" type is deprecated - converting to groupBy');
                // Convert aggregate to groupBy for backwards compatibility
                return this.executeGroupBy(operation, data);
            case 'calculate':
                return this.executeCalculate(operation, data);
            case 'sort':
                return this.executeSort(operation, data);
            case 'conditional':
                return this.executeConditional(operation, data);
            default:
                console.error('❌ Unknown operation type:', operation.type);
                console.error('❌ Available types: filter, groupBy, calculate, sort, conditional');
                console.error('❌ Full operation:', operation);
                return data;
        }
    }

    // Filter operation
    executeFilter(operation, data) {
        const { field, operator, value } = operation.config || {};

        if (!field || !operator || value === undefined) {
            console.warn('Filter operation missing required config');
            return data;
        }

        return data.filter(record => {
            const recordValue = record[field.name];

            switch (operator) {
                case 'equals':
                    return recordValue === value;
                case 'not_equals':
                    return recordValue !== value;
                case 'contains':
                    return String(recordValue).toLowerCase().includes(String(value).toLowerCase());
                case 'greater_than':
                    return Number(recordValue) > Number(value);
                case 'less_than':
                    return Number(recordValue) < Number(value);
                case 'between':
                    return Number(recordValue) >= Number(value.min) && Number(recordValue) <= Number(value.max);
                case 'in':
                    return Array.isArray(value) ? value.includes(recordValue) : false;
                case 'is_empty':
                    return !recordValue || recordValue === '';
                case 'is_not_empty':
                    return recordValue && recordValue !== '';
                default:
                    return true;
            }
        });
    }

    // Group by operation with aggregations
    executeGroupBy(operation, data) {
        const { groupByFields, aggregations, sortBy } = operation.config || {};

        if (!groupByFields || !Array.isArray(groupByFields)) {
            console.error('❌ GroupBy operation missing groupByFields array!');
            console.error('❌ Received config:', operation.config);
            return data;
        }

        // Handle case where groupByFields is empty (pure aggregation)
        if (groupByFields.length === 0) {

            if (!aggregations || aggregations.length === 0) {
                console.warn('⚠️ No aggregations specified for pure aggregation operation');
                return data;
            }

            // Create single "ALL" group for aggregation
            const allGroup = {
                key: 'ALL',
                records: data
            };

            const result = [{
                GroupKey: 'Totalt'
            }];

            // Process aggregations manually for the single group
            aggregations.forEach(agg => {
                const { field, function: fn, alias } = agg;

                if (fn === 'COUNT') {
                    result[0][alias] = allGroup.records.length;
                } else if (fn === 'SUM') {
                    const values = allGroup.records
                        .map(r => {
                            const val = r[field.name];

                            let cleanVal = val;
                            if (typeof val === 'number') {
                                cleanVal = val;
                            } else if (typeof val === 'string') {
                                cleanVal = val.replace(/kr\s*/gi, '').replace(/\s/g, '').replace(/,/g, '.');
                            } else {
                                cleanVal = 0;
                            }

                            const numVal = Number(cleanVal);
                            const result = isNaN(numVal) ? 0 : numVal;
                            return result;
                        })
                        .filter(v => !isNaN(v) && v !== 0);



                    result[0][alias] = values.reduce((sum, val) => sum + val, 0);
                } else if (fn === 'AVG') {
                    const values = allGroup.records
                        .map(r => {
                            const val = r[field.name];
                            let cleanVal = val;
                            if (typeof val === 'string') {
                                cleanVal = val.replace(/kr\s*/gi, '').replace(/\s/g, '').replace(/,/g, '.');
                            }
                            const numVal = Number(cleanVal);
                            return isNaN(numVal) ? 0 : numVal;
                        })
                        .filter(v => !isNaN(v) && v !== 0);

                    result[0][alias] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
                } else if (fn === 'COUNT_TRUE') {
                    const cnt = allGroup.records.reduce((acc, r) => acc + ((r[field.name] === true || r[field.name] === 1 || r[field.name] === '1') ? 1 : 0), 0);
                    result[0][alias] = cnt;
                } else if (fn === 'COUNT_FALSE') {
                    const cntTrue = allGroup.records.reduce((acc, r) => acc + ((r[field.name] === true || r[field.name] === 1 || r[field.name] === '1') ? 1 : 0), 0);
                    result[0][alias] = allGroup.records.length - cntTrue;
                } else if (fn === 'PERCENT_TRUE') {
                    const cntTrue = allGroup.records.reduce((acc, r) => acc + ((r[field.name] === true || r[field.name] === 1 || r[field.name] === '1') ? 1 : 0), 0);
                    result[0][alias] = allGroup.records.length > 0 ? (cntTrue / allGroup.records.length) * 100 : 0;
                } else if (fn === 'PERCENT_FALSE') {
                    const cntTrue = allGroup.records.reduce((acc, r) => acc + ((r[field.name] === true || r[field.name] === 1 || r[field.name] === '1') ? 1 : 0), 0);
                    const cntFalse = allGroup.records.length - cntTrue;
                    result[0][alias] = allGroup.records.length > 0 ? (cntFalse / allGroup.records.length) * 100 : 0;
                } else if (fn === 'ANY' || fn === 'FIRST') {
                    const val = allGroup.records.find(r => r[field.name] !== undefined && r[field.name] !== null)?.[field.name];
                    result[0][alias] = val ?? null;
                }
            });

            console.log('✅ Pure aggregation complete');
            return result;
        }

        // Precompute totals needed for certain aggregations
        const percentTotals = {};
        if (aggregations && Array.isArray(aggregations)) {
            aggregations
                .filter(a => a.function === 'PERCENT_OF_TOTAL')
                .forEach(a => {
                    if (!percentTotals[a.field?.name]) {
                        const values = data.map(r => {
                            const val = r[a.field.name];
                            let cleanVal = val;
                            if (typeof val === 'number') cleanVal = val;
                            else if (typeof val === 'string') cleanVal = val.replace(/kr\s*/gi, '').replace(/\s/g, '').replace(/,/g, '.');
                            else cleanVal = 0;
                            const num = Number(cleanVal);
                            return isNaN(num) ? 0 : num;
                        });
                        percentTotals[a.field.name] = values.reduce((sum, v) => sum + v, 0);
                    }
                });
        }

        // Group the data
        const groups = {};

        data.forEach(record => {
            // Create composite group key
            const groupKey = groupByFields.map(field => {
                let value = record[field.name];

                // Handle null/undefined values
                if (value === null || value === undefined || value === '') {
                    value = 'Ukjent';
                }

                // Transform boolean values for better display
                if (field.name === 'ErBedriftskunde') {
                    value = value === true || value === 1 ? 'Bedriftskunde' : 'Privatkunde';
                }

                // Date grouping by time granularity
                if (field.timeGranularity && typeof value === 'string' && value.includes('T')) {
                    try {
                        const date = new Date(value);
                        if (field.timeGranularity === 'month') {
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
                            value = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
                        } else if (field.timeGranularity === 'year') {
                            value = date.getFullYear().toString();
                        } else if (field.timeGranularity === 'quarter') {
                            const quarter = Math.ceil((date.getMonth() + 1) / 3);
                            value = `Q${quarter} ${date.getFullYear()}`;
                        } else if (field.timeGranularity === 'day') {
                            value = date.toLocaleDateString('nb-NO');
                        }
                    } catch (e) {
                        console.warn('Failed to parse date:', value);
                        value = 'Ugyldig dato';
                    }
                }

                return value;
            }).join(' | ');

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    records: [],
                    groupValues: {}
                };

                // Store group field values
                groupByFields.forEach(field => {
                    let value = record[field.name];
                    if (value === null || value === undefined || value === '') {
                        value = 'Ukjent';
                    }
                    if (field.name === 'ErBedriftskunde') {
                        value = value === true || value === 1 ? 'Bedriftskunde' : 'Privatkunde';
                    }

                    // Apply same date transformation as for groupKey
                    if (field.timeGranularity && typeof value === 'string' && value.includes('T')) {
                        try {
                            const date = new Date(value);
                            if (field.timeGranularity === 'month') {
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
                                value = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
                            } else if (field.timeGranularity === 'year') {
                                value = date.getFullYear().toString();
                            } else if (field.timeGranularity === 'quarter') {
                                const quarter = Math.ceil((date.getMonth() + 1) / 3);
                                value = `Q${quarter} ${date.getFullYear()}`;
                            } else if (field.timeGranularity === 'day') {
                                value = date.toLocaleDateString('nb-NO');
                            }
                        } catch (e) {
                            console.warn('Failed to parse date:', value);
                            value = 'Ugyldig dato';
                        }
                    }

                    groups[groupKey].groupValues[field.name] = value;
                });
            }

            groups[groupKey].records.push(record);
        });

        console.log('📊 Groups created:', Object.keys(groups).length);

        // Calculate aggregations for each group
        const result = Object.entries(groups).map(([groupKey, group]) => {
            // Start with ONLY group field values - no individual record data
            const row = { ...group.groupValues };

            // DON'T preserve individual record fields for proper aggregation
            // This was causing raw data to show instead of aggregated groups

            // Apply aggregations
            if (aggregations && Array.isArray(aggregations)) {
                aggregations.forEach(agg => {
                    const { field, function: aggFunction, alias } = agg;
                    const fieldName = alias || `${aggFunction}_${field.name}`;

                    if (aggFunction === 'COUNT') {
                        row[fieldName] = group.records.length;
                    } else if (field.name === '_any') {
                        // Special case for counting all records
                        row[fieldName] = group.records.length;
                    } else {
                        const values = group.records
                            .map(r => {
                                const val = r[field.name];

                                // Handle both numbers and currency strings
                                let cleanVal = val;

                                if (typeof val === 'number') {
                                    cleanVal = val;
                                } else if (typeof val === 'string') {
                                    cleanVal = val.replace(/kr\s*/gi, '').replace(/\s/g, '').replace(/,/g, '.');
                                } else {
                                    cleanVal = 0;
                                }

                                const numVal = Number(cleanVal);
                                const result = isNaN(numVal) ? 0 : numVal;
                                return result;
                            })
                            .filter(v => !isNaN(v) && v !== 0); // Filter out zeros for better aggregation



                        switch (aggFunction) {
                            case 'SUM':
                                row[fieldName] = values.reduce((sum, val) => sum + val, 0);
                                break;
                            case 'AVG':
                                row[fieldName] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
                                break;
                            case 'MIN':
                                row[fieldName] = values.length > 0 ? Math.min(...values) : 0;
                                break;
                            case 'MAX':
                                row[fieldName] = values.length > 0 ? Math.max(...values) : 0;
                                break;
                            case 'MEDIAN':
                                if (values.length > 0) {
                                    const sorted = values.sort((a, b) => a - b);
                                    const mid = Math.floor(sorted.length / 2);
                                    row[fieldName] = sorted.length % 2 === 0
                                        ? (sorted[mid - 1] + sorted[mid]) / 2
                                        : sorted[mid];
                                } else {
                                    row[fieldName] = 0;
                                }
                                break;
                            case 'COUNT_TRUE': {
                                const cnt = group.records.reduce((acc, r) => acc + ((r[field.name] === true || r[field.name] === 1 || r[field.name] === '1') ? 1 : 0), 0);
                                row[fieldName] = cnt;
                                break;
                            }
                            case 'COUNT_FALSE': {
                                const cntTrue = group.records.reduce((acc, r) => acc + ((r[field.name] === true || r[field.name] === 1 || r[field.name] === '1') ? 1 : 0), 0);
                                row[fieldName] = group.records.length - cntTrue;
                                break;
                            }
                            case 'PERCENT_TRUE': {
                                const cntTrue = group.records.reduce((acc, r) => acc + ((r[field.name] === true || r[field.name] === 1 || r[field.name] === '1') ? 1 : 0), 0);
                                row[fieldName] = group.records.length > 0 ? (cntTrue / group.records.length) * 100 : 0;
                                break;
                            }
                            case 'PERCENT_FALSE': {
                                const cntTrue = group.records.reduce((acc, r) => acc + ((r[field.name] === true || r[field.name] === 1 || r[field.name] === '1') ? 1 : 0), 0);
                                const cntFalse = group.records.length - cntTrue;
                                row[fieldName] = group.records.length > 0 ? (cntFalse / group.records.length) * 100 : 0;
                                break;
                            }
                            case 'ANY':
                            case 'FIRST': {
                                const val = group.records.find(r => r[field.name] !== undefined && r[field.name] !== null)?.[field.name];
                                row[fieldName] = val ?? null;
                                break;
                            }
                            case 'PERCENT_OF_TOTAL':
                                // percent of total for the specified field
                                const groupSum = values.reduce((sum, val) => sum + val, 0);
                                const total = percentTotals[field.name] || 0;
                                row[fieldName] = total > 0 ? (groupSum / total) * 100 : 0;
                                break;
                            case 'DISTINCT_COUNT':
                            case 'DISTINCT':
                                // Count unique values in this group
                                const uniqueValues = new Set(group.records.map(r => r[field.name]));
                                row[fieldName] = uniqueValues.size;
                                break;
                            default:
                                row[fieldName] = values.length;
                        }

                        console.log(`✅ ${aggFunction} result: ${row[fieldName]}`);
                    }
                });
            } else {
                console.log('⚠️ No aggregations provided');
            }

            return row;
        });

        console.log('✅ GroupBy complete:', result.length, 'groups');

        // 🎯 Sorting: explicit sortBy overrides smart default
        if (result.length > 1) {
            if (sortBy && sortBy.field && sortBy.direction) {
                const dir = sortBy.direction === 'ASC' ? 1 : -1;
                result.sort((a, b) => {
                    let aVal = a[sortBy.field];
                    let bVal = b[sortBy.field];
                    aVal = typeof aVal === 'string' ? parseFloat(String(aVal).replace(/kr\s*/gi, '').replace(/\s/g, '').replace(/,/g, '.')) || aVal : aVal;
                    bVal = typeof bVal === 'string' ? parseFloat(String(bVal).replace(/kr\s*/gi, '').replace(/\s/g, '').replace(/,/g, '.')) || bVal : bVal;
                    if (aVal === bVal) return 0;
                    return aVal > bVal ? dir : -dir;
                });
            } else if (aggregations && aggregations.length > 0) {
                // Smart default sort
                const priorityOrder = ['SUM', 'COUNT', 'AVG', 'MAX', 'MIN', 'MEDIAN'];
                const mainAggregation = aggregations
                    .filter(agg => agg.function && (agg.alias || agg.field?.name))
                    .sort((a, b) => {
                        const aPriority = priorityOrder.indexOf(a.function) !== -1 ? priorityOrder.indexOf(a.function) : 999;
                        const bPriority = priorityOrder.indexOf(b.function) !== -1 ? priorityOrder.indexOf(b.function) : 999;
                        return aPriority - bPriority;
                    })[0];
                if (mainAggregation) {
                    const sortField = mainAggregation.alias || `${mainAggregation.function}_${mainAggregation.field?.name}`;
                    result.sort((a, b) => (Number(b[sortField]) || 0) - (Number(a[sortField]) || 0));
                }
            }
        }

        return result;
    }

    // Calculate operation (create new fields)
    executeCalculate(operation, data) {
        const { formula, alias, fields } = operation.config || {};

        if (!formula || !alias) {
            console.warn('Calculate operation missing formula or alias');
            return data;
        }

        return data.map(record => {
            const newRecord = { ...record };

            try {
                // Simple formula evaluation
                // For now, support basic operations between two fields
                if (fields && fields.length >= 2) {
                    const field1Value = Number(record[fields[0].name]) || 0;
                    const field2Value = Number(record[fields[1].name]) || 0;

                    // Prevent division by zero
                    if (formula.includes('/') && field2Value === 0) {
                        newRecord[alias] = 0;
                    } else {
                        // Simple math operations
                        const result = eval(formula.replace(fields[0].name, field1Value).replace(fields[1].name, field2Value));
                        newRecord[alias] = result;
                    }
                }
            } catch (error) {
                console.warn('Formula evaluation error:', error);
                newRecord[alias] = 0;
            }

            return newRecord;
        });
    }

    // Sort operation
    executeSort(operation, data) {
        const { field, direction } = operation.config || {};

        if (!field) {
            console.warn('Sort operation missing field');
            return data;
        }

        return [...data].sort((a, b) => {
            let aVal = a[field.name];
            let bVal = b[field.name];

            // Handle different data types
            if (field.type === 'number') {
                aVal = Number(aVal) || 0;
                bVal = Number(bVal) || 0;
            } else if (field.type === 'date') {
                aVal = new Date(aVal).getTime() || 0;
                bVal = new Date(bVal).getTime() || 0;
            } else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }

            let comparison = 0;
            if (aVal > bVal) comparison = 1;
            if (aVal < bVal) comparison = -1;

            return direction === 'DESC' ? -comparison : comparison;
        });
    }

    // Conditional operation
    executeConditional(operation, data) {
        const { conditions, alias } = operation.config || {};

        if (!conditions || !alias) {
            console.warn('Conditional operation missing conditions or alias');
            return data;
        }

        return data.map(record => {
            const newRecord = { ...record };

            // Evaluate conditions
            for (const condition of conditions) {
                const { field, operator, value, thenValue, elseValue } = condition;
                const recordValue = record[field.name];

                let conditionMet = false;

                switch (operator) {
                    case 'greater_than':
                        conditionMet = Number(recordValue) > Number(value);
                        break;
                    case 'less_than':
                        conditionMet = Number(recordValue) < Number(value);
                        break;
                    case 'equals':
                        conditionMet = recordValue === value;
                        break;
                    default:
                        conditionMet = false;
                }

                newRecord[alias] = conditionMet ? thenValue : elseValue;
                break; // For now, only handle first condition
            }

            return newRecord;
        });
    }
}