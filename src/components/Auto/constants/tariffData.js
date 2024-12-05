export const VEHICLE_TYPES = {
  PRIVATE_LIGHT: 'Privat- og firmabiler inntil 3,5 tonn',
  ELECTRIC_LIGHT: 'El-biler inntil 3,5 tonn',
  BUDGET: 'Rimeligere biler (spesialtariff)',
  PRIVATE_MEDIUM: 'Privat- og firmabiler 3,5 - 7,499 tonn',
  TRUCK: 'Lastebiler fom 7,5 tonn'
};

export const COVERAGE_TYPES = {
  LIABILITY: 'Ansvar',
  PARTIAL_KASKO: 'Delkasko',
  FULL_KASKO: 'Kasko'
};

export const BONUS_LEVELS = [
  '75%', '70%', '60%', '50%', '40%', '30%', '20%', '-10%'
];

export const BUDGET_CAR_BRANDS = [
  'Ford Connect',
  'Citroen Berlingo',
  'Nissan Kubistar',
  'Toyota Yaris Verso',
  'Ford Courier',
  'Opel Combo',
  'Renault Kangoo',
  'Mercedes-Benz Citan',
  'Fiat Doblo',
  'Peugeot Partner',
  'Seat Inca',
  'Annet'
];

export const EXTRAS = [
  {
    id: 'driverAccident',
    label: 'Fører- og passasjerulykke',
    price: 210.00
  },
  {
    id: 'leasing',
    label: 'Leasing/3. manns interesse',
    price: 199.00
  },
  {
    id: 'limitedIdentification',
    label: 'Begrenset identifikasjon',
    price: 245.00
  },
  {
    id: 'fireTheft',
    label: 'Brann/Tyveri',
    price: 619.50
  },
  {
    id: 'rentalCar15',
    label: 'Leiebil 15 dager',
    price: 375.00
  },
  {
    id: 'rentalCar30',
    label: 'Leiebil 30 dager',
    price: 670.00
  },
  {
    id: 'craneLiability',
    label: 'Kranansvar',
    price: 1700.00
  }
];

// Tariff-tabeller for ulike kjøretøytyper og dekninger
export const TARIFFS = {
  PRIVATE_LIGHT: {
    LIABILITY: {
      '75%': 2949,
      '70%': 3215,
      '60%': 3539,
      '50%': 3981,
      '40%': 4424,
      '30%': 4896,
      '20%': 5456,
      '-10%': 6488
    },
    PARTIAL_KASKO: {
      '75%': 4123,
      '70%': 4498,
      '60%': 4948,
      '50%': 5570,
      '40%': 6189,
      '30%': 6850,
      '20%': 7634,
      '-10%': 9079
    },
    FULL_KASKO: {
      '75%': 6598,
      '70%': 7197,
      '60%': 7917,
      '50%': 8907,
      '40%': 9897,
      '30%': 10960,
      '20%': 12214,
      '-10%': 14526
    }
  },
  ELECTRIC_LIGHT: {
    LIABILITY: {
      '75%': 2359,
      '70%': 2572,
      '60%': 2831,
      '50%': 3185,
      '40%': 3539,
      '30%': 3917,
      '20%': 4365,
      '-10%': 5190
    },
    PARTIAL_KASKO: {
      '75%': 3298,
      '70%': 3598,
      '60%': 3958,
      '50%': 4456,
      '40%': 4951,
      '30%': 5480,
      '20%': 6107,
      '-10%': 7263
    },
    FULL_KASKO: {
      '75%': 5278,
      '70%': 5758,
      '60%': 6334,
      '50%': 7126,
      '40%': 7918,
      '30%': 8768,
      '20%': 9771,
      '-10%': 11621
    }
  },
  // ... fortsetter med andre kjøretøytyper
};

// Spesialtariff for rimeligere biler
export const BUDGET_TARIFFS = {
  LIABILITY: {
    '75%': 2359,
    '70%': 2572,
    '60%': 2831,
    '50%': 3185,
    '40%': 3539,
    '30%': 3917,
    '20%': 4365,
    '-10%': 5190
  },
  PARTIAL_KASKO: {
    '75%': 3298,
    '70%': 3598,
    '60%': 3958,
    '50%': 4456,
    '40%': 4951,
    '30%': 5480,
    '20%': 6107,
    '-10%': 7263
  },
  FULL_KASKO: {
    '75%': 5278,
    '70%': 5758,
    '60%': 6334,
    '50%': 7126,
    '40%': 7918,
    '30%': 8768,
    '20%': 9771,
    '-10%': 11621
  }
};

export const MILEAGE_OPTIONS = [
  { value: 10000, label: '10.000 km', factor: 0.90 },
  { value: 12000, label: '12.000 km', factor: 0.92 },
  { value: 16000, label: '16.000 km', factor: 0.96 },
  { value: 20000, label: '20.000 km', factor: 1.00 },
  { value: 25000, label: '25.000 km', factor: 1.05 },
  { value: 30000, label: '30.000 km', factor: 1.10 },
  { value: 35000, label: '35.000 km', factor: 1.15 },
  { value: 999999, label: 'Fri kjørelengde', factor: 1.25 }
];

export const MILEAGE_FACTORS = {
  PRIVATE_LIGHT: MILEAGE_OPTIONS.reduce((acc, { value, factor }) => {
    acc[value] = factor;
    return acc;
  }, {}),
  ELECTRIC_LIGHT: MILEAGE_OPTIONS.reduce((acc, { value, factor }) => {
    acc[value] = factor;
    return acc;
  }, {}),
  TRUCK: MILEAGE_OPTIONS.reduce((acc, { value, factor }) => {
    acc[value] = factor;
    return acc;
  }, {})
};

// Tariff tables will be added here 