import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { AuditCard } from '@/components/AuditCard';
import { NewAuditDialog } from '@/components/NewAuditDialog';
import { useAudits, AuditWithClient } from '@/hooks/useAudits';
import { useAuditTasks } from '@/hooks/useAuditTasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Plus, Search, Filter } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Audit } from '@/types/audit';

type StatusFilter = 'all' | 'scheduled' | 'in-progress' | 'completed';

// Transform database audit to local Audit type
const transformAuditToLocal = (dbAudit: AuditWithClient, tasks: any[]): Audit => ({
  id: dbAudit.id,
  clientId: dbAudit.client_id,
  clientName: dbAudit.clients?.name || 'Unbekannt',
  type: dbAudit.type,
  certifications: (dbAudit.certifications || []) as any,
  scheduledDate: new Date(dbAudit.scheduled_date),
  status: dbAudit.status,
  tasks: tasks
    .filter(t => t.audit_id === dbAudit.id)
    .map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      status: t.status,
      dueDate: new Date(t.due_date),
      assignedTo: t.assigned_to || undefined,
      completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
    })),
  notes: dbAudit.notes || undefined,
  createdAt: new Date(dbAudit.created_at),
});

const AuditCardSkeleton = () => (
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
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-10 w-full" />
    </CardContent>
  </Card>
);

const Audits = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showNewAuditDialog, setShowNewAuditDialog] = useState(false);

  const { data: dbAudits = [], isLoading: auditsLoading, error: auditsError } = useAudits();
  const { data: tasks = [], isLoading: tasksLoading } = useAuditTasks();

  const audits = useMemo(() => 
    dbAudits.map(audit => transformAuditToLocal(audit, tasks)),
    [dbAudits, tasks]
  );

  const handleViewDetails = useCallback((audit: Audit) => {
    navigate(`/audits/${audit.id}`);
  }, [navigate]);

  const filteredAudits = useMemo(() => {
    return audits.filter(audit => {
      const matchesSearch = audit.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || audit.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [audits, searchQuery, statusFilter]);

  const isLoading = auditsLoading || tasksLoading;

  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Audits</h1>
            <p className="text-muted-foreground">Verwaltung und Planung aller Zertifizierungsaudits</p>
          </div>
          <Button className="gap-2" onClick={() => setShowNewAuditDialog(true)}>
            <Plus className="h-4 w-4" />
            Neues Audit
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Audit oder Kunde suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Status Tabs */}
        <Tabs defaultValue="all" onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="scheduled">Geplant</TabsTrigger>
            <TabsTrigger value="in-progress">In Bearbeitung</TabsTrigger>
            <TabsTrigger value="completed">Abgeschlossen</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="mt-6">
            {auditsError ? (
              <div className="text-center py-12">
                <p className="text-destructive">Fehler beim Laden der Audits</p>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <AuditCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredAudits.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' ? 'Keine Audits gefunden' : 'Noch keine Audits vorhanden'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button className="mt-4" onClick={() => setShowNewAuditDialog(true)}>
                    Erstes Audit erstellen
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAudits.map((audit) => (
                  <AuditCard key={audit.id} audit={audit} onViewDetails={handleViewDetails} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <NewAuditDialog open={showNewAuditDialog} onOpenChange={setShowNewAuditDialog} />
    </Layout>
  );
};

export default Audits;
