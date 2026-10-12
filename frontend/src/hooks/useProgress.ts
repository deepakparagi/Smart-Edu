'use client';

import { useQuery } from '@tanstack/react-query';
import { api, ProgressOverviewSchema, ProgressTrendsSchema } from '@/lib/api';

export function useProgressOverview() {
  return useQuery({
    queryKey: ['progress', 'overview'],
    queryFn: () => api.get('/progress/overview', ProgressOverviewSchema),
  });
}

export function useProgressTrends() {
  return useQuery({
    queryKey: ['progress', 'trends'],
    queryFn: () => api.get('/progress/trends', ProgressTrendsSchema),
  });
}