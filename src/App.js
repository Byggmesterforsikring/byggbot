import React, { useEffect, useState } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import authManager from './auth/AuthManager';
import { AuthProvider } from './components/Auth/AuthContext.jsx';

const isDev = process.env.NODE_ENV === 'development';

const devlog = (message, data = null) => {
  if (isDev) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] App: ${message}`;
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
};

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  // Logger miljøvariabler for debugging
  useEffect(() => {
    devlog('App mount - Miljø:', process.env.NODE_ENV);

    // Sjekk om tailwind er aktivert
    const tailwindActive = document.documentElement.classList.contains('tw-root') ||
      document.getElementById('shadcn-ui') !== null;
    devlog('Tailwind status:', { active: tailwindActive });

    // Sørg for at shadcn-ui rot-elementet finnes
    if (!document.getElementById('shadcn-ui')) {
      devlog('Oppretter shadcn-ui rot-element');
      const shadcnRoot = document.createElement('div');
      shadcnRoot.id = 'shadcn-ui';
      document.body.appendChild(shadcnRoot);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        devlog('Starter auth initialisering');
        const result = await authManager.initialize();
        devlog('Auth initialisering fullført', { success: result });
        setIsInitialized(true);
      } catch (error) {
        devlog('Auth initialisering feilet', { error: error.message });
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  if (!isInitialized) {
    return <div>Laster...</div>;
  }

  return (
    <AuthProvider>
      <Router>
        <MainLayout />
      </Router>
    </AuthProvider>
  );
}

export default App; 