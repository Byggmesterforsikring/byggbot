import React, { useState } from 'react';
import {
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Box,
  Button
} from '@mui/material';

import VehicleTypeStep from './steps/VehicleTypeStep';
import CoverageStep from './steps/CoverageStep';
import ExtrasStep from './steps/ExtrasStep';
import SummaryStep from './steps/SummaryStep';

const steps = ['Kjøretøytype', 'Dekning', 'Tillegg', 'Oppsummering'];

function AutoCalculator() {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    vehicleType: '',
    mileage: '',
    coverage: '',
    bonusLevel: '',
    extras: [],
    carBrand: ''
  });

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return <VehicleTypeStep 
          formData={formData} 
          onChange={handleFormChange} 
        />;
      case 1:
        return <CoverageStep 
          formData={formData} 
          onChange={handleFormChange} 
        />;
      case 2:
        return <ExtrasStep 
          formData={formData} 
          onChange={handleFormChange} 
        />;
      case 3:
        return <SummaryStep formData={formData} />;
      default:
        return 'Ukjent steg';
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Auto Kalkulator
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {getStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          {activeStep !== 0 && (
            <Button onClick={handleBack} sx={{ mr: 1 }}>
              Tilbake
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={activeStep === steps.length - 1}
          >
            {activeStep === steps.length - 1 ? 'Fullfør' : 'Neste'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default AutoCalculator; 