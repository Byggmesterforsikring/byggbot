import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import AutoCalculator from '../Auto/AutoCalculator';
import FleetAutoCalculator from '../Auto/FleetAutoCalculator';
import TrailerCalculator from '../Auto/TrailerCalculator';
import ArbeidsmaskinCalculator from '../Auto/ArbeidsmaskinCalculator';
import Dashboard from '../Dashboard/Dashboard';
import ReportDocs from '../Documentation/ReportDocs';
import RulesLayout from '../Rules/RulesLayout';
import LoginPage from '../Auth/LoginPage';
import ProtectedRoute from '../Auth/ProtectedRoute';
import UserManagement from '../Admin/UserManagement';
import { Box } from '@mui/material';
import authManager from '../../auth/AuthManager';

const isDev = process.env.NODE_ENV === 'development';

const devlog = (message, data = null) => {
  if (isDev) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] MainLayout: ${message}`;
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
};

function MainLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      devlog('Sjekker autentisering');
      const authStatus = authManager.isAuthenticated();
      devlog('Autentiseringsstatus:', { authStatus });
      setIsAuthenticated(authStatus);
      setIsInitialized(true);
    };

    checkAuth();
  }, []);

  // Legg til en event listener for å oppdatere auth status
  useEffect(() => {
    const handleStorageChange = () => {
      devlog('Storage endret, sjekker auth på nytt');
      const authStatus = authManager.isAuthenticated();
      devlog('Ny autentiseringsstatus:', { authStatus });
      setIsAuthenticated(authStatus);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!isInitialized) {
    devlog('Venter på initialisering');
    return null;
  }

  if (!isAuthenticated) {
    devlog('Ikke autentisert, viser login-layout');
    return (
      <Box sx={{ height: '100vh', bgcolor: 'background.default' }}>
        <Routes>
          <Route path="/login" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Box>
    );
  }

  devlog('Er autentisert, viser hoved-layout');
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: '#F8F9FD',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            maxWidth: '1400px',
            width: '100%',
            mx: 'auto',
            p: { xs: 2, sm: 3 },
            pt: { xs: 2, sm: 3 },
          }}
        >
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route path="/tegningsregler" element={<RulesLayout />} />
            <Route path="/calculators/auto" element={<AutoCalculator />} />
            <Route path="/calculators/fleet-auto" element={<FleetAutoCalculator />} />
            <Route path="/calculators/trailer" element={<TrailerCalculator />} />
            <Route path="/calculators/arbeidsmaskin" element={<ArbeidsmaskinCalculator />} />
            <Route path="/docs/reports" element={<ReportDocs />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}

export default MainLayout; 