import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { NewClientDialog } from '@/components/NewClientDialog';
import { ExcelImportDialog } from '@/components/ExcelImportDialog';
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
  Hash,
  Upload
} from 'lucide-react';

type ViewMode = 'list' | 'grouped';

interface CompanyGroup {
  id: string;
  name: string;
  isGroupOnly: boolean; // True if this is just a group header (no own certifications)
  children: ClientWithCerts[];
}

interface ClientWithCerts {
  client: DbClient;
  certifications: CertificationRow[];
}

interface CertificationInfo {
  certificationId: string;
  certificationName: string;
  certificateNumber: string | null;
  validUntil: string | null;
  status: string | null;
}

interface CertificationRow {
  clientId: string;
  clientName: string;
  clientNumber: string | null;
  certifications: CertificationInfo[];
  // Use earliest validUntil for sorting/display
  earliestValidUntil: string | null;
}

const Clients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  
  const { data: clients = [], isLoading, error } = useClients();
  const { data: allCertifications = [] } = useAllClientCertifications();

  // Get all client IDs for bulk contact fetch
  const clientIds = useMemo(() => clients.map(c => c.id), [clients]);
  const { data: contactsMap = {} } = useContactsByClientIds(clientIds);

  // Create a map of client certifications by client ID, grouped by certificate_number
  const certificationsByClient = useMemo(() => {
    const map: Record<string, CertificationRow[]> = {};
    
    // First, collect all certifications per client
    const rawCertsByClient: Record<string, CertificationInfo[]> = {};
    const clientInfoMap: Record<string, { name: string; number: string | null }> = {};
    
    allCertifications.forEach((cc: any) => {
      if (!cc.clients || !cc.certifications) return;
      const clientId = cc.client_id;
      
      if (!rawCertsByClient[clientId]) rawCertsByClient[clientId] = [];
      if (!clientInfoMap[clientId]) {
        clientInfoMap[clientId] = {
          name: cc.clients.name,
          number: cc.clients.client_number,
        };
      }
      
      rawCertsByClient[clientId].push({
        certificationId: cc.certification_id,
        certificationName: cc.certifications.name,
        certificateNumber: cc.certificate_number,
        validUntil: cc.valid_until,
        status: cc.status,
      });
    });
    
    // Group certifications by certificate_number (same number = same row)
    Object.entries(rawCertsByClient).forEach(([clientId, certs]) => {
      const grouped: Record<string, CertificationInfo[]> = {};
      const noNumber: CertificationInfo[] = [];
      
      certs.forEach(cert => {
        if (cert.certificateNumber) {
          if (!grouped[cert.certificateNumber]) grouped[cert.certificateNumber] = [];
          grouped[cert.certificateNumber].push(cert);
        } else {
          noNumber.push(cert);
        }
      });
      
      map[clientId] = [];
      
      // Add grouped certifications (those with same certificate number)
      Object.entries(grouped).forEach(([certNum, groupedCerts]) => {
        const earliestDate = groupedCerts
          .map(c => c.validUntil)
          .filter(Boolean)
          .sort()[0] || null;
          
        map[clientId].push({
          clientId,
          clientName: clientInfoMap[clientId].name,
          clientNumber: clientInfoMap[clientId].number,
          certifications: groupedCerts,
          earliestValidUntil: earliestDate,
        });
      });
      
      // Add certifications without certificate number as individual rows
      noNumber.forEach(cert => {
        map[clientId].push({
          clientId,
          clientName: clientInfoMap[clientId].name,
          clientNumber: clientInfoMap[clientId].number,
          certifications: [cert],
          earliestValidUntil: cert.validUntil,
        });
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

  // Group clients by parent - show parent as group header, children with their certs
  const companyGroups = useMemo(() => {
    const groups: CompanyGroup[] = [];
    const parentClients = filteredClients.filter(c => !c.parent_client_id);
    const childClients = filteredClients.filter(c => c.parent_client_id);
    
    // Build map of children by parent
    const childrenByParent: Record<string, DbClient[]> = {};
    childClients.forEach(child => {
      const parentId = child.parent_client_id!;
      if (!childrenByParent[parentId]) childrenByParent[parentId] = [];
      childrenByParent[parentId].push(child);
    });
    
    parentClients.forEach(parent => {
      const children = childrenByParent[parent.id] || [];
      const parentCerts = certificationsByClient[parent.id] || [];
      
      if (children.length > 0) {
        // This is a group with children
        groups.push({
          id: parent.id,
          name: parent.name,
          isGroupOnly: parentCerts.length === 0,
          children: children.map(child => ({
            client: child,
            certifications: certificationsByClient[child.id] || [],
          })),
        });
      } else {
        // Standalone client (no children) - treat as single-client group
        groups.push({
          id: parent.id,
          name: parent.name,
          isGroupOnly: false,
          children: [{
            client: parent,
            certifications: parentCerts,
          }],
        });
      }
    });
    
    // Handle orphaned children (parent not in filtered results)
    childClients.forEach(child => {
      const parentId = child.parent_client_id!;
      const parentExists = parentClients.some(p => p.id === parentId);
      if (!parentExists) {
        groups.push({
          id: child.id,
          name: child.name,
          isGroupOnly: false,
          children: [{
            client: child,
            certifications: certificationsByClient[child.id] || [],
          }],
        });
      }
    });
    
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredClients, certificationsByClient]);

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
    const certRows = certificationsByClient[clientId] || [];
    if (certRows.length === 0) {
      return (
        <div className="pl-16 py-2 text-sm text-muted-foreground italic">
          Keine Zertifizierungen
        </div>
      );
    }
    return certRows.map((row, idx) => (
      <div
        key={`${row.clientId}-${idx}`}
        className="flex items-center gap-4 pl-16 pr-4 py-2 text-sm border-t border-border/30 hover:bg-muted/30 cursor-pointer"
        onClick={() => navigate(`/clients/${row.clientId}`)}
      >
        <div className="flex items-center gap-2">
          {row.certifications.map((cert, certIdx) => (
            <Badge key={cert.certificationId} variant="secondary" className="gap-1">
              <Award className="h-3 w-3" />
              {cert.certificationName}
            </Badge>
          ))}
        </div>
        {row.certifications[0]?.certificateNumber && (
          <span className="text-muted-foreground">
            Nr. {row.certifications[0].certificateNumber}
          </span>
        )}
        {row.earliestValidUntil && (
          <span className="text-muted-foreground">
            bis {new Date(row.earliestValidUntil).toLocaleDateString('de-DE')}
          </span>
        )}
        {row.certifications.some(c => c.status && c.status !== 'active') && (
          <Badge variant={row.certifications.some(c => c.status === 'expired') ? 'destructive' : 'outline'}>
            {row.certifications.find(c => c.status !== 'active')?.status}
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Excel-Import
            </Button>
            <Button onClick={() => setShowNewClientDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Neuer Kunde
            </Button>
          </div>
        </div>

        <NewClientDialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog} />
        <ExcelImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />

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
          /* GROUPED VIEW - Groups by parent company, with certifications as rows */
          <div className="border rounded-lg overflow-hidden">
            {companyGroups.map(group => {
              const isExpanded = expandedGroups.has(group.id);
              const totalCerts = group.children.reduce((sum, c) => sum + c.certifications.length, 0);
              const isMultiClient = group.children.length > 1 || group.isGroupOnly;

              return (
                <div key={group.id} className="border-b last:border-b-0">
                  {/* Group Header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 bg-card"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      {isMultiClient ? (
                        <FolderTree className="h-4 w-4 text-primary" />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold">{group.name}</span>
                      {isMultiClient && (
                        <Badge variant="outline" className="text-xs">
                          Gruppe
                        </Badge>
                      )}
                      {!isMultiClient && group.children[0]?.client.client_number && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Hash className="h-3 w-3" />
                          {group.children[0].client.client_number}
                        </Badge>
                      )}
                      {totalCerts > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {totalCerts} Zertifikat{totalCerts !== 1 ? 'e' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Expanded Content - Shows clients in group */}
                  {isExpanded && (
                    <div className="bg-muted/20">
                      {group.children.map((childWithCerts) => {
                        const { client, certifications } = childWithCerts;
                        const contacts = contactsMap[client.id] || [];
                        const isClientExpanded = expandedClients.has(client.id);
                        
                        return (
                          <div key={client.id}>
                            {/* Client Row - always show for multi-client groups, clickable to expand certifications */}
                            {isMultiClient ? (
                              <div
                                className="flex items-center justify-between px-4 py-2 pl-10 bg-muted/30 border-t border-border/50 cursor-pointer hover:bg-muted/50"
                                onClick={() => certifications.length > 0 ? toggleClient(client.id) : navigate(`/clients/${client.id}`)}
                              >
                                <div className="flex items-center gap-3">
                                  {certifications.length > 0 ? (
                                    isClientExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                                  ) : (
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className="font-medium">{client.name}</span>
                                  {client.client_number && (
                                    <Badge variant="outline" className="gap-1 text-xs">
                                      <Hash className="h-3 w-3" />
                                      {client.client_number}
                                    </Badge>
                                  )}
                                  {certifications.length > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {certifications.length} Zertifikat{certifications.length !== 1 ? 'e' : ''}
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
                            ) : null}
                            
                            {/* Certification Rows - only show when client is expanded (for multi) or always (for single) */}
                            {(!isMultiClient || isClientExpanded) && (
                              <>
                                {certifications.length > 0 ? (
                                  certifications.map((row, idx) => (
                                    <div
                                      key={`${row.clientId}-${idx}`}
                                      className={`flex items-center gap-4 px-4 py-2 text-sm border-t border-border/30 hover:bg-muted/40 cursor-pointer ${isMultiClient ? 'pl-14' : 'pl-10'}`}
                                      onClick={() => navigate(`/clients/${row.clientId}`)}
                                    >
                                      <div className="flex items-center gap-2">
                                        {row.certifications.map((cert) => (
                                          <Badge key={cert.certificationId} variant="secondary" className="gap-1">
                                            <Award className="h-3 w-3" />
                                            {cert.certificationName}
                                          </Badge>
                                        ))}
                                      </div>
                                      {row.certifications[0]?.certificateNumber && (
                                        <span className="text-muted-foreground">
                                          Nr. {row.certifications[0].certificateNumber}
                                        </span>
                                      )}
                                      {row.earliestValidUntil && (
                                        <span className="text-muted-foreground">
                                          bis {new Date(row.earliestValidUntil).toLocaleDateString('de-DE')}
                                        </span>
                                      )}
                                      {row.certifications.some(c => c.status && c.status !== 'active') && (
                                        <Badge variant={row.certifications.some(c => c.status === 'expired') ? 'destructive' : 'outline'}>
                                          {row.certifications.find(c => c.status !== 'active')?.status}
                                        </Badge>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className={`py-2 text-sm text-muted-foreground italic ${isMultiClient ? 'pl-14' : 'pl-10'} border-t border-border/30`}>
                                    Keine Zertifizierungen
                                  </div>
                                )}
                              </>
                            )}
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
