import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClientLock {
  id: string;
  client_id: string;
  locked_by: string;
  locked_by_name: string | null;
  locked_at: string;
  expires_at: string;
}

export const useClientLock = (clientId: string | undefined) => {
  const { user } = useAuth();
  const [lock, setLock] = useState<ClientLock | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();

  const isLockedByOther = lock && lock.locked_by !== user?.id && new Date(lock.expires_at) > new Date();
  const isLockedByMe = lock && lock.locked_by === user?.id;

  const fetchLock = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from('client_locks')
      .select('*')
      .eq('client_id', clientId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    setLock(data as ClientLock | null);
  }, [clientId]);

  const acquireLock = useCallback(async () => {
    if (!clientId || !user) return false;
    setIsLocking(true);
    try {
      // First clean up expired locks
      await supabase
        .from('client_locks')
        .delete()
        .eq('client_id', clientId)
        .lt('expires_at', new Date().toISOString());

      // Get user name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data, error } = await supabase
        .from('client_locks')
        .upsert({
          client_id: clientId,
          locked_by: user.id,
          locked_by_name: profile?.full_name || user.email || 'Unbekannt',
          locked_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }, { onConflict: 'client_id' })
        .select()
        .single();

      if (error) {
        // Conflict — someone else holds the lock
        await fetchLock();
        return false;
      }
      setLock(data as ClientLock);
      return true;
    } catch {
      await fetchLock();
      return false;
    } finally {
      setIsLocking(false);
    }
  }, [clientId, user, fetchLock]);

  const releaseLock = useCallback(async () => {
    if (!clientId || !user) return;
    await supabase
      .from('client_locks')
      .delete()
      .eq('client_id', clientId)
      .eq('locked_by', user.id);
    setLock(null);
  }, [clientId, user]);

  // Heartbeat: extend lock every 60s
  useEffect(() => {
    if (!isLockedByMe || !clientId || !user) return;

    heartbeatRef.current = setInterval(async () => {
      await supabase
        .from('client_locks')
        .update({ expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() })
        .eq('client_id', clientId)
        .eq('locked_by', user.id);
    }, 60_000);

    return () => clearInterval(heartbeatRef.current);
  }, [isLockedByMe, clientId, user]);

  // Fetch lock on mount + subscribe to realtime changes
  useEffect(() => {
    if (!clientId) return;
    fetchLock();

    const channel = supabase
      .channel(`client-lock-${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'client_locks',
        filter: `client_id=eq.${clientId}`,
      }, () => {
        fetchLock();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, fetchLock]);

  // Release lock on unmount / page leave
  useEffect(() => {
    if (!isLockedByMe) return;
    
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable cleanup
      if (clientId && user) {
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/client_locks?client_id=eq.${clientId}&locked_by=eq.${user.id}`,
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      releaseLock();
    };
  }, [isLockedByMe, clientId, user, releaseLock]);

  return {
    lock,
    isLockedByOther: !!isLockedByOther,
    isLockedByMe: !!isLockedByMe,
    lockedByName: lock?.locked_by_name || null,
    isLocking,
    acquireLock,
    releaseLock,
  };
};
