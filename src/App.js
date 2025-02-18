import React, { useEffect, useState } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import authManager from './auth/AuthManager';

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
    <Router>
      <MainLayout />
    </Router>
  );
}

export default App; 