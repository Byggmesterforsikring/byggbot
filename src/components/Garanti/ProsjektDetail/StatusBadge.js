import React from 'react';
import { getStatusStyle, formatStatusDisplay } from './ProsjektDetailUtils';

// Status badge-komponent
const StatusBadge = ({ status }) => {
    return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusStyle(status)}`}>
            {formatStatusDisplay(status) || 'Ukjent status'}
        </span>
    );
};

export default StatusBadge; 