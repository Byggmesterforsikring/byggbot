import React, { useState } from 'react';
import { Box, useTheme } from '@mui/material';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';
import AutoCalculator from '../Auto/AutoCalculator';
import Dashboard from '../Dashboard/Dashboard';
import ReportDocs from '../Documentation/ReportDocs';
import RulesLayout from '../Rules/RulesLayout';

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const theme = useTheme();
  const drawerWidth = sidebarOpen ? 240 : 56;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar 
        open={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
      />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: '#F8F9FD',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            maxWidth: '1400px',
            width: '100%',
            mx: 'auto',
            p: 3,
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tegningsregler" element={<RulesLayout />} />
            <Route path="/calculators/auto" element={<AutoCalculator />} />
            <Route path="/docs/reports" element={<ReportDocs />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}

export default MainLayout; 