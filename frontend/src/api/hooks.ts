import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { ApiRequest, Collection, Execution, ReportSummary, Schedule, Workspace } from '../types/domain';

export function useWorkspaces() {
  return useQuery({ queryKey: ['workspaces'], queryFn: async () => (await api.get<Workspace[]>('/workspaces')).data });
}

export function useCollections(workspaceId?: string) {
  return useQuery({ queryKey: ['collections', workspaceId], enabled: !!workspaceId, queryFn: async () => (await api.get<Collection[]>(`/workspaces/${workspaceId}/collections`)).data });
}

export function useRequests(workspaceId?: string) {
  return useQuery({ queryKey: ['requests', workspaceId], enabled: !!workspaceId, queryFn: async () => (await api.get<ApiRequest[]>(`/workspaces/${workspaceId}/requests`)).data });
}

export function useSchedules(workspaceId?: string) {
  return useQuery({ queryKey: ['schedules', workspaceId], enabled: !!workspaceId, queryFn: async () => (await api.get<Schedule[]>(`/workspaces/${workspaceId}/schedules`)).data });
}

export function useExecutions(workspaceId?: string) {
  return useQuery({ queryKey: ['executions', workspaceId], enabled: !!workspaceId, refetchInterval: 15000, queryFn: async () => (await api.get<Execution[]>(`/workspaces/${workspaceId}/executions`)).data });
}

export function useReport(workspaceId?: string) {
  return useQuery({ queryKey: ['report', workspaceId], enabled: !!workspaceId, refetchInterval: 15000, queryFn: async () => (await api.get<ReportSummary>(`/workspaces/${workspaceId}/reports/summary`)).data });
}

export function useCreateRequest(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ApiRequest> & { auth?: Record<string, unknown> }) => (await api.post(`/workspaces/${workspaceId}/requests`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests', workspaceId] })
  });
}

export function useUpdateRequest(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ApiRequest> & { auth?: Record<string, unknown> } }) => (await api.put(`/workspaces/${workspaceId}/requests/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests', workspaceId] })
  });
}

export function useCreateCollection(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; parentId?: string }) => (await api.post<Collection>(`/workspaces/${workspaceId}/collections`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections', workspaceId] })
  });
}

export function useInviteUser(workspaceId?: string) {
  return useMutation({
    mutationFn: async (payload: { email: string; role: 'ADMIN' | 'MEMBER' }) => (await api.post(`/workspaces/${workspaceId}/invites`, payload)).data
  });
}

export function useExecute(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => (await api.post<Execution>(`/workspaces/${workspaceId}/requests/${requestId}/execute`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['executions', workspaceId] });
      qc.invalidateQueries({ queryKey: ['report', workspaceId] });
    }
  });
}

export function useCreateSchedule(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Schedule>) => (await api.post(`/workspaces/${workspaceId}/schedules`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules', workspaceId] })
  });
}

export function useUpdateSchedule(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Schedule> }) => (await api.put(`/workspaces/${workspaceId}/schedules/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules', workspaceId] })
  });
}

export function useCreateCertificate(workspaceId?: string) {
  return useMutation({
    mutationFn: async (payload: { name: string; certificatePem: string; privateKeyPem?: string }) => (await api.post(`/workspaces/${workspaceId}/certificates`, payload)).data
  });
}
