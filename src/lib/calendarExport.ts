import { Audit } from "@/types/audit";
import { format } from "date-fns";

export function generateICSContent(audit: Audit): string {
  const startDate = format(audit.scheduledDate, "yyyyMMdd");
  const endDate = format(audit.scheduledDate, "yyyyMMdd");
  const now = format(new Date(), "yyyyMMdd'T'HHmmss");
  
  const auditTypeLabels: Record<string, string> = {
    initial: "Initialaudit",
    surveillance: "Überwachungsaudit",
    recertification: "Re-Zertifizierungsaudit",
    "six-month": "6-Monats-Überwachung",
  };

  const title = `${auditTypeLabels[audit.type]} - ${audit.clientName}`;
  const description = `Zertifizierungen: ${audit.certifications.join(", ")}\\n\\nAufgaben:\\n${audit.tasks.map(t => `- ${t.title} (${t.status})`).join("\\n")}`;

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Audit Management Tool//DE
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
DTSTART;VALUE=DATE:${startDate}
DTEND;VALUE=DATE:${endDate}
DTSTAMP:${now}Z
UID:audit-${audit.id}@audit-tool.local
SUMMARY:${title}
DESCRIPTION:${description}
STATUS:CONFIRMED
TRANSP:OPAQUE
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Audit Erinnerung
TRIGGER:-P7D
END:VALARM
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Audit morgen
TRIGGER:-P1D
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

export function generateMultipleICSContent(audits: Audit[]): string {
  const now = format(new Date(), "yyyyMMdd'T'HHmmss");
  
  const auditTypeLabels: Record<string, string> = {
    initial: "Initialaudit",
    surveillance: "Überwachungsaudit",
    recertification: "Re-Zertifizierungsaudit",
    "six-month": "6-Monats-Überwachung",
  };

  const events = audits.map(audit => {
    const startDate = format(audit.scheduledDate, "yyyyMMdd");
    const title = `${auditTypeLabels[audit.type]} - ${audit.clientName}`;
    const description = `Zertifizierungen: ${audit.certifications.join(", ")}`;

    return `BEGIN:VEVENT
DTSTART;VALUE=DATE:${startDate}
DTEND;VALUE=DATE:${startDate}
DTSTAMP:${now}Z
UID:audit-${audit.id}@audit-tool.local
SUMMARY:${title}
DESCRIPTION:${description}
STATUS:CONFIRMED
TRANSP:OPAQUE
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Audit Erinnerung
TRIGGER:-P7D
END:VALARM
END:VEVENT`;
  }).join("\n");

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Audit Management Tool//DE
CALSCALE:GREGORIAN
METHOD:PUBLISH
${events}
END:VCALENDAR`;
}

export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAuditToCalendar(audit: Audit): void {
  const ics = generateICSContent(audit);
  downloadICS(ics, `audit-${audit.clientName.replace(/\s+/g, "-")}.ics`);
}

export function exportAllAuditsToCalendar(audits: Audit[]): void {
  const activeAudits = audits.filter(a => a.status !== "completed" && a.status !== "cancelled");
  const ics = generateMultipleICSContent(activeAudits);
  downloadICS(ics, "alle-audits.ics");
}
