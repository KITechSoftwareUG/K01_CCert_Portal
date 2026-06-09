import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardCheck, Calendar, Building2, ChevronRight } from 'lucide-react';
import { useAllAuditTasks, DbAuditTaskFull } from '@/hooks/useAuditTasks';
import { format, isPast, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const OpenTasksCard = () => {
    const navigate = useNavigate();
    const { data: rawTasks = [], isLoading } = useAllAuditTasks();
    const allTasks = rawTasks as DbAuditTaskFull[];

    const openTasks = useMemo(() => {
        return allTasks
            .filter((task) => task.status !== 'completed')
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    }, [allTasks]);

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                        Offene Aufgaben
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground italic">Laden...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base font-semibold">
                    <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                        Wichtige Aufgaben
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {allTasks.filter((t) => t.status !== 'completed').length} gesamt
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pt-0">
                <ScrollArea className="h-[480px] -mr-4 pr-4">
                    {openTasks.length === 0 ? (
                        <div className="text-center py-10">
                            <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
                            <p className="text-sm text-muted-foreground italic">Alles erledigt! Keine offenen Aufgaben.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 py-1">
                            {Object.entries(
                                openTasks.reduce<Record<string, DbAuditTaskFull[]>>((acc, task) => {
                                    const monthKey = format(new Date(task.due_date), 'MMMM yyyy', { locale: de });
                                    if (!acc[monthKey]) acc[monthKey] = [];
                                    acc[monthKey].push(task);
                                    return acc;
                                }, {})
                            ).map(([month, tasks]) => (
                                <div key={month} className="space-y-2">
                                    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-1.5 px-2 -mx-2 border-b border-border/50">
                                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <Calendar className="h-3 w-3" />
                                            {month}
                                        </h3>
                                    </div>
                                    <div className="space-y-2">
                                        {tasks.map((task) => {
                                            const dueDate = new Date(task.due_date);
                                            const isOverdue = isPast(dueDate) && !isToday(dueDate);

                                            return (
                                                <div
                                                    key={task.id}
                                                    onClick={() => navigate(`/audits/${task.audit_id}`)}
                                                    className="group relative flex flex-col p-3 rounded-lg border bg-card transition-all hover:border-primary/30 hover:shadow-sm cursor-pointer"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">
                                                            {task.title}
                                                        </p>
                                                        <div className={cn(
                                                            "shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                                            isOverdue
                                                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                                                : "bg-muted text-muted-foreground border-transparent"
                                                        )}>
                                                            <Calendar className="h-3 w-3" />
                                                            {format(dueDate, 'dd.MM.yyyy')}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                                                        <Building2 className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">{task.audits?.clients?.name || 'Unbekannter Kunde'}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {openTasks.length > 0 && (
                                <button
                                    onClick={() => navigate('/audits')}
                                    className="w-full py-2 text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 border border-dashed rounded-lg mt-2"
                                >
                                    Zur Auditübersicht
                                    <ChevronRight className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
