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
import { Building2, Plus, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyGroup {
  name: string;
  clientNumber: string;
  clients: DbClient[];
}

const ClientRow = memo(({ client, onViewDetails, isSubRow = false }: { 
  client: DbClient; 
  onViewDetails: (client: DbClient) => void;
  isSubRow?: boolean;
}) => (
  <TableRow 
    className={cn(
      "cursor-pointer hover:bg-muted/50 transition-colors",
      isSubRow && "bg-muted/20"
    )}
    onClick={() => onViewDetails(client)}
  >
    <TableCell className={cn("font-medium", isSubRow && "pl-10")}>
      {!isSubRow && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          <span>{client.name}</span>
        </div>
      )}
      {isSubRow && (
        <span className="text-muted-foreground">└ Standort</span>
      )}
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
    <TableCell className="text-right">
      <Button variant="ghost" size="sm" className="h-7 text-xs">
        Details
      </Button>
    </TableCell>
  </TableRow>
));

ClientRow.displayName = 'ClientRow';

const CompanyGroupRow = memo(({ group, onViewDetails }: { 
  group: CompanyGroup; 
  onViewDetails: (client: DbClient) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasSubClients = group.clients.length > 1;
  const mainClient = group.clients[0];

  if (!hasSubClients) {
    return <ClientRow client={mainClient} onViewDetails={onViewDetails} />;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="hover:bg-muted/50 transition-colors bg-muted/30">
        <TableCell className="font-medium">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <CollapsibleTrigger asChild>
              <button 
                type="button" 
                className="p-1 hover:bg-muted rounded transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-semibold">{group.name}</span>
            <Badge variant="outline" className="ml-2 whitespace-nowrap flex-shrink-0">
              {group.clients.length} Standorte
            </Badge>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="font-mono text-xs">
            {group.clientNumber}
          </Badge>
        </TableCell>
        <TableCell>{mainClient.country || '-'}</TableCell>
        <TableCell>
          <span className="text-muted-foreground text-sm">Mehrere Berater</span>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {getAllCertifications(group.clients).map((cert) => (
              <Badge key={cert} variant="secondary" className="text-xs py-0 px-1.5">
                {cert}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell></TableCell>
      </TableRow>
      <CollapsibleContent asChild>
        <>
          {group.clients.map((client, index) => (
            <TableRow 
              key={client.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors bg-muted/10"
              onClick={() => onViewDetails(client)}
            >
              <TableCell className="pl-12">
                <span className="text-muted-foreground">
                  {index === group.clients.length - 1 ? '└' : '├'} Zertifizierung {index + 1}
                </span>
              </TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
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
                    <span className="text-muted-foreground text-sm">GMP</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </>
      </CollapsibleContent>
    </Collapsible>
  );
});

CompanyGroupRow.displayName = 'CompanyGroupRow';

// Helper function to get all unique certifications from a group
function getAllCertifications(clients: DbClient[]): string[] {
  const certs = new Set<string>();
  clients.forEach(client => {
    if (client.certifications) {
      client.certifications.forEach(cert => certs.add(cert));
    }
  });
  // Add GMP if there's a client without certifications (we know it's GMP)
  if (clients.some(c => !c.certifications || c.certifications.length === 0)) {
    certs.add('GMP');
  }
  return Array.from(certs).sort();
}

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

  // Group clients by company (client_number)
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
              {totalUniqueCompanies} Unternehmen, {clients.length} Zertifizierungseinträge
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
            placeholder="Kunde, Berater oder Kundennummer suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Clients Table */}
        {error ? (
          <div className="text-center py-12">
            <p className="text-destructive">Fehler beim Laden der Kunden</p>
          </div>
        ) : isLoading ? (
          <TableSkeleton />
        ) : companyGroups.length === 0 ? (
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
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[300px]">Unternehmen</TableHead>
                  <TableHead className="w-[100px]">Kd-Nr.</TableHead>
                  <TableHead className="w-[120px]">Land</TableHead>
                  <TableHead className="w-[180px]">Berater</TableHead>
                  <TableHead>Zertifizierungen</TableHead>
                  <TableHead className="w-[80px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyGroups.map((group) => (
                  <CompanyGroupRow 
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
