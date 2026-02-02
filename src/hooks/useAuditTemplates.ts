import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AuditTemplate = {
  id: string;
  certification_id: string;
  audit_type: 'initial' | 'surveillance' | 'recertification' | 'six-month' | 'internal';
  name: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  certifications?: {
    id: string;
    name: string;
  } | null;
};

export type AuditTemplateTask = {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  days_before_audit: number;
  sort_order: number;
  created_at: string;
};

export type AuditTemplateInsert = {
  certification_id: string;
  audit_type: 'initial' | 'surveillance' | 'recertification' | 'six-month' | 'internal';
  name?: string | null;
  description?: string | null;
};

export type AuditTemplateTaskInsert = {
  template_id: string;
  title: string;
  description?: string | null;
  days_before_audit?: number;
  sort_order?: number;
};

// Fetch all templates with certification info
export const useAuditTemplates = () => {
  return useQuery({
    queryKey: ['audit-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_templates')
        .select(`
          *,
          certifications (id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AuditTemplate[];
    },
  });
};

// Fetch template by certification and audit type
export const useAuditTemplateByType = (
  certificationId: string | undefined, 
  auditType: 'initial' | 'surveillance' | 'recertification' | 'six-month' | 'internal' | undefined
) => {
  return useQuery({
    queryKey: ['audit-template', certificationId, auditType],
    queryFn: async () => {
      if (!certificationId || !auditType) return null;
      
      const { data, error } = await supabase
        .from('audit_templates')
        .select('*')
        .eq('certification_id', certificationId)
        .eq('audit_type', auditType)
        .maybeSingle();
      
      if (error) throw error;
      return data as AuditTemplate | null;
    },
    enabled: !!certificationId && !!auditType,
  });
};

// Fetch template tasks directly by certification and audit type
export const fetchTemplateTasksForAudit = async (
  certificationId: string,
  auditType: 'initial' | 'surveillance' | 'recertification' | 'six-month' | 'internal'
): Promise<AuditTemplateTask[]> => {
  // First find the template
  const { data: template, error: templateError } = await supabase
    .from('audit_templates')
    .select('id')
    .eq('certification_id', certificationId)
    .eq('audit_type', auditType)
    .maybeSingle();
  
  if (templateError) throw templateError;
  if (!template) return [];
  
  // Then fetch tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('audit_template_tasks')
    .select('*')
    .eq('template_id', template.id)
    .order('sort_order', { ascending: true });
  
  if (tasksError) throw tasksError;
  return tasks as AuditTemplateTask[];
};

// Fetch tasks for a template
export const useAuditTemplateTasks = (templateId: string | undefined) => {
  return useQuery({
    queryKey: ['audit-template-tasks', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from('audit_template_tasks')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as AuditTemplateTask[];
    },
    enabled: !!templateId,
  });
};

// Create template
export const useCreateAuditTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: AuditTemplateInsert) => {
      const { data, error } = await supabase
        .from('audit_templates')
        .insert(template)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-templates'] });
    },
  });
};

// Update template
export const useUpdateAuditTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AuditTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('audit_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-templates'] });
    },
  });
};

// Delete template
export const useDeleteAuditTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('audit_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-templates'] });
    },
  });
};

// Create template task
export const useCreateAuditTemplateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: AuditTemplateTaskInsert) => {
      const { data, error } = await supabase
        .from('audit_template_tasks')
        .insert(task)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit-template-tasks', variables.template_id] });
    },
  });
};

// Update template task
export const useUpdateAuditTemplateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AuditTemplateTask> & { id: string }) => {
      const { data, error } = await supabase
        .from('audit_template_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-template-tasks'] });
    },
  });
};

// Delete template task
export const useDeleteAuditTemplateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) => {
      const { error } = await supabase
        .from('audit_template_tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return templateId;
    },
    onSuccess: (templateId) => {
      queryClient.invalidateQueries({ queryKey: ['audit-template-tasks', templateId] });
    },
  });
};
