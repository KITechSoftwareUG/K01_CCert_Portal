import { cn } from '@/lib/utils';

interface ClientNumberBadgeProps {
  clientNumber: string | null | undefined;
  className?: string;
}

/**
 * Displays a client number in a subtle, elegant way.
 * Simple display without any highlighting.
 */
export const ClientNumberBadge = ({ 
  clientNumber, 
  className,
}: ClientNumberBadgeProps) => {
  if (!clientNumber) return null;
  
  return (
    <span 
      className={cn(
        "font-mono text-xs text-muted-foreground",
        className
      )}
    >
      {clientNumber}
    </span>
  );
};

interface GroupClientNumbersProps {
  clientNumbers: (string | null | undefined)[];
  className?: string;
}

/**
 * Displays multiple client numbers for a company group.
 * Shows them subtly separated by commas.
 */
export const GroupClientNumbers = ({ 
  clientNumbers,
  className,
}: GroupClientNumbersProps) => {
  const validNumbers = clientNumbers.filter(Boolean) as string[];
  
  if (validNumbers.length === 0) return null;
  
  return (
    <span 
      className={cn(
        "font-mono text-xs text-muted-foreground/60",
        className
      )}
    >
      ({validNumbers.join(', ')})
    </span>
  );
};