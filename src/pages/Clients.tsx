import { useState, useMemo, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { NewClientDialog } from '@/components/NewClientDialog';
import { useClients, DbClient } from '@/hooks/useClients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Building2, Mail, Plus, Search, ChevronDown, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientCardProps {
  client: DbClient;
  onViewDetails: (client: DbClient) => void;
}

const ClientCard = memo(({ client, onViewDetails }: ClientCardProps) => (
  <Card className="card-hover">
    <CardHeader className="pb-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {client.client_number && (
                <Badge variant="outline" className="text-xs font-mono shrink-0">
                  {client.client_number}
                </Badge>
              )}
              <CardTitle className="text-base truncate">{client.name}</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {client.consultant && <span className="font-medium">{client.consultant}</span>}
              {client.consultant && <span>•</span>}
              <span>{format(new Date(client.created_at), 'MMM yyyy', { locale: de })}</span>
            </div>
          </div>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-2 pt-0">
      <div className="flex items-center gap-2 text-sm">
        <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-foreground truncate">{client.email}</span>
      </div>

      {client.certifications && client.certifications.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {client.certifications.slice(0, 4).map((cert) => (
            <Badge key={cert} variant="secondary" className="text-xs py-0 px-1.5">
              {cert}
            </Badge>
          ))}
          {client.certifications.length > 4 && (
            <Badge variant="outline" className="text-xs py-0 px-1.5">
              +{client.certifications.length - 4}
            </Badge>
          )}
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => onViewDetails(client)}>
        Details
      </Button>
    </CardContent>
  </Card>
));

ClientCard.displayName = 'ClientCard';

const ClientCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div>
          <Skeleton className="h-5 w-28 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3 pt-0">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-8 w-full" />
    </CardContent>
  </Card>
);

interface CountryGroupProps {
  country: string;
  clients: DbClient[];
  onViewDetails: (client: DbClient) => void;
  defaultOpen?: boolean;
}

const CountryGroup = memo(({ country, clients, onViewDetails, defaultOpen = true }: CountryGroupProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto bg-muted/50 hover:bg-muted"
        >
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">{country}</span>
            <Badge variant="secondary" className="ml-2">
              {clients.length} {clients.length === 1 ? 'Kunde' : 'Kunden'}
            </Badge>
          </div>
          <ChevronDown className={cn(
            "h-5 w-5 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} onViewDetails={onViewDetails} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

CountryGroup.displayName = 'CountryGroup';

const Clients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  
  const { data: clients = [], isLoading, error } = useClients();

  const handleViewDetails = useCallback((client: DbClient) => {
    navigate(`/clients/${client.id}`);
  }, [navigate]);

  const filteredClients = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return clients.filter(client =>
      client.name.toLowerCase().includes(query) ||
      client.contact_person.toLowerCase().includes(query) ||
      (client.country && client.country.toLowerCase().includes(query)) ||
      (client.client_number && client.client_number.toLowerCase().includes(query)) ||
      (client.consultant && client.consultant.toLowerCase().includes(query))
    );
  }, [searchQuery, clients]);

  // Group clients by country
  const clientsByCountry = useMemo(() => {
    const groups: Record<string, DbClient[]> = {};
    
    filteredClients.forEach(client => {
      const country = client.country || 'Nicht zugeordnet';
      if (!groups[country]) {
        groups[country] = [];
      }
      groups[country].push(client);
    });

    // Sort countries alphabetically, but put "Deutschland" first
    const sortedCountries = Object.keys(groups).sort((a, b) => {
      if (a === 'Deutschland') return -1;
      if (b === 'Deutschland') return 1;
      if (a === 'Nicht zugeordnet') return 1;
      if (b === 'Nicht zugeordnet') return -1;
      return a.localeCompare(b);
    });

    return sortedCountries.map(country => ({
      country,
      clients: groups[country].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [filteredClients]);

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Kunden</h1>
            <p className="text-muted-foreground">
              Verwaltung aller zertifizierten Unternehmen ({clients.length} Kunden)
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowNewClientDialog(true)}>
            <Plus className="h-4 w-4" />
            Neuer Kunde
          </Button>
        </div>

        <NewClientDialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog} />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kunde, Ansprechpartner oder Land suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Clients by Country */}
        {error ? (
          <div className="text-center py-12">
            <p className="text-destructive">Fehler beim Laden der Kunden</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-14 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <ClientCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : clientsByCountry.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'Keine Kunden gefunden' : 'Noch keine Kunden vorhanden'}
            </p>
            {!searchQuery && (
              <Button className="mt-4" onClick={() => setShowNewClientDialog(true)}>
                Ersten Kunden erstellen
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {clientsByCountry.map(({ country, clients }, index) => (
              <CountryGroup
                key={country}
                country={country}
                clients={clients}
                onViewDetails={handleViewDetails}
                defaultOpen={index < 3}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Clients;
