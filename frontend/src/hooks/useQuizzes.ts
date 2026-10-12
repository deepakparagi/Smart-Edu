'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, QuizSchema, QuizQuestionSchema, type Quiz } from '@/lib/api';

export function useQuizzes() {
  return useQuery({
    queryKey: ['quizzes'],
    queryFn: () => api.get('/quizzes', z.array(QuizSchema)),
  });
}

export function useQuiz(id: number) {
  return useQuery({
    queryKey: ['quiz', id],
    queryFn: () => api.get(`/quizzes/${id}`, z.object({
      ...QuizSchema.shape,
      questions: z.array(QuizQuestionSchema),
    })),
    enabled: !!id,
  });
}

export function useGenerateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (materialId: number) => api.post('/quizzes/generate', { materialId }, QuizSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useQuizAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quizId, answers }: { quizId: number; answers: string[] }) =>
      api.post(`/quizzes/${quizId}/attempts`, { answers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

import { z } from 'zod';