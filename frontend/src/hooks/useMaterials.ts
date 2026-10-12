'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, MaterialSchema, MaterialListSchema, type Material } from '@/lib/api';

export function useMaterials(page = 0, size = 20) {
  return useQuery({
    queryKey: ['materials', page, size],
    queryFn: () => api.get(`/materials?page=${page}&size=${size}`, MaterialListSchema),
  });
}

export function useMaterial(id: number) {
  return useQuery({
    queryKey: ['material', id],
    queryFn: () => api.get(`/materials/${id}`, MaterialSchema),
    enabled: !!id,
  });
}

export function useMaterialText(id: number, page = 0, size = 50) {
  return useQuery({
    queryKey: ['material', id, 'text', page],
    queryFn: () => api.get(`/materials/${id}/text?page=${page}&size=${size}`),
    enabled: !!id,
  });
}

export function useSearchMaterials(query: string, page = 0, size = 20) {
  return useQuery({
    queryKey: ['materials', 'search', query, page, size],
    queryFn: () => api.get(`/materials/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`, MaterialListSchema),
    enabled: query.length > 0,
  });
}

export function useUploadMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => api.upload<Material>('/materials', file, MaterialSchema),
    onSuccess: (newMaterial) => {
      queryClient.setQueryData(['materials', 0, 20], (old: any) => {
        if (!old) return { content: [newMaterial], totalElements: 1, totalPages: 1, size: 20, number: 0 };
        return { ...old, content: [newMaterial, ...old.content], totalElements: old.totalElements + 1 };
      });
    },
  });
}

export function useRetryMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.post(`/materials/${id}/process`, undefined, MaterialSchema),
    onSuccess: (updated, id) => {
      queryClient.setQueryData(['material', id], updated);
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete(`/materials/${id}`),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['material', id] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export function useDownloadMaterial() {
  return useMutation({
    mutationFn: (id: number) => api.download(`/materials/${id}/file`),
  });
}