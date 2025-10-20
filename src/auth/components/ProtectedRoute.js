import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { CircularProgress, Box } from '@mui/material';

function ProtectedRoute({ children, requiredRole }) {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (isAuthenticated && accounts.length > 0) {
        try {
          const account = instance.getActiveAccount() || accounts[0];
          if (account) {
            console.log('Brukerinfo:', {
              username: account.username,
              localAccountId: account.localAccountId,
              homeAccountId: account.homeAccountId,
              environment: account.environment
            });

            try {
              const role = await window.electron.getUserRole(account.username);
              console.log('Brukerrolle satt til:', role);
              setUserRole(role);
            } catch (error) {
              console.warn('Kunne ikke hente brukerrolle:', error);
              console.log('Setter standardrolle USER på grunn av feil');
              setUserRole('USER');
            }
          }
        } catch (error) {
          console.warn('Feil ved henting av brukerinfo:', error);
          console.log('Setter standardrolle USER på grunn av generell feil');
          setUserRole('USER');
        }
      } else if (!isAuthenticated) {
        console.log('Bruker ikke autentisert, redirecter til login');
        setUserRole(null);
      }
      setLoading(false);
    };

    console.log('ProtectedRoute: Starter fetchUserRole...');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('accounts:', accounts);
    
    fetchUserRole();
  }, [isAuthenticated, instance, accounts]);

  if (loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    console.log('Ikke autentisert, redirecter til login');
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole && userRole !== 'ADMIN') {
    console.log('Mangler nødvendig rolle, redirecter til hovedsiden');
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute; 