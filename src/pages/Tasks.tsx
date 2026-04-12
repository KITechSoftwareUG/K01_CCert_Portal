import { memo, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  parseISO,
  isBefore,
  startOfDay,
  isToday,
  isThisWeek,
  isThisMonth,
} from 'date-fns';
import { de } from 'date-fns/locale';
import {
  CheckSquare,
  Search,
  X,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Building2,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useAllAuditTasks,
  useUpdateAuditTask,
  DbAuditTaskFull,
  TaskStatus,
} from '@/hooks/useAuditTasks';
import { TASK_STATUS_CONFIG, AUDIT_TYPE_LABELS } from '@/lib/constants';
import { EditFindingDialog } from '@/components/EditFindingDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useScrollPersistence } from '@/hooks/useScrollPersistence';
import { AuditType } from '@/types/audit';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | TaskStatus;
type CategoryFilter = 'all' | 'task' | 'finding';
type DueFilter = 'all' | 'overdue' | 'today' | 'this-week' | 'this-month';
type GroupBy = 'status' | 'due-date' | 'audit' | 'client' | 'none';

// ─── SessionStorage keys ────────────────────────────────────────────────────

const SS_SEARCH = 'tasks-search-query';
const SS_STATUS = 'tasks-status-filter';
const SS_CATEGORY = 'tasks-category-filter';
const SS_DUE = 'tasks-due-filter';
const SS_GROUP = 'tasks-group-by';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_GROUP_ORDER: TaskStatus[] = ['overdue', 'in-progress', 'pending', 'completed'];

const SEVERITY_LABELS: Record<string, string> = {
  major: 'Haupt-NK',
  minor: 'Neben-NK',
  recommendation: 'Empfehlung',
};

const SEVERITY_CLASSES: Record<string, string> = {
  major: 'bg-destructive/10 text-destructive border-destructive/20',
  minor: 'bg-warning/10 text-warning border-warning/20',
  recommendation: 'bg-secondary text-secondary-foreground border-border',
};

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'overdue', label: 'Überfällig' },
  { value: 'in-progress', label: 'In Bearbeitung' },
  { value: 'pending', label: 'Ausstehend' },
  { value: 'completed', label: 'Abgeschlossen' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEffectiveStatus(task: DbAuditTaskFull): TaskStatus {
  if (task.status === 'completed') return 'completed';
  const due = parseISO(task.due_date);
  if (isBefore(due, startOfDay(new Date()))) return 'overdue';
  return task.status as TaskStatus;
}

function formatDue(dateStr: string): string {
  return format(parseISO(dateStr), 'dd.MM.yyyy');
}

// ─── TaskRow ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: DbAuditTaskFull;
  onToggle: (task: DbAuditTaskFull) => void;
  onEdit: (task: DbAuditTaskFull) => void;
}

