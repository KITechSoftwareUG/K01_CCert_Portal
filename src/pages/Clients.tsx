import { useState, useMemo, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { NewClientDialog } from '@/components/NewClientDialog';
import { useClients, DbClient } from '@/hooks/useClients';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Plus, Search, ChevronDown, ChevronRight, List, FolderTree } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyGroup {
  name: string;
  clientNumber: string;
  clients: DbClient[];
}

type ViewMode = 'list' | 'grouped';

// Simple flat list row
const FlatClientRow = memo(({ client, onViewDetails }: { 
  client: DbClient; 
  onViewDetails: (client: DbClient) => void;
}) => (
  <TableRow 
    className="cursor-pointer hover:bg-muted/50 transition-colors"
    onClick={() => onViewDetails(client)}
  >
    <TableCell className="font-medium">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary shrink-0" />
        <span>{client.name}</span>
      </div>
    </TableCell>
    <TableCell>
      <Badge variant="outline" className="font-mono text-xs">
        {client.client_number || '-'}
      </Badge>
    </TableCell>
    <TableCell>{client.country || '-'}</TableCell>
    <TableCell>{client.consultant || '-'}</TableCell>
    <TableCell>
      <div className="flex flex-wrap gap-1">
        {client.certifications && client.certifications.length > 0 ? (
          client.certifications.map((cert) => (
            <Badge key={cert} variant="secondary" className="text-xs py-0 px-1.5">
              {cert}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </div>
    </TableCell>
    <TableCell>{client.contact_person || '-'}</TableCell>
  </TableRow>
));

FlatClientRow.displayName = 'FlatClientRow';

// Grouped view - Parent company row with collapsible children
const GroupedCompanyRow = memo(({ group, onViewDetails }: { 
  group: CompanyGroup; 
  onViewDetails: (client: DbClient) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasMultipleLocations = group.clients.length > 1;

  // If only one location, show it directly
  if (!hasMultipleLocations) {
    const client = group.clients[0];
    return (
      <TableRow 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => onViewDetails(client)}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span>{client.name}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="font-mono text-xs">
            {client.client_number || '-'}
          </Badge>
        </TableCell>
        <TableCell>{client.country || '-'}</TableCell>
        <TableCell>{client.consultant || '-'}</TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {client.certifications && client.certifications.length > 0 ? (
              client.certifications.map((cert) => (
                <Badge key={cert} variant="secondary" className="text-xs py-0 px-1.5">
                  {cert}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">-</span>
            )}
          </div>
        </TableCell>
        <TableCell>{client.contact_person || '-'}</TableCell>
      </TableRow>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="hover:bg-primary/5 transition-colors bg-primary/10 border-l-4 border-l-primary">
        <TableCell colSpan={6} className="font-medium py-3">
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <button 
                type="button" 
                className="p-1 hover:bg-muted rounded transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-primary" />
                )}
              </button>
            </CollapsibleTrigger>
            <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="font-bold text-foreground">{group.name}</span>
            <Badge variant="secondary" className="ml-2">
              {group.clients.length} Standorte
            </Badge>
            <Badge variant="outline" className="font-mono text-xs ml-auto">
              {group.clientNumber}
            </Badge>
          </div>
        </TableCell>
      </TableRow>
      <CollapsibleContent asChild>
        <>
          {group.clients.map((client, index) => (
            <TableRow 
              key={client.id}
              className={cn(
                "cursor-pointer hover:bg-muted/50 transition-colors",
                "bg-muted/20 border-l-4 border-l-muted"
              )}
              onClick={() => onViewDetails(client)}
            >
              <TableCell className="pl-12 font-medium">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    {index === group.clients.length - 1 ? '└' : '├'}
                  </span>
                  <span>{client.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-xs">
                  {client.client_number || '-'}
                </Badge>
              </TableCell>
              <TableCell>{client.country || '-'}</TableCell>
              <TableCell>{client.consultant || '-'}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {client.certifications && client.certifications.length > 0 ? (
                    client.certifications.map((cert) => (
                      <Badge key={cert} variant="secondary" className="text-xs py-0 px-1.5">
                        {cert}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{client.contact_person || '-'}</TableCell>
            </TableRow>
          ))}
        </>
      </CollapsibleContent>
    </Collapsible>
  );
});

GroupedCompanyRow.displayName = 'GroupedCompanyRow';

const TableSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3, 4, 5].map((i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
);

const Clients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  
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

  // Sort clients by client number for list view
  const sortedClients = useMemo(() => {
    return [...filteredClients].sort((a, b) => {
      const numA = parseInt(a.client_number || '') || 9999;
      const numB = parseInt(b.client_number || '') || 9999;
      return numA - numB;
    });
  }, [filteredClients]);

  // Group clients by company (client_number) for grouped view
  const companyGroups = useMemo(() => {
    const groups: Record<string, CompanyGroup> = {};
    
    filteredClients.forEach(client => {
      const key = client.client_number || client.id;
      if (!groups[key]) {
        groups[key] = {
          name: client.name,
          clientNumber: client.client_number || '-',
          clients: [],
        };
      }
      groups[key].clients.push(client);
    });

    // Sort groups by client number
    return Object.values(groups).sort((a, b) => {
      const numA = parseInt(a.clientNumber) || 9999;
      const numB = parseInt(b.clientNumber) || 9999;
      return numA - numB;
    });
  }, [filteredClients]);

  const totalUniqueCompanies = companyGroups.length;

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Kunden</h1>
            <p className="text-muted-foreground">
              {totalUniqueCompanies} Unternehmen, {clients.length} Einträge
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowNewClientDialog(true)}>
            <Plus className="h-4 w-4" />
            Neuer Kunde
          </Button>
        </div>

        <NewClientDialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog} />

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kunde, Berater oder Kundennummer suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                Liste
              </TabsTrigger>
              <TabsTrigger value="grouped" className="gap-2">
                <FolderTree className="h-4 w-4" />
                Gruppiert
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Clients Table */}
        {error ? (
          <div className="text-center py-12">
            <p className="text-destructive">Fehler beim Laden der Kunden</p>
          </div>
        ) : isLoading ? (
          <TableSkeleton />
        ) : (viewMode === 'list' ? sortedClients : companyGroups).length === 0 ? (
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
        ) : viewMode === 'list' ? (
          // FLAT LIST VIEW
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[280px]">Unternehmen</TableHead>
                  <TableHead className="w-[100px]">Kd-Nr.</TableHead>
                  <TableHead className="w-[100px]">Land</TableHead>
                  <TableHead className="w-[160px]">Berater</TableHead>
                  <TableHead className="w-[180px]">Zertifizierungen</TableHead>
                  <TableHead>Ansprechpartner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map((client) => (
                  <FlatClientRow 
                    key={client.id} 
                    client={client} 
                    onViewDetails={handleViewDetails} 
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          // GROUPED VIEW
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[280px]">Unternehmen / Standort</TableHead>
                  <TableHead className="w-[100px]">Kd-Nr.</TableHead>
                  <TableHead className="w-[100px]">Land</TableHead>
                  <TableHead className="w-[160px]">Berater</TableHead>
                  <TableHead className="w-[180px]">Zertifizierungen</TableHead>
                  <TableHead>Ansprechpartner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyGroups.map((group) => (
                  <GroupedCompanyRow 
                    key={group.clientNumber} 
                    group={group} 
                    onViewDetails={handleViewDetails} 
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Clients;
