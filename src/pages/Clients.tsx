import { useState, useMemo, memo } from 'react';
import { Layout } from '@/components/Layout';
import { NewClientDialog } from '@/components/NewClientDialog';
import { useClients, DbClient } from '@/hooks/useClients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Mail, Phone, MapPin, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ClientCardProps {
  client: DbClient;
}

const ClientCard = memo(({ client }: ClientCardProps) => (
  <Card className="card-hover">
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">{client.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Kunde seit {format(new Date(client.created_at), 'MMMM yyyy', { locale: de })}
            </p>
          </div>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">{client.email}</span>
        </div>
        {client.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{client.phone}</span>
          </div>
        )}
        {client.address && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{client.address}</span>
          </div>
        )}
      </div>

      {client.certifications && client.certifications.length > 0 && (
        <div className="pt-4 border-t">
          <p className="text-sm font-medium text-muted-foreground mb-2">Zertifizierungen</p>
          <div className="flex flex-wrap gap-2">
            {client.certifications.map((cert) => (
              <Badge key={cert} variant="secondary">
                {cert}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Button variant="outline" className="w-full">
        Details anzeigen
      </Button>
    </CardContent>
  </Card>
));

ClientCard.displayName = 'ClientCard';

const ClientCardSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-10 w-full" />
    </CardContent>
  </Card>
);

const Clients = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  
  const { data: clients = [], isLoading, error } = useClients();

  const filteredClients = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return clients.filter(client =>
      client.name.toLowerCase().includes(query) ||
      client.contact_person.toLowerCase().includes(query)
    );
  }, [searchQuery, clients]);

  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Kunden</h1>
            <p className="text-muted-foreground">Verwaltung aller zertifizierten Unternehmen</p>
          </div>
          <Button className="gap-2" onClick={() => setShowNewClientDialog(true)}>
            <Plus className="h-4 w-4" />
            Neuer Kunde
          </Button>
        </div>

        <NewClientDialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog} />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kunde oder Ansprechpartner suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Clients Grid */}
        {error ? (
          <div className="text-center py-12">
            <p className="text-destructive">Fehler beim Laden der Kunden</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <ClientCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredClients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Clients;
