import React, { memo, useMemo } from 'react';
import ProsjektInfoSection from './ProsjektInfoSection';
import ErrorBoundary from './ErrorBoundary';

// Isolert wrapper som forhindrer re-rendering av andre komponenter
const IsolatedProsjektInfoWrapper = memo(({ prosjekt, onSave }) => {
    // Memo-iser props for å forhindre unødvendige re-renders
    const memoizedProsjekt = useMemo(() => prosjekt, [
        prosjekt?.id,
        prosjekt?.navn,
        prosjekt?.gateadresse,
        prosjekt?.prosjektGateadresse,
        prosjekt?.postnummer,
        prosjekt?.prosjektPostnummer,
        prosjekt?.poststed,
        prosjekt?.prosjektPoststed,
        prosjekt?.kommune,
        prosjekt?.prosjektKommune
    ]);

    const memoizedOnSave = useMemo(() => onSave, [onSave]);

    return (
        <ErrorBoundary>
            <div style={{ isolation: 'isolate' }}>
                <ProsjektInfoSection
                    prosjekt={memoizedProsjekt}
                    onSave={memoizedOnSave}
                />
            </div>
        </ErrorBoundary>
    );
});

export default IsolatedProsjektInfoWrapper; 