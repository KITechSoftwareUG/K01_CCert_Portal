import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { NewClientDialog } from '@/components/NewClientDialog';
import { useClients, DbClient } from '@/hooks/useClients';
import { useAllClientCertifications } from '@/hooks/useClientCertifications';
import { useContactsByClientIds } from '@/hooks/useContacts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactPopover } from '@/components/ContactPopover';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  List, 
  FolderTree, 
  Award,
  Building2,
  Hash
} from 'lucide-react';

type ViewMode = 'list' | 'grouped';

interface CompanyGroup {
  id: string | null; // null for groups without a parent record
  name: string;
  client?: DbClient; // The parent client record if it exists
  children: DbClient[];
}

interface CertificationRow {
  clientId: string;
  clientName: string;
  clientNumber: string | null;
  certificationId: string;
  certificationName: string;
  certificateNumber: string | null;
  validUntil: string | null;
  status: string | null;
}

const Clients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  
  const { data: clients = [], isLoading, error } = useClients();
  const { data: allCertifications = [] } = useAllClientCertifications();

  // Get all client IDs for bulk contact fetch
  const clientIds = useMemo(() => clients.map(c => c.id), [clients]);
  const { data: contactsMap = {} } = useContactsByClientIds(clientIds);

  // Create a map of client certifications by client ID
  const certificationsByClient = useMemo(() => {
    const map: Record<string, CertificationRow[]> = {};
    allCertifications.forEach((cc: any) => {
      if (!cc.clients || !cc.certifications) return;
      const clientId = cc.client_id;
      if (!map[clientId]) map[clientId] = [];
      map[clientId].push({
        clientId,
        clientName: cc.clients.name,
        clientNumber: cc.clients.client_number,
        certificationId: cc.certification_id,
        certificationName: cc.certifications.name,
        certificateNumber: cc.certificate_number,
        validUntil: cc.valid_until,
        status: cc.status,
      });
    });
    return map;
  }, [allCertifications]);

  // Filter clients
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

  // Group clients by parent
  const companyGroups = useMemo(() => {
    const groups: Record<string, CompanyGroup> = {};
    const parentClients = filteredClients.filter(c => !c.parent_client_id);
    const childClients = filteredClients.filter(c => c.parent_client_id);
    
    // Create groups for parent clients
    parentClients.forEach(client => {
      groups[client.id] = {
        id: client.id,
        name: client.name,
        client,
        children: [],
      };
    });
    
    // Add children to their parents
    childClients.forEach(child => {
      const parentId = child.parent_client_id!;
      if (groups[parentId]) {
        groups[parentId].children.push(child);
      } else {
        // Parent not in filtered results, show child as standalone
        groups[child.id] = {
          id: child.id,
          name: child.name,
          client: child,
          children: [],
        };
      }
    });
    
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredClients]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleClient = (id: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderCertificationRows = (clientId: string) => {
    const certs = certificationsByClient[clientId] || [];
    if (certs.length === 0) {
      return (
        <div className="pl-16 py-2 text-sm text-muted-foreground italic">
          Keine Zertifizierungen
        </div>
      );
    }
    return certs.map((cert, idx) => (
      <div
        key={`${cert.clientId}-${cert.certificationId}-${idx}`}
        className="flex items-center gap-4 pl-16 pr-4 py-2 text-sm border-t border-border/30 hover:bg-muted/30 cursor-pointer"
        onClick={() => navigate(`/clients/${cert.clientId}`)}
      >
        <Badge variant="secondary" className="gap-1">
          <Award className="h-3 w-3" />
          {cert.certificationName}
        </Badge>
        {cert.certificateNumber && (
          <span className="text-muted-foreground">
            Nr. {cert.certificateNumber}
          </span>
        )}
        {cert.validUntil && (
          <span className="text-muted-foreground">
            bis {new Date(cert.validUntil).toLocaleDateString('de-DE')}
          </span>
        )}
        {cert.status && cert.status !== 'active' && (
          <Badge variant={cert.status === 'expired' ? 'destructive' : 'outline'}>
            {cert.status}
          </Badge>
        )}
      </div>
    ));
  };

  const renderClientWithCerts = (client: DbClient, indent = false) => {
    const certs = certificationsByClient[client.id] || [];
    const isExpanded = expandedClients.has(client.id);
    const contacts = contactsMap[client.id] || [];
    
    return (
      <div key={client.id}>
        <div
          className={`flex items-center justify-between px-4 py-3 hover:bg-muted/50 cursor-pointer border-t border-border/50 ${indent ? 'pl-10 bg-muted/20' : ''}`}
          onClick={() => certs.length > 0 ? toggleClient(client.id) : navigate(`/clients/${client.id}`)}
        >
          <div className="flex items-center gap-3">
            {certs.length > 0 ? (
              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={indent ? '' : 'font-medium'}>{client.name}</span>
            {client.client_number && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Hash className="h-3 w-3" />
                {client.client_number}
              </Badge>
            )}
            {certs.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {certs.length} Zertifikat{certs.length !== 1 ? 'e' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ContactPopover
              legacyName={client.contact_person}
              legacyPhone={client.phone}
              legacyEmail={client.email}
              contacts={contacts}
              onEdit={() => navigate(`/clients/${client.id}`)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/clients/${client.id}`);
              }}
            >
              Details
            </Button>
          </div>
        </div>
        {isExpanded && (
          <div className="bg-muted/10">
            {renderCertificationRows(client.id)}
          </div>
        )}
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
            <p className="text-muted-foreground">
              {companyGroups.length} Unternehmen{companyGroups.length !== 1 ? '' : ''} • {clients.length} Standorte
            </p>
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
              <TabsTrigger value="list" title="Flache Liste"><List className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="grouped" title="Gruppiert"><FolderTree className="h-4 w-4" /></TabsTrigger>
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
          /* FLAT LIST - Shows each client with their certifications */
          <div className="border rounded-lg divide-y">
            {filteredClients.map(client => renderClientWithCerts(client))}
          </div>
        ) : (
          /* GROUPED VIEW - Groups by parent company */
          <div className="border rounded-lg divide-y">
            {companyGroups.map(group => {
              const isExpanded = expandedGroups.has(group.id || group.name);
              const hasChildren = group.children.length > 0;
              const groupClient = group.client;
              const groupCerts = groupClient ? certificationsByClient[groupClient.id] || [] : [];
              const contacts = groupClient ? contactsMap[groupClient.id] || [] : [];

              return (
                <div key={group.id || group.name}>
                  {/* Group Header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => hasChildren || groupCerts.length > 0 
                      ? toggleGroup(group.id || group.name) 
                      : groupClient && navigate(`/clients/${groupClient.id}`)
                    }
                  >
                    <div className="flex items-center gap-3">
                      {(hasChildren || groupCerts.length > 0) ? (
                        isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold">{group.name}</span>
                      {groupClient?.client_number && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Hash className="h-3 w-3" />
                          {groupClient.client_number}
                        </Badge>
                      )}
                      {hasChildren && (
                        <Badge variant="secondary">
                          {group.children.length + 1} Standorte
                        </Badge>
                      )}
                      {!hasChildren && groupCerts.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {groupCerts.length} Zertifikat{groupCerts.length !== 1 ? 'e' : ''}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {groupClient && (
                        <>
                          <ContactPopover
                            legacyName={groupClient.contact_person}
                            legacyPhone={groupClient.phone}
                            legacyEmail={groupClient.email}
                            contacts={contacts}
                            onEdit={() => navigate(`/clients/${groupClient.id}`)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/clients/${groupClient.id}`);
                            }}
                          >
                            Details
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="bg-muted/10">
                      {/* Parent's certifications */}
                      {groupClient && groupCerts.length > 0 && (
                        <div className="border-t border-border/30">
                          <div className="pl-10 py-2 text-xs text-muted-foreground font-medium uppercase">
                            Zertifikate von {group.name}
                          </div>
                          {renderCertificationRows(groupClient.id)}
                        </div>
                      )}
                      
                      {/* Children */}
                      {group.children.map(child => renderClientWithCerts(child, true))}
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
