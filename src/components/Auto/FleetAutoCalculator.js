import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Checkbox,
  FormControlLabel,
  Button,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  COVERAGE_TYPES,
  BONUS_LEVELS,
  BUDGET_CAR_BRANDS,
  MILEAGE_OPTIONS,
  EXTRAS,
  TARIFFS,
  BUDGET_TARIFFS,
} from './constants/tariffData';
import { GroupWork as CarIcon } from '@mui/icons-material';

const VEHICLE_TYPES_FLÅTE = {
  PRIVATE_LIGHT: 'Firmabiler inntil 3,5 tonn',
  ELECTRIC_LIGHT: 'El-biler inntil 3,5 tonn',
  BUDGET: 'Rimeligere biler (spesialtariff)',
};

function FleetAutoCalculator() {
  const [formData, setFormData] = useState({
    vehicleType: '',
    carBrand: '',
    mileage: '20000',
    coverage: '',
    bonusLevel: '75%',
    extras: ['driverAccident'],
  });

  const [fleet, setFleet] = useState([]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleExtraChange = (extraId) => {
    setFormData((prevData) => {
      let newExtras = [...prevData.extras];
      if (extraId === 'bilEkstra') {
        if (!prevData.extras.includes(extraId)) {
          newExtras.push(extraId);
          if (!newExtras.includes('rentalCar30')) {
            newExtras = newExtras.filter((id) => id !== 'rentalCar15');
            newExtras.push('rentalCar30');
          }
        } else {
          newExtras = newExtras.filter((id) => id !== extraId);
        }
      } else if (
        extraId === 'rentalCar30' &&
        prevData.extras.includes('bilEkstra')
      ) {
        return prevData;
      } else if (
        extraId === 'rentalCar15' &&
        prevData.extras.includes('bilEkstra')
      ) {
        return prevData;
      } else if (extraId === 'rentalCar15' || extraId === 'rentalCar30') {
        newExtras = newExtras.filter(
          (id) => id !== 'rentalCar15' && id !== 'rentalCar30'
        );
        if (!prevData.extras.includes(extraId)) {
          newExtras.push(extraId);
        }
      } else {
        newExtras = prevData.extras.includes(extraId)
          ? newExtras.filter((id) => id !== extraId)
          : [...newExtras, extraId];
      }
      return {
        ...prevData,
        extras: newExtras,
      };
    });
  };

  const shouldShowExtra = (extraId) => {
    const isKasko = formData.coverage === 'FULL_KASKO';
    switch (extraId) {
      case 'driverAccident':
        return true;
      case 'craneLiability':
        return formData.vehicleType === 'TRUCK';
      case 'rentalCar15':
      case 'rentalCar30':
        return isKasko;
      case 'leasing':
        return isKasko;
      case 'bilEkstra':
        return isKasko;
      default:
        return true;
    }
  };

  const calculatePremiumDistribution = () => {
    if (
      !formData.vehicleType ||
      !formData.coverage ||
      !formData.bonusLevel ||
      !formData.mileage
    ) {
      return {
        liability: 0,
        partialKasko: 0,
        kasko: 0,
        extras: [],
        total: 0,
      };
    }

    let basePremium;
    if (formData.vehicleType === 'BUDGET') {
      basePremium =
        BUDGET_TARIFFS[formData.coverage]?.[formData.bonusLevel] || 0;
    } else {
      basePremium =
        TARIFFS[formData.vehicleType]?.[formData.coverage]?.[
          formData.bonusLevel
        ] || 0;
    }

    const mileageOption = MILEAGE_OPTIONS.find(
      (opt) => opt.value === parseInt(formData.mileage)
    );
    if (mileageOption) {
      basePremium *= mileageOption.factor;
    }

    const extrasWithoutBilEkstra = formData.extras
      .filter((extraId) => extraId !== 'bilEkstra')
      .map((extraId) => {
        const extra = EXTRAS.find((e) => e.id === extraId);
        return {
          id: extraId,
          label: extra.label,
          price: extra.price,
        };
      });

    const extrasCostWithoutBilEkstra = extrasWithoutBilEkstra.reduce(
      (sum, extra) => sum + extra.price,
      0
    );

    let distribution = {
      liability: 0,
      partialKasko: 0,
      kasko: 0,
      extras: extrasWithoutBilEkstra,
      total: Math.round(basePremium + extrasCostWithoutBilEkstra),
    };

    if (
      ['PRIVATE_LIGHT', 'ELECTRIC_LIGHT', 'BUDGET'].includes(
        formData.vehicleType
      )
    ) {
      switch (formData.coverage) {
        case 'LIABILITY':
          distribution.liability = basePremium;
          break;
        case 'PARTIAL_KASKO':
          distribution.liability = 2949;
          distribution.partialKasko = basePremium - 2949;
          break;
        case 'FULL_KASKO':
          distribution.liability = 2949;
          distribution.partialKasko = basePremium * 0.28;
          distribution.kasko = basePremium - 2949 - basePremium * 0.28;
          break;
      }
    } else if (formData.vehicleType === 'PRIVATE_MEDIUM') {
      switch (formData.coverage) {
        case 'LIABILITY':
          distribution.liability = basePremium;
          break;
        case 'PARTIAL_KASKO':
          distribution.liability = 3449;
          distribution.partialKasko = basePremium - 3449;
          break;
        case 'FULL_KASKO':
          distribution.liability = 3449;
          distribution.partialKasko = basePremium * 0.25;
          distribution.kasko = basePremium - 3449 - basePremium * 0.25;
          break;
      }
    } else if (formData.vehicleType === 'TRUCK') {
      switch (formData.coverage) {
        case 'LIABILITY':
          distribution.liability = basePremium;
          break;
        case 'PARTIAL_KASKO':
          distribution.liability = 4842;
          distribution.partialKasko = basePremium - 4842;
          break;
        case 'FULL_KASKO':
          distribution.liability = 4842;
          distribution.partialKasko = basePremium * 0.36;
          distribution.kasko = basePremium - 4842 - basePremium * 0.36;
          break;
      }
    }

    if (formData.extras.includes('bilEkstra')) {
      const bilEkstra = EXTRAS.find((e) => e.id === 'bilEkstra');
      const bilEkstraPrice = bilEkstra.price + distribution.total * 0.1;
      distribution.extras.push({
        id: 'bilEkstra',
        label: bilEkstra.label,
        price: Math.round(bilEkstraPrice),
      });
      distribution.total = Math.round(distribution.total + bilEkstraPrice);
    }

    return distribution;
  };

  const handleAddToFleet = () => {
    if (
      !formData.vehicleType ||
      !formData.coverage ||
      !formData.bonusLevel ||
      !formData.mileage
    ) {
      alert('Vennligst fyll ut alle nødvendige felter.');
      return;
    }
    const vehiclePremium = calculatePremiumDistribution();
    setFleet((prevFleet) => [
      ...prevFleet,
      {
        ...vehiclePremium,
        name: `Kjøretøy ${prevFleet.length + 1}`,
        vehicleType: formData.vehicleType,
        coverage: formData.coverage,
        extras: formData.extras,
      },
    ]);
    handleReset();
  };

  const calculateFleetAverage = (type) => {
    if (fleet.length === 0) return 0;
    const total = fleet.reduce((sum, vehicle) => sum + (vehicle[type] || 0), 0);
    return Math.round(total / fleet.length);
  };

  const handleNameChange = (index, newName) => {
    const updatedFleet = [...fleet];
    updatedFleet[index].name = newName;
    setFleet(updatedFleet);
  };

  const handleDeleteVehicle = (index) => {
    const updatedFleet = fleet.filter((_, i) => i !== index);
    setFleet(updatedFleet);
  };

  const handleReset = () => {
    setFormData((prevData) => ({
      vehicleType: fleet.length > 0 ? fleet[0].vehicleType : prevData.vehicleType,
      carBrand: '',
      mileage: '20000',
      coverage: fleet.length > 0 ? fleet[0].coverage : prevData.coverage,
      bonusLevel: '75%',
      extras: fleet.length > 0 ? fleet[0].extras : prevData.extras,
    }));
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              p: 1,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CarIcon fontSize="large" />
          </Box>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Bilflåte
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              Beregn forsikringspremie for kjøretøyflåte
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            sx={{
              borderColor: 'rgba(99, 102, 241, 0.1)',
              bgcolor: 'rgba(99, 102, 241, 0.05)',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'rgba(99, 102, 241, 0.1)',
              },
            }}
          >
            Se tegningsregler
          </Button>
          <Button
            variant="outlined"
            size="small"
            sx={{
              borderColor: 'rgba(99, 102, 241, 0.1)',
              bgcolor: 'rgba(99, 102, 241, 0.05)',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'rgba(99, 102, 241, 0.1)',
              },
            }}
            onClick={handleReset}
          >
            Nullstill skjema
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 500,
                    color: 'text.primary',
                    mb: 2,
                  }}
                >
                  Kjøretøyinformasjon
                </Typography>
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Kjøretøytype</InputLabel>
                        <Select
                          name="vehicleType"
                          value={formData.vehicleType}
                          onChange={handleChange}
                          label="Kjøretøytype"
                          disabled={fleet.length > 0}
                        >
                          {Object.entries(VEHICLE_TYPES_FLÅTE).map(([key, label]) => (
                            <MenuItem
                              key={key}
                              value={key}
                              disabled={
                                (fleet.length > 0 &&
                                  fleet[0].vehicleType === 'ELECTRIC_LIGHT' &&
                                  key !== 'ELECTRIC_LIGHT') ||
                                (fleet.length > 0 &&
                                  fleet[0].vehicleType !== 'ELECTRIC_LIGHT' &&
                                  key === 'ELECTRIC_LIGHT')
                              }
                            >
                              {label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {formData.vehicleType === 'BUDGET' && (
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Bilmerke</InputLabel>
                          <Select
                            name="carBrand"
                            value={formData.carBrand}
                            onChange={handleChange}
                            label="Bilmerke"
                          >
                            {BUDGET_CAR_BRANDS.map((brand) => (
                              <MenuItem key={brand} value={brand}>
                                {brand}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </Grid>

              {/* Bruksinformasjon */}
              <Grid item xs={12}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 500, color: 'text.primary', mb: 2 }}
                >
                  Bruksinformasjon
                </Typography>
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Kjørelengde</InputLabel>
                        <Select
                          name="mileage"
                          value={formData.mileage}
                          onChange={handleChange}
                          label="Kjørelengde"
                        >
                          {MILEAGE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Bonus</InputLabel>
                        <Select
                          name="bonusLevel"
                          value={formData.bonusLevel}
                          onChange={handleChange}
                          label="Bonus"
                        >
                          {BONUS_LEVELS.map((level) => (
                            <MenuItem key={level} value={level}>
                              {level}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* Dekning */}
              <Grid item xs={12}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 500, color: 'text.primary', mb: 2 }}
                >
                  Dekning
                </Typography>
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Dekningstype</InputLabel>
                        <Select
                          name="coverage"
                          value={formData.coverage}
                          onChange={handleChange}
                          label="Dekningstype"
                          disabled={fleet.length > 0}
                        >
                          {Object.entries(COVERAGE_TYPES).map(([key, label]) => (
                            <MenuItem key={key} value={key}>
                              {label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* Tilleggsdekninger */}
              <Grid item xs={12}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 500, color: 'text.primary', mb: 2 }}
                >
                  Tilleggsdekninger
                </Typography>
                <Box
                  sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}
                >
                  <Grid container spacing={2}>
                    {EXTRAS.map(
                      (extra) =>
                        shouldShowExtra(extra.id) && (
                          <Grid item xs={12} md={6} key={extra.id}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={formData.extras.includes(extra.id)}
                                  onChange={() => handleExtraChange(extra.id)}
                                  size="small"
                                  disabled={fleet.length > 0}
                                />
                              }
                              label={
                                <Typography variant="body2">
                                  {extra.label}{' '}
                                  {extra.id !== 'bilEkstra' && (
                                    <span style={{ color: 'text.secondary' }}>
                                      ({extra.price} kr)
                                    </span>
                                  )}
                                </Typography>
                              }
                            />
                          </Grid>
                        )
                    )}
                  </Grid>
                </Box>
              </Grid>

              {/* Add to Fleet Button */}
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handleAddToFleet}
                  sx={{
                    bgcolor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                >
                  Legg til i flåte
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Høyre side - Flåtevisning */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              borderRadius: 2,
              bgcolor: 'background.paper',
              position: 'sticky',
              top: 24,
            }}
          >
            {fleet.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'text.secondary',
                  textAlign: 'center',
                }}
              >
                <Typography variant="body1">
                  Legg til kjøretøy i Bilflåte for at priser skal vises
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                {/* Fleet Average Premium */}
                <Box
                  sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: 1,
                    bgcolor: 'primary.main',
                    color: 'white',
                  }}
                >
                  <Typography variant="body1" sx={{ mb: 1, opacity: 0.9 }}>
                    Gjennomsnittlig total premie
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {calculateFleetAverage('total').toLocaleString('nb-NO')} kr
                  </Typography>
                </Box>

                {/* Average for Each Coverage */}
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 2, color: 'text.secondary' }}
                >
                  Gjennomsnitt per dekning
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="body2">Ansvar</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {calculateFleetAverage('liability').toLocaleString(
                        'nb-NO'
                      )}{' '}
                      kr
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="body2">Delkasko</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {calculateFleetAverage('partialKasko').toLocaleString(
                        'nb-NO'
                      )}{' '}
                      kr
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="body2">Kasko</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {calculateFleetAverage('kasko').toLocaleString('nb-NO')}{' '}
                      kr
                    </Typography>
                  </Box>
                </Box>

                {/* Fleet Details */}
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 2, color: 'text.secondary' }}
                >
                  Kjøretøy i flåte
                </Typography>
                <Box sx={{ mb: 3 }}>
                  {fleet.map((vehicle, index) => (
                    <Accordion key={index}>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={`panel${index}-content`}
                        id={`panel${index}-header`}
                      >
                        <TextField
                          value={vehicle.name}
                          onChange={(e) =>
                            handleNameChange(index, e.target.value)
                          }
                          variant="standard"
                          sx={{ flexGrow: 1 }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {(vehicle.total || 0).toLocaleString('nb-NO')} kr
                        </Typography>
                        <IconButton
                          onClick={() => handleDeleteVehicle(index)}
                          size="small"
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Typography variant="body2">Ansvar:</Typography>
                            <Typography variant="body2">
                              {(vehicle.liability || 0).toLocaleString('nb-NO')} kr
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Typography variant="body2">Delkasko:</Typography>
                            <Typography variant="body2">
                              {(vehicle.partialKasko || 0).toLocaleString('nb-NO')} kr
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Typography variant="body2">Kasko:</Typography>
                            <Typography variant="body2">
                              {(vehicle.kasko || 0).toLocaleString('nb-NO')} kr
                            </Typography>
                          </Box>
                          <Typography variant="body2">Tillegg:</Typography>
                          {vehicle.extras.map((extra) => (
                            <Box
                              key={extra.id}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Typography variant="body2">
                                {extra.label}:
                              </Typography>
                              <Typography variant="body2">
                                {(extra.price || 0).toLocaleString('nb-NO')} kr
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default FleetAutoCalculator;
