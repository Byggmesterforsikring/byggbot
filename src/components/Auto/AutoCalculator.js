import React, { useState } from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  Typography,
  Box,
  Button,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home } from '@mui/icons-material';

import VehicleTypeStep from './steps/VehicleTypeStep';
import CoverageStep from './steps/CoverageStep';
import ExtrasStep from './steps/ExtrasStep';
import SummaryStep from './steps/SummaryStep';

const steps = ['Kjøretøytype', 'Dekning', 'Tillegg', 'Oppsummering'];

function AutoCalculator() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    vehicleType: '',
    mileage: '',
    coverage: '',
    bonusLevel: '',
    extras: ['driverAccident'],
    carBrand: ''
  });

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      if (field === 'coverage' && value !== 'FULL_KASKO') {
        const kaskoOnly = ['leasing', 'rentalCar15', 'rentalCar30'];
        newData.extras = prev.extras.filter(extra => !kaskoOnly.includes(extra));
      }

      return newData;
    });
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
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4 
      }}>
        <Typography variant="h5" component="h1">
          Auto Kalkulator
        </Typography>
      </Box>
      
      <Paper 
        elevation={0} 
        sx={{ 
          bgcolor: 'white', 
          p: 4,
          borderRadius: 1,
          minHeight: '600px'
        }}
      >
        <Stepper 
          activeStep={activeStep} 
          sx={{ 
            mb: 6,
            '& .MuiStepLabel-root .Mui-completed': {
              color: 'primary.main'
            },
            '& .MuiStepLabel-root .Mui-active': {
              color: 'primary.main'
            }
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: '300px' }}>
          {getStepContent(activeStep)}
        </Box>

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          mt: 4,
          pt: 3,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
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
            NESTE
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default AutoCalculator; 