export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type ScheduleType = 'INTERVAL' | 'CRON';
export type ScheduleTargetType = 'REQUEST' | 'WORKFLOW';

export interface Workspace { id: string; name: string; role: 'OWNER' | 'ADMIN' | 'MEMBER'; }
export interface Collection { id: string; parentId?: string; name: string; description?: string; }
export interface Certificate { id: string; name: string; }
export interface ApiRequest {
  id: string;
  collectionId?: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, unknown>;
  queryParams: Record<string, unknown>;
  bodyType: 'NONE' | 'JSON' | 'RAW' | 'FORM_DATA';
  body: Record<string, unknown>;
  authType: 'NONE' | 'BEARER' | 'API_KEY' | 'BASIC';
  certificateId?: string;
}
export interface Execution {
  id: string;
  apiRequestId: string;
  scheduleId?: string;
  statusCode?: number;
  success: boolean;
  responseTimeMs: number;
  responseHeaders: Record<string, unknown>;
  responseBody?: string;
  errorMessage?: string;
  executedAt: string;
}
export interface Schedule {
  id: string;
  apiRequestId?: string;
  collectionId?: string;
  targetType: ScheduleTargetType;
  name: string;
  scheduleType: ScheduleType;
  intervalMinutes?: number;
  cronExpression?: string;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt?: string;
}
export interface ReportSummary { total: number; success: number; successRate: number; errorRate: number; avgLatencyMs: number; }
export interface ScheduleMetrics { totalRuns: number; successfulRuns: number; failedRuns: number; successRate: number; failureRate: number; avgLatencyMs: number; }
export interface ScheduleDetail { schedule: Schedule; metrics: ScheduleMetrics; executions: Execution[]; }
export interface AlertRule {
  id: string;
  scheduleId: string;
  enabled: boolean;
  alertOnFailure: boolean;
  latencyThresholdMs?: number;
  consecutiveFailuresThreshold: number;
  emailRecipients: string[];
  createdAt: string;
  updatedAt: string;
}
export interface AlertIncident {
  id: string;
  scheduleId: string;
  alertRuleId: string;
  executionId?: string;
  status: 'OPEN' | 'RESOLVED';
  reason: string;
  openedAt: string;
  resolvedAt?: string;
  lastTriggeredAt: string;
  triggerCount: number;
  lastStatusCode?: number;
  lastLatencyMs?: number;
  lastErrorMessage?: string;
}
export interface ExtractionRule { variableName: string; jsonPath: string; }
export interface WorkflowStep { id?: string; apiRequestId: string; stepOrder: number; dependsOnStepId?: string; stopOnFailure: boolean; extractionRules: ExtractionRule[]; }
export interface WorkflowRunLog { id: string; workflowStepId: string; executionId?: string; stepOrder: number; stepName: string; success: boolean; responseTimeMs: number; statusCode?: number; extractedVariables: Record<string, unknown>; errorMessage?: string; executedAt: string; }
export interface WorkflowRun { id: string; collectionId: string; scheduleId?: string; success: boolean; totalDurationMs: number; variables: Record<string, unknown>; errorMessage?: string; startedAt: string; completedAt?: string; logs: WorkflowRunLog[]; }
