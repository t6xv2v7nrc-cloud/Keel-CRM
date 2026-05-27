import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useLead(id) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useLeadActivity(leadId) {
  return useQuery({
    queryKey: ['activity', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead) => {
      const { data, error } = await supabase.from('leads').insert(lead).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['leads', data.id] });
      qc.invalidateQueries({ queryKey: ['leads', 'pinned'] });
    },
  });
}

export function useAddActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (activity) => {
      const { data, error } = await supabase
        .from('activity_log')
        .insert(activity)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['activity', vars.lead_id] });
    },
  });
}

export function useCalendarActivity(year, month) {
  return useQuery({
    queryKey: ['calendar', year, month],
    queryFn: async () => {
      const start = new Date(year, month, 1).toISOString();
      const end   = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();

      const [actRes, leadsRes] = await Promise.all([
        supabase
          .from('activity_log')
          .select('id, lead_id, type, text, created_at, leads(id, name, status)')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: true }),
        supabase
          .from('leads')
          .select('id, name, status, created_at')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: true }),
      ]);

      if (actRes.error)   throw actRes.error;
      if (leadsRes.error) throw leadsRes.error;
      return { activity: actRes.data ?? [], newLeads: leadsRes.data ?? [] };
    },
  });
}

export function usePinnedLeads() {
  return useQuery({
    queryKey: ['leads', 'pinned'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name')
        .eq('pinned', true)
        .order('updated_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });
}
