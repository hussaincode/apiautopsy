import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { AlertIncident, AlertRule, AlertTestResponse, ApiRequest, Certificate, Collection, ConnectedApp, CreatedIntegrationApiKey, Execution, IntegrationApiKey, PublicStatus, ReportSummary, Schedule, ScheduleAssertion, ScheduleDetail, WorkflowRun, WorkflowStep, Workspace } from '../types/domain';

export function useWorkspaces(enabled = true) {
  return useQuery({ queryKey: ['workspaces'], enabled, queryFn: async () => (await api.get<Workspace[]>('/workspaces')).data });
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

export function usePublicExecute() {
  return useMutation({
    mutationFn: async (payload: Partial<ApiRequest> & { auth?: Record<string, unknown> }) => (await api.post<Execution>('/public/execute', payload)).data
  });
}

export function useCreateSchedule(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Schedule>) => (await api.post<Schedule>(`/workspaces/${workspaceId}/schedules`, payload)).data,
    onSuccess: (schedule) => {
      qc.setQueryData<Schedule[]>(['schedules', workspaceId], (current) => current ? [schedule, ...current.filter((item) => item.id !== schedule.id)] : [schedule]);
      qc.invalidateQueries({ queryKey: ['schedules', workspaceId] });
      qc.invalidateQueries({ queryKey: ['alert-rules', workspaceId] });
    }
  });
}

export function useUpdateSchedule(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Schedule> }) => (await api.put<Schedule>(`/workspaces/${workspaceId}/schedules/${id}`, payload)).data,
    onSuccess: (schedule) => {
      qc.setQueryData<Schedule[]>(['schedules', workspaceId], (current) => current?.map((item) => item.id === schedule.id ? schedule : item) ?? [schedule]);
      qc.invalidateQueries({ queryKey: ['schedules', workspaceId] });
      qc.invalidateQueries({ queryKey: ['schedule-detail', workspaceId, schedule.id] });
      qc.invalidateQueries({ queryKey: ['alert-rules', workspaceId] });
    }
  });
}

export function useToggleSchedule(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => (await api.patch<Schedule>(`/workspaces/${workspaceId}/schedules/${id}/enabled`, { enabled })).data,
    onMutate: async ({ id, enabled }) => {
      await qc.cancelQueries({ queryKey: ['schedules', workspaceId] });
      const previousSchedules = qc.getQueryData<Schedule[]>(['schedules', workspaceId]);
      qc.setQueryData<Schedule[]>(['schedules', workspaceId], (current) => current?.map((schedule) => schedule.id === id ? { ...schedule, enabled } : schedule));
      return { previousSchedules };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSchedules) qc.setQueryData(['schedules', workspaceId], context.previousSchedules);
    },
    onSuccess: (schedule) => {
      qc.setQueryData<Schedule[]>(['schedules', workspaceId], (current) => current?.map((item) => item.id === schedule.id ? schedule : item));
      qc.invalidateQueries({ queryKey: ['schedule-detail', workspaceId, schedule.id] });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['schedules', workspaceId] })
  });
}

export function useDeleteSchedule(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/workspaces/${workspaceId}/schedules/${id}`)).data,
    onSuccess: (_data, id) => {
      qc.setQueryData<Schedule[]>(['schedules', workspaceId], (current) => current?.filter((schedule) => schedule.id !== id) ?? []);
      qc.invalidateQueries({ queryKey: ['schedules', workspaceId] });
      qc.invalidateQueries({ queryKey: ['executions', workspaceId] });
      qc.invalidateQueries({ queryKey: ['alert-rules', workspaceId] });
      qc.invalidateQueries({ queryKey: ['alert-incidents', workspaceId] });
      qc.removeQueries({ queryKey: ['schedule-detail', workspaceId, id] });
    }
  });
}

export function useScheduleDetail(workspaceId?: string, scheduleId?: string) {
  return useQuery({
    queryKey: ['schedule-detail', workspaceId, scheduleId],
    enabled: !!workspaceId && !!scheduleId,
    refetchInterval: 15000,
    queryFn: async () => (await api.get<ScheduleDetail>(`/workspaces/${workspaceId}/schedules/${scheduleId}/detail`)).data
  });
}

export function useScheduleAssertions(workspaceId?: string, scheduleId?: string) {
  return useQuery({
    queryKey: ['schedule-assertions', workspaceId, scheduleId],
    enabled: !!workspaceId && !!scheduleId,
    queryFn: async () => (await api.get<ScheduleAssertion[]>(`/workspaces/${workspaceId}/schedules/${scheduleId}/assertions`)).data
  });
}

export function useCreateAssertion(workspaceId?: string, scheduleId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ScheduleAssertion>) => (await api.post<ScheduleAssertion>(`/workspaces/${workspaceId}/schedules/${scheduleId}/assertions`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-assertions', workspaceId, scheduleId] })
  });
}

export function useDeleteAssertion(workspaceId?: string, scheduleId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assertionId: string) => (await api.delete(`/workspaces/${workspaceId}/schedules/${scheduleId}/assertions/${assertionId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-assertions', workspaceId, scheduleId] })
  });
}

export function usePublicStatus(slug?: string) {
  return useQuery({
    queryKey: ['public-status', slug],
    enabled: !!slug,
    refetchInterval: 30000,
    queryFn: async () => (await api.get<PublicStatus>(`/status/${slug}`)).data
  });
}

