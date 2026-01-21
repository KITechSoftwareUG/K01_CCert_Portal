import { parseClientNumber, getCountryFromPrefix } from '@/lib/clientNumberUtils';
import { cn } from '@/lib/utils';

interface ClientNumberBadgeProps {
  clientNumber: string | null | undefined;
  className?: string;
  showTooltip?: boolean;
}

/**
 * Displays a client number in a subtle, elegant way.
 * Format: Country prefix (1 digit) + sequence (3 digits) = 4 digits total
 * Example: 0001 = Deutschland, client #1
 */
export const ClientNumberBadge = ({ 
  clientNumber, 
  className,
  showTooltip = true 
}: ClientNumberBadgeProps) => {
  if (!clientNumber) return null;
  
  const parsed = parseClientNumber(clientNumber);
  const country = parsed ? getCountryFromPrefix(parsed.prefix) : null;
  
  return (
    <span 
      className={cn(
        "inline-flex items-center font-mono text-xs text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded",
        className
      )}
      title={showTooltip && country ? `${country} - Kunde Nr. ${parsed?.sequence}` : undefined}
    >
      <span className="font-semibold text-muted-foreground">{clientNumber.charAt(0)}</span>
      <span className="text-muted-foreground/60">{clientNumber.slice(1)}</span>
    </span>
  );
};
