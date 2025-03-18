export const MENU_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: 'Dashboard',
  },
  {
    id: 'reports',
    label: 'Rapporter',
    path: '/reports',
    icon: 'Assessment',
    subItems: [
      {
        id: 'nysalgsrapport',
        label: 'Nysalgsrapport',
        path: '/reports?type=nysalg',
      },
      {
        id: 'garantirapport',
        label: 'Garantirapport',
        path: '/reports?type=garanti',
      },
      {
        id: 'skaderapport',
        label: 'Skaderapport',
        path: '/reports?type=skade',
      }
    ],
  },
  {
    id: 'tegningsregler',
    label: 'Tegningsregler',
    path: '/tegningsregler',
    icon: 'Gavel',
  },
  {
    id: 'ai-chat',
    label: 'ByggBot',
    path: '/ai-chat',
    icon: 'SmartToy',
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
  {
    id: 'admin',
    label: 'Administrasjon',
    icon: 'AdminPanelSettings',
    requiredRole: 'ADMIN',
    subItems: [
      {
        id: 'user-management',
        label: 'Brukere',
        path: '/admin/users',
      }
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