import { Client, Audit, AuditType } from '@/types/audit';
import { daysFromNow } from './dateUtils';

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'Holz GmbH',
    contactPerson: 'Hans Müller',
    email: 'h.mueller@holzgmbh.de',
    phone: '+49 123 456789',
    address: 'Waldstraße 123, 10115 Berlin',
    certifications: ['FSC', 'PEFC'],
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Energie AG',
    contactPerson: 'Anna Schmidt',
    email: 'a.schmidt@energie-ag.de',
    phone: '+49 234 567890',
    address: 'Energieweg 45, 20095 Hamburg',
    certifications: ['ISCC', 'ISO 14001'],
    createdAt: new Date('2024-02-20'),
  },
  {
    id: '3',
    name: 'Produktions KG',
    contactPerson: 'Michael Weber',
    email: 'm.weber@produktions-kg.de',
    phone: '+49 345 678901',
    address: 'Industriestraße 78, 80331 München',
    certifications: ['ISO 9001', 'ISO 14001'],
    createdAt: new Date('2024-03-10'),
  },
];

const getTasksForAuditType = (type: AuditType, auditId: string) => {
  const taskTemplates: Record<AuditType, Array<{ title: string; description: string; status: string; dueDays: number; completedDays?: number; assignedTo: string }>> = {
    initial: [
      {
        title: 'Registrierung beim Zertifizierer',
        description: 'Registrierung beim Zertifizierer und im SURE-EU-System durchführen',
        status: 'completed',
        dueDays: -20,
        completedDays: -23,
        assignedTo: 'Hans Müller',
      },
      {
        title: 'Training und Dokumentation',
        description: 'Schulung der Mitarbeiter durchführen und vollständige Dokumentation erstellen',
        status: 'in-progress',
        dueDays: -2,
        assignedTo: 'Anna Schmidt',
      },
      {
        title: 'Zertifizierungsaudit und Umsetzung',
        description: 'Vollständiges Zertifizierungsaudit durchführen und Umsetzung der Standards prüfen',
        status: 'pending',
        dueDays: 2,
        assignedTo: 'Michael Weber',
      },
    ],
    surveillance: [
      {
        title: 'Zusendung der Unterlagen',
        description: 'Alle relevanten Unterlagen für die interne Überprüfung zusenden',
        status: 'in-progress',
        dueDays: 1,
        assignedTo: 'Anna Schmidt',
      },
      {
        title: 'Austausch und Korrektur',
        description: 'Feedback vom Zertifizierer besprechen und notwendige Korrekturen durchführen',
        status: 'pending',
        dueDays: 8,
        assignedTo: 'Hans Müller',
      },
    ],
    recertification: [
      {
        title: 'Vorbereitung Re-Zertifizierung',
        description: 'Alle Dokumente aktualisieren und für Re-Zertifizierung vorbereiten',
        status: 'pending',
        dueDays: 20,
        assignedTo: 'Michael Weber',
      },
      {
        title: 'Interne Überprüfung',
        description: 'Internes Audit zur Sicherstellung der Standards durchführen',
        status: 'pending',
        dueDays: 35,
        assignedTo: 'Anna Schmidt',
      },
      {
        title: 'Re-Zertifizierungsaudit',
        description: 'Vollständiges Re-Zertifizierungsaudit durchführen',
        status: 'pending',
        dueDays: 42,
        assignedTo: 'Hans Müller',
      },
    ],
    'six-month': [
      {
        title: 'Statusbericht erstellen',
        description: '6-Monats-Bericht über die Umsetzung der Zertifizierungsanforderungen erstellen',
        status: 'in-progress',
        dueDays: 5,
        assignedTo: 'Anna Schmidt',
      },
      {
        title: 'Dokumentation prüfen',
        description: 'Vollständigkeit und Aktualität der Dokumentation überprüfen',
        status: 'pending',
        dueDays: 15,
        assignedTo: 'Michael Weber',
      },
    ],
  };

  return taskTemplates[type].map((task, index) => ({
    id: `${auditId}-${index + 1}`,
    title: task.title,
    description: task.description,
    status: task.status as 'pending' | 'in-progress' | 'completed',
    dueDate: daysFromNow(task.dueDays),
    completedAt: task.completedDays ? daysFromNow(task.completedDays) : undefined,
    assignedTo: task.assignedTo,
  }));
};

export const mockAudits: Audit[] = [
  {
    id: 'a1',
    clientId: '1',
    clientName: 'Holz GmbH',
    type: 'initial',
    certifications: ['FSC', 'PEFC'],
    scheduledDate: daysFromNow(5),
    status: 'in-progress',
    tasks: getTasksForAuditType('initial', 'a1'),
    notes: 'Initialaudit für FSC und PEFC Zertifizierung',
    createdAt: new Date('2024-11-15'),
  },
  {
    id: 'a2',
    clientId: '2',
    clientName: 'Energie AG',
    type: 'surveillance',
    certifications: ['ISCC'],
    scheduledDate: daysFromNow(12),
    status: 'scheduled',
    tasks: getTasksForAuditType('surveillance', 'a2'),
    notes: 'Jährliches Überwachungsaudit',
    createdAt: new Date('2024-11-01'),
  },
  {
    id: 'a3',
    clientId: '3',
    clientName: 'Produktions KG',
    type: 'recertification',
    certifications: ['ISO 9001', 'ISO 14001'],
    scheduledDate: daysFromNow(45),
    status: 'scheduled',
    tasks: getTasksForAuditType('recertification', 'a3'),
    notes: 'Re-Zertifizierung nach 3 Jahren',
    createdAt: new Date('2024-10-20'),
  },
  {
    id: 'a4',
    clientId: '1',
    clientName: 'Holz GmbH',
    type: 'six-month',
    certifications: ['FSC'],
    scheduledDate: daysFromNow(25),
    status: 'scheduled',
    tasks: getTasksForAuditType('six-month', 'a4'),
    notes: '6-Monats-Überwachung im ersten Jahr',
    createdAt: new Date('2024-11-20'),
  },
];
