import { useState, useEffect } from 'react';

/**
 * Hook for å hente og håndtere kundedata
 */
export const useKundeData = (kundenr) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = async (customerNumber) => {
        if (!customerNumber) return;

        setLoading(true);
        setError(null);

        try {
            if (!window.electron?.customer?.fetchAnalysis) {
                throw new Error('Customer API ikke tilgjengelig. Sjekk at Electron preload er lastet korrekt.');
            }

            const result = await window.electron.customer.fetchAnalysis({
                kundenr: customerNumber
            });

            if (result && result.error) {
                setError(result.error);
                setData(null);
            } else if (result) {
                setData(result);
                setError(null);
            } else {
                setError('Ingen data mottatt fra API');
                setData(null);
            }
        } catch (err) {
            setError(err.message || 'Ukjent feil ved henting av kundedata');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (kundenr) {
            fetchData(kundenr);
        }
    }, [kundenr]);

    return {
        data,
        loading,
        error,
        refetch: () => fetchData(kundenr)
    };
};