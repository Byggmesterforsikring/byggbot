export const MENU_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: 'Dashboard',
  },
  {
    id: 'tegningsregler',
    label: 'Tegningsregler',
    path: '/tegningsregler',
    icon: 'Gavel',
  },
  {
    id: 'calculators',
    label: 'Kalkulatorer',
    icon: 'Calculate',
    subItems: [
      {
        id: 'auto',
        label: 'Auto',
        path: '/calculators/auto',
      },
      {
        id: 'fleet-auto',
        label: 'Bilflåte',
        path: '/calculators/fleet-auto',
      },
      {
        id: 'trailer',
        label: 'Tilhenger',
        icon: 'Trailer', // Use an appropriate icon
        path: '/calculators/trailer', // Ensure this matches the route path
      },
      {
        id: 'arbeidsmaskin',
        label: 'Arbeidsmaskin',
        path: '/calculators/arbeidsmaskin',
      },
    ],
  },
  // {
  //   id: 'documentation',
  //   label: 'Dokumentasjon',
  //   icon: 'Description',
  //   subItems: [
  //     {
  //       id: 'user-manuals',
  //       label: 'Brukermanualer',
  //       path: '/docs/manuals'
  //     },
  //     {
  //       id: 'report-docs',
  //       label: 'Rapportbeskrivelser',
  //       path: '/docs/reports'
  //     },
  //     {
  //       id: 'api-docs',
  //       label: 'API Dokumentasjon',
  //       path: '/docs/api'
  //     }
  //   ]
  // },
]; 