import React, { useEffect, useState, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { Box, Button, Typography, Paper, CircularProgress } from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getAuthStrategy } from '../config/authStrategies';

const isDev = process.env.NODE_ENV === 'development';
const authStrategy = getAuthStrategy();

function LoginPage() {
  const { instance, accounts, inProgress } = useMsal();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Håndter redirect i development (SPA) mode
  useEffect(() => {
    const handleRedirect = async () => {
      if (!isDev) return;

      try {
        console.log('Håndterer SPA redirect...');
        const response = await instance.handleRedirectPromise();

        if (response) {
          console.log('SPA login vellykket:', response.account);
          instance.setActiveAccount(response.account);
          setError(null);
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('SPA autentiseringsfeil:', error);
        setError(isDev ? error.message : 'Det oppstod en feil ved innlogging. Vennligst prøv igjen.');
        setIsLoading(false);
      }
    };

    if (isDev && inProgress === 'none') {
      handleRedirect();
    }
  }, [instance, inProgress, navigate]);

  // Håndter innlogging basert på miljø
  const handleLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (isDev) {
        // Development (SPA) login
        console.log('Starter SPA innlogging med konfig:', authStrategy.loginRequest);

        // Tøm eksisterende pålogginger
        const currentAccounts = instance.getAllAccounts();
        await Promise.all(currentAccounts.map(account =>
          instance.removeAccount(account)
        ));
        sessionStorage.clear();

        await instance.loginRedirect(authStrategy.loginRequest);
      } else {
        // Production (Desktop) login
        console.log('Starter desktop innlogging...');
        const { client, loginRequest } = authStrategy;

        try {
          const authResult = await client.acquireTokenInteractive(loginRequest);

          if (authResult) {
            console.log('Desktop login vellykket');
            await window.electron.auth.setAuthData(authResult);

            // Sett opp lytter for auth-response
            const cleanup = window.electron.auth.onAuthResponse((url) => {
              console.log('Mottok auth response:', url);
              cleanup(); // Fjern lytteren etter bruk
              navigate('/', { replace: true });
            });
          }
        } catch (error) {
          if (error.name === 'InteractionRequiredAuthError') {
            console.log('Interaktiv autentisering kreves...');
            await client.acquireTokenPopup(loginRequest);
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Innloggingsfeil:', error);
      setError(isDev
        ? `${error.message} (${error.errorCode})`
        : 'Det oppstod en feil ved innlogging. Vennligst prøv igjen.');
      setIsLoading(false);
    }
  }, [instance, navigate]);

  // Loading state
  if (isLoading || (!isDev && inProgress !== 'none')) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2
        }}
      >
        <CircularProgress />
        <Typography variant="body1" color="textSecondary">
          Logger inn...
        </Typography>
      </Box>
    );
  }

  // Login UI
  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          borderRadius: 2
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Velkommen til ByggBot
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
          Logg inn med din bedriftskonto for å fortsette
        </Typography>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <Button
          variant="contained"
          size="large"
          startIcon={<LoginIcon />}
          onClick={handleLogin}
          disabled={isLoading || (!isDev && inProgress !== 'none')}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            py: 1.5
          }}
        >
          {isLoading ? 'Logger inn...' : 'Logg inn med Microsoft'}
        </Button>
      </Paper>
    </Box>
  );
}

export default LoginPage; 