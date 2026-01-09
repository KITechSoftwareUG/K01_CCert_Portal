import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Copy, Check, Phone, Mail, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface ContactPopoverProps {
  name: string;
  phone?: string | null;
  email?: string | null;
  onEdit?: () => void;
}

export const ContactPopover = ({ name, phone, email, onEdit }: ContactPopoverProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Kopiert!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-auto p-1 text-sm font-normal hover:text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {name}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72" 
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <p className="font-semibold">{name}</p>
          
          {phone && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{phone}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => copyToClipboard(phone, 'phone')}
              >
                {copiedField === 'phone' ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}
          
          {email && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{email}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => copyToClipboard(email, 'email')}
              >
                {copiedField === 'email' ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}

          {!phone && !email && (
            <p className="text-sm text-muted-foreground">Keine Kontaktdaten hinterlegt</p>
          )}

          {onEdit && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={onEdit}
            >
              <Pencil className="h-3 w-3 mr-2" />
              Bearbeiten
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
