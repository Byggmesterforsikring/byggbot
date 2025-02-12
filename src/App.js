import React, { useEffect, useState } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication, LogLevel, EventType } from '@azure/msal-browser';
import MainLayout from './components/Layout/MainLayout';
import { msalConfig } from './config/authConfig';

// Verifiser at miljøvariablene er tilgjengelige
console.log('Client ID:', process.env.REACT_APP_AZURE_CLIENT_ID);
console.log('Tenant ID:', process.env.REACT_APP_AZURE_TENANT_ID);

// Konfigurer MSAL logging
const msalInstance = new PublicClientApplication({
  ...msalConfig,
  system: {
    allowNativeBroker: false,
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
        }
      },
      logLevel: LogLevel.Verbose
    }
  }
});

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize();
        console.log('MSAL initialisert');
        
        // Håndter redirect etter initialisering
        const response = await msalInstance.handleRedirectPromise().catch(error => {
          console.error('Redirect håndteringsfeil:', error);
        });

        if (response) {
          console.log('Redirect response mottatt:', response);
          msalInstance.setActiveAccount(response.account);
        } else {
          const currentAccounts = msalInstance.getAllAccounts();
          if (currentAccounts.length > 0) {
            msalInstance.setActiveAccount(currentAccounts[0]);
          }
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('MSAL initialiseringsfeil:', error);
      }
    };

    initializeMsal();

    // Registrer event handlers
    const callbackId = msalInstance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS) {
        console.log('Innlogging vellykket:', event);
        // Sett aktiv konto etter vellykket innlogging
        if (event.payload.account) {
          msalInstance.setActiveAccount(event.payload.account);
        }
      } else if (event.eventType === EventType.LOGIN_FAILURE) {
        console.error('Innlogging feilet:', event.error);
      }
    });

    return () => {
      if (callbackId) {
        msalInstance.removeEventCallback(callbackId);
      }
    };
  }, []);

  if (!isInitialized) {
    return <div>Laster...</div>;
  }

  return (
    <MsalProvider instance={msalInstance}>
      <Router>
        <MainLayout />
      </Router>
    </MsalProvider>
  );
}

export default App; 