const TaskRow = memo(({ task, onToggle, onEdit }: TaskRowProps) => {
  const navigate = useNavigate();
  const effectiveStatus = getEffectiveStatus(task);
  const statusCfg = TASK_STATUS_CONFIG[effectiveStatus];
  const isOverdue = effectiveStatus === 'overdue';
  const isCompleted = task.status === 'completed';
  const isFinding = task.category === 'finding';

  const clientName = task.audits?.clients?.name ?? '';
  const auditType = task.audits
    ? (AUDIT_TYPE_LABELS[task.audits.type as AuditType] ?? task.audits.type)
    : '';
  const auditDate = task.audits ? format(parseISO(task.audits.scheduled_date), 'dd.MM.yyyy') : '';

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-dialog]')) return;
    onEdit(task);
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0',
        'cursor-pointer hover:bg-muted/30 transition-colors',
        isOverdue && 'bg-destructive/5',
        isCompleted && 'opacity-60'
      )}
      onClick={handleRowClick}
    >
      {/* Checkbox — status toggle */}
      <div
        data-no-dialog
        className="pt-0.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onToggle(task)}
          className="mt-0.5"
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: category badge + title */}
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs shrink-0 font-normal">
            {isFinding ? 'Befund' : 'Aufgabe'}
          </Badge>
          {isFinding && task.severity && (
            <Badge
              variant="outline"
              className={cn('text-xs shrink-0', SEVERITY_CLASSES[task.severity])}
            >
              {SEVERITY_LABELS[task.severity] ?? task.severity}
            </Badge>
          )}
          <span
            className={cn(
              'text-sm font-medium truncate',
              isCompleted && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </span>
        </div>

        {/* Row 2: description */}
        {task.description && (
          <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
            {task.description}
          </p>
        )}

        {/* Row 3: meta */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span
            className={cn(
              'flex items-center gap-1',
              isOverdue && 'text-destructive font-medium'
            )}
          >
            <Calendar className="h-3 w-3 shrink-0" />
            {formatDue(task.due_date)}
          </span>

          {task.assigned_to && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3 shrink-0" />
              {task.assigned_to}
            </span>
          )}

          {clientName && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0" />
              {clientName}
            </span>
          )}

          {auditType && (
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3 shrink-0" />
              {auditType}
              {auditDate && ` – ${auditDate}`}
            </span>
          )}
        </div>
      </div>

      {/* Right: status badge + navigate */}
      <div className="flex items-center gap-2 shrink-0 self-center">
        <Badge
          className={cn(
            'text-xs hidden sm:inline-flex',
            statusCfg.bg,
            statusCfg.color
          )}
        >
          {statusCfg.label}
        </Badge>
        {task.audits && (
          <Button
            data-no-dialog
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            title="Zum Audit navigieren"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/audits/${task.audits!.id}`);
            }}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
});
TaskRow.displayName = 'TaskRow';

// ─── TaskGroup ───────────────────────────────────────────────────────────────

interface TaskGroupProps {
  label: string;
  tasks: DbAuditTaskFull[];
  onToggle: (task: DbAuditTaskFull) => void;
  onEdit: (task: DbAuditTaskFull) => void;
}

const TaskGroup = ({ label, tasks, onToggle, onEdit }: TaskGroupProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-4 rounded-lg border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-semibold text-sm">{label}</span>
          <span className="text-xs text-muted-foreground bg-background border border-border rounded-full px-2 py-0.5 leading-none">
            {tasks.length}
          </span>
        </div>
      </button>

      {!collapsed && (
        <div>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={onToggle}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

const TasksSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, gi) => (
      <div key={gi} className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/40">
          <Skeleton className="h-4 w-32" />
        </div>
        {Array.from({ length: 3 }).map((_, ti) => (
          <div key={ti} className="flex gap-3 px-4 py-3 border-b border-border/50 last:border-0">
            <Skeleton className="h-4 w-4 mt-0.5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Tasks() {
  const scrollRef = useScrollPersistence();

  const [searchQuery, setSearchQuery] = useState(
    () => sessionStorage.getItem(SS_SEARCH) ?? ''
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    () => (sessionStorage.getItem(SS_STATUS) as StatusFilter) ?? 'all'
  );
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(
    () => (sessionStorage.getItem(SS_CATEGORY) as CategoryFilter) ?? 'all'
  );
  const [dueFilter, setDueFilter] = useState<DueFilter>(
    () => (sessionStorage.getItem(SS_DUE) as DueFilter) ?? 'all'
  );
  const [groupBy, setGroupBy] = useState<GroupBy>(
    () => (sessionStorage.getItem(SS_GROUP) as GroupBy) ?? 'status'
  );

  const [editTask, setEditTask] = useState<DbAuditTaskFull | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: tasks, isLoading } = useAllAuditTasks();
  const updateTask = useUpdateAuditTask();

  // Persisted setters
  const setSearch = useCallback((v: string) => {
    setSearchQuery(v);
    sessionStorage.setItem(SS_SEARCH, v);
  }, []);

  const setStatus = useCallback((v: StatusFilter) => {
    setStatusFilter(v);
    sessionStorage.setItem(SS_STATUS, v);
  }, []);

  const setCategory = useCallback((v: CategoryFilter) => {
    setCategoryFilter(v);
    sessionStorage.setItem(SS_CATEGORY, v);
  }, []);

  const setDue = useCallback((v: DueFilter) => {
    setDueFilter(v);
    sessionStorage.setItem(SS_DUE, v);
  }, []);

  const setGroup = useCallback((v: GroupBy) => {
    setGroupBy(v);
    sessionStorage.setItem(SS_GROUP, v);
  }, []);

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setDueFilter('all');
    setGroupBy('status');
    [SS_SEARCH, SS_STATUS, SS_CATEGORY, SS_DUE, SS_GROUP].forEach((k) =>
      sessionStorage.removeItem(k)
    );
  }, []);

  const handleToggle = useCallback(
    async (task: DbAuditTaskFull) => {
      const newStatus: TaskStatus =
        task.status === 'completed' ? 'pending' : 'completed';
      try {
        await updateTask.mutateAsync({
          id: task.id,
          status: newStatus,
          completed_at:
            newStatus === 'completed' ? new Date().toISOString() : null,
        });
        toast.success(
          newStatus === 'completed'
            ? 'Aufgabe abgeschlossen'
            : 'Aufgabe wieder geöffnet'
        );
      } catch {
        toast.error('Fehler beim Aktualisieren');
      }
    },
    [updateTask]
  );

  const handleEdit = useCallback((task: DbAuditTaskFull) => {
    setEditTask(task);
    setEditOpen(true);
  }, []);

  // ── Filter ──────────────────────────────────────────────────────────────

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks
      .filter((task) => {
        const effectiveStatus = getEffectiveStatus(task);

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = task.title.toLowerCase().includes(q);
          const matchesAssigned = (task.assigned_to ?? '')
            .toLowerCase()
            .includes(q);
          const matchesClient = (task.audits?.clients?.name ?? '')
            .toLowerCase()
            .includes(q);
          if (!matchesTitle && !matchesAssigned && !matchesClient) return false;
        }

        if (statusFilter !== 'all' && effectiveStatus !== statusFilter)
          return false;

        if (categoryFilter === 'task' && task.category === 'finding')
          return false;
        if (categoryFilter === 'finding' && task.category !== 'finding')
          return false;

        if (dueFilter !== 'all') {
          const due = parseISO(task.due_date);
          if (dueFilter === 'overdue' && !isBefore(due, startOfDay(new Date())))
            return false;
          if (dueFilter === 'today' && !isToday(due)) return false;
          if (dueFilter === 'this-week' && !isThisWeek(due, { weekStartsOn: 1 }))
            return false;
          if (dueFilter === 'this-month' && !isThisMonth(due)) return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime()
      );
  }, [tasks, searchQuery, statusFilter, categoryFilter, dueFilter]);

  // ── Grouping ────────────────────────────────────────────────────────────

  const groups = useMemo(() => {
    const map = new Map<string, { tasks: DbAuditTaskFull[]; order: number }>();

    filteredTasks.forEach((task) => {
      let key: string;
      let order: number;

      switch (groupBy) {
        case 'status': {
          const eff = getEffectiveStatus(task);
          key = TASK_STATUS_CONFIG[eff].label;
          order = STATUS_GROUP_ORDER.indexOf(eff);
          break;
        }
        case 'due-date': {
          key = format(parseISO(task.due_date), 'MMMM yyyy', { locale: de });
          order = parseISO(task.due_date).getTime();
          break;
        }
        case 'audit': {
          if (task.audits) {
            const typeLabel =
              AUDIT_TYPE_LABELS[task.audits.type as AuditType] ??
              task.audits.type;
            const dateStr = format(parseISO(task.audits.scheduled_date), 'dd.MM.yyyy');
            key = `${typeLabel} – ${dateStr}`;
            order = parseISO(task.audits.scheduled_date).getTime();
          } else {
            key = 'Kein Audit';
            order = Number.MAX_SAFE_INTEGER;
          }
          break;
        }
        case 'client': {
          key = task.audits?.clients?.name ?? 'Kein Kunde';
          order = 0;
          break;
        }
        case 'none':
        default:
          key = 'Alle Aufgaben';
          order = 0;
          break;
      }

      if (!map.has(key)) map.set(key, { tasks: [], order });
      map.get(key)!.tasks.push(task);
    });

    return [...map.entries()]
      .sort(([ka, a], [kb, b]) => {
        if (groupBy === 'client') return ka.localeCompare(kb, 'de');
        return a.order - b.order;
      })
      .map(([label, { tasks: groupTasks }]) => ({ label, tasks: groupTasks }));
  }, [filteredTasks, groupBy]);

  const hasActiveFilters =
    !!(searchQuery) ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    dueFilter !== 'all';

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky header + filters */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-0">
          {/* Title row */}
          <div className="flex items-center gap-3 mb-4">
            <CheckSquare className="h-6 w-6 text-primary shrink-0" />
            <h1 className="text-xl font-bold">Aufgaben</h1>
            {!isLoading && (
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-0.5 font-medium">
                {filteredTasks.length}{' '}
                {filteredTasks.length === 1 ? 'Aufgabe' : 'Aufgaben'}
              </span>
            )}
          </div>

          {/* Filter controls */}
          <div className="flex flex-wrap gap-2 mb-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9"
                placeholder="Titel, Zuständige, Kunde..."
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setSearch('')}
                  aria-label="Suche löschen"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category */}
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategory(v as CategoryFilter)}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="task">Nur Aufgaben</SelectItem>
                <SelectItem value="finding">Nur Befunde</SelectItem>
              </SelectContent>
            </Select>

            {/* Due date */}
            <Select
              value={dueFilter}
              onValueChange={(v) => setDue(v as DueFilter)}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Fristen</SelectItem>
                <SelectItem value="overdue">Überfällig</SelectItem>
                <SelectItem value="today">Heute fällig</SelectItem>
                <SelectItem value="this-week">Diese Woche</SelectItem>
                <SelectItem value="this-month">Dieser Monat</SelectItem>
              </SelectContent>
            </Select>

            {/* Group by */}
            <Select
              value={groupBy}
              onValueChange={(v) => setGroup(v as GroupBy)}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">Nach Status</SelectItem>
                <SelectItem value="due-date">Nach Fälligkeit</SelectItem>
                <SelectItem value="client">Nach Kunde</SelectItem>
                <SelectItem value="audit">Nach Audit</SelectItem>
                <SelectItem value="none">Keine Gruppierung</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={handleReset}
              >
                <X className="h-4 w-4 mr-1.5" />
                Zurücksetzen
              </Button>
            )}
          </div>

          {/* Status tabs */}
          <div className="flex gap-0 -mb-px overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatus(tab.value)}
                className={cn(
                  'px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
                  statusFilter === tab.value
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 md:p-6">
        {isLoading ? (
          <TasksSkeleton />
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckSquare className="h-14 w-14 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground font-medium mb-1">
              Keine Aufgaben gefunden
            </p>
            {hasActiveFilters && (
              <Button
                variant="link"
                size="sm"
                onClick={handleReset}
                className="text-muted-foreground"
              >
                Filter zurücksetzen
              </Button>
            )}
          </div>
        ) : (
          <div>
            {groups.map(({ label, tasks: groupTasks }) => (
              <TaskGroup
                key={label}
                label={label}
                tasks={groupTasks}
                onToggle={handleToggle}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <EditFindingDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        task={editTask}
      />
    </div>
  );
}
