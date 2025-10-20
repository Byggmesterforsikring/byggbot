import React, { createContext, useContext, useState, useEffect } from 'react';
import authManager from '../../auth/AuthManager';

// Oppretter en React-kontekst for auth
const AuthContext = createContext(null);

// Sjekk om vi er i utvikling eller produksjon
const isDev = process.env.NODE_ENV === 'development';

// AuthProvider komponent for å innkapsle applikasjonen
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialiserer auth ved oppstart
    useEffect(() => {
        const initAuth = async () => {
            try {
                // Sjekk om brukeren er autentisert
                const isAuthenticated = authManager.isAuthenticated();

                if (isAuthenticated) {
                    // Hent brukerinformasjon
                    const userDetails = authManager.getCurrentUserDetails();

                    // Sjekk brukerrolle basert på roller fra userDetails
                    let role = 'USER';
                    let isAdmin = false;

                    if (userDetails?.roller && Array.isArray(userDetails.roller)) {
                        const hasAdminRole = userDetails.roller.some(rolle =>
                            rolle.role_name === 'ADMIN' || rolle.roleName === 'ADMIN'
                        );
                        if (hasAdminRole) {
                            role = 'ADMIN';
                            isAdmin = true;
                        }
                    }

                    console.log('Brukerdata:', { userDetails, role });

                    setUser({
                        username: userDetails?.email || userDetails?.msalUsername,
                        name: userDetails?.navn || userDetails?.msalName,
                        email: userDetails?.email,
                        id: userDetails?.id,
                        isAdmin: isAdmin,
                        role: role
                    });
                } else if (isDev) {
                    // I utviklingsmiljø, opprett en dummy admin-bruker hvis ingen er autentisert
                    console.log('Oppretter dummy admin-bruker for utviklingsmiljø');
                    setUser({
                        username: 'dev.admin@example.com',
                        name: 'Development Admin',
                        isAdmin: true,
                        role: 'ADMIN'
                    });
                }
            } catch (error) {
                console.error('Feil ved initialisering av auth:', error);

                // Fallback til admin i utviklingsmiljø
                if (isDev) {
                    console.log('Fallback til dummy admin-bruker etter feil');
                    setUser({
                        username: 'dev.admin@example.com',
                        name: 'Development Admin',
                        isAdmin: true,
                        role: 'ADMIN'
                    });
                }
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    // For testformål, legg til en hasAdmin-funksjon
    const hasAdmin = user && user.isAdmin;
    console.log('Current user auth status:', { user, hasAdmin });

    return (
        <AuthContext.Provider value={{ user, isLoading, hasAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook for å bruke auth-konteksten
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth må brukes innenfor en AuthProvider');
    }
    return context;
}; 