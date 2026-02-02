export type AuditType = 'initial' | 'surveillance' | 'recertification' | 'six-month' | 'internal';

export type CertificationStandard = 'SURE' | 'FSC' | 'PEFC' | 'ISCC' | 'ISO 9001' | 'ISO 14001';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'overdue';

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  certifications: CertificationStandard[];
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