export function useAlertRules(workspaceId?: string) {
  return useQuery({
    queryKey: ['alert-rules', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => (await api.get<AlertRule[]>(`/workspaces/${workspaceId}/alerts/rules`)).data
  });
}

export function useSaveAlertRule(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scheduleId, payload }: { scheduleId: string; payload: Partial<AlertRule> }) => (await api.put<AlertRule>(`/workspaces/${workspaceId}/alerts/rules/${scheduleId}`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert-rules', workspaceId] });
      qc.invalidateQueries({ queryKey: ['alert-incidents', workspaceId] });
    }
  });
}

export function useAlertIncidents(workspaceId?: string) {
  return useQuery({
    queryKey: ['alert-incidents', workspaceId],
    enabled: !!workspaceId,
    refetchInterval: 15000,
    queryFn: async () => (await api.get<AlertIncident[]>(`/workspaces/${workspaceId}/alerts/incidents`)).data
  });
}

export function useTestAlertRule(workspaceId?: string) {
  return useMutation({
    mutationFn: async (scheduleId: string) => (await api.post<AlertTestResponse>(`/workspaces/${workspaceId}/alerts/rules/${scheduleId}/test`)).data
  });
}

export function useResolveAlertIncident(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (incidentId: string) => (await api.post<AlertIncident>(`/workspaces/${workspaceId}/alerts/incidents/${incidentId}/resolve`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-incidents', workspaceId] })
  });
}

export function useWorkflowSteps(workspaceId?: string, collectionId?: string) {
  return useQuery({
    queryKey: ['workflow-steps', workspaceId, collectionId],
    enabled: !!workspaceId && !!collectionId,
    queryFn: async () => (await api.get<WorkflowStep[]>(`/workspaces/${workspaceId}/collections/${collectionId}/workflow/steps`)).data
  });
}

export function useSaveWorkflowSteps(workspaceId?: string, collectionId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (steps: WorkflowStep[]) => (await api.put<WorkflowStep[]>(`/workspaces/${workspaceId}/collections/${collectionId}/workflow/steps`, steps)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-steps', workspaceId, collectionId] })
  });
}

export function useRunWorkflow(workspaceId?: string, collectionId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<WorkflowRun>(`/workspaces/${workspaceId}/collections/${collectionId}/workflow/run`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-runs', workspaceId, collectionId] })
  });
}

export function useWorkflowRuns(workspaceId?: string, collectionId?: string) {
  return useQuery({
    queryKey: ['workflow-runs', workspaceId, collectionId],
    enabled: !!workspaceId && !!collectionId,
    refetchInterval: 15000,
    queryFn: async () => (await api.get<WorkflowRun[]>(`/workspaces/${workspaceId}/collections/${collectionId}/workflow/runs`)).data
  });
}

export function useCreateCertificate(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FormData) => (await api.post(`/workspaces/${workspaceId}/certificates`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificates', workspaceId] })
  });
}

export function useCertificates(workspaceId?: string) {
  return useQuery({ queryKey: ['certificates', workspaceId], enabled: !!workspaceId, queryFn: async () => (await api.get<Certificate[]>(`/workspaces/${workspaceId}/certificates`)).data });
}

export function useIntegrationApiKeys() {
  return useQuery({
    queryKey: ['integration-api-keys'],
    queryFn: async () => (await api.get<IntegrationApiKey[]>('/integration-keys')).data
  });
}

export function useCreateIntegrationApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string }) => (await api.post<CreatedIntegrationApiKey>('/integration-keys', payload)).data,
    onSuccess: (created) => {
      const safeKey: IntegrationApiKey = {
        id: created.id,
        name: created.name,
        keyPrefix: created.keyPrefix,
        scope: created.scope,
        createdAt: created.createdAt,
        lastUsedAt: created.lastUsedAt,
        revokedAt: created.revokedAt
      };
      qc.setQueryData<IntegrationApiKey[]>(['integration-api-keys'], (current) => [safeKey, ...(current ?? []).filter((item) => item.id !== created.id)]);
      qc.invalidateQueries({ queryKey: ['integration-api-keys'] });
    }
  });
}

export function useRevokeIntegrationApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (keyId: string) => api.delete(`/integration-keys/${keyId}`),
    onSuccess: (_result, keyId) => {
      qc.setQueryData<IntegrationApiKey[]>(['integration-api-keys'], (current) => current?.map((key) => key.id === keyId ? { ...key, revokedAt: new Date().toISOString() } : key) ?? []);
      qc.invalidateQueries({ queryKey: ['integration-api-keys'] });
    }
  });
}

export function useConnectedApps() {
  return useQuery({
    queryKey: ['connected-apps'],
    queryFn: async () => (await api.get<ConnectedApp[]>('/oauth/connected-apps')).data
  });
}

export function useRevokeConnectedApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: string) => api.delete(`/oauth/connected-apps/${tokenId}`),
    onSuccess: (_result, tokenId) => {
      qc.setQueryData<ConnectedApp[]>(['connected-apps'], (current) => current?.map((app) => app.tokenId === tokenId ? { ...app, revokedAt: new Date().toISOString() } : app) ?? []);
      qc.invalidateQueries({ queryKey: ['connected-apps'] });
    }
  });
}
