export const MENU_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: 'LayoutDashboard',
  },
  {
    id: 'reports',
    label: 'Rapporter',
    path: '/reports',
    icon: 'AreaChart',
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
    icon: 'Bot',
  },
  {
    id: 'skade',
    label: 'Skade',
    icon: 'Receipt',
    subItems: [
      {
        id: 'faktura-opplasting',
        label: 'Fakturaopplasting',
        path: '/skade/betalinger/faktura',
      },
    ],
  },
  {
    id: 'calculators',
    label: 'Kalkulatorer',
    icon: 'Calculator',
    subItems: [
      {
        id: 'auto',
        label: 'Auto',
        path: '/calculators/auto',
        requiredRole: 'USER',
      },
      {
        id: 'fleet-auto',
        label: 'Bilflåte',
        path: '/calculators/fleet-auto',
        requiredRole: 'USER',
      },
      {
        id: 'trailer',
        label: 'Tilhenger',
        icon: 'Truck',
        path: '/calculators/trailer',
        requiredRole: 'USER',
      },
      {
        id: 'arbeidsmaskin',
        label: 'Arbeidsmaskin',
        path: '/calculators/arbeidsmaskin',
        requiredRole: 'USER',
      },
      {
        id: 'lastebil',
        label: 'Lastebil',
        path: '/calculators/lastebil',
        requiredRole: 'EDITOR',
      },
      {
        id: 'veterankjoeretoy',
        label: 'Veterankjøretøy',
        path: '/calculators/veterankjoeretoy',
        requiredRole: 'EDITOR',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administrasjon',
    icon: 'ShieldCheck',
    requiredRole: 'ADMIN',
    subItems: [
      {
        id: 'user-management',
        label: 'Brukere',
        path: '/admin/users',
      },
      {
        id: 'invoice-feedback',
        label: 'Fakturabehandling',
        path: '/admin/invoice-feedback',
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