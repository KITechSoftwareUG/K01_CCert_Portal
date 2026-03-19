export type AuditType = 'initial' | 'surveillance' | 'recertification' | 'six-month' | 'internal' | 'training';

export type CertificationStandard = string;

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'overdue';

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  certifications: string[];
  createdAt: Date;
}

export interface AuditTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: Date;
  assignedTo?: string;
  completedAt?: Date;
  category?: string;
  severity?: string;
}

export interface Audit {
  id: string;
  clientId: string;
  clientName: string;
  type: AuditType;
  certifications: CertificationStandard[];
  scheduledDate: Date;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  tasks: AuditTask[];
  notes?: string;
  createdAt: Date;
}
