import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Check, Cloud, RefreshCw, Unplug, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface OutlookIntegrationProps {
  auditCount?: number;
}

export const OutlookIntegration = ({ auditCount = 5 }: OutlookIntegrationProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showOAuthDialog, setShowOAuthDialog] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncedEvents, setSyncedEvents] = useState(0);

  const simulateOAuth = async () => {
    setShowOAuthDialog(true);
    setIsConnecting(true);
    
    // Simulate OAuth redirect delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setShowOAuthDialog(false);
    setIsConnecting(false);
    setIsConnected(true);
    setLastSynced(new Date());
    setSyncedEvents(auditCount);
    
    toast({
      title: "Outlook verbunden",
      description: "Ihr Microsoft-Konto wurde erfolgreich verknüpft.",
    });
  };

  const simulateSync = async () => {
    setIsSyncing(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSyncing(false);
    setLastSynced(new Date());
    setSyncedEvents(auditCount);
    
    toast({
      title: "Synchronisierung abgeschlossen",
      description: `${auditCount} Audit-Termine wurden mit Outlook synchronisiert.`,
    });
  };

  const disconnect = () => {
    setIsConnected(false);
    setLastSynced(null);
    setSyncedEvents(0);
    
    toast({
      title: "Verbindung getrennt",
      description: "Die Outlook-Integration wurde deaktiviert.",
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isConnected ? "bg-success/10" : "bg-muted"
              )}>
                <Cloud className={cn(
                  "h-5 w-5",
                  isConnected ? "text-success" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <CardTitle className="text-base">Microsoft Outlook</CardTitle>
                <CardDescription className="text-xs">
                  Automatische Kalendersynchronisierung
                </CardDescription>
              </div>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"} className={cn(
              isConnected && "bg-success text-success-foreground"
            )}>
              {isConnected ? "Verbunden" : "Nicht verbunden"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Synchronisierte Termine</span>
                <span className="font-medium text-foreground">{syncedEvents}</span>
              </div>
              {lastSynced && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Letzte Synchronisierung</span>
                  <span className="font-medium text-foreground">
                    {lastSynced.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={simulateSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {isSyncing ? "Synchronisiere..." : "Jetzt synchronisieren"}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={disconnect}
                >
                  <Unplug className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Verbinden Sie Ihr Microsoft-Konto, um Audit-Termine automatisch in Ihrem Outlook-Kalender anzuzeigen.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-success" />
                  Automatische Synchronisierung
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-success" />
                  Erinnerungen 7 Tage & 1 Tag vorher
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-success" />
                  Bidirektionale Updates
                </li>
              </ul>
              <Button 
                className="w-full" 
                onClick={simulateOAuth}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Mit Microsoft anmelden
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Mock OAuth Dialog */}
      <Dialog open={showOAuthDialog} onOpenChange={setShowOAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg viewBox="0 0 23 23" className="h-6 w-6">
                <path fill="#f25022" d="M0 0h11v11H0z" />
                <path fill="#00a4ef" d="M0 12h11v11H0z" />
                <path fill="#7fba00" d="M12 0h11v11H12z" />
                <path fill="#ffb900" d="M12 12h11v11H12z" />
              </svg>
              Microsoft Anmeldung
            </DialogTitle>
            <DialogDescription>
              Verbindung wird hergestellt...
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">
              Bitte warten Sie, während wir Sie bei Microsoft authentifizieren...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
