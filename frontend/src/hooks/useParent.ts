'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ParentLink } from '@/lib/api';

export function useParentLinks() {
  return useQuery({
    queryKey: ['parent', 'links'],
    queryFn: () => api.get('/parents/links', z.array(z.object({
      id: z.number(),
      student: z.object({ id: z.number(), name: z.string(), email: z.string() }),
      status: z.string(),
      createdAt: z.string(),
    }))),
  });
}

export function useParentLinkRequests() {
  return useQuery({
    queryKey: ['parent', 'requests'],
    queryFn: () => api.get('/parents/requests', z.array(z.object({
      id: z.number(),
      parent: z.object({ id: z.number(), name: z.string(), email: z.string() }),
      createdAt: z.string(),
    }))),
  });
}

export function useRequestParentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => api.post('/parents/link-request', { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent', 'links'] });
    },
  });
}

export function useApproveParentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.post(`/parents/links/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent', 'links'] });
      queryClient.invalidateQueries({ queryKey: ['parent', 'requests'] });
    },
  });
}

export function useRejectParentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.post(`/parents/links/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent', 'requests'] });
    },
  });
}

export function useRevokeParentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.post(`/parents/links/${id}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent', 'links'] });
    },
  });
}

import { z } from 'zod';