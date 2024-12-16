import React from 'react';
import { Box } from '@mui/material';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';
import AutoCalculator from '../Auto/AutoCalculator';
import FleetAutoCalculator from '../Auto/FleetAutoCalculator';
import TrailerCalculator from '../Auto/TrailerCalculator';
import ArbeidsmaskinCalculator from '../Auto/ArbeidsmaskinCalculator';
import Dashboard from '../Dashboard/Dashboard';
import ReportDocs from '../Documentation/ReportDocs';
import RulesLayout from '../Rules/RulesLayout';

function MainLayout() {
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/tegningsregler" element={<RulesLayout />} />
            <Route path="/calculators/auto" element={<AutoCalculator />} />
            <Route path="/calculators/fleet-auto" element={<FleetAutoCalculator />} />
            <Route path="/calculators/trailer" element={<TrailerCalculator />} />
            <Route path="/calculators/arbeidsmaskin" element={<ArbeidsmaskinCalculator />} />
            <Route path="/docs/reports" element={<ReportDocs />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}

export default MainLayout; 