import { Layout } from '@/components/Layout';
import { mockAudits } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { exportAllAuditsToCalendar } from '@/lib/calendarExport';
import { toast } from '@/hooks/use-toast';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAuditsForDay = (day: Date) => {
    return mockAudits.filter(audit => isSameDay(audit.scheduledDate, day));
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Kalender</h1>
            <p className="text-muted-foreground">Übersicht aller geplanten Audits und Termine</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-medium text-foreground">
                {format(currentDate, 'MMMM yyyy', { locale: de })}
              </span>
            </div>
            <Button 
              onClick={() => {
                exportAllAuditsToCalendar(mockAudits);
                toast({
                  title: "Alle Audits exportiert",
                  description: "ICS-Datei wurde heruntergeladen. Öffnen Sie diese, um alle Termine in Outlook zu importieren.",
                });
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Alle zu Outlook exportieren
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
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
                  const audits = getAuditsForDay(day);
                  const hasAudits = audits.length > 0;
                  
                  return (
                    <div
                      key={day.toString()}
                      className={cn(
                        'min-h-24 p-2 border rounded-lg transition-colors',
                        hasAudits ? 'bg-primary/5 border-primary/20' : 'border-border',
                        isSameDay(day, new Date()) && 'ring-2 ring-primary'
                      )}
                    >
                      <div className={cn(
                        'text-sm font-medium mb-1',
                        isSameDay(day, new Date()) ? 'text-primary' : 'text-foreground',
                        !isSameMonth(day, currentDate) && 'text-muted-foreground'
                      )}>
                        {format(day, 'd')}
                      </div>
                      {audits.map((audit) => (
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

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle>Anstehende Termine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockAudits
                .filter(a => a.status !== 'completed' && a.status !== 'cancelled')
                .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
                .slice(0, 5)
                .map((audit) => (
                  <div key={audit.id} className="space-y-2 pb-4 border-b last:border-0">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <p className="font-medium text-sm text-foreground">{audit.clientName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(audit.scheduledDate, 'dd. MMM yyyy', { locale: de })}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {audit.certifications[0]}
                      </Badge>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Calendar;
