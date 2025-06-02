export const MENU_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: 'LayoutDashboard',
    defaultRequiredRole: null,
  },
  {
    id: 'garanti', // ID for Garanti-hovedmeny
    label: 'Garanti',
    icon: 'FileText',
    defaultRequiredRole: null,
    requiredModule: 'Garanti', // Hovedmenyen krever 'Garanti'-modulen
    subItems: [
      {
        id: 'prosjektoversikt',
        label: 'Prosjektoversikt',
        path: '/garanti/saker',
        defaultRequiredRole: null,
        // Arver 'Garanti'-modulkravet, eller kan settes eksplisitt: requiredModule: 'Garanti'
      },
      {
        id: 'selskaper_submenu', // Endret ID for å være unik som subitem
        label: 'Selskaper',
        path: '/garanti/selskaper',
        defaultRequiredRole: null,
        requiredModule: 'Garanti', // Dette subitemet krever også 'Garanti'-modulen
      },
      // { // Valgfritt: Direkte lenke til å starte ny prosess
      //   id: 'garanti-ny-prosess',
      //   label: 'Nytt Garantiprosjekt',
      //   path: '/garanti/prosjekt/ny',
      //   defaultRequiredRole: null,
      //   requiredModule: 'Garanti',
      // },
    ],
  },
  {
    id: 'reports',
    label: 'Rapporter',
    icon: 'AreaChart',
    defaultRequiredRole: null,
    requiredModule: 'Rapporter',
    subItems: [
      // ... subitems for rapporter ...
      {
        id: 'nysalgsrapport',
        label: 'Nysalgsrapport',
        path: '/reports?type=nysalg',
        defaultRequiredRole: null,
      },
      {
        id: 'garantirapport',
        label: 'Garantirapport',
        path: '/reports?type=garanti', // Denne er både rapport og garanti-relatert
        defaultRequiredRole: null,
        // Kan evt. også kreve 'Garanti'-modulen i tillegg hvis man vil være streng:
        // requiredModules: ['Rapporter', 'Garanti'] // Sidebar.js må da støtte array
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
    // requiredModule: 'Tegningsregler' // Hvis aktuell
  },
  {
    id: 'ai-chat',
    label: 'ByggBot',
    path: '/ai-chat',
    icon: 'Bot',
    defaultRequiredRole: null,
    // requiredModule: 'AIChat' // Hvis aktuell
  },
  {
    id: 'skade',
    label: 'Skade',
    icon: 'Receipt',
    defaultRequiredRole: null,
    requiredModule: 'Skade',
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
    id: 'admin',
    label: 'Administrasjon',
    icon: 'ShieldCheck',
    defaultRequiredRole: 'ADMIN', // Admin-rolle gir tilgang til gruppen
    // Forutsetter at admin-brukeren har de nødvendige Admin-modulene tildelt
    // for at sub-items skal vises.
    subItems: [
      {
        id: 'user-management',
        label: 'Brukere',
        path: '/admin/users',
        defaultRequiredRole: 'ADMIN',
        requiredModule: 'AdminUserManagement',
      },
      {
        id: 'invoice-feedback',
        label: 'Fakturabehandling',
        path: '/admin/invoice-feedback',
        defaultRequiredRole: 'ADMIN',
        // requiredModule: 'AdminInvoiceFeedback' // Hvis aktuell
      },
      {
        id: 'ai-prompts',
        label: 'AI Prompter',
        path: '/admin/ai-prompts',
        defaultRequiredRole: 'ADMIN',
        // requiredModule: 'AdminAIPrompts' // Hvis aktuell
      },
    ],
  },
  {
    id: 'calculators',
    label: 'Kalkulatorer',
    icon: 'Calculator',
    defaultRequiredRole: null,
    requiredModule: 'Kalkulatorer', // Krever "Kalkulatorer"-modulen for hovedpunktet
    subItems: [
      {
        id: 'auto',
        label: 'Auto',
        path: '/calculators/auto',
        defaultRequiredRole: 'USER',
        requiredModule: 'Kalkulatorer', // Kan arve, men eksplisitt for tydelighet
      },
      {
        id: 'fleet-auto',
        label: 'Bilflåte',
        path: '/calculators/fleet-auto',
        defaultRequiredRole: 'USER',
        requiredModule: 'Kalkulatorer',
      },
      {
        id: 'trailer',
        label: 'Tilhenger',
        path: '/calculators/trailer',
        defaultRequiredRole: 'USER', // Var USER i tidligere versjon du viste
        requiredModule: 'Kalkulatorer',
      },
      {
        id: 'arbeidsmaskin',
        label: 'Arbeidsmaskin',
        path: '/calculators/arbeidsmaskin',
        defaultRequiredRole: 'USER',
        requiredModule: 'Kalkulatorer',
      },
      {
        id: 'lastebil',
        label: 'Lastebil',
        path: '/calculators/lastebil',
        defaultRequiredRole: 'EDITOR',
        requiredModule: 'Kalkulatorer',
      },
      {
        id: 'veterankjoeretoy',
        label: 'Veterankjøretøy',
        path: '/calculators/veterankjoeretoy',
        defaultRequiredRole: 'EDITOR',
        requiredModule: 'Kalkulatorer',
      },
    ],
  },
]; 