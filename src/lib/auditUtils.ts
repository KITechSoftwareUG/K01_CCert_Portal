import { Audit, AuditTask } from '@/types/audit';
import { isOverdue } from './dateUtils';
import { AuditWithClient } from '@/hooks/useAudits';

/**
 * Transform a database audit (AuditWithClient) to the local Audit type.
 * Accepts optional tasks array for Audits page variant.
 */
export const transformAuditToLocal = (dbAudit: AuditWithClient, tasks?: any[]): Audit => ({
  id: dbAudit.id,
  clientId: dbAudit.client_id,
  clientName: dbAudit.clients?.name || 'Unbekannt',
  type: dbAudit.type,
  certifications: (dbAudit.certifications || []) as any,
  scheduledDate: new Date(dbAudit.scheduled_date),
  status: dbAudit.status,
  tasks: tasks
    ? tasks
        .filter(t => t.audit_id === dbAudit.id)
        .map(t => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          status: t.status,
          dueDate: new Date(t.due_date),
          assignedTo: t.assigned_to || undefined,
          completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
        }))
    : [],
  notes: dbAudit.notes || undefined,
  createdAt: new Date(dbAudit.created_at),
});

/**
 * Calculate task progress for an audit
 */
export const calculateProgress = (tasks: AuditTask[]): { completed: number; total: number; percentage: number } => {
  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  
  return { completed, total, percentage };
};

/**
 * Get overdue tasks from an audit
 */
export const getOverdueTasks = (tasks: AuditTask[]): AuditTask[] => {
  return tasks.filter(t => t.status !== 'completed' && isOverdue(t.dueDate));
};

/**
 * Get pending (not completed) tasks from an audit
 */
export const getPendingTasks = (tasks: AuditTask[]): AuditTask[] => {
  return tasks.filter(t => t.status !== 'completed');
};

/**
 * Filter active audits (not completed or cancelled)
 */
export const getActiveAudits = (audits: Audit[]): Audit[] => {
  return audits.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
};

/**
 * Sort audits by scheduled date (ascending)
 */
export const sortAuditsByDate = (audits: Audit[]): Audit[] => {
  return [...audits].sort((a, b) => 
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );
};

/**
 * Get all pending tasks from multiple audits with audit context
 */
export interface TaskWithAuditContext extends AuditTask {
  auditId: string;
  clientName: string;
  auditType: string;
}

export const getAllPendingTasksWithContext = (
  audits: Audit[], 
  auditTypeLabels: Record<string, string>
): TaskWithAuditContext[] => {
  return getActiveAudits(audits)
    .flatMap(audit => 
      getPendingTasks(audit.tasks).map(task => ({
        ...task,
        auditId: audit.id,
        clientName: audit.clientName,
        auditType: auditTypeLabels[audit.type],
      }))
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
};
