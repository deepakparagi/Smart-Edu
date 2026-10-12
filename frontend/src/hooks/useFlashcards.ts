'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, FlashcardSchema, FlashcardReviewSchema, type Flashcard, type FlashcardReview } from '@/lib/api';

export function useFlashcards(params?: { materialId?: number; dueOnly?: boolean; search?: string }) {
  const queryKey = ['flashcards', params];
  return useQuery({
    queryKey,
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.materialId) searchParams.set('materialId', String(params.materialId));
      if (params?.dueOnly) searchParams.set('dueOnly', 'true');
      if (params?.search) searchParams.set('search', params.search);
      return api.get(`/flashcards?${searchParams.toString()}`, z.array(FlashcardSchema));
    },
  });
}

export function useFlashcard(id: number) {
  return useQuery({
    queryKey: ['flashcard', id],
    queryFn: () => api.get(`/flashcards/${id}`, FlashcardSchema),
    enabled: !!id,
  });
}

export function useFlashcardDueCount() {
  return useQuery({
    queryKey: ['flashcards', 'due-count'],
    queryFn: () => api.get('/flashcards/due-count'),
  });
}

export function useFlashcardStats() {
  return useQuery({
    queryKey: ['flashcards', 'stats'],
    queryFn: () => api.get('/flashcards/stats'),
  });
}

export function useCreateFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { front: string; back: string; materialId?: number; sourceReference?: string }) =>
      api.post('/flashcards', data, FlashcardSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'due-count'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'stats'] });
    },
  });
}

export function useUpdateFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { front: string; back: string; sourceReference?: string } }) =>
      api.patch(`/flashcards/${id}`, data, FlashcardSchema),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(['flashcard', id], updated);
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
}

export function useDeleteFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete(`/flashcards/${id}`),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['flashcard', id] });
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'due-count'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'stats'] });
    },
  });
}

export function useGenerateFlashcards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (materialId: number) => api.post('/flashcards/generate', { materialId }, z.array(FlashcardSchema)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'due-count'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'stats'] });
    },
  });
}

export function useReviewFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quality }: { id: number; quality: 0 | 1 | 2 | 3 }) =>
      api.post(`/flashcards/${id}/review`, { quality }, z.object({
        card: FlashcardSchema,
        projectedIntervals: z.object({
          again: z.number(),
          hard: z.number(),
          good: z.number(),
          easy: z.number(),
        }),
      })),
    onSuccess: (result, { id }) => {
      queryClient.setQueryData(['flashcard', id], result.card);
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'due-count'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'stats'] });
    },
  });
}

export function useFlashcardHistory(id: number) {
  return useQuery({
    queryKey: ['flashcard', id, 'history'],
    queryFn: () => api.get(`/flashcards/${id}/history`, z.array(FlashcardReviewSchema)),
    enabled: !!id,
  });
}

import { z } from 'zod';