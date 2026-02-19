import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAudits } from '@/hooks/useAudits';
import { transformAuditToLocal } from '@/lib/auditUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isAfter, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { exportAllAuditsToCalendar } from '@/lib/calendarExport';
import { toast } from '@/hooks/use-toast';
import { OutlookIntegration } from '@/components/OutlookIntegration';

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
  const navigate = useNavigate();
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

  const { data: dbAudits = [], isLoading, error } = useAudits();

  const audits = useMemo(() => 
    dbAudits.map(audit => transformAuditToLocal(audit)),
    [dbAudits]
  );

  const { daysInMonth, startDayOffset } = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const dayOfWeek = start.getDay();
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return {
      daysInMonth: eachDayOfInterval({ start, end }),
      startDayOffset: offset,
    };
  }, [currentDate]);

  const getAuditsForDay = useCallback((day: Date) => {
    return audits.filter(audit => isSameDay(audit.scheduledDate, day));
  }, [audits]);

  const handleExportAll = useCallback(() => {
    exportAllAuditsToCalendar(audits);
    toast({
      title: "Alle Audits exportiert",
      description: "ICS-Datei wurde heruntergeladen.",
    });
  }, [audits]);

  // Active audits within the next 12 months for Outlook sync
  const activeAudits = useMemo(() => {
    const now = new Date();
    const in12Months = addMonths(now, 12);
    return audits.filter(a =>
      (a.status === 'scheduled' || a.status === 'in-progress') &&
      isAfter(a.scheduledDate, now) &&
      isBefore(a.scheduledDate, in12Months)
    );
  }, [audits]);

  const upcomingAudits = useMemo(
    () => activeAudits
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
      .slice(0, 5),
    [activeAudits]
  );

  // Outlook events: only audits, next 12 months
  const outlookEvents = useMemo(() => {
    return activeAudits.map(audit => ({
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
  }, [activeAudits]);

  return (
    <Layout>
      <div className="p-4 sm:p-8 space-y-4 sm:space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Kalender</h1>
            <p className="text-sm text-muted-foreground">Übersicht aller geplanten Audits</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToToday} className="px-2 sm:px-3 h-8 sm:h-9 text-sm">
                Heute
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-sm sm:text-lg font-medium text-foreground">
              {format(currentDate, 'MMMM yyyy', { locale: de })}
            </span>
            <Button size="sm" className="ml-auto" onClick={handleExportAll} disabled={audits.length === 0}>
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Alle exportieren</span>
            </Button>
          </div>
        </div>

        {error ? (
          <div className="text-center py-12">
            <p className="text-destructive">Fehler beim Laden der Daten</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Calendar Grid */}
            {isLoading ? (
              <CalendarSkeleton />
            ) : (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Monatsübersicht – {format(currentDate, 'MMMM yyyy', { locale: de })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                    {Array.from({ length: startDayOffset }).map((_, i) => (
                      <div key={`empty-${i}`} className="min-h-24 p-2" />
                    ))}
                    {daysInMonth.map((day) => {
                      const dayAudits = getAuditsForDay(day);
                      const hasEvents = dayAudits.length > 0;
                      const isToday = isSameDay(day, new Date());

                      const handleDayClick = () => {
                        if (dayAudits.length > 0) {
                          navigate(`/audits/${dayAudits[0].id}`);
                        }
                      };

                      return (
                        <div
                          key={day.toISOString()}
                          onClick={hasEvents ? handleDayClick : undefined}
                          className={cn(
                            'min-h-24 p-2 border rounded-lg transition-colors',
                            hasEvents ? 'bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10' : 'border-border',
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
                auditCount={activeAudits.length}
                audits={outlookEvents}
              />

              {/* Upcoming Audits */}
              <Card>
                <CardHeader>
                  <CardTitle>Anstehende Audits</CardTitle>
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
                      Keine anstehenden Audits
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
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Calendar;
