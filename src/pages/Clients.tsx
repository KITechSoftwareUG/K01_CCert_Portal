import { useState, useMemo, memo } from 'react';
import { Layout } from '@/components/Layout';
import { NewClientDialog } from '@/components/NewClientDialog';
import { mockClients } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Mail, Phone, MapPin, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Client } from '@/types/audit';

interface ClientCardProps {
  client: Client;
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
              Kunde seit {format(client.createdAt, 'MMMM yyyy', { locale: de })}
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
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">{client.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">{client.address}</span>
        </div>
      </div>

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

      <Button variant="outline" className="w-full">
        Details anzeigen
      </Button>
    </CardContent>
  </Card>
));

ClientCard.displayName = 'ClientCard';

const Clients = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);

  const filteredClients = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return mockClients.filter(client =>
      client.name.toLowerCase().includes(query) ||
      client.contactPerson.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Clients;
