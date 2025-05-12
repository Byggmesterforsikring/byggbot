export const MENU_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: 'LayoutDashboard',
    defaultRequiredRole: null,
  },
  {
    id: 'reports',
    label: 'Rapporter',
    path: '/reports',
    icon: 'AreaChart',
    defaultRequiredRole: null,
    subItems: [
      {
        id: 'nysalgsrapport',
        label: 'Nysalgsrapport',
        path: '/reports?type=nysalg',
        defaultRequiredRole: null,
      },
      {
        id: 'garantirapport',
        label: 'Garantirapport',
        path: '/reports?type=garanti',
        defaultRequiredRole: null,
      },
      {
        id: 'skaderapport',
        label: 'Skaderapport',
        path: '/reports?type=skade',
        defaultRequiredRole: null,
      }
    ],
  },
  {
    id: 'tegningsregler',
    label: 'Tegningsregler',
    path: '/tegningsregler',
    icon: 'Gavel',
    defaultRequiredRole: null,
  },
  {
    id: 'ai-chat',
    label: 'ByggBot',
    path: '/ai-chat',
    icon: 'Bot',
    defaultRequiredRole: null,
  },
  {
    id: 'skade',
    label: 'Skade',
    icon: 'Receipt',
    defaultRequiredRole: null,
    subItems: [
      {
        id: 'faktura-opplasting',
        label: 'Fakturaopplasting',
        path: '/skade/betalinger/faktura',
        defaultRequiredRole: null,
      },
    ],
  },
  {
    id: 'calculators',
    label: 'Kalkulatorer',
    icon: 'Calculator',
    defaultRequiredRole: null,
    subItems: [
      {
        id: 'auto',
        label: 'Auto',
        path: '/calculators/auto',
        defaultRequiredRole: 'USER',
      },
      {
        id: 'fleet-auto',
        label: 'Bilflåte',
        path: '/calculators/fleet-auto',
        defaultRequiredRole: 'USER',
      },
      {
        id: 'trailer',
        label: 'Tilhenger',
        icon: 'Truck',
        path: '/calculators/trailer',
        defaultRequiredRole: 'USER',
      },
      {
        id: 'arbeidsmaskin',
        label: 'Arbeidsmaskin',
        path: '/calculators/arbeidsmaskin',
        defaultRequiredRole: 'USER',
      },
      {
        id: 'lastebil',
        label: 'Lastebil',
        path: '/calculators/lastebil',
        defaultRequiredRole: 'EDITOR',
      },
      {
        id: 'veterankjoeretoy',
        label: 'Veterankjøretøy',
        path: '/calculators/veterankjoeretoy',
        defaultRequiredRole: 'EDITOR',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administrasjon',
    icon: 'ShieldCheck',
    defaultRequiredRole: 'ADMIN',
    subItems: [
      {
        id: 'user-management',
        label: 'Brukere',
        path: '/admin/users',
        defaultRequiredRole: 'ADMIN',
      },
      {
        id: 'invoice-feedback',
        label: 'Fakturabehandling',
        path: '/admin/invoice-feedback',
        defaultRequiredRole: 'ADMIN',
      },
      {
        id: 'ai-prompts',
        label: 'AI Prompter',
        path: '/admin/ai-prompts',
        defaultRequiredRole: 'ADMIN',
      },
      {
        id: 'menu-access',
        label: 'Menytilgang',
        path: '/admin/menu-access',
        defaultRequiredRole: 'ADMIN',
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