import React from 'react';
import { HashRouter as Router } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';

function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}

export default App; 