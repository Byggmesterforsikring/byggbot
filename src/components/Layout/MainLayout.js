import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import AutoCalculator from '../Auto/AutoCalculator';
import FleetAutoCalculator from '../Auto/FleetAutoCalculator';
import TrailerCalculator from '../Auto/TrailerCalculator';
import ArbeidsmaskinCalculator from '../Auto/ArbeidsmaskinCalculator';
import LastebilCalculator from '../Auto/LastebilCalculator';
import VeterankjoeretoyCalculator from '../Auto/VeterankjoeretoyCalculator';
import Dashboard from '../Dashboard/Dashboard';
import ReportDocs from '../Documentation/ReportDocs';
import RulesLayout from '../Rules/RulesLayout';
import LoginPage from '../Auth/LoginPage';
import ProtectedRoute from '../Auth/ProtectedRoute';
import UserManagementV2 from '../Admin/UserManagementV2';
import InvoiceFeedback from '../Admin/InvoiceFeedback';
import SystemPromptEditor from '../Admin/SystemPromptEditor';
import { Box } from '@mui/material';
import authManager from '../../auth/AuthManager';
import DrawingRulesPage from '../DrawingRules/DrawingRulesPage';
import AiChatPage from '../AiChat/AiChatPage';
import ReportsPage from '../Reports/ReportsPage';
import FakturaUploader from '../Skade/Betalinger/FakturaUploader';
import GarantiProsjekterPage from '../Garanti/GarantiSakerPage';
import SelskaperOversiktSide from '../Garanti/SelskaperOversiktSide';
import SelskapDetailPage from '../Selskap/SelskapDetailPage';
import ProsjektDetailPage from '../Garanti/ProsjektDetailPage';
import NyttGarantiprosjektPage from '../Garanti/NyttGarantiprosjektPage';
import NyttSelskapSide from '../Garanti/NyttSelskapSide';

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
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <UserManagementV2 />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/invoice-feedback"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <InvoiceFeedback />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ai-prompts"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <SystemPromptEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tegningsregler"
              element={
                <ProtectedRoute>
                  <DrawingRulesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tegningsregler/:slug"
              element={
                <ProtectedRoute>
                  <DrawingRulesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-chat"
              element={
                <ProtectedRoute>
                  <AiChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/skade/betalinger/faktura"
              element={
                <ProtectedRoute>
                  <FakturaUploader />
                </ProtectedRoute>
              }
            />
            <Route
              path="/garanti/saker"
              element={
                <ProtectedRoute>
                  <GarantiProsjekterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/garanti/selskaper"
              element={
                <ProtectedRoute>
                  <SelskaperOversiktSide />
                </ProtectedRoute>
              }
            />
            <Route
              path="/garanti/selskap/ny"
              element={
                <ProtectedRoute>
                  <NyttSelskapSide />
                </ProtectedRoute>
              }
            />
            <Route
              path="/garanti/prosjekt/ny"
              element={
                <ProtectedRoute>
                  <NyttGarantiprosjektPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/garanti/prosjekt/:prosjektId"
              element={
                <ProtectedRoute>
                  <ProsjektDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/garanti/selskap/:selskapId"
              element={
                <ProtectedRoute>
                  <SelskapDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calculators/auto"
              element={
                <ProtectedRoute>
                  <AutoCalculator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calculators/fleet-auto"
              element={
                <ProtectedRoute>
                  <FleetAutoCalculator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calculators/trailer"
              element={
                <ProtectedRoute requiredRole="EDITOR">
                  <TrailerCalculator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calculators/arbeidsmaskin"
              element={
                <ProtectedRoute>
                  <ArbeidsmaskinCalculator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calculators/lastebil"
              element={
                <ProtectedRoute>
                  <LastebilCalculator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calculators/veterankjoeretoy"
              element={
                <ProtectedRoute requiredRole="EDITOR">
                  <VeterankjoeretoyCalculator />
                </ProtectedRoute>
              }
            />
            <Route path="/docs/reports" element={<ReportDocs />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}

export default MainLayout; 