import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Circle, Clock, AlertCircle, ListTodo } from 'lucide-react';
import { useAllAuditTasks } from '@/hooks/useAuditTasks';
import { format, isPast, isToday } from 'date-fns';
import { de } from 'date-fns/locale';

export const OpenTasksCard = () => {
    const { data: tasks = [], isLoading } = useAllAuditTasks();

    const openTasks = useMemo(() => {
        return (tasks as any[])
            .filter((task) => task.status !== 'completed')
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
            .slice(0, 10); // Only show top 10 important ones
    }, [tasks]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ListTodo className="h-4 w-4 text-primary" />
                        Offene Aufgaben
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground">Laden...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                        <ListTodo className="h-4 w-4 text-primary" />
                        Wichtige Aufgaben
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tasks.filter(t => t.status !== 'completed').length} gesamt
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <ScrollArea className="h-[300px]">
                    {openTasks.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                            <p className="text-xs text-muted-foreground italic text-center">Keine offenen Aufgaben</p>
                        </div>
                    ) : (
                        <div className="space-y-3 pr-2">
                            {openTasks.map((task) => {
                                const isOverdue = isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
                                return (
                                    <div key={task.id} className="flex gap-3 group">
                                        <div className="mt-0.5">
                                            {task.status === 'in-progress' ? (
                                                <Clock className="h-4 w-4 text-amber-500" />
                                            ) : isOverdue ? (
                                                <AlertCircle className="h-4 w-4 text-destructive" />
                                            ) : (
                                                <Circle className="h-4 w-4 text-muted-foreground/40" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium leading-none mb-1 truncate">{task.title}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-muted-foreground truncate">
                                                    {task.audits?.clients?.name || 'Unbekannt'}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    • {format(new Date(task.due_date), 'dd. MMM', { locale: de })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Badge variant={isOverdue ? "destructive" : "outline"} className="text-[9px] px-1 py-0">
                                                {isOverdue ? 'Überfällig' : task.status}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
