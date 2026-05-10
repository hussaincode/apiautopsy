import { describe, expect, it } from 'vitest';
import type { ApiRequest, Collection, Execution, Schedule } from '../../types/domain';
import { buildMonitorRows, calculateQualityScore, filterMonitorRows, toResultState } from '../monitoringMetrics';

const request: ApiRequest = {
  id: 'request-1',
  name: 'Health check',
  method: 'GET',
  url: 'https://example.com/health',
  headers: {},
  queryParams: {},
  bodyType: 'NONE',
  body: {},
  authType: 'NONE'
};

const collection: Collection = {
  id: 'collection-1',
  name: 'Payments'
};

const schedule: Schedule = {
  id: 'schedule-1',
  apiRequestId: request.id,
  targetType: 'REQUEST',
  name: 'Production monitor',
  scheduleType: 'INTERVAL',
  intervalMinutes: 5,
  enabled: true,
  nextRunAt: '2026-05-11T00:00:00.000Z',
  sloUptimeTarget: 99,
  sloLatencyP95Ms: 500,
  publicStatusEnabled: false
};

function execution(id: string, success: boolean, responseTimeMs: number, executedAt: string): Execution {
  return {
    id,
    apiRequestId: request.id,
    scheduleId: schedule.id,
    statusCode: success ? 200 : 500,
    success,
    responseTimeMs,
    responseHeaders: {},
    responseSizeBytes: 128,
    assertionPassed: success,
    executedAt
  };
}

describe('monitoring metrics', () => {
  it('classifies pass, slow, fail, and empty monitor results', () => {
    expect(toResultState(undefined, 500)).toBe('empty');
    expect(toResultState(execution('pass', true, 100, '2026-05-11T00:00:00.000Z'), 500)).toBe('pass');
    expect(toResultState(execution('slow', true, 900, '2026-05-11T00:00:00.000Z'), 500)).toBe('slow');
    expect(toResultState(execution('fail', false, 200, '2026-05-11T00:00:00.000Z'), 500)).toBe('fail');
  });

  it('builds monitor rows from schedules and real executions', () => {
    const rows = buildMonitorRows([
      schedule
    ], [
      execution('run-1', true, 200, '2026-05-11T00:00:00.000Z'),
      execution('run-2', true, 800, '2026-05-11T00:05:00.000Z'),
      execution('run-3', false, 300, '2026-05-11T00:10:00.000Z')
    ], [request], [collection]);

    expect(rows).toHaveLength(1);
    expect(rows[0].totalRuns).toBe(3);
    expect(rows[0].failedRuns).toBe(1);
    expect(rows[0].availability).toBeCloseTo(66.67, 1);
    expect(rows[0].slowPercent).toBeCloseTo(33.33, 1);
    expect(rows[0].latestState).toBe('fail');
    expect(rows[0].hourlyResults[0]).toMatchObject({ latencyMs: 200, state: 'pass', statusCode: 200 });
    expect(rows[0].request?.name).toBe('Health check');
  });

  it('keeps quality score in a safe percentage range', () => {
    expect(calculateQualityScore(100, 0, 100, 500)).toBe(100);
    expect(calculateQualityScore(50, 100, 2000, 500)).toBeGreaterThanOrEqual(0);
    expect(calculateQualityScore(50, 100, 2000, 500)).toBeLessThanOrEqual(100);
  });

  it('filters monitor rows by name and health thresholds', () => {
    const rows = buildMonitorRows([
      schedule
    ], [
      execution('run-1', true, 200, '2026-05-11T00:00:00.000Z'),
      execution('run-2', true, 800, '2026-05-11T00:05:00.000Z')
    ], [request], [collection]);

    expect(filterMonitorRows(rows, { name: 'health', minQuality: '', minAvailability: '', maxSlowPercent: '', maxLatencyMs: '' })).toHaveLength(1);
    expect(filterMonitorRows(rows, { name: 'missing', minQuality: '', minAvailability: '', maxSlowPercent: '', maxLatencyMs: '' })).toHaveLength(0);
    expect(filterMonitorRows(rows, { name: '', minQuality: '101', minAvailability: '', maxSlowPercent: '', maxLatencyMs: '' })).toHaveLength(0);
    expect(filterMonitorRows(rows, { name: '', minQuality: '', minAvailability: '', maxSlowPercent: '0', maxLatencyMs: '' })).toHaveLength(0);
    expect(filterMonitorRows(rows, { name: '', minQuality: '', minAvailability: '', maxSlowPercent: '', maxLatencyMs: '1000' })).toHaveLength(1);
  });
});
