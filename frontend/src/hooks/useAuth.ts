'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, UserSchema, type User } from '@/lib/api';
import { useRouter } from 'next/navigation';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me', UserSchema),
    retry: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.post('/auth/login', { email, password }, UserSchema),
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
      if (user.role === 'STUDENT') router.push('/dashboard');
      else if (user.role === 'PARENT') router.push('/parent');
      else if (user.role === 'ADMIN') router.push('/admin');
      else router.push('/dashboard');
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: 'STUDENT' | 'PARENT' }) =>
      api.post('/auth/register', data, UserSchema),
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user);
      if (user.role === 'STUDENT') router.push('/dashboard');
      else if (user.role === 'PARENT') router.push('/parent');
      else router.push('/dashboard');
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      queryClient.clear();
      router.push('/');
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api.post('/auth/forgot-password', { email }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      api.post('/auth/reset-password', { token, password }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', { currentPassword, newPassword }),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => api.post('/auth/verify-email', { token }),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () => api.post('/auth/resend-verification'),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (password: string) => api.delete('/auth/account', undefined, { body: JSON.stringify({ password }) }),
    onSuccess: () => {
      queryClient.clear();
      router.push('/');
    },
  });
}

export function useExportData() {
  return useMutation({
    mutationFn: () => api.get('/auth/export'),
  });
}