import { describe, expect, it } from 'vitest';
import { canContinueMonitoringStep, createMonitoringDraft, normalizeStatusSlug, type MonitorWizardDraft } from '../schedulerWizard';

const baseDraft: MonitorWizardDraft = {
  targetType: 'REQUEST',
  apiRequestId: 'request-1',
  collectionId: '',
  name: 'Production health check',
  scheduleType: 'INTERVAL',
  intervalMinutes: 5,
  cronExpression: '0 */5 * * * *',
  enabled: true,
  sloUptimeTarget: 99,
  sloLatencyP95Ms: 1000,
  publicStatusEnabled: false,
  publicSlug: 'production-health-check',
  ownerName: '',
  workEmail: '',
  projectKind: 'WORK'
};

describe('scheduler wizard helpers', () => {
  it('normalizes public status slugs to safe lowercase path segments', () => {
    expect(normalizeStatusSlug(' Payment API Health!! ')).toBe('payment-api-health');
    expect(normalizeStatusSlug('API___Monitor 2026')).toBe('api-monitor-2026');
  });

  it('prefills an editable monitoring draft from saved data', () => {
    const draft = createMonitoringDraft(undefined, [{
      id: 'request-1',
      collectionId: 'collection-1',
      name: 'JSONPlaceholder Health',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      headers: {},
      queryParams: {},
      bodyType: 'NONE',
      body: {},
      authType: 'NONE'
    }], []);

    expect(draft.apiRequestId).toBe('request-1');
    expect(draft.intervalMinutes).toBe(5);
    expect(draft.publicSlug).toBe('production-health-check');
  });

  it('blocks the project-details step until a target and monitor name are selected', () => {
    expect(canContinueMonitoringStep(1, { ...baseDraft, apiRequestId: '' })).toBe(false);
    expect(canContinueMonitoringStep(1, { ...baseDraft, name: '  ' })).toBe(false);
    expect(canContinueMonitoringStep(1, baseDraft)).toBe(true);
  });

  it('validates interval and cron scheduling choices', () => {
    expect(canContinueMonitoringStep(2, { ...baseDraft, intervalMinutes: 0 })).toBe(false);
    expect(canContinueMonitoringStep(2, { ...baseDraft, scheduleType: 'CRON', cronExpression: '' })).toBe(false);
    expect(canContinueMonitoringStep(2, { ...baseDraft, scheduleType: 'CRON', cronExpression: '0 */10 * * * *' })).toBe(true);
  });

  it('requires valid SLO values and status slug before publishing a status page', () => {
    expect(canContinueMonitoringStep(3, { ...baseDraft, sloUptimeTarget: 101 })).toBe(false);
    expect(canContinueMonitoringStep(3, { ...baseDraft, sloLatencyP95Ms: 0 })).toBe(false);
    expect(canContinueMonitoringStep(3, { ...baseDraft, publicStatusEnabled: true, publicSlug: '***' })).toBe(false);
    expect(canContinueMonitoringStep(3, { ...baseDraft, publicStatusEnabled: true, publicSlug: 'client-health' })).toBe(true);
  });
});
