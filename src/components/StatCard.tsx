import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'accent';
  compact?: boolean;
}

export const StatCard = ({ title, value, icon: Icon, trend, variant = 'default', compact = false }: StatCardProps) => {
  const variantStyles = {
    default: {
      icon: 'bg-primary/10 text-primary',
      highlight: 'text-primary',
    },
    success: {
      icon: 'bg-success/10 text-success',
      highlight: 'text-success',
    },
    warning: {
      icon: 'bg-warning/10 text-warning',
      highlight: 'text-warning',
    },
    accent: {
      icon: 'bg-accent/10 text-accent',
      highlight: 'text-accent',
    },
  };

  const style = variantStyles[variant];

  if (compact) {
    return (
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
              <p className={cn('text-2xl font-bold mt-0.5', style.highlight)}>{value}</p>
            </div>
            <div className={cn('p-2 rounded-lg shrink-0', style.icon)}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn('text-3xl font-bold', style.highlight)}>{value}</p>
            {trend && (
              <p className={cn(
                'text-sm font-medium',
                trend.positive ? 'text-success' : 'text-destructive'
              )}>
                {trend.value}
              </p>
            )}
          </div>
          <div className={cn('p-3 rounded-lg', style.icon)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
