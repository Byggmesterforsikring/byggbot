import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, AreaChart, Gavel, Bot, Calculator, ShieldCheck, Truck, Receipt } from 'lucide-react';
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
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
};

const iconMap = {
  LayoutDashboard,
  AreaChart,
  Gavel,
  Bot,
  Calculator,
  ShieldCheck,
  Truck,
  Receipt,
};

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('USER');
  const [activeAccordionItem, setActiveAccordionItem] = useState(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const account = authManager.getCurrentAccount();
        if (account) {
          devlog('Henter brukerrolle for:', { email: account.username });
          const role = await authManager.getUserRole();
          devlog('Mottatt brukerrolle:', { role });
          setUserRole(role || 'USER');
        }
      } catch (error) {
        devlog('Feil ved henting av brukerrolle:', { error: error.message });
        setUserRole('USER');
      }
    };

    fetchUserRole();
  }, []);

  const getIcon = (iconName) => {
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
  };

  const handleItemClick = (item) => {
    if (!item.subItems && item.path) {
      navigate(item.path);
    }
  };

  useEffect(() => {
    let currentActiveParent = null;
    MENU_ITEMS.forEach(item => {
      if (item.subItems) {
        item.subItems.forEach(subItem => {
          if (isItemActive(subItem.path)) {
            currentActiveParent = item.id;
          }
        });
      }
    });
    setActiveAccordionItem(currentActiveParent);
  }, [location]);

  const isItemActive = (path) => {
    if (!path) return false;

    if (path.startsWith('/reports?')) {
      return location.pathname === '/reports' && location.search.includes(path.split('?')[1]);
    }
    return location.pathname === path;
  };

  const canShowMenuItem = (item) => {
    if (!item) return false;

    devlog('Sjekker tilgang for meny-item:', {
      label: item.label,
      requiredRole: item.requiredRole,
      userRole
    });
    if (!item.requiredRole) return true;
    return userRole === item.requiredRole || userRole === 'ADMIN';
  };

  return (
    <div className="w-[260px] flex-shrink-0 bg-card text-card-foreground border-r border-border flex flex-col h-screen shadow-sm overflow-hidden">
      <div className="flex items-center p-4 pt-5 pb-[19px] h-[68px]">
        <img
          src={logo}
          alt="BMF Pro Logo"
          className="h-9 w-auto"
        />
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
          {MENU_ITEMS.filter(Boolean).map((item) => (
            canShowMenuItem(item) && (
              item.subItems ? (
                <AccordionItem key={item.id} value={item.id} className="border-none">
                  <AccordionTrigger
                    className={cn(
                      "flex items-center justify-between w-full h-10 px-2 rounded-lg text-base font-medium text-left",
                      "hover:bg-muted hover:text-foreground data-[state=open]:bg-muted",
                    )}
                  >
                    <div className="flex items-center">
                      <span className={cn(
                        "h-6 w-6 flex items-center justify-center mr-3",
                        isItemActive(item.path) ? "text-primary" : "text-muted-foreground/80"
                      )}>
                        {getIcon(item.icon)}
                      </span>
                      <span className={cn(
                        isItemActive(item.path) ? "text-primary font-semibold" : "text-muted-foreground"
                      )}>
                        {item.label}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 pb-0 pl-6 pr-1">
                    <div className="flex flex-col gap-1 border-l border-border/80 pl-3">
                      {item.subItems.filter(Boolean).map((subItem) => (
                        canShowMenuItem(subItem) && (
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
                            <span className="mr-3 h-1.5 w-1.5 flex-shrink-0 rounded-full data-[state=active]:bg-primary bg-muted-foreground/50"></span>
                            {subItem.label}
                          </Button>
                        )
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
                  <span className="h-6 w-6 flex items-center justify-center mr-1 text-muted-foreground/80 data-[state=active]:text-primary">
                    {getIcon(item.icon)}
                  </span>
                  {item.label}
                </Button>
              )
            )
          ))}
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