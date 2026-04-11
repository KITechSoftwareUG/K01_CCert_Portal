import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Json | null;
  created_at: string;
}

export const useActivityLog = (limit = 1000) => {
  return useQuery({
    queryKey: ['activity-log', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ActivityLogEntry[];
    },
  });
};

export const useLogActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      action: string;
      entity_type: string;
      entity_id?: string;
      entity_name?: string;
      details?: Json;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const userName = user.user_metadata?.full_name || user.email || 'Unbekannt';

      const { error } = await supabase.from('activity_log').insert({
        user_id: user.id,
        user_name: userName,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id || null,
        entity_name: entry.entity_name || null,
        details: entry.details || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
    },
  });
};

// Helper to fire-and-forget log an activity (non-blocking)
export const logActivity = async (entry: {
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  details?: Json;
}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const userName = user.user_metadata?.full_name || user.email || 'Unbekannt';

    await supabase.from('activity_log').insert({
      user_id: user.id,
      user_name: userName,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      entity_name: entry.entity_name || null,
      details: entry.details || null,
    });
  } catch (e) {
    console.warn('Activity log failed:', e);
  }
};
