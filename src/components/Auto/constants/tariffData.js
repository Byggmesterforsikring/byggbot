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
      '75%': 6028,
      '70%': 6571,
      '60%': 7234,
      '50%': 8138,
      '40%': 9042,
      '30%': 10006,
      '20%': 11152,
      '-10%': 13262
    },
    FULL_KASKO: {
      '75%': 9359,
      '70%': 10201,
      '60%': 11231,
      '50%': 12634,
      '40%': 14038,
      '30%': 15536,
      '20%': 17314,
      '-10%': 20589
    }
  },
  ELECTRIC_LIGHT: {
    LIABILITY: {
      '75%': 3250,
      '70%': 3542,
      '60%': 3900,
      '50%': 4387,
      '40%': 4874,
      '30%': 5394,
      '20%': 6012,
      '-10%': 7149
    },
    PARTIAL_KASKO: {
      '75%': 6476,
      '70%': 7059,
      '60%': 7771,
      '50%': 8742,
      '40%': 9714,
      '30%': 10750,
      '20%': 11980,
      '-10%': 14247
    },
    FULL_KASKO: {
      '75%': 10139,
      '70%': 11051,
      '60%': 12166,
      '50%': 13687,
      '40%': 15208,
      '30%': 16830,
      '20%': 18757,
      '-10%': 22305
    }
  },
  // ... fortsetter med andre kjøretøytyper
};

// Spesialtariff for rimeligere biler
export const BUDGET_TARIFFS = {
  LIABILITY: {
    '75%': 2949,
    '70%': 3215,
    '60%': 3359,
    '50%': 3981,
    '40%': 4424,
    '30%': 4896,
    '20%': 5456,
    '-10%': 6488
  },
  PARTIAL_KASKO: {
    '75%': 4822,
    '70%': 5256,
    '60%': 5787,
    '50%': 6510,
    '40%': 7234,
    '30%': 8005,
    '20%': 8921,
    '-10%': 10609
  },
  FULL_KASKO: {
    '75%': 6926,
    '70%': 7549,
    '60%': 8311,
    '50%': 9349,
    '40%': 10388,
    '30%': 11496,
    '20%': 12812,
    '-10%': 15236
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