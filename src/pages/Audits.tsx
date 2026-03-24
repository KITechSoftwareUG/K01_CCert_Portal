import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NewAuditDialog } from '@/components/NewAuditDialog';
import { useAudits } from '@/hooks/useAudits';
import { useAuditTasks } from '@/hooks/useAuditTasks';
import { useClients } from '@/hooks/useClients';
import { useAuditors } from '@/hooks/useAuditors';
import { useCertificationBodies } from '@/hooks/useCertificationBodies';
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
import { Plus, Search, ChevronRight, Calendar, Building2, ClipboardCheck, Users, Trash2, X, RotateCcw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Audit } from '@/types/audit';
import { AUDIT_TYPE_LABELS, AUDIT_STATUS_CONFIG } from '@/lib/constants';
import { toast } from 'sonner';
import { format, isSameMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

type StatusFilter = 'all' | 'scheduled' | 'in-progress' | 'completed';
type GroupBy = 'month' | 'client' | 'type' | 'none';

const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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
  isSelected: boolean;
  onSelectChange: (selected: boolean) => void;
}

const AuditRow = ({
  audit,
  onClick,
  showClient = true,
  showType = true,
  isSelected,
  onSelectChange
}: AuditRowProps) => {
  const statusConfig = AUDIT_STATUS_CONFIG[audit.status];
  const pendingTasks = audit.tasks.filter(t => t.status !== 'completed').length;
  const overdueTasks = audit.tasks.filter(t => t.status === 'overdue' || (t.status !== 'completed' && t.dueDate < new Date())).length;

  return (
    <TableRow
      className={cn("cursor-pointer hover:bg-muted/50 transition-colors", isSelected && "bg-primary/5")}
      onClick={onClick}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectChange(!!checked)}
        />
      </TableCell>
      {showClient && (
        <TableCell className="font-medium text-left">{audit.clientName}</TableCell>
      )}
      <TableCell className="text-center">
        <div className="flex flex-wrap gap-1 justify-center">
          {audit.certifications.length > 0 ? audit.certifications.map((cert, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {cert}
            </Badge>
          )) : (
            <span className="text-xs text-muted-foreground">–</span>
          )}
        </div>
      </TableCell>
      {showType && (
        <TableCell>
          <span className="text-sm">{AUDIT_TYPE_LABELS[audit.type]}</span>
        </TableCell>
      )}
      <TableCell>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {format(audit.scheduledDate, 'dd.MM.yyyy')}
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
        <div className="text-sm font-medium">
          {audit.auditorName || <span className="text-muted-foreground opacity-50">–</span>}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {audit.certificationBodyName || <span className="text-muted-foreground opacity-50">–</span>}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {audit.tasks.some(t => t.category === 'finding' && t.status !== 'completed') && (
            <Badge variant="destructive" className="text-[10px] py-0 h-4 w-fit">
              {audit.tasks.filter(t => t.category === 'finding' && t.status !== 'completed').length} NCs
            </Badge>
          )}
          {pendingTasks > 0 ? (
            <div className="flex items-center gap-1">
              <span className={cn(
                "text-sm",
                overdueTasks > 0 ? "text-destructive font-medium" : "text-muted-foreground"
              )}>
                {overdueTasks > 0 ? `${overdueTasks} überfällig` : `${pendingTasks} Aufgabe${pendingTasks !== 1 ? 'n' : ''}`}
              </span>
            </div>
          ) : (
            <span className="text-sm text-green-600 font-medium">✓ Fertig</span>
          )}
        </div>
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
  const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('audits-search-query') || '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    (sessionStorage.getItem('audits-status-filter') as StatusFilter) || 'all'
  );
  const [groupBy, setGroupBy] = useState<GroupBy>(() =>
    (sessionStorage.getItem('audits-group-by') as GroupBy) || 'month'
  );
  const [showNewAuditDialog, setShowNewAuditDialog] = useState(false);
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'active' | 'inactive'>(() =>
    (sessionStorage.getItem('audits-client-status-filter') as 'all' | 'active' | 'inactive') || 'active'
  );
  const [consultantFilter, setConsultantFilter] = useState<string>(() =>
    sessionStorage.getItem('audits-consultant-filter') || 'all'
  );
  const [auditorFilter, setAuditorFilter] = useState<string>(() =>
    sessionStorage.getItem('audits-auditor-filter') || 'all'
  );
  const [certificationBodyFilter, setCertificationBodyFilter] = useState<string>(() =>
    sessionStorage.getItem('audits-cert-body-filter') || 'all'
  );
  const [selectedAuditIds, setSelectedAuditIds] = useState<Set<string>>(new Set());

  const { data: dbAudits = [], isLoading: auditsLoading, error: auditsError } = useAudits();
  const { data: tasks = [], isLoading: tasksLoading } = useAuditTasks();
  const { data: clients = [] } = useClients();
  const { data: auditors = [] } = useAuditors();
  const { data: certificationBodies = [] } = useCertificationBodies();

  const clientMap = useMemo(() => {
    const map = new Map<string, { is_active: boolean; consultant: string | null }>();
    clients.forEach(c => map.set(c.id, { is_active: c.is_active, consultant: c.consultant }));
    return map;
  }, [clients]);

  const consultants = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => { if (c.consultant) set.add(c.consultant); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  }, [clients]);

  const audits = useMemo(() =>
    dbAudits.map(audit => transformAuditToLocal(audit, tasks)),
    [dbAudits, tasks]
  );

  // Scroll to current month on initial load once audits are loaded
  useEffect(() => {
    if (!auditsLoading && audits.length > 0 && groupBy === 'month') {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        scrollToCurrentMonth();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [auditsLoading, groupBy, audits.length]);

  const handleViewDetails = useCallback((audit: Audit) => {
    navigate(`/audits/${audit.id}`);
  }, [navigate]);

  const filteredAudits = useMemo(() => {
    return audits
      .filter(audit => {
        const matchesSearch = audit.clientName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || audit.status === statusFilter;

        const clientInfo = clientMap.get(audit.clientId);
        const matchesClientStatus = clientStatusFilter === 'all'
          || (clientStatusFilter === 'active' && clientInfo?.is_active === true)
          || (clientStatusFilter === 'inactive' && clientInfo?.is_active === false);
        const matchesConsultant = consultantFilter === 'all' || clientInfo?.consultant === consultantFilter;

        const matchesAuditor = auditorFilter === 'all' || audit.auditorId === auditorFilter;
        const matchesCertBody = certificationBodyFilter === 'all' || audit.certificationBodyId === certificationBodyFilter;

        return matchesSearch && matchesStatus && matchesClientStatus && matchesConsultant && matchesAuditor && matchesCertBody;
      })
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }, [audits, searchQuery, statusFilter, clientStatusFilter, consultantFilter, auditorFilter, certificationBodyFilter, clientMap]);

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

  const scrollToCurrentMonth = useCallback(() => {
    const currentMonthKey = format(new Date(), 'yyyy-MM');
    const element = document.getElementById(`month-${currentMonthKey}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      toast.info('Keine Audits im aktuellen Monat geplant');
    }
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setClientStatusFilter('active');
    setConsultantFilter('all');
    setAuditorFilter('all');
    setCertificationBodyFilter('all');

    sessionStorage.removeItem('audits-search-query');
    sessionStorage.removeItem('audits-status-filter');
    sessionStorage.removeItem('audits-client-status-filter');
    sessionStorage.removeItem('audits-consultant-filter');
    sessionStorage.removeItem('audits-auditor-filter');
    sessionStorage.removeItem('audits-cert-body-filter');

    toast.success('Filter zurückgesetzt');
  }, []);

  const toggleAuditSelection = (auditId: string) => {
    setSelectedAuditIds(prev => {
      const next = new Set(prev);
      if (next.has(auditId)) next.delete(auditId);
      else next.add(auditId);
      return next;
    });
  };

  const toggleAllInGroup = (auditIds: string[]) => {
    setSelectedAuditIds(prev => {
      const next = new Set(prev);
      const allSelected = auditIds.every(id => next.has(id));
      if (allSelected) {
        auditIds.forEach(id => next.delete(id));
      } else {
        auditIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const isLoading = auditsLoading || tasksLoading;

  return (
    <>
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

        <Tabs
          value={statusFilter}
          onValueChange={(v) => {
            const val = v as StatusFilter;
            setStatusFilter(val);
            sessionStorage.setItem('audits-status-filter', val);
          }}
          className="w-full"
        >
          {/* Sticky Filters Row & TabsList */}
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b pb-4 pt-2 -mx-4 px-4 sm:-mx-6 sm:px-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative flex-1 min-w-0 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Kunde suchen..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    sessionStorage.setItem('audits-search-query', e.target.value);
                  }}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={clientStatusFilter}
                  onValueChange={(v) => {
                    const val = v as 'all' | 'active' | 'inactive';
                    setClientStatusFilter(val);
                    sessionStorage.setItem('audits-client-status-filter', val);
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="all">Alle Kunden</SelectItem>
                    <SelectItem value="active">Nur aktive</SelectItem>
                    <SelectItem value="inactive">Nur inaktive</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={consultantFilter}
                  onValueChange={(v) => {
                    setConsultantFilter(v);
                    sessionStorage.setItem('audits-consultant-filter', v);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Berater..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="all">Alle Berater</SelectItem>
                    {consultants.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={auditorFilter}
                  onValueChange={(v) => {
                    setAuditorFilter(v);
                    sessionStorage.setItem('audits-auditor-filter', v);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Auditor..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="all">Alle Auditoren</SelectItem>
                    {auditors.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={certificationBodyFilter}
                  onValueChange={(v) => {
                    setCertificationBodyFilter(v);
                    sessionStorage.setItem('audits-cert-body-filter', v);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Zertifizierer..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="all">Alle Zertifizierer</SelectItem>
                    {certificationBodies.map(cb => (
                      <SelectItem key={cb.id} value={cb.id}>{cb.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-sm text-muted-foreground hidden sm:inline">Gruppieren:</span>
                <div className="flex items-center gap-1">
                  <Select
                    value={groupBy}
                    onValueChange={(v) => {
                      const val = v as GroupBy;
                      setGroupBy(val);
                      sessionStorage.setItem('audits-group-by', val);
                    }}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
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
                  {groupBy === 'month' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-2"
                      onClick={scrollToCurrentMonth}
                      title="Zum aktuellen Monat springen"
                    >
                      Heute
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 text-muted-foreground hover:text-foreground"
                  onClick={handleResetFilters}
                  title="Alle Filter zurücksetzen"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>

            <TabsList>
              <TabsTrigger value="all">Alle</TabsTrigger>
              <TabsTrigger value="scheduled">Geplant</TabsTrigger>
              <TabsTrigger value="in-progress">In Bearbeitung</TabsTrigger>
              <TabsTrigger value="completed">Abgeschlossen</TabsTrigger>
            </TabsList>
          </div>

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
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-[15%]">Kunde</TableHead>
                      <TableHead className="w-[8%] text-center">Zertifikat</TableHead>
                      <TableHead className="w-[12%]">Auditart</TableHead>
                      <TableHead className="w-[10%]">Termin</TableHead>
                      <TableHead className="w-[10%]">Status</TableHead>
                      <TableHead className="w-[12%]">Auditor</TableHead>
                      <TableHead className="w-[12%]">Zertifizierer</TableHead>
                      <TableHead className="w-[10%]">Aufgaben</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
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
                    <div id={groupBy === 'month' ? `month-${group.key}` : undefined} className="scroll-mt-[200px]">
                      <Table className="table-fixed w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]">
                              <Checkbox
                                checked={group.audits.every(a => selectedAuditIds.has(a.id))}
                                onCheckedChange={() => toggleAllInGroup(group.audits.map(a => a.id))}
                              />
                            </TableHead>
                            {groupBy !== 'client' && <TableHead className="text-left w-[15%]">Kunde</TableHead>}
                            <TableHead className="text-left w-[8%] text-center">Zertifikat</TableHead>
                            {groupBy !== 'type' && <TableHead className="text-left w-[12%]">Auditart</TableHead>}
                            <TableHead className="text-left w-[10%]">Termin</TableHead>
                            <TableHead className="text-left w-[10%]">Status</TableHead>
                            <TableHead className="text-left w-[12%]">Auditor</TableHead>
                            <TableHead className="text-left w-[12%]">Zertifizierer</TableHead>
                            <TableHead className="text-left w-[10%]">Aufgaben</TableHead>
                            <TableHead className="w-[40px] text-right pr-4"></TableHead>
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
                              isSelected={selectedAuditIds.has(audit.id)}
                              onSelectChange={() => toggleAuditSelection(audit.id)}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <NewAuditDialog open={showNewAuditDialog} onOpenChange={setShowNewAuditDialog} />

      {/* Bulk Action Bar */}
      {selectedAuditIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-foreground text-background px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-primary/20">
            <div className="flex items-center gap-2 border-r border-background/20 pr-6">
              <span className="text-sm font-bold">{selectedAuditIds.size}</span>
              <span className="text-sm opacity-80">Audit{selectedAuditIds.size !== 1 ? 's' : ''} ausgewählt</span>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-background hover:bg-background/10 gap-2 h-8"
                onClick={() => {
                  if (confirm(`${selectedAuditIds.size} Audits wirklich löschen?`)) {
                    // Bulk delete logic would go here
                    toast.error('Bulk Delete noch nicht implementiert (Vorsicht!)');
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Löschen
              </Button>

              <div className="h-4 w-[1px] bg-background/20 mx-2" />

              <Button
                variant="ghost"
                size="sm"
                className="text-background hover:bg-background/10 h-8 p-1"
                onClick={() => setSelectedAuditIds(new Set())}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Audits;
