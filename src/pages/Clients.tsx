import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { NewClientDialog } from '@/components/NewClientDialog';
import { useClients, DbClient } from '@/hooks/useClients';
import { useContactsByClientIds } from '@/hooks/useContacts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactPopover } from '@/components/ContactPopover';
import { Plus, Search, ChevronDown, ChevronRight, List, FolderTree, Globe, Building2 } from 'lucide-react';

type ViewMode = 'list' | 'grouped' | 'country';

interface ParentCompany {
  name: string;
  clients: DbClient[];
}

interface CountryGroup {
  country: string;
  clients: DbClient[];
}

const Clients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const { data: clients = [], isLoading, error } = useClients();

  // Get all client IDs for bulk contact fetch
  const clientIds = useMemo(() => clients.map(c => c.id), [clients]);
  const { data: contactsMap = {} } = useContactsByClientIds(clientIds);

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(client =>
      client.name.toLowerCase().includes(query) ||
      client.contact_person?.toLowerCase().includes(query) ||
      client.client_number?.toLowerCase().includes(query) ||
      client.country?.toLowerCase().includes(query)
    );
  }, [searchQuery, clients]);

  // Group by parent company (first word)
  const parentCompanies = useMemo(() => {
    const groups: Record<string, ParentCompany> = {};
    
    filteredClients.forEach(client => {
      const parentName = client.name.split(' ')[0];
      if (!groups[parentName]) {
        groups[parentName] = { name: parentName, clients: [] };
      }
      groups[parentName].clients.push(client);
    });

    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredClients]);

  // Group by country
  const countryGroups = useMemo(() => {
    const groups: Record<string, CountryGroup> = {};
    
    filteredClients.forEach(client => {
      const country = client.country || 'Unbekannt';
      if (!groups[country]) {
        groups[country] = { country, clients: [] };
      }
      groups[country].clients.push(client);
    });

    return Object.values(groups).sort((a, b) => a.country.localeCompare(b.country));
  }, [filteredClients]);

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const renderClientRow = (client: DbClient, indent = false) => {
    const contacts = contactsMap[client.id] || [];
    return (
      <div
        key={client.id}
        className={`flex items-center justify-between px-4 py-2 hover:bg-muted/50 cursor-pointer border-t border-border/50 ${indent ? 'pl-12 bg-muted/30' : ''}`}
        onClick={() => navigate(`/clients/${client.id}`)}
      >
        <span className={indent ? '' : 'font-medium'}>{client.name}</span>
        <ContactPopover
          legacyName={client.contact_person}
          legacyPhone={client.phone}
          legacyEmail={client.email}
          contacts={contacts}
          onEdit={() => navigate(`/clients/${client.id}`)}
        />
      </div>
    );
  };

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Kunden</h1>
            <p className="text-muted-foreground">{clients.length} Einträge</p>
          </div>
          <Button onClick={() => setShowNewClientDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Kunde
          </Button>
        </div>

        <NewClientDialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog} />

        {/* Search + View Toggle */}
        <div className="flex gap-4 items-center justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="list" title="Liste"><List className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="grouped" title="Unternehmen"><FolderTree className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="country" title="Länder"><Globe className="h-4 w-4" /></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        {error ? (
          <p className="text-destructive text-center py-12">Fehler beim Laden</p>
        ) : isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filteredClients.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Keine Kunden gefunden</p>
        ) : viewMode === 'list' ? (
          /* FLAT LIST */
          <div className="border rounded-lg divide-y">
            {filteredClients.map(client => renderClientRow(client))}
          </div>
        ) : viewMode === 'country' ? (
          /* COUNTRY TILES */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {countryGroups.map(group => (
              <div key={group.country} className="border rounded-lg overflow-hidden">
                <div 
                  className="flex items-center justify-between px-4 py-3 bg-muted/50 cursor-pointer"
                  onClick={() => toggleGroup(`country-${group.country}`)}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{group.country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{group.clients.length}</Badge>
                    {expandedGroups.has(`country-${group.country}`) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </div>
                
                {expandedGroups.has(`country-${group.country}`) && (
                  <div className="divide-y">
                    {group.clients.map(client => {
                      const contacts = contactsMap[client.id] || [];
                      return (
                        <div
                          key={client.id}
                          className="flex items-center justify-between px-4 py-2 hover:bg-muted/50 cursor-pointer"
                          onClick={() => navigate(`/clients/${client.id}`)}
                        >
                          <span className="text-sm">{client.name}</span>
                          <ContactPopover
                            legacyName={client.contact_person}
                            legacyPhone={client.phone}
                            legacyEmail={client.email}
                            contacts={contacts}
                            onEdit={() => navigate(`/clients/${client.id}`)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* GROUPED VIEW */
          <div className="border rounded-lg divide-y">
            {parentCompanies.map(group => {
              const isExpanded = expandedGroups.has(group.name);
              const hasMultiple = group.clients.length > 1;
              const firstClient = group.clients[0];
              const firstContacts = contactsMap[firstClient.id] || [];

              return (
                <div key={group.name}>
                  {/* Parent Row */}
                  <div
                    className={`flex items-center justify-between px-4 py-3 ${hasMultiple ? 'cursor-pointer hover:bg-muted/50' : 'cursor-pointer hover:bg-muted/50'}`}
                    onClick={() => hasMultiple ? toggleGroup(group.name) : navigate(`/clients/${firstClient.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      {hasMultiple ? (
                        isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold">{group.name}</span>
                      {hasMultiple && (
                        <Badge variant="outline">{group.clients.length} Standorte</Badge>
                      )}
                    </div>

                    {!hasMultiple && (
                      <ContactPopover
                        legacyName={firstClient.contact_person}
                        legacyPhone={firstClient.phone}
                        legacyEmail={firstClient.email}
                        contacts={firstContacts}
                        onEdit={() => navigate(`/clients/${firstClient.id}`)}
                      />
                    )}
                  </div>

                  {/* Children */}
                  {hasMultiple && isExpanded && (
                    <div className="bg-muted/30">
                      {group.clients.map(client => {
                        const contacts = contactsMap[client.id] || [];
                        return (
                          <div
                            key={client.id}
                            className="flex items-center justify-between px-4 py-2 pl-12 hover:bg-muted/50 cursor-pointer border-t border-border/50"
                            onClick={() => navigate(`/clients/${client.id}`)}
                          >
                            <span>{client.name}</span>
                            <ContactPopover
                              legacyName={client.contact_person}
                              legacyPhone={client.phone}
                              legacyEmail={client.email}
                              contacts={contacts}
                              onEdit={() => navigate(`/clients/${client.id}`)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Clients;
