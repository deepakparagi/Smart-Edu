'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, FocusSessionSchema, type FocusSession } from '@/lib/api';

export function useFocusSessions() {
  return useQuery({
    queryKey: ['focus', 'sessions'],
    queryFn: () => api.get('/focus/sessions', z.array(FocusSessionSchema)),
  });
}

export function useActiveFocusSession() {
  return useQuery({
    queryKey: ['focus', 'active'],
    queryFn: () => api.get('/focus/active', FocusSessionSchema.nullable()),
    refetchInterval: 1000, // Poll every second for active session
  });
}

export function useStartFocusSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { taskId?: number; estimatedMinutes?: number }) =>
      api.post('/focus/start', data, FocusSessionSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['focus', 'sessions'] });
    },
  });
}

export function usePauseFocusSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.post(`/focus/${id}/pause`, undefined, FocusSessionSchema),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(['focus', 'active'], updated);
      queryClient.invalidateQueries({ queryKey: ['focus', 'sessions'] });
    },
  });
}

export function useResumeFocusSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.post(`/focus/${id}/resume`, undefined, FocusSessionSchema),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(['focus', 'active'], updated);
      queryClient.invalidateQueries({ queryKey: ['focus', 'sessions'] });
    },
  });
}

export function useCompleteFocusSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.post(`/focus/${id}/complete`, undefined, FocusSessionSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['focus', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

import { z } from 'zod';