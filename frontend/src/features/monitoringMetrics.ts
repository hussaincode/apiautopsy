import type { ApiRequest, Collection, Execution, Schedule } from '../types/domain';

export type MonitorResultState = 'pass' | 'fail' | 'slow' | 'empty';

export type MonitorRow = {
  availability: number;
  avgLatencyMs: number;
  collectionName?: string;
  dailyStatus: Array<{ date: string; state: MonitorResultState }>;
  executions: Execution[];
  failedRuns: number;
  hourlyResults: MonitorResultPoint[];
  latestState: MonitorResultState;
  p95LatencyMs: number;
  qualityScore: number;
  recentResults: MonitorResultPoint[];
  request?: ApiRequest;
  schedule: Schedule;
  slowPercent: number;
  totalRuns: number;
};

export type MonitorResultPoint = {
  executedAt?: string;
  latencyMs?: number;
  state: MonitorResultState;
  statusCode?: number;
};

export type MonitorFilters = {
  maxLatencyMs: string;
  maxSlowPercent: string;
  minAvailability: string;
  minQuality: string;
  name: string;
};

export function buildMonitorRows(schedules: Schedule[], executions: Execution[], requests: ApiRequest[], collections: Collection[]): MonitorRow[] {
  const requestById = new Map(requests.map((request) => [request.id, request]));
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));

  return schedules.map((schedule) => {
    const request = schedule.apiRequestId ? requestById.get(schedule.apiRequestId) : undefined;
    const collectionName = schedule.collectionId ? collectionById.get(schedule.collectionId)?.name : undefined;
    const relatedExecutions = executions
      .filter((execution) => execution.scheduleId === schedule.id || Boolean(schedule.apiRequestId && execution.apiRequestId === schedule.apiRequestId))
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
    const totalRuns = relatedExecutions.length;
    const failedRuns = relatedExecutions.filter((execution) => !execution.success).length;
    const slowRuns = relatedExecutions.filter((execution) => execution.success && execution.responseTimeMs > schedule.sloLatencyP95Ms).length;
    const availability = totalRuns === 0 ? 0 : (totalRuns - failedRuns) * 100 / totalRuns;
    const slowPercent = totalRuns === 0 ? 0 : slowRuns * 100 / totalRuns;
    const latencies = relatedExecutions.map((execution) => execution.responseTimeMs).sort((a, b) => a - b);
    const avgLatencyMs = totalRuns === 0 ? 0 : latencies.reduce((sum, latency) => sum + latency, 0) / totalRuns;
    const p95LatencyMs = percentile(latencies, 95);
    const latestState = toResultState(relatedExecutions[0], schedule.sloLatencyP95Ms);
    const qualityScore = calculateQualityScore(availability, slowPercent, p95LatencyMs, schedule.sloLatencyP95Ms);

    return {
      availability,
      avgLatencyMs,
      collectionName,
      dailyStatus: buildDailyStatus(relatedExecutions, schedule.sloLatencyP95Ms),
      executions: relatedExecutions,
      failedRuns,
      hourlyResults: relatedExecutions.slice(0, 24).reverse().map((execution) => toResultPoint(execution, schedule.sloLatencyP95Ms)),
      latestState,
      p95LatencyMs,
      qualityScore,
      recentResults: relatedExecutions.slice(0, 5).reverse().map((execution) => toResultPoint(execution, schedule.sloLatencyP95Ms)),
      request,
      schedule,
      slowPercent,
      totalRuns
    };
  });
}

export function toResultState(execution: Execution | undefined, slowThresholdMs: number): MonitorResultState {
  if (!execution) return 'empty';
  if (!execution.success) return 'fail';
  if (execution.responseTimeMs > slowThresholdMs) return 'slow';
  return 'pass';
}

export function toResultPoint(execution: Execution | undefined, slowThresholdMs: number): MonitorResultPoint {
  return {
    executedAt: execution?.executedAt,
    latencyMs: execution?.responseTimeMs,
    state: toResultState(execution, slowThresholdMs),
    statusCode: execution?.statusCode
  };
}

export function calculateQualityScore(availability: number, slowPercent: number, p95LatencyMs: number, latencyTargetMs: number) {
  if (availability <= 0) return 0;
  const latencyPenalty = latencyTargetMs > 0 ? Math.max(0, (p95LatencyMs - latencyTargetMs) / latencyTargetMs) * 12 : 0;
  return Math.max(0, Math.min(100, availability - slowPercent * 0.35 - latencyPenalty));
}

export function filterMonitorRows(rows: MonitorRow[], filters: MonitorFilters) {
  const name = filters.name.trim().toLowerCase();
  const minQuality = parseOptionalNumber(filters.minQuality);
  const minAvailability = parseOptionalNumber(filters.minAvailability);
  const maxSlowPercent = parseOptionalNumber(filters.maxSlowPercent);
  const maxLatencyMs = parseOptionalNumber(filters.maxLatencyMs);

  return rows.filter((row) => {
    const title = `${row.schedule.name} ${row.request?.name ?? ''} ${row.request?.url ?? ''} ${row.collectionName ?? ''}`.toLowerCase();
    if (name && !title.includes(name)) return false;
    if (minQuality !== undefined && row.qualityScore < minQuality) return false;
    if (minAvailability !== undefined && row.availability < minAvailability) return false;
    if (maxSlowPercent !== undefined && row.slowPercent > maxSlowPercent) return false;
    if (maxLatencyMs !== undefined && row.avgLatencyMs > maxLatencyMs) return false;
    return true;
  });
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildDailyStatus(executions: Execution[], slowThresholdMs: number) {
  const today = new Date();
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    const dayRuns = executions.filter((execution) => execution.executedAt.slice(0, 10) === key);
    let state: MonitorResultState = 'empty';
    if (dayRuns.length > 0) {
      const hasFailure = dayRuns.some((execution) => !execution.success);
      const hasSlow = dayRuns.some((execution) => execution.success && execution.responseTimeMs > slowThresholdMs);
      state = hasFailure ? 'fail' : hasSlow ? 'slow' : 'pass';
    }
    return { date: key, state };
  });
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) return 0;
  const index = Math.ceil((percentileValue / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(index, values.length - 1))];
}
