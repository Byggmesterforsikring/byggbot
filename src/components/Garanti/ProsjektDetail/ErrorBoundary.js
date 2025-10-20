import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Oppdater state så neste render viser fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Du kan også logge feilen til en error reporting service
        console.error('[ErrorBoundary] Fanget en feil:', error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            // Du kan rendere et hvilket som helst fallback UI
            return (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Noe gikk galt!</h2>
                    <details className="text-sm text-red-700">
                        <summary>Klikk for detaljer</summary>
                        <pre className="mt-2 whitespace-pre-wrap">
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo.componentStack}
                        </pre>
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 