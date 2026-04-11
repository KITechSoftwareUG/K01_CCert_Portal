import { Audit, AuditTask } from '@/types/audit';
import { isOverdue } from './dateUtils';
import { AuditWithClient } from '@/hooks/useAudits';
import { Tables } from '@/integrations/supabase/types';

/**
 * Transform a database audit (AuditWithClient) to the local Audit type.
 * Accepts optional tasks array for Audits page variant.
 */
export const transformAuditToLocal = (dbAudit: AuditWithClient, tasks?: Tables<'audit_tasks'>[]): Audit => ({
  id: dbAudit.id,
  clientId: dbAudit.client_id,
  clientName: dbAudit.clients?.name || 'Unbekannt',
  type: dbAudit.type,
  certifications: (() => {
    // Primary: get certification name from joined client_certifications
    const certName = dbAudit.client_certifications?.certifications?.name;
    if (certName) return [certName];
    // Fallback: legacy enum array on audits table
    if (dbAudit.certifications && dbAudit.certifications.length > 0) return dbAudit.certifications as string[];
    return [];
  })(),
  scheduledDate: new Date(dbAudit.scheduled_date),
  status: dbAudit.status,
  auditorId: dbAudit.auditor_id || undefined,
  auditorName: dbAudit.auditors?.name || undefined,
  certificationBodyId: dbAudit.certification_body_id || undefined,
  certificationBodyName: dbAudit.certification_bodies?.name || undefined,
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
  return (audits || []).filter(a => a.status !== 'completed' && a.status !== 'cancelled');
};
