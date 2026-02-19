import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { NewAuditDialog } from '@/components/NewAuditDialog';
import { useAudits } from '@/hooks/useAudits';
import { useAuditTasks } from '@/hooks/useAuditTasks';
import { transformAuditToLocal } from '@/lib/auditUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, ChevronRight, Calendar, Building2, ClipboardCheck, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Audit } from '@/types/audit';
import { AUDIT_TYPE_LABELS, AUDIT_STATUS_CONFIG } from '@/lib/constants';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'scheduled' | 'in-progress' | 'completed';
type GroupBy = 'month' | 'client' | 'type' | 'none';

const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
  </TableRow>
);

interface AuditRowProps {
  audit: Audit;
  onClick: () => void;
  showClient?: boolean;
  showType?: boolean;
}

const AuditRow = ({ audit, onClick, showClient = true, showType = true }: AuditRowProps) => {
  const statusConfig = AUDIT_STATUS_CONFIG[audit.status];
  const pendingTasks = audit.tasks.filter(t => t.status !== 'completed').length;
  const overdueTasks = audit.tasks.filter(t => t.status === 'overdue' || (t.status !== 'completed' && t.dueDate < new Date())).length;

  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      {showClient && (
        <TableCell className="font-medium text-left">{audit.clientName}</TableCell>
      )}
      {showType && (
        <TableCell>
          <span className="text-sm">{AUDIT_TYPE_LABELS[audit.type]}</span>
        </TableCell>
      )}
      <TableCell>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {format(audit.scheduledDate, 'dd. MMM yyyy', { locale: de })}
        </div>
      </TableCell>
      <TableCell>
        <Badge 
          variant={statusConfig.variant}
          className={cn("text-xs", statusConfig.className)}
        >
          {statusConfig.label}
        </Badge>
      </TableCell>
      <TableCell>
        {pendingTasks > 0 ? (
          <div className="flex items-center gap-1">
            <span className={cn(
              "text-sm",
              overdueTasks > 0 ? "text-destructive font-medium" : "text-muted-foreground"
            )}>
              {overdueTasks > 0 ? `${overdueTasks} überfällig` : `${pendingTasks} offen`}
            </span>
          </div>
        ) : (
          <span className="text-sm text-success">✓ Fertig</span>
        )}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

interface GroupHeaderProps {
  title: string;
  count: number;
  icon?: React.ReactNode;
}

const GroupHeader = ({ title, count, icon }: GroupHeaderProps) => (
  <div className="flex items-center gap-3 py-3 px-4 bg-muted/30 border-y border-border sticky top-0">
    {icon}
    <span className="font-semibold text-foreground">{title}</span>
    <Badge variant="secondary" className="text-xs">{count}</Badge>
  </div>
);

const Audits = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('month');
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
    return audits
      .filter(audit => {
        const matchesSearch = audit.clientName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || audit.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }, [audits, searchQuery, statusFilter]);

  // Group audits
  const groupedAudits = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', title: 'Alle Audits', audits: filteredAudits }];
    }

    const groups = new Map<string, { title: string; audits: Audit[]; sortKey: string }>();

    filteredAudits.forEach(audit => {
      let key: string;
      let title: string;
      let sortKey: string;

      if (groupBy === 'month') {
        key = format(audit.scheduledDate, 'yyyy-MM');
        title = format(audit.scheduledDate, 'MMMM yyyy', { locale: de });
        sortKey = key;
      } else if (groupBy === 'client') {
        key = audit.clientId;
        title = audit.clientName;
        sortKey = title;
      } else {
        key = audit.type;
        title = AUDIT_TYPE_LABELS[audit.type];
        sortKey = title;
      }

      if (!groups.has(key)) {
        groups.set(key, { title, audits: [], sortKey });
      }
      groups.get(key)!.audits.push(audit);
    });

    return Array.from(groups.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => groupBy === 'month' ? a.sortKey.localeCompare(b.sortKey) : a.title.localeCompare(b.title, 'de'));
  }, [filteredAudits, groupBy]);

  const isLoading = auditsLoading || tasksLoading;

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Audits</h1>
            <p className="text-sm text-muted-foreground">
              {filteredAudits.length} Audit{filteredAudits.length !== 1 ? 's' : ''} gefunden
            </p>
          </div>
          <Button className="gap-2 self-start sm:self-auto" onClick={() => setShowNewAuditDialog(true)}>
            <Plus className="h-4 w-4" />
            Neues Audit
          </Button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kunde suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">Gruppieren:</span>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Nach Monat
                  </div>
                </SelectItem>
                <SelectItem value="client">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Nach Kunde
                  </div>
                </SelectItem>
                <SelectItem value="type">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    Nach Auditart
                  </div>
                </SelectItem>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Keine Gruppierung
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status Tabs */}
        <Tabs defaultValue="all" onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="scheduled">Geplant</TabsTrigger>
            <TabsTrigger value="in-progress">In Bearbeitung</TabsTrigger>
            <TabsTrigger value="completed">Abgeschlossen</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="mt-4">
            {auditsError ? (
              <div className="text-center py-12">
                <p className="text-destructive">Fehler beim Laden der Audits</p>
              </div>
            ) : isLoading ? (
              <div className="border rounded-lg overflow-hidden">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">Kunde</TableHead>
                      <TableHead className="w-[18%]">Auditart</TableHead>
                      <TableHead className="w-[18%]">Termin</TableHead>
                      <TableHead className="w-[12%]">Status</TableHead>
                      <TableHead className="w-[12%]">Aufgaben</TableHead>
                      <TableHead className="w-[5%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRowSkeleton key={i} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : filteredAudits.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/20">
                <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
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
              <div className="space-y-6">
                {groupedAudits.map((group) => (
                  <div key={group.key} className="border rounded-lg overflow-hidden bg-card">
                    {groupBy !== 'none' && (
                      <GroupHeader 
                        title={group.title} 
                        count={group.audits.length}
                        icon={groupBy === 'month'
                          ? <Calendar className="h-4 w-4 text-primary" />
                          : groupBy === 'client' 
                            ? <Users className="h-4 w-4 text-primary" />
                            : <ClipboardCheck className="h-4 w-4 text-primary" />
                        }
                      />
                    )}
                    <Table className="table-fixed w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-left w-[35%]">Kunde</TableHead>
                          <TableHead className="text-left w-[18%]">Auditart</TableHead>
                          <TableHead className="text-left w-[18%]">Termin</TableHead>
                          <TableHead className="text-left w-[12%]">Status</TableHead>
                          <TableHead className="text-left w-[12%]">Aufgaben</TableHead>
                          <TableHead className="w-[5%]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.audits.map((audit) => (
                          <AuditRow
                            key={audit.id}
                            audit={audit}
                            onClick={() => handleViewDetails(audit)}
                            showClient={groupBy !== 'client'}
                            showType={groupBy !== 'type'}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
