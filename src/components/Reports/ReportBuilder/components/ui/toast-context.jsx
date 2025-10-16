import React, { createContext, useContext, useState } from 'react';
import { Alert, AlertDescription } from '../../../../ui/alert';
import { Button } from '../../../../ui/button';
import { CheckCircle2, AlertTriangle, X, Info } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = 'info', duration = 5000) => {
        const id = Date.now();
        const toast = { id, message, type, duration };
        
        setToasts(prev => [...prev, toast]);
        
        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
        
        return id;
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const toast = {
        success: (message, duration) => showToast(message, 'success', duration),
        error: (message, duration) => showToast(message, 'error', duration),
        warning: (message, duration) => showToast(message, 'warning', duration),
        info: (message, duration) => showToast(message, 'info', duration)
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="h-4 w-4" />;
            case 'error': return <AlertTriangle className="h-4 w-4" />;
            case 'warning': return <AlertTriangle className="h-4 w-4" />;
            case 'info': return <Info className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    const getAlertVariant = (type) => {
        switch (type) {
            case 'error': return 'destructive';
            case 'warning': return 'default';
            default: return 'default';
        }
    };

    const getAlertColor = (type) => {
        switch (type) {
            case 'success': return 'border-green-200 bg-green-50 text-green-800';
            case 'error': return 'border-red-200 bg-red-50 text-red-800';
            case 'warning': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
            case 'info': return 'border-blue-200 bg-blue-50 text-blue-800';
            default: return 'border-blue-200 bg-blue-50 text-blue-800';
        }
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
                {toasts.map((toast) => (
                    <Alert 
                        key={toast.id}
                        variant={getAlertVariant(toast.type)}
                        className={`${getAlertColor(toast.type)} shadow-lg border animate-in slide-in-from-right-full`}
                    >
                        <div className="flex items-start gap-2 w-full">
                            {getIcon(toast.type)}
                            <AlertDescription className="flex-1">
                                {toast.message}
                            </AlertDescription>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 hover:bg-black/10"
                                onClick={() => removeToast(toast.id)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    </Alert>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
