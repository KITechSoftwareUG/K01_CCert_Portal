import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuditEvent {
  id: string;
  clientName: string;
  type: string;
  status: string;
  scheduledDate: string;
  certifications?: string[];
  notes?: string;
  clientAddress?: string;
  eventType?: 'audit' | 'certification';
  isAllDay?: boolean;
  title?: string;
}

export const useOutlookSync = () => {
  const syncToOutlook = useCallback(async (events: AuditEvent[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session, skipping Outlook sync');
        return { success: false, reason: 'no-session' };
      }

      // Check if user has Outlook connected
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const statusResponse = await fetch(`${baseUrl}/functions/v1/outlook-auth?action=status`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const statusData = await statusResponse.json();
      if (!statusData.connected) {
        console.log('Outlook not connected, skipping sync');
        return { success: false, reason: 'not-connected' };
      }

      // Sync to Outlook
      const response = await fetch(`${baseUrl}/functions/v1/outlook-sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audits: events }),
      });

      const data = await response.json();

      if (data.reconnectRequired) {
        return { success: false, reason: 'reconnect-required' };
      }

      if (data.success) {
        toast.success(`${data.synced} Termin(e) wurden automatisch zu Outlook hinzugefügt.`);
        return { success: true, synced: data.synced };
      }

      return { success: false, reason: 'sync-failed', error: data.error };
    } catch (error) {
      console.error('Error syncing to Outlook:', error);
      return { success: false, reason: 'error', error };
    }
  }, []);

  const syncSingleAudit = useCallback(async (audit: {
    id: string;
    clientName: string;
    type: string;
    scheduledDate: Date | string;
    certifications?: string[];
    notes?: string;
    clientAddress?: string;
  }) => {
    const event: AuditEvent = {
      id: audit.id,
      clientName: audit.clientName,
      type: audit.type,
      status: 'scheduled',
      scheduledDate: typeof audit.scheduledDate === 'string' 
        ? audit.scheduledDate 
        : audit.scheduledDate.toISOString(),
      certifications: audit.certifications,
      notes: audit.notes,
      clientAddress: audit.clientAddress,
      eventType: 'audit',
      isAllDay: false,
    };

    return syncToOutlook([event]);
  }, [syncToOutlook]);

  return { syncToOutlook, syncSingleAudit };
};
