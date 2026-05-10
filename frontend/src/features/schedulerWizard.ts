import type { ApiRequest, Collection, Schedule, ScheduleType } from '../types/domain';

export const monitoringStepLabels = [
  'My info',
  'Project details',
  'Monitor API',
  'Checks & status',
  'Summary'
] as const;

export type MonitorWizardDraft = {
  targetType: Schedule['targetType'];
  apiRequestId: string;
  collectionId: string;
  name: string;
  scheduleType: ScheduleType;
  intervalMinutes: number;
  cronExpression: string;
  enabled: boolean;
  sloUptimeTarget: number;
  sloLatencyP95Ms: number;
  publicStatusEnabled: boolean;
  publicSlug: string;
  ownerName: string;
  workEmail: string;
  projectKind: 'PERSONAL' | 'WORK';
};

export function normalizeStatusSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function createMonitoringDraft(schedule: Schedule | undefined, requests: ApiRequest[], collections: Collection[]): MonitorWizardDraft {
  const name = schedule?.name ?? 'Production health check';
  return {
    targetType: schedule?.targetType ?? 'REQUEST',
    apiRequestId: schedule?.apiRequestId ?? requests[0]?.id ?? '',
    collectionId: schedule?.collectionId ?? collections[0]?.id ?? '',
    name,
    scheduleType: schedule?.scheduleType ?? 'INTERVAL',
    intervalMinutes: schedule?.intervalMinutes ?? 5,
    cronExpression: schedule?.cronExpression ?? '0 */5 * * * *',
    enabled: schedule?.enabled ?? true,
    sloUptimeTarget: schedule?.sloUptimeTarget ?? 99,
    sloLatencyP95Ms: schedule?.sloLatencyP95Ms ?? 1000,
    publicStatusEnabled: schedule?.publicStatusEnabled ?? false,
    publicSlug: schedule?.publicSlug ?? normalizeStatusSlug(name),
    ownerName: '',
    workEmail: '',
    projectKind: 'WORK'
  };
}

export function canContinueMonitoringStep(stepIndex: number, draft: MonitorWizardDraft) {
  if (stepIndex === 0) return true;
  if (stepIndex === 1) return Boolean(draft.name.trim() && (draft.targetType === 'WORKFLOW' ? draft.collectionId : draft.apiRequestId));
  if (stepIndex === 2) return draft.scheduleType === 'INTERVAL' ? draft.intervalMinutes >= 1 : draft.cronExpression.trim().length > 0;
  if (stepIndex === 3) {
    const uptimeValid = Number(draft.sloUptimeTarget) > 0 && Number(draft.sloUptimeTarget) <= 100;
    const latencyValid = Number(draft.sloLatencyP95Ms) > 0;
    const slugValid = !draft.publicStatusEnabled || normalizeStatusSlug(draft.publicSlug).length > 0;
    return uptimeValid && latencyValid && slugValid;
  }
  return true;
}

