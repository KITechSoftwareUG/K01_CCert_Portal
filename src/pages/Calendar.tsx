import { useState, useMemo, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { useAudits, AuditWithClient } from '@/hooks/useAudits';
import { useAllClientCertifications } from '@/hooks/useClientCertifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, Clock, Download, Award, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addDays, differenceInDays, addMonths, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { exportAllAuditsToCalendar } from '@/lib/calendarExport';
import { toast } from '@/hooks/use-toast';
import { OutlookIntegration } from '@/components/OutlookIntegration';
import { Audit } from '@/types/audit';

// Transform database audit to local Audit type
const transformAuditToLocal = (dbAudit: AuditWithClient): Audit => ({
  id: dbAudit.id,
  clientId: dbAudit.client_id,
  clientName: dbAudit.clients?.name || 'Unbekannt',
  type: dbAudit.type,
  certifications: (dbAudit.certifications || []) as any,
  scheduledDate: new Date(dbAudit.scheduled_date),
  status: dbAudit.status,
  tasks: [],
  notes: dbAudit.notes || undefined,
  createdAt: new Date(dbAudit.created_at),
});

// Calendar event types
interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'audit' | 'certification-expiry' | 'certification-reminder';
  isAllDay: boolean;
  variant: 'default' | 'warning' | 'danger';
  certificationId?: string;
  clientName?: string;
}

