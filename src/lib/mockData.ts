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

const getTasksForAuditType = (type: AuditType, auditId: string): any[] => {
  if (type === 'initial') {
    return [
      {
        id: `${auditId}-1`,
        title: 'Registrierung beim Zertifizierer',
        description: 'Registrierung beim Zertifizierer und im SURE-EU-System durchführen',
        status: 'completed',
        dueDate: new Date('2024-12-01'),
        completedAt: new Date('2024-11-28'),
      },
      {
        id: `${auditId}-2`,
        title: 'Training und Dokumentation',
        description: 'Schulung durchführen und Dokumentation erstellen',
        status: 'in-progress',
        dueDate: new Date('2024-12-15'),
      },
      {
        id: `${auditId}-3`,
        title: 'Zertifizierungsaudit',
        description: 'Audit durchführen und Umsetzung prüfen',
        status: 'pending',
        dueDate: new Date('2025-01-10'),
      },
    ];
  } else if (type === 'surveillance') {
    return [
      {
        id: `${auditId}-1`,
        title: 'Unterlagen zusenden',
        description: 'Unterlagen für interne Überprüfung zusenden',
        status: 'in-progress',
        dueDate: new Date('2024-12-10'),
      },
      {
        id: `${auditId}-2`,
        title: 'Austausch und Korrektur',
        description: 'Feedback besprechen und Korrekturen durchführen',
        status: 'pending',
        dueDate: new Date('2024-12-20'),
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
    scheduledDate: new Date('2025-01-10'),
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
    scheduledDate: new Date('2024-12-20'),
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
    scheduledDate: new Date('2025-02-15'),
    status: 'scheduled',
    tasks: [],
    notes: 'Re-Zertifizierung nach 3 Jahren',
    createdAt: new Date('2024-10-20'),
  },
];
