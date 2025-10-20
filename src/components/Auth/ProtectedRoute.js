import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authManager from '../../auth/AuthManager';

const isDev = process.env.NODE_ENV === 'development';

const devlog = (message, data = null) => {
    if (isDev) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ProtectedRoute: ${message}`;
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }
};

const ProtectedRoute = ({ children, requiredRole = null }) => {
    const location = useLocation();
    devlog('Sjekker tilgang for rute', { path: location.pathname, requiredRole });

    const isAuthenticated = authManager.isAuthenticated();
    devlog('Autentiseringsstatus fra authManager.isAuthenticated():', { isAuthenticated });

    if (!isAuthenticated) {
        devlog('Bruker er ikke autentisert (eller ikke aktiv). Redirecter til login.');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Hvis vi er på login-siden og er autentisert, redirect til dashboard
    if (location.pathname === '/login') {
        devlog('Autentisert på login-side, redirecter til dashboard.');
        return <Navigate to="/" replace />;
    }

    const currentUserDetails = authManager.getCurrentUserDetails();
    devlog('authManager.getCurrentUserDetails() detaljer:', currentUserDetails);

    if (!currentUserDetails) {
        devlog('Ingen brukerdetaljer funnet selv om isAuthenticated var true? Redirecter til login.');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Rolle-sjekk hvis requiredRole er satt for ruten
    if (requiredRole) {
        const brukerRollerNavn = currentUserDetails.roller?.map(r => r.role_name) || [];
        devlog('Brukerens roller:', brukerRollerNavn);

        const harAdminRolle = brukerRollerNavn.includes('ADMIN');
        const harSpesifikkRolle = brukerRollerNavn.includes(requiredRole);

        if (!harAdminRolle && !harSpesifikkRolle) {
            devlog(`Mangler påkrevd rolle ('${requiredRole}'). Bruker har [${brukerRollerNavn.join(', ')}]. Redirecter til hovedside.`);
            return <Navigate to="/" state={{ from: location }} replace />;
        }
        devlog(`Tilgang OK basert på rolle ('${requiredRole}' eller ADMIN).`);
    } else {
        devlog('Ingen spesifikk rolle påkrevd for denne ruten.');
    }

    // TODO: Senere, legg til sjekk for modul-tilgang hvis det er relevant for ProtectedRoute
    // For eksempel, hvis en rute er /garanti/* og brukeren må ha 'Garanti'-modulen.
    // Dette kan kreve at `requiredModule` også sendes som prop til ProtectedRoute.

    devlog('Tilgang godkjent, viser innhold for rute:', location.pathname);
    return children;
};

export default ProtectedRoute; 