import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { NewClientDialog } from '@/components/NewClientDialog';
import { useClients, DbClient } from '@/hooks/useClients';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactPopover } from '@/components/ContactPopover';
import { Plus, Search, ChevronDown, ChevronRight, List, FolderTree, Building2 } from 'lucide-react';

type ViewMode = 'list' | 'grouped';

interface ParentCompany {
  name: string;
  clients: DbClient[];
}

const Clients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const { data: clients = [], isLoading, error } = useClients();

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(client =>
      client.name.toLowerCase().includes(query) ||
      client.contact_person?.toLowerCase().includes(query) ||
      client.client_number?.toLowerCase().includes(query)
    );
  }, [searchQuery, clients]);

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
              <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="grouped"><FolderTree className="h-4 w-4" /></TabsTrigger>
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
            {filteredClients.map(client => (
              <div
                key={client.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <span className="font-medium">{client.name}</span>
                <ContactPopover
                  name={client.contact_person}
                  phone={client.phone}
                  email={client.email}
                  onEdit={() => navigate(`/clients/${client.id}`)}
                />
              </div>
            ))}
          </div>
        ) : (
          /* GROUPED VIEW */
          <div className="border rounded-lg divide-y">
            {parentCompanies.map(group => {
              const isExpanded = expandedGroups.has(group.name);
              const hasMultiple = group.clients.length > 1;

              return (
                <div key={group.name}>
                  {/* Parent Row */}
                  <div
                    className={`flex items-center justify-between px-4 py-3 ${hasMultiple ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                    onClick={() => hasMultiple ? toggleGroup(group.name) : navigate(`/clients/${group.clients[0].id}`)}
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
                        name={group.clients[0].contact_person}
                        phone={group.clients[0].phone}
                        email={group.clients[0].email}
                        onEdit={() => navigate(`/clients/${group.clients[0].id}`)}
                      />
                    )}
                  </div>

                  {/* Children */}
                  {hasMultiple && isExpanded && (
                    <div className="bg-muted/30">
                      {group.clients.map(client => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between px-4 py-2 pl-12 hover:bg-muted/50 cursor-pointer border-t border-border/50"
                          onClick={() => navigate(`/clients/${client.id}`)}
                        >
                          <span>{client.name}</span>
                          <ContactPopover
                            name={client.contact_person}
                            phone={client.phone}
                            email={client.email}
                            onEdit={() => navigate(`/clients/${client.id}`)}
                          />
                        </div>
                      ))}
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
