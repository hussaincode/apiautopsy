export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type ScheduleType = 'INTERVAL' | 'CRON';

export interface Workspace { id: string; name: string; role: 'OWNER' | 'ADMIN' | 'MEMBER'; }
export interface Collection { id: string; parentId?: string; name: string; description?: string; }
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
  apiRequestId: string;
  name: string;
  scheduleType: ScheduleType;
  intervalMinutes?: number;
  cronExpression?: string;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt?: string;
}
export interface ReportSummary { total: number; success: number; successRate: number; errorRate: number; avgLatencyMs: number; }
