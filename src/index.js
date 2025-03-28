import './styles/tailwind.css'; // Import Tailwind CSS FØRST
import React from 'react';
import { createRoot } from 'react-dom/client';
// Fjernet utkommenterte og unødvendige MUI-importer
// import { ThemeProvider } from '@mui/material/styles';
// import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
// import theme from './theme';

// Add global shadcn root element
if (!document.getElementById('shadcn-ui')) {
  const rootEl = document.createElement('div');
  rootEl.id = 'shadcn-ui';
  rootEl.style.height = '100%';
  document.body.appendChild(rootEl);
}

// Add debug logs
console.log('React initialization starting...');
console.log('Looking for root element...');

const container = document.getElementById('root');
if (!container) {
  console.error('Root element not found!');
} else {
  console.log('Root element found:', container);
}

try {
  const root = createRoot(container);
  console.log('Root created successfully');

  root.render(
    <React.StrictMode>
      {/* <ThemeProvider theme={theme}> */}
      {/* <CssBaseline /> */}
      <App />
      {/* </ThemeProvider> */}
    </React.StrictMode>
  );
  console.log('Render completed');
} catch (error) {
  console.error('Error during render:', error);
} 