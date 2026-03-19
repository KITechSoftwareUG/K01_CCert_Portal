import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Calendar,
  Building2,
  UserCheck,
  LogOut,
  Award,
  ListChecks,
  ChevronDown,
  ChevronRight,
  Menu,
  History
} from 'lucide-react';
import logo from '@/assets/logo-navy.jpg';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from './ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: ReactNode;
}

const mainNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Kunden', href: '/clients', icon: Users },
  { name: 'Audits', href: '/audits', icon: ClipboardCheck },
  { name: 'Zertifizierer', href: '/certification-bodies', icon: Building2 },
  { name: 'Auditoren', href: '/auditors', icon: UserCheck },
  { name: 'Berater', href: '/consultants', icon: UserCheck },
  { name: 'Kalender', href: '/calendar', icon: Calendar },
  { name: 'Aktivitäten', href: '/activity-log', icon: History },
];

const settingsNavigation = [
  { name: 'Zertifizierungen', href: '/settings/certifications', icon: Award },
  { name: 'Audit-Vorlagen', href: '/settings/audit-templates', icon: ListChecks },
];

const SidebarContent = ({
  location,
  settingsOpen,
  setSettingsOpen,
  user,
  handleSignOut,
  onNavClick,
}: {
  location: ReturnType<typeof useLocation>;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  user: any;
  handleSignOut: () => void;
  onNavClick?: () => void;
}) => {
  const isSettingsActive = location.pathname.startsWith('/settings');

  return (
    <>
      <div className="flex items-center justify-center p-4 bg-white border-b border-sidebar-border">
        <img src={logo} alt="cert consulting" className="h-16 w-auto" />
      </div>
      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
        {mainNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavClick}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}

        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors',
                isSettingsActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <div className="flex items-center gap-3">
                <ListChecks className="h-5 w-5" />
                <span className="font-medium">Vorlagen</span>
              </div>
              {settingsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 ml-4 space-y-1">
            {settingsNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onNavClick}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="text-sm text-muted-foreground truncate px-2">
          {user?.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </Button>
      </div>
    </>
  );
};

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [settingsOpen, setSettingsOpen] = useState(
    location.pathname.startsWith('/settings')
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-sidebar border-b border-sidebar-border">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
              <div className="flex flex-col h-full">
                <SidebarContent
                  location={location}
                  settingsOpen={settingsOpen}
                  setSettingsOpen={setSettingsOpen}
                  user={user}
                  handleSignOut={handleSignOut}
                  onNavClick={() => setSheetOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
          <img src={logo} alt="cert consulting" className="h-8 w-auto" />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0 h-screen">
        <SidebarContent
          location={location}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          user={user}
          handleSignOut={handleSignOut}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};
