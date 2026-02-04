import { AuditType, TaskStatus } from '@/types/audit';

// Audit type labels for display
export const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  initial: 'Initialaudit',
  surveillance: 'Überwachungsaudit',
  recertification: 'Re-Zertifizierung',
  'six-month': '6-Monats-Überwachung',
  internal: 'Internes Audit',
} as const;

// Audit status configuration
export const AUDIT_STATUS_CONFIG = {
  scheduled: { 
    label: 'Geplant', 
    variant: 'secondary' as const,
    className: '',
  },
  'in-progress': { 
    label: 'In Bearbeitung', 
    variant: 'default' as const,
    className: 'bg-warning text-warning-foreground',
  },
  completed: { 
    label: 'Abgeschlossen', 
    variant: 'default' as const,
    className: 'bg-success text-success-foreground',
  },
  cancelled: { 
    label: 'Abgebrochen', 
    variant: 'destructive' as const,
    className: '',
  },
} as const;

// Audit status labels for display
export const AUDIT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Geplant',
  'in-progress': 'In Bearbeitung',
  completed: 'Abgeschlossen',
  cancelled: 'Abgebrochen',
} as const;

// Audit status colors for badges
export const AUDIT_STATUS_COLORS: Record<string, string> = {
  scheduled: 'border-muted-foreground/50 text-muted-foreground',
  'in-progress': 'border-warning/50 bg-warning/10 text-warning',
  completed: 'border-success/50 bg-success/10 text-success',
  cancelled: 'border-destructive/50 bg-destructive/10 text-destructive',
} as const;

// Task status configuration
export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Ausstehend', color: 'text-muted-foreground', bg: 'bg-secondary' },
  'in-progress': { label: 'In Bearbeitung', color: 'text-warning-foreground', bg: 'bg-warning' },
  completed: { label: 'Abgeschlossen', color: 'text-success-foreground', bg: 'bg-success' },
  overdue: { label: 'Überfällig', color: 'text-destructive-foreground', bg: 'bg-destructive' },
} as const;

// Timeline status configuration
export const TIMELINE_STATUS_CONFIG = {
  critical: {
    color: 'bg-destructive',
    dotColor: 'bg-destructive',
    textColor: 'text-destructive',
    label: 'Aufgaben überfällig',
    borderClass: 'border-destructive/30 bg-destructive/5',
  },
  imminent: {
    color: 'bg-warning',
    dotColor: 'bg-warning',
    textColor: 'text-warning',
    label: 'In < 7 Tagen',
    borderClass: 'border-warning/30 bg-warning/5',
  },
  upcoming: {
    color: 'bg-primary',
    dotColor: 'bg-primary',
    textColor: 'text-primary',
    label: 'In < 30 Tagen',
    borderClass: 'border-border bg-card',
  },
  planned: {
    color: 'bg-muted-foreground',
    dotColor: 'bg-muted-foreground',
    textColor: 'text-muted-foreground',
    label: 'Geplant',
    borderClass: 'border-border bg-card',
  },
} as const;

// Urgency configuration for tasks - subtle/informational styling
export const URGENCY_CONFIG = {
  overdue: { 
    bg: 'bg-muted/50 border-muted-foreground/20', 
    text: 'text-muted-foreground',
    badge: 'Überfällig',
  },
  critical: { 
    bg: 'bg-muted/30 border-border', 
    text: 'text-muted-foreground',
    badge: 'Dringend',
  },
  warning: { 
    bg: 'bg-card border-border', 
    text: 'text-muted-foreground',
    badge: null,
  },
  normal: { 
    bg: 'bg-card border-border', 
    text: 'text-muted-foreground',
    badge: null,
  },
} as const;

// Alert severity configuration
export const ALERT_SEVERITY_CONFIG = {
  critical: {
    bg: 'bg-destructive/10 border-destructive/30',
    iconColor: 'text-destructive',
  },
  warning: {
    bg: 'bg-warning/10 border-warning/30',
    iconColor: 'text-warning',
  },
  info: {
    bg: 'bg-accent/10 border-accent/30',
    iconColor: 'text-accent-foreground',
  },
} as const;

// ChatBot dummy responses
export const CHATBOT_RESPONSES: Record<string, string> = {
  audit: 'Ich kann Ihnen bei der Vorbereitung Ihres nächsten Audits helfen. Welche Zertifizierung benötigen Sie? (SURE, FSC, PEFC, ISCC, ISO 9001, ISO 14001)',
  dokument: 'Für die Dokumentenvorbereitung empfehle ich, zuerst die Checkliste im Audit-Detail zu prüfen. Soll ich Ihnen die offenen Dokumente für ein bestimmtes Audit anzeigen?',
  termin: 'Ich kann Ihnen helfen, einen Audit-Termin zu planen. Geben Sie mir bitte den gewünschten Zeitraum und die Zertifizierungsart an.',
  erinnerung: 'Ich habe eine Erinnerung für Sie erstellt. Sie werden rechtzeitig vor dem Termin benachrichtigt.',
  checkliste: 'Die Vorbereitungs-Checkliste für Ihr Audit umfasst: 1) Dokumentenprüfung, 2) Schulungsnachweis, 3) Interne Prüfung, 4) Maßnahmenplan. Welchen Punkt möchten Sie bearbeiten?',
  status: 'Aktueller Status Ihrer Audits:\n• 2 Audits in Vorbereitung\n• 1 Audit überfällig\n• 3 Audits diesen Monat geplant\n\nMöchten Sie Details zu einem bestimmten Audit?',
  hilfe: 'Ich kann Ihnen bei folgenden Aufgaben helfen:\n• Audit-Vorbereitung\n• Dokumentenmanagement\n• Terminplanung\n• Checklisten-Verwaltung\n• Status-Übersicht\n\nWas möchten Sie tun?',
} as const;
