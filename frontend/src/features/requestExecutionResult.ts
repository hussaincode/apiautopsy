import { isAxiosError } from 'axios';
import type { ApiRequest, Execution } from '../types/domain';

type RequestIdentity = Pick<ApiRequest, 'id'> | { id?: string };

export function createFailedExecution(error: unknown, request: RequestIdentity | undefined, startedAtMs: number): Execution {
  const elapsedMs = Math.max(0, Date.now() - startedAtMs);
  const statusCode = isAxiosError(error) ? error.response?.status : undefined;

  return {
    id: `local-error-${crypto.randomUUID()}`,
    apiRequestId: request?.id ?? 'unsaved-request',
    statusCode,
    success: false,
    responseTimeMs: elapsedMs,
    responseHeaders: extractResponseHeaders(error),
    responseBody: extractResponseBody(error),
    errorMessage: readableExecutionError(error),
    executedAt: new Date().toISOString(),
    responseSizeBytes: 0,
    assertionPassed: false
  };
}

export function readableExecutionError(error: unknown): string {
  if (isAxiosError(error)) {
    const serverMessage = error.response?.data;
    if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
    if (serverMessage && typeof serverMessage === 'object') {
      const message = 'message' in serverMessage ? serverMessage.message : undefined;
      const errorText = 'error' in serverMessage ? serverMessage.error : undefined;
      if (typeof message === 'string' && message.trim()) return message;
      if (typeof errorText === 'string' && errorText.trim()) return errorText;
      return JSON.stringify(serverMessage);
    }
    if (error.response?.status) return `Request failed with HTTP ${error.response.status}`;
    if (error.code === 'ERR_NETWORK') return 'Network error. The backend or target API could not be reached from this browser/network.';
    return error.message || 'Request failed before a response was received.';
  }

  if (error instanceof Error) return error.message;
  return 'Request failed before a response was received.';
}

function extractResponseBody(error: unknown) {
  if (!isAxiosError(error)) return undefined;
  const data = error.response?.data;
  if (typeof data === 'string') return data;
  if (data === undefined) return undefined;
  return JSON.stringify(data, null, 2);
}

function extractResponseHeaders(error: unknown) {
  if (!isAxiosError(error)) return {};
  return { ...error.response?.headers };
}
