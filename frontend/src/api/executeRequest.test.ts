import { AxiosError, type AxiosInstance } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { executeSavedRequest } from './executeRequest';
import type { Execution } from '../types/domain';

const execution: Execution = {
  id: 'execution-1',
  apiRequestId: 'request-1',
  statusCode: 200,
  success: true,
  responseTimeMs: 64,
  responseHeaders: {},
  responseBody: '{"ok":true}',
  executedAt: '2026-05-19T00:00:00Z',
  responseSizeBytes: 11,
  assertionPassed: true
};

function resolvingClient(data: Execution) {
  return { post: vi.fn().mockResolvedValue({ data }) } as unknown as AxiosInstance & { post: ReturnType<typeof vi.fn> };
}

function rejectingClient(error: unknown) {
  return { post: vi.fn().mockRejectedValue(error) } as unknown as AxiosInstance & { post: ReturnType<typeof vi.fn> };
}

describe('executeSavedRequest', () => {
  it('executes saved requests through the primary backend by default', async () => {
    const primaryClient = resolvingClient(execution);
    const fallbackClient = resolvingClient({ ...execution, id: 'fallback' });

    await expect(executeSavedRequest('workspace-1', 'request-1', { primaryClient, fallbackClient, hostname: 'apiautopsy.com' })).resolves.toEqual(execution);
    expect(primaryClient.post).toHaveBeenCalledWith('/workspaces/workspace-1/requests/request-1/execute');
    expect(fallbackClient.post).not.toHaveBeenCalled();
  });

  it('falls back to the same-origin API route when production browsers cannot reach the backend host', async () => {
    const primaryClient = rejectingClient(new AxiosError('Network Error', 'ERR_NETWORK'));
    const fallbackExecution = { ...execution, id: 'fallback' };
    const fallbackClient = resolvingClient(fallbackExecution);

    await expect(executeSavedRequest('workspace-1', 'request-1', { primaryClient, fallbackClient, hostname: 'apiautopsy.com' })).resolves.toEqual(fallbackExecution);
    expect(fallbackClient.post).toHaveBeenCalledWith('/workspaces/workspace-1/requests/request-1/execute');
  });

  it('does not hide backend validation or auth errors behind the fallback', async () => {
    const backendError = new AxiosError('Forbidden', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config: {} as never,
      data: {}
    });
    const primaryClient = rejectingClient(backendError);
    const fallbackClient = resolvingClient(execution);

    await expect(executeSavedRequest('workspace-1', 'request-1', { primaryClient, fallbackClient, hostname: 'apiautopsy.com' })).rejects.toBe(backendError);
    expect(fallbackClient.post).not.toHaveBeenCalled();
  });
});
