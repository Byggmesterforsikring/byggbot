import React, { useState } from 'react';
import { Box, useTheme } from '@mui/material';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import HomePage from '../HomePage';
import AutoCalculator from '../Auto/AutoCalculator';
import Dashboard from '../Dashboard/Dashboard';
import ReportDocs from '../Documentation/ReportDocs';
import RulesLayout from '../Rules/RulesLayout';

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const theme = useTheme();
  const drawerWidth = sidebarOpen ? 240 : 56;

  return (
    <Box sx={{ 
      display: 'flex', 
      bgcolor: '#F8F9FD',
    }}>
      <Sidebar 
        open={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          marginTop: 2,
          marginBottom: 3,
          transition: 'margin 225ms cubic-bezier(0.4, 0, 0.6, 1) 0ms',
          padding: 2,
        }}
      >
        <Box
          sx={{
            maxWidth: '1400px',
            width: '100%',
            mx: 'auto',
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tegningsregler" element={<RulesLayout />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/calculators/auto" element={<AutoCalculator />} />
            <Route path="/docs/reports" element={<ReportDocs />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}

export default MainLayout; 