import { Client, Audit, AuditType, CertificationStandard } from '@/types/audit';

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

// Helper to create dates relative to today
const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const getTasksForAuditType = (type: AuditType, auditId: string): any[] => {
  if (type === 'initial') {
    return [
      {
        id: `${auditId}-1`,
        title: 'Registrierung beim Zertifizierer',
        description: 'Registrierung beim Zertifizierer und im SURE-EU-System durchführen (oder nur beim Zertifizierer, je nach System)',
        status: 'completed',
        dueDate: daysFromNow(-20),
        completedAt: daysFromNow(-23),
        assignedTo: 'Hans Müller',
      },
      {
        id: `${auditId}-2`,
        title: 'Training und Dokumentation',
        description: 'Schulung der Mitarbeiter durchführen und vollständige Dokumentation erstellen',
        status: 'in-progress',
        dueDate: daysFromNow(-2), // Overdue!
        assignedTo: 'Anna Schmidt',
      },
      {
        id: `${auditId}-3`,
        title: 'Zertifizierungsaudit und Umsetzung',
        description: 'Vollständiges Zertifizierungsaudit durchführen und Umsetzung der Standards prüfen',
        status: 'pending',
        dueDate: daysFromNow(2), // Due very soon!
        assignedTo: 'Michael Weber',
      },
    ];
  } else if (type === 'surveillance') {
    return [
      {
        id: `${auditId}-1`,
        title: 'Zusendung der Unterlagen',
        description: 'Alle relevanten Unterlagen für die interne Überprüfung (internes Audit) zusenden',
        status: 'in-progress',
        dueDate: daysFromNow(1), // Due tomorrow!
        assignedTo: 'Anna Schmidt',
      },
      {
        id: `${auditId}-2`,
        title: 'Austausch und Korrektur',
        description: 'Feedback vom Zertifizierer besprechen und notwendige Korrekturen durchführen',
        status: 'pending',
        dueDate: daysFromNow(8),
        assignedTo: 'Hans Müller',
      },
    ];
  } else if (type === 'recertification') {
    return [
      {
        id: `${auditId}-1`,
        title: 'Vorbereitung Re-Zertifizierung',
        description: 'Alle Dokumente aktualisieren und für Re-Zertifizierung vorbereiten',
        status: 'pending',
        dueDate: daysFromNow(20),
        assignedTo: 'Michael Weber',
      },
      {
        id: `${auditId}-2`,
        title: 'Interne Überprüfung',
        description: 'Internes Audit zur Sicherstellung der Standards durchführen',
        status: 'pending',
        dueDate: daysFromNow(35),
        assignedTo: 'Anna Schmidt',
      },
      {
        id: `${auditId}-3`,
        title: 'Re-Zertifizierungsaudit',
        description: 'Vollständiges Re-Zertifizierungsaudit durchführen',
        status: 'pending',
        dueDate: daysFromNow(42),
        assignedTo: 'Hans Müller',
      },
    ];
  } else if (type === 'six-month') {
    return [
      {
        id: `${auditId}-1`,
        title: 'Statusbericht erstellen',
        description: '6-Monats-Bericht über die Umsetzung der Zertifizierungsanforderungen erstellen',
        status: 'in-progress',
        dueDate: daysFromNow(5),
        assignedTo: 'Anna Schmidt',
      },
      {
        id: `${auditId}-2`,
        title: 'Dokumentation prüfen',
        description: 'Vollständigkeit und Aktualität der Dokumentation überprüfen',
        status: 'pending',
        dueDate: daysFromNow(15),
        assignedTo: 'Michael Weber',
      },
    ];
  }
  return [];
};

export const mockAudits: Audit[] = [
  {
    id: 'a1',
    clientId: '1',
    clientName: 'Holz GmbH',
    type: 'initial',
    certifications: ['FSC', 'PEFC'],
    scheduledDate: daysFromNow(5), // In 5 days!
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
    scheduledDate: daysFromNow(12), // In 12 days
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
    scheduledDate: daysFromNow(45), // In 45 days
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
    scheduledDate: daysFromNow(25), // In 25 days
    status: 'scheduled',
    tasks: getTasksForAuditType('six-month', 'a4'),
    notes: '6-Monats-Überwachung im ersten Jahr',
    createdAt: new Date('2024-11-20'),
  },
];
