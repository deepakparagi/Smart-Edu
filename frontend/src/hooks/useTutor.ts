'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, TutorConversationSchema, type TutorConversation } from '@/lib/api';

export function useTutorConversations() {
  return useQuery({
    queryKey: ['tutor', 'conversations'],
    queryFn: () => api.get('/tutor/conversations', z.array(TutorConversationSchema)),
  });
}

export function useTutorConversation(id: number) {
  return useQuery({
    queryKey: ['tutor', 'conversation', id],
    queryFn: () => api.get(`/tutor/conversations/${id}`),
    enabled: !!id,
  });
}

export function useCreateTutorConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title: string) =>
      api.post('/tutor/conversations', { title }, TutorConversationSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversations'] });
    },
  });
}

export function useAskTutor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { question: string; materialId: number; conversationId: number }) =>
      api.post('/tutor/ask', data),
    onSuccess: (result, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversations'] });
    },
  });
}

export function useDeleteTutorConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete(`/tutor/conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversations'] });
    },
  });
}

export function useRenameTutorConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      api.patch(`/tutor/conversations/${id}`, { title }, TutorConversationSchema),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(['tutor', 'conversation', id], updated);
      queryClient.invalidateQueries({ queryKey: ['tutor', 'conversations'] });
    },
  });
}

import { z } from 'zod';