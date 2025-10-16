import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, AreaChart, Gavel, Bot, Calculator, ShieldCheck, Truck, Receipt, FileText, Building2, TrendingUp, BarChart3 } from 'lucide-react';
import { MENU_ITEMS } from '../../constants/menuStructure';
import logo from '../../assets/logo.svg';
import authManager from '../../auth/AuthManager';
import packageJson from '../../../package.json';
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { cn } from "~/lib/utils";
const { version } = packageJson;

const isDev = process.env.NODE_ENV === 'development';

const devlog = (message, data = null) => {
  if (isDev) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] Sidebar: ${message}`;
    if (data) console.log(logMessage, data); else console.log(logMessage);
  }
};

const iconMap = {
  LayoutDashboard, AreaChart, Gavel, Bot, Calculator, ShieldCheck, Truck, Receipt, FileText, Building2, TrendingUp, BarChart3,
};

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUserDetails, setCurrentUserDetails] = useState(undefined); // Start som undefined for å skille fra null (ingen bruker)
  const [isUserDetailsLoading, setIsUserDetailsLoading] = useState(true);
  const [activeAccordionItem, setActiveAccordionItem] = useState(null);
  const [customMenuAccess, setCustomMenuAccess] = useState({});
  const [menuAccessLoaded, setMenuAccessLoaded] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsUserDetailsLoading(true);
      setMenuAccessLoaded(false);
      try {
        // Hent brukerdetaljer
        const userDetailsFromAuth = authManager.getCurrentUserDetails();

        if (userDetailsFromAuth && userDetailsFromAuth.email) {
          devlog('Bruker funnet i AuthManager, henter/bekrefter detaljer for:', { email: userDetailsFromAuth.email });
          if (window.electron && window.electron.userV2 && window.electron.userV2.getUserByEmail) {
            const userResult = await window.electron.userV2.getUserByEmail(userDetailsFromAuth.email);
            if (userResult.success && userResult.data) {
              setCurrentUserDetails(userResult.data);
              devlog('Mottatt/bekreftet brukerdetaljer i Sidebar:', userResult.data);
            } else {
              devlog('Kunne ikke hente/bekrefte brukerdetaljer fra API i Sidebar:', userResult.error);
              setCurrentUserDetails(null);
            }
          } else {
            devlog('User API V2 (getUserByEmail) ikke tilgjengelig i Sidebar.');
            setCurrentUserDetails(null);
          }
        } else {
          devlog('Ingen innlogget bruker funnet via authManager.getCurrentUserDetails() i Sidebar.');
          setCurrentUserDetails(null);
        }

        // Hent custom menu access
        if (window.electron && window.electron.menuAccess && window.electron.menuAccess.getSettings) {
          const result = await window.electron.menuAccess.getSettings();
          if (result.success && result.data && result.data.length > 0) {
            const accessMap = {};
            result.data.forEach(item => { accessMap[item.id] = item.requiredRole; });
            setCustomMenuAccess(accessMap);
            devlog('Lastet custom menytilganger', { count: result.data.length });
          }
        } else {
          devlog('API for menuAccess.getSettings ikke tilgjengelig.');
        }

      } catch (error) {
        devlog('Feil ved henting av initialdata for Sidebar:', { error: error.message });
        setCurrentUserDetails(null);
      } finally {
        setIsUserDetailsLoading(false);
        setMenuAccessLoaded(true);
      }
    };
    fetchInitialData();
  }, []); // Kjøres bare ved mount. For re-fetch ved login/logout trengs annen mekanisme.

  const getIcon = (iconName) => iconMap[iconName] ? React.createElement(iconMap[iconName], { className: "h-5 w-5" }) : null;

  const handleItemClick = (item) => {
    if (!item.subItems && item.path) {
      navigate(item.path);
    }
  };

  const isItemActive = (path) => {
    if (!path) return false;
    if (path.startsWith('/reports?')) {
      return location.pathname === '/reports' && location.search.includes(path.split('?')[1]);
    }
    return location.pathname === path;
  };

  // Oppdatert canShowMenuItem
  const canShowMenuItem = useCallback((item) => {
    if (!item) return false;

    const brukerRoller = currentUserDetails?.roller?.map(r => r.role_name) || [];
    const brukerModuler = currentUserDetails?.modulTilganger?.map(mt => mt.navn) || [];
    const customMenuTilganger = currentUserDetails?.customMenuTilganger || [];

    // Sjekk for individuell menytilgang først - dette gjelder ALLE brukere, inkludert ADMIN
    const individuellTilgang = customMenuTilganger.find(t => t.menuId === item.id);
    if (individuellTilgang && individuellTilgang.overrideDefault) {
      devlog('[canShowMenuItem] Individuell tilgang (gjelder også ADMIN):', { item: item.label, harTilgang: individuellTilgang.harTilgang });
      return individuellTilgang.harTilgang;
    }

    // Hvis brukerdata eller menytilgangsdata fortsatt lastes, ikke render menyen ennå for å unngå flimring/feil
    // Men vis elementer som ikke har noen krav.
    if (!item.requiredRole && !item.defaultRequiredRole && !item.requiredModule) {
      return true;
    }

    // Hvis vi venter på data og elementet har krav, skjul det foreløpig.
    if (isUserDetailsLoading || !menuAccessLoaded) return false;

    // Hvis ingen bruker er logget inn/funnet (currentUserDetails er null, ikke undefined)
    if (currentUserDetails === null) {
      return false; // Ikke vis elementer med krav hvis ingen gyldig bruker
    }
    // Hvis currentUserDetails fortsatt er undefined (init state før første fetch)
    if (currentUserDetails === undefined) return false;

    // Fallback til rolle-basert tilgang
    const customMenuRole = customMenuAccess[item.id];
    const requiredRole = customMenuRole !== undefined ? customMenuRole : item.requiredRole || item.defaultRequiredRole;

    let harPåkrevdRolle = true;
    if (requiredRole) {
      harPåkrevdRolle = brukerRoller.includes(requiredRole) || brukerRoller.includes('ADMIN');
    }

    let harTilgangTilModul = true;
    if (item.requiredModule) {
      harTilgangTilModul = brukerModuler.some(modul => modul.toLowerCase() === item.requiredModule.toLowerCase());
    }

    devlog('[canShowMenuItem]', {
      item: item.label,
      reqRole: requiredRole,
      hasRole: harPåkrevdRolle,
      reqMod: item.requiredModule,
      hasMod: harTilgangTilModul,
      individuell: individuellTilgang ? 'Ja' : 'Nei'
    });
    return harPåkrevdRolle && harTilgangTilModul;
  }, [currentUserDetails, isUserDetailsLoading, customMenuAccess, menuAccessLoaded]);

  useEffect(() => {
    let determinedActiveParent = null;

    MENU_ITEMS.forEach(item => {
      // Hopp over items som ikke skal vises eller ikke har subItems
      if (!item.subItems || !canShowMenuItem(item)) {
        return;
      }

      const isActiveSubItemPresent = item.subItems.some(subItem =>
        isItemActive(subItem.path) && canShowMenuItem(subItem)
      );

      if (isActiveSubItemPresent) {
        determinedActiveParent = item.id;
      }
    });

    // Sett bare hvis det er en endring for å unngå unødvendige re-renders
    // Eller hvis vi navigerer til en side der ingen accordion skal være åpen
    if (activeAccordionItem !== determinedActiveParent) {
      setActiveAccordionItem(determinedActiveParent);
    }
    // Dependency array: reager på endring i location og når canShowMenuItem-funksjonen (og dens avhengigheter) endres.
    // Dette sikrer at riktig panel er åpent ved navigasjon og ved endring i brukerens tilganger.
  }, [location, canShowMenuItem]); // Fjernet activeAccordionItem, la til determinedActiveParent indirekte via logikken

  // JSX for Sidebar ...
  // Loading state for hele sidebaren hvis brukerdata ikke er lastet
  if (currentUserDetails === undefined) { // Venter på første last av brukerdata
    return (
      <div className="w-[260px] flex-shrink-0 bg-card text-card-foreground border-r border-border flex flex-col h-screen shadow-sm overflow-hidden">
        <div className="flex items-center p-4 pt-5 pb-[19px] h-[68px]">
          <img src={logo} alt="BMF Pro Logo" className="h-9 w-auto" />
        </div>
        <Separator className="bg-border/60" />
        <div className="p-4 text-muted-foreground">Laster brukerdata...</div>
      </div>
    );
  }

  return (
    <div className="w-[260px] flex-shrink-0 bg-card text-card-foreground border-r border-border flex flex-col h-screen shadow-sm overflow-hidden">
      <div className="flex items-center p-4 pt-5 pb-[19px] h-[68px]">
        <img src={logo} alt="BMF Pro Logo" className="h-9 w-auto" />
      </div>
      <Separator className="bg-border/60" />
      <div className="flex-grow px-3 py-3 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/30 scrollbar-track-transparent">
        <Accordion
          type="single"
          collapsible
          value={activeAccordionItem}
          onValueChange={setActiveAccordionItem}
          className="w-full"
        >
          {MENU_ITEMS.filter(Boolean).map((item) => {
            if (!canShowMenuItem(item)) return null; // Hvis bruker ikke har tilgang, ikke render elementet

            const isActive = item.subItems
              ? item.subItems.some(sub => isItemActive(sub.path) && canShowMenuItem(sub))
              : isItemActive(item.path);

            return item.subItems ? (
              <AccordionItem key={item.id} value={item.id} className="border-none">
                <AccordionTrigger
                  className={cn(
                    "flex items-center justify-between w-full h-10 px-2 rounded-lg text-base font-medium text-left",
                    "hover:bg-muted hover:text-foreground",
                    isActive && !activeAccordionItem // For å unngå dobbel styling når accordion er åpen via activeAccordionItem
                      ? "bg-muted data-[state=closed]:bg-primary/10 data-[state=closed]:text-primary data-[state=closed]:font-semibold"
                      : "",
                    "data-[state=open]:bg-muted"
                  )}
                >
                  <div className="flex items-center">
                    <span className={cn("h-6 w-6 flex items-center justify-center mr-3", isActive ? "text-primary" : "text-muted-foreground/80")}>
                      {getIcon(item.icon)}
                    </span>
                    <span className={cn(isActive ? "text-primary font-semibold" : "text-muted-foreground")}>
                      {item.label}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-0 pl-6 pr-1">
                  <div className="flex flex-col gap-1 border-l border-border/80 pl-3">
                    {item.subItems.filter(subItem => canShowMenuItem(subItem)).map((subItem) => (
                      <Button
                        key={subItem.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(subItem.path || '/')}
                        data-state={isItemActive(subItem.path) ? 'active' : 'inactive'}
                        className={cn(
                          "w-full justify-start h-8 px-2 font-normal text-sm",
                          "text-muted-foreground hover:text-primary hover:bg-primary/5",
                          "data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:bg-primary/10"
                        )}
                      >
                        <span className={cn("mr-3 h-1.5 w-1.5 flex-shrink-0 rounded-full", isItemActive(subItem.path) ? "bg-primary" : "bg-muted-foreground/50")} />
                        {subItem.label}
                      </Button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ) : (
              <Button
                key={item.id}
                variant="ghost"
                size="default"
                onClick={() => handleItemClick(item)}
                data-state={isItemActive(item.path) ? 'active' : 'inactive'}
                className={cn(
                  "w-full justify-start h-10 px-2 text-base font-medium flex items-center rounded-lg",
                  "text-muted-foreground hover:text-foreground hover:bg-muted",
                  "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold"
                )}
              >
                <span className={cn("h-6 w-6 flex items-center justify-center mr-3", isItemActive(item.path) ? "text-primary" : "text-muted-foreground/80")}>
                  {getIcon(item.icon)}
                </span>
                {item.label}
              </Button>
            );
          })}
        </Accordion>
      </div>
      <div className="mt-auto p-2 border-t border-border/60 flex justify-center bg-background/40">
        <span className="text-xs font-medium text-muted-foreground/80">
          Versjon {version} {isDev ? '(Dev)' : ''}
        </span>
      </div>
    </div>
  );
}

export default Sidebar; 