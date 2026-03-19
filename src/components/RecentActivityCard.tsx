import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, ChevronRight, User, MousePointerClick, PlusCircle, Pencil, Trash2, Calendar, ClipboardCheck } from 'lucide-react';
import { useActivityLog } from '@/hooks/useActivityLog';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export const RecentActivityCard = () => {
    const navigate = useNavigate();
    const { data: activities = [], isLoading } = useActivityLog(20);

    const getActionIcon = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes('erstellt')) return <PlusCircle className="h-4 w-4 text-green-500" />;
        if (a.includes('bearbeitet') || a.includes('aktualisiert')) return <Pencil className="h-4 w-4 text-blue-500" />;
        if (a.includes('gelöscht')) return <Trash2 className="h-4 w-4 text-red-500" />;
        if (a.includes('geplant')) return <Calendar className="h-4 w-4 text-purple-500" />;
        return <MousePointerClick className="h-4 w-4 text-muted-foreground" />;
    };

    const getEntityLink = (activity: any) => {
        const type = activity.entity_type;
        const id = activity.entity_id;
        if (!id) return null;

        switch (type) {
            case 'client': return `/clients/${id}`;
            case 'audit': return `/audits/${id}`;
            case 'certification': return `/certifications/${id}`;
            case 'auditor': return `/auditors`;
            case 'consultant': return `/consultants`;
            default: return null;
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <History className="h-4 w-4 text-primary" />
                        Letzte Aktivitäten
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
                        <History className="h-4 w-4 text-primary" />
                        Letzte Aktivitäten
                    </div>
                    <Badge variant="outline" className="text-[10px] font-normal">System-Log</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <ScrollArea className="h-[480px] -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="space-y-3">
                        {activities.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                Keine Aktivitäten protokolliert.
                            </p>
                        ) : (
                            activities.map((activity) => {
                                const link = getEntityLink(activity);
                                return (
                                    <div
                                        key={activity.id}
                                        className="flex gap-3 group relative pb-3 border-b border-border/30 last:border-0 last:pb-0"
                                    >
                                        <div className="mt-1 shrink-0 bg-muted p-1.5 rounded-full">
                                            {getActionIcon(activity.action)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-medium leading-none truncate">
                                                    {activity.action}
                                                </p>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: de })}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <User className="h-3 w-3" /> {activity.user_name || 'System'}
                                                </span>
                                                {activity.entity_name && (
                                                    <>
                                                        <span className="text-muted-foreground/30">•</span>
                                                        <span className="text-xs font-semibold text-primary truncate">
                                                            {activity.entity_name}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            {link && (
                                                <button
                                                    onClick={() => navigate(link)}
                                                    className="mt-1.5 text-[10px] font-medium text-primary hover:underline flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    Details ansehen <ChevronRight className="h-2.5 w-2.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
