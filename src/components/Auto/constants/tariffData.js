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

// Tariff tables will be added here 