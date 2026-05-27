import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useOfficerStreak(officerId) {
  return useQuery({
    queryKey: ['officer-streak', officerId],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 29);
      since.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('leads')
        .select('created_at')
        .eq('officer_id', officerId)
        .gte('created_at', since.toISOString());
      if (error) throw error;

      const activeDays = new Set(
        (data || []).map(r => new Date(r.created_at).toDateString()),
      );

      return Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return activeDays.has(d.toDateString()) ? 1 : 0;
      });
    },
    enabled: !!officerId,
  });
}

export function useOfficers() {
  return useQuery({
    queryKey: ['officers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('officers')
        .select('*')
        .order('score', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateOfficer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (officer) => {
      const { data, error } = await supabase.from('officers').insert(officer).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['officers'] }),
  });
}

export function useBulkCreateOfficers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (officers) => {
      const { data, error } = await supabase
        .from('officers')
        .insert(officers)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['officers'] }),
  });
}

export function useUpdateOfficer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('officers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['officers'] }),
  });
}
