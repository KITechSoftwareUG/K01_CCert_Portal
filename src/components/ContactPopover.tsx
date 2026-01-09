import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Phone, Mail, Pencil, User, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Contact } from '@/hooks/useContacts';

interface ContactPopoverProps {
  // Legacy single contact (fallback from client table)
  legacyName?: string;
  legacyPhone?: string | null;
  legacyEmail?: string | null;
  // Multiple contacts from contacts table
  contacts?: Contact[];
  onEdit?: () => void;
  onAddContact?: () => void;
}

export const ContactPopover = ({ 
  legacyName, 
  legacyPhone, 
  legacyEmail, 
  contacts = [],
  onEdit,
  onAddContact 
}: ContactPopoverProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Kopiert!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Use contacts if available, otherwise fall back to legacy
  const hasContacts = contacts.length > 0;
  const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
  const displayName = hasContacts ? primaryContact?.name : legacyName;
  const contactCount = contacts.length;

  if (!displayName) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-auto p-1 text-sm font-normal hover:text-primary hover:underline gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <User className="h-3 w-3" />
          {displayName}
          {contactCount > 1 && (
            <Badge variant="secondary" className="ml-1 text-xs px-1">+{contactCount - 1}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80" 
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          {hasContacts ? (
            // Multiple contacts view
            contacts.map((contact, idx) => (
              <div key={contact.id} className={idx > 0 ? "border-t pt-3" : ""}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-semibold">{contact.name}</p>
                  {contact.is_primary && (
                    <Badge variant="default" className="text-xs">Hauptkontakt</Badge>
                  )}
                  {contact.role && (
                    <span className="text-xs text-muted-foreground">{contact.role}</span>
                  )}
                </div>
                
                {contact.phone && (
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.phone}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyToClipboard(contact.phone!, `phone-${contact.id}`)}
                    >
                      {copiedField === `phone-${contact.id}` ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
                
                {contact.email && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyToClipboard(contact.email!, `email-${contact.id}`)}
                    >
                      {copiedField === `email-${contact.id}` ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))
          ) : (
            // Legacy single contact view
            <div>
              <p className="font-semibold mb-2">{legacyName}</p>
              
              {legacyPhone && (
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{legacyPhone}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => copyToClipboard(legacyPhone, 'phone')}
                  >
                    {copiedField === 'phone' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}
              
              {legacyEmail && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{legacyEmail}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => copyToClipboard(legacyEmail, 'email')}
                  >
                    {copiedField === 'email' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}

              {!legacyPhone && !legacyEmail && (
                <p className="text-sm text-muted-foreground">Keine Kontaktdaten hinterlegt</p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            {onAddContact && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={onAddContact}
              >
                <Plus className="h-3 w-3 mr-1" />
                Kontakt
              </Button>
            )}
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={onEdit}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Details
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
