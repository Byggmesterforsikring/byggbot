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
    price: 210.0,
  },
  {
    id: 'leasing',
    label: 'Leasing/3. manns interesse',
    price: 199.0,
  },
  {
    id: 'limitedIdentification',
    label: 'Begrenset identifikasjon',
    price: 245.0,
  },
  {
    id: 'rentalCar15',
    label: 'Leiebil 15 dager',
    price: 375.0,
  },
  {
    id: 'rentalCar30',
    label: 'Leiebil 30 dager',
    price: 670.0,
  },
  {
    id: 'craneLiability',
    label: 'Kranansvar',
    price: 1700.0,
  },
  {
    id: 'bilEkstra',
    label: 'BilEkstra (10% + 500 kr)',
    price: 500.0,
  },
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
      '75%': 5818,
      '70%': 6361,
      '60%': 7024,
      '50%': 7928,
      '40%': 8832,
      '30%': 9796,
      '20%': 10942,
      '-10%': 13052
    },
    FULL_KASKO: {
      '75%': 9149,
      '70%': 10001,
      '60%': 11031,
      '50%': 12434,
      '40%': 13838,
      '30%': 15336,
      '20%': 17114,
      '-10%': 18389
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
      '75%': 6266,
      '70%': 6849,
      '60%': 7561,
      '50%': 8532,
      '40%': 9504,
      '30%': 10540,
      '20%': 11770,
      '-10%': 14037
    },
    FULL_KASKO: {
      '75%': 9929,
      '70%': 10841,
      '60%': 11956,
      '50%': 13477,
      '40%': 15008,
      '30%': 16620,
      '20%': 18547,
      '-10%': 22095
    }
  },
  PRIVATE_MEDIUM: {
    LIABILITY: {
      '75%': 4087,
      '70%': 4455,
      '60%': 4904,
      '50%': 5517,
      '40%': 6130,
      '30%': 6784,
      '20%': 7560,
      '-10%': 8991
    },
    PARTIAL_KASKO: {
      '75%': 6639,
      '70%': 7255,
      '60%': 8009,
      '50%': 9036,
      '40%': 10063,
      '30%': 11159,
      '20%': 12460,
      '-10%': 14857
    },
    FULL_KASKO: {
      '75%': 11287,
      '70%': 12322,
      '60%': 13587,
      '50%': 15312,
      '40%': 17036,
      '30%': 18876,
      '20%': 21060,
      '-10%': 25084
    }
  },
  TRUCK: {
    LIABILITY: {
      '75%': 6120,
      '70%': 6671,
      '60%': 7344,
      '50%': 8262,
      '40%': 9180,
      '30%': 10159,
      '20%': 11322,
      '-10%': 13464
    },
    PARTIAL_KASKO: {
      '75%': 11046,
      '70%': 12059,
      '60%': 13297,
      '50%': 14996,
      '40%': 16684,
      '30%': 18485,
      '20%': 20614,
      '-10%': 24553
    },
    FULL_KASKO: {
      '70%': 15847,
      '75%': 14521,
      '60%': 17467,
      '50%': 19677,
      '40%': 21886,
      '30%': 24243,
      '20%': 27042,
      '-10%': 32198
    }
  }
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
    '75%': 4822 - 210,
    '70%': 5256 - 210,
    '60%': 5787 - 210,
    '50%': 6510 - 210,
    '40%': 7234 - 210,
    '30%': 8005 - 210,
    '20%': 8921 - 210,
    '-10%': 10609 - 210
  },
  FULL_KASKO: {
    '75%': 6926 - 210,
    '70%': 7549 - 210,
    '60%': 8311 - 210,
    '50%': 9349 - 210,
    '40%': 10388 - 210,
    '30%': 11496 - 210,
    '20%': 12812 - 210,
    '-10%': 15236 - 210
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
  PRIVATE_MEDIUM: MILEAGE_OPTIONS.reduce((acc, { value, factor }) => {
    acc[value] = factor;
    return acc;
  }, {}),
  TRUCK: MILEAGE_OPTIONS.reduce((acc, { value, factor }) => {
    acc[value] = factor;
    return acc;
  }, {})
};

// Tariff tables will be added here 