const CalendarSkeleton = () => (
  <Card className="lg:col-span-2">
    <CardHeader>
      <Skeleton className="h-6 w-32" />
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-7 gap-2">
        {[...Array(35)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </CardContent>
  </Card>
);

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(prev => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(prev => addMonths(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);
  const { data: dbAudits = [], isLoading: auditsLoading, error: auditsError } = useAudits();
  const { data: clientCertifications = [], isLoading: certsLoading } = useAllClientCertifications();

  const isLoading = auditsLoading || certsLoading;
  const error = auditsError;

  const audits = useMemo(() => 
    dbAudits.map(audit => transformAuditToLocal(audit)),
    [dbAudits]
  );

  // Generate certification expiry events and reminders
  const certificationEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    clientCertifications.forEach((cert: any) => {
      if (!cert.valid_until) return;

      const expiryDate = new Date(cert.valid_until);
      expiryDate.setHours(0, 0, 0, 0);
      
      const certName = cert.certifications?.name || 'Zertifikat';
      const clientName = cert.clients?.name || 'Unbekannt';
      const daysUntilExpiry = differenceInDays(expiryDate, today);

      // Only show events for next 90 days and past 30 days
      if (daysUntilExpiry < -30 || daysUntilExpiry > 90) return;

      // Expiry date event (blocker)
      events.push({
        id: `expiry-${cert.id}`,
        title: `⚠️ ${certName} läuft ab - ${clientName}`,
        date: expiryDate,
        type: 'certification-expiry',
        isAllDay: true,
        variant: daysUntilExpiry <= 0 ? 'danger' : daysUntilExpiry <= 14 ? 'warning' : 'default',
        certificationId: cert.id,
        clientName,
      });

      // 30 days reminder
      const reminder30 = addDays(expiryDate, -30);
      if (differenceInDays(reminder30, today) >= 0 && differenceInDays(reminder30, today) <= 90) {
        events.push({
          id: `reminder-30-${cert.id}`,
          title: `📅 30 Tage: ${certName} - ${clientName}`,
          date: reminder30,
          type: 'certification-reminder',
          isAllDay: true,
          variant: 'default',
          certificationId: cert.id,
          clientName,
        });
      }

      // 14 days reminder
      const reminder14 = addDays(expiryDate, -14);
      if (differenceInDays(reminder14, today) >= 0 && differenceInDays(reminder14, today) <= 90) {
        events.push({
          id: `reminder-14-${cert.id}`,
          title: `⏰ 14 Tage: ${certName} - ${clientName}`,
          date: reminder14,
          type: 'certification-reminder',
          isAllDay: true,
          variant: 'warning',
          certificationId: cert.id,
          clientName,
        });
      }

      // 7 days reminder
      const reminder7 = addDays(expiryDate, -7);
      if (differenceInDays(reminder7, today) >= 0 && differenceInDays(reminder7, today) <= 90) {
        events.push({
          id: `reminder-7-${cert.id}`,
          title: `🚨 7 Tage: ${certName} - ${clientName}`,
          date: reminder7,
          type: 'certification-reminder',
          isAllDay: true,
          variant: 'danger',
          certificationId: cert.id,
          clientName,
        });
      }
    });

    return events;
  }, [clientCertifications]);
  
  const { daysInMonth, monthStart } = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return {
      monthStart: start,
      daysInMonth: eachDayOfInterval({ start, end }),
    };
  }, [currentDate]);

  const getAuditsForDay = useCallback((day: Date) => {
    return audits.filter(audit => isSameDay(audit.scheduledDate, day));
  }, [audits]);

  const getCertEventsForDay = useCallback((day: Date) => {
    return certificationEvents.filter(event => isSameDay(event.date, day));
  }, [certificationEvents]);

  const handleExportAll = useCallback(() => {
    exportAllAuditsToCalendar(audits);
    toast({
      title: "Alle Audits exportiert",
      description: "ICS-Datei wurde heruntergeladen. Öffnen Sie diese, um alle Termine in Outlook zu importieren.",
    });
  }, [audits]);

  const activeAudits = useMemo(
    () => audits.filter(a => a.status === 'scheduled' || a.status === 'in-progress'),
    [audits]
  );

  const upcomingAudits = useMemo(
    () => activeAudits
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
      .slice(0, 5),
    [activeAudits]
  );

  // Prepare all events for Outlook sync (audits + certification events)
  const outlookEvents = useMemo(() => {
    const auditEvents = activeAudits.map(audit => ({
      id: audit.id,
      clientName: audit.clientName,
      type: audit.type,
      status: audit.status,
      scheduledDate: audit.scheduledDate.toISOString(),
      certifications: audit.certifications,
      notes: audit.notes,
      eventType: 'audit' as const,
      isAllDay: false,
    }));

    const certEvents = certificationEvents.map(event => ({
      id: event.id,
      clientName: event.clientName || '',
      type: event.type,
      status: 'scheduled',
      scheduledDate: event.date.toISOString(),
      certifications: [],
      notes: event.title,
      eventType: 'certification' as const,
      isAllDay: true,
      title: event.title,
    }));

    return [...auditEvents, ...certEvents];
  }, [activeAudits, certificationEvents]);

  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Kalender</h1>
            <p className="text-muted-foreground">Übersicht aller geplanten Audits, Zertifikatsabläufe und Erinnerungen</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToToday} className="px-3">
                Heute
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-medium text-foreground min-w-[140px]">
                {format(currentDate, 'MMMM yyyy', { locale: de })}
              </span>
            </div>
            <Button onClick={handleExportAll} disabled={audits.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Alle zu Outlook exportieren
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Audit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Zertifikat-Erinnerung</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Zertifikat läuft ab</span>
          </div>
        </div>

        {error ? (
          <div className="text-center py-12">
            <p className="text-destructive">Fehler beim Laden der Daten</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Grid */}
            {isLoading ? (
              <CalendarSkeleton />
            ) : (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Monatsübersicht</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                    {daysInMonth.map((day) => {
                      const dayAudits = getAuditsForDay(day);
                      const dayCertEvents = getCertEventsForDay(day);
                      const hasEvents = dayAudits.length > 0 || dayCertEvents.length > 0;
                      const isToday = isSameDay(day, new Date());
                      const hasDangerEvent = dayCertEvents.some(e => e.variant === 'danger');
                      const hasWarningEvent = dayCertEvents.some(e => e.variant === 'warning');
                      
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            'min-h-24 p-2 border rounded-lg transition-colors',
                            hasEvents ? 'bg-primary/5 border-primary/20' : 'border-border',
                            hasDangerEvent && 'bg-destructive/10 border-destructive/30',
                            hasWarningEvent && !hasDangerEvent && 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30',
                            isToday && 'ring-2 ring-primary'
                          )}
                        >
                          <div className={cn(
                            'text-sm font-medium mb-1',
                            isToday ? 'text-primary' : 'text-foreground',
                            !isSameMonth(day, currentDate) && 'text-muted-foreground'
                          )}>
                            {format(day, 'd')}
                          </div>
                          {dayAudits.map((audit) => (
                            <div
                              key={audit.id}
                              className="text-xs bg-primary/10 text-primary px-2 py-1 rounded mb-1 truncate"
                            >
                              {audit.clientName}
                            </div>
                          ))}
                          {dayCertEvents.map((event) => (
                            <div
                              key={event.id}
                              className={cn(
                                "text-xs px-2 py-1 rounded mb-1 truncate",
                                event.variant === 'danger' && 'bg-destructive/20 text-destructive',
                                event.variant === 'warning' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
                                event.variant === 'default' && 'bg-muted text-muted-foreground'
                              )}
                              title={event.title}
                            >
                              {event.type === 'certification-expiry' ? (
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {event.clientName}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Award className="h-3 w-3" />
                                  {event.clientName}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Outlook Integration */}
              <OutlookIntegration 
                auditCount={activeAudits.length + certificationEvents.length} 
                audits={outlookEvents} 
              />

              {/* Upcoming Events */}
              <Card>
                <CardHeader>
                  <CardTitle>Anstehende Termine</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : upcomingAudits.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Keine anstehenden Termine
                    </p>
                  ) : (
                    upcomingAudits.map((audit) => (
                      <div key={audit.id} className="space-y-2 pb-4 border-b last:border-0">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <p className="font-medium text-sm text-foreground">{audit.clientName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(audit.scheduledDate, 'dd. MMM yyyy', { locale: de })}
                            </div>
                          </div>
                          {audit.certifications.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {audit.certifications[0]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Certification Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Zertifikats-Termine
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : certificationEvents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Keine Zertifikats-Termine
                    </p>
                  ) : (
                    certificationEvents
                      .filter(e => e.date >= new Date())
                      .sort((a, b) => a.date.getTime() - b.date.getTime())
                      .slice(0, 5)
                      .map((event) => (
                        <div key={event.id} className="space-y-1 pb-3 border-b last:border-0">
                          <p className={cn(
                            "font-medium text-sm",
                            event.variant === 'danger' && 'text-destructive',
                            event.variant === 'warning' && 'text-amber-600 dark:text-amber-400',
                            event.variant === 'default' && 'text-foreground'
                          )}>
                            {event.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            {format(event.date, 'dd. MMM yyyy', { locale: de })}
                          </div>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Calendar;
