import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  Calendar,
  Building2,
  LogOut,
  Shield
} from 'lucide-react';
import logo from '@/assets/logo.png';
import ChatBot from './ChatBot';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Kunden', href: '/clients', icon: Users },
  { name: 'Audits', href: '/audits', icon: ClipboardCheck },
  { name: 'Kalender', href: '/calendar', icon: Calendar },
  { name: 'Zertifizierer', href: '/certification-bodies', icon: Building2 },
];

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settingUpMfa, setSettingUpMfa] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleSetupMfa = async () => {
    setSettingUpMfa(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    });

    if (error) {
      toast({
        title: 'MFA-Setup fehlgeschlagen',
        description: error.message,
        variant: 'destructive',
      });
      setSettingUpMfa(false);
    } else if (data) {
      // Open MFA setup in a new flow - simplified for now
      toast({
        title: 'MFA wird eingerichtet',
        description: 'Bitte folgen Sie den Anweisungen in Ihrer Authenticator-App.',
      });
      setSettingUpMfa(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="flex items-center p-4 border-b border-sidebar-border">
          <img src={logo} alt="cert consulting pane·spark" className="h-12 w-auto" />
        </div>
        <nav className="p-4 space-y-2 flex-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
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
        </nav>
        
        {/* User section */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <div className="text-sm text-muted-foreground truncate px-2">
            {user?.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground"
            onClick={handleSetupMfa}
            disabled={settingUpMfa}
          >
            <Shield className="h-4 w-4" />
            MFA einrichten
          </Button>
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
};
