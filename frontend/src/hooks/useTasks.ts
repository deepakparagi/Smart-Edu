'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, TaskSchema, type Task } from '@/lib/api';

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks', z.array(TaskSchema)),
  });
}

export function useTask(id: number) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => api.get(`/tasks/${id}`, TaskSchema),
    enabled: !!id,
  });
}

export function useCurrentPlan() {
  return useQuery({
    queryKey: ['plan', 'current'],
    queryFn: () => api.get('/plans/current'),
  });
}

export function useGeneratePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { availableMinutesPerDay: number; startDate?: string }) =>
      api.post('/plans/generate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan', 'current'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { title: string; subject?: string; scheduledDate?: string; estimatedMinutes: number; priority: string }) =>
      api.post('/tasks', data, TaskSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) =>
      api.patch(`/tasks/${id}`, data, TaskSchema),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(['task', id], updated);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.post(`/tasks/${id}/complete`),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(['task', id], updated);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useReopenTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.post(`/tasks/${id}/reopen`),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(['task', id], updated);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

import { z } from 'zod';