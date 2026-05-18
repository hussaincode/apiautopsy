import { AxiosError, type AxiosInstance } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { executePublicRequest, isBrowserNetworkError } from './publicExecute';
import type { Execution } from '../types/domain';

const successfulExecution: Execution = {
  id: 'execution-1',
  apiRequestId: 'request-1',
  statusCode: 200,
  responseTimeMs: 142,
  success: true,
  responseBody: '{"ok":true}',
  responseHeaders: {},
  executedAt: '2026-05-18T00:00:00Z',
  responseSizeBytes: 11,
  assertionPassed: true
};

function clientThatResolves(data: Execution) {
  return { post: vi.fn().mockResolvedValue({ data }) } as unknown as AxiosInstance & { post: ReturnType<typeof vi.fn> };
}

function clientThatRejects(error: unknown) {
  return { post: vi.fn().mockRejectedValue(error) } as unknown as AxiosInstance & { post: ReturnType<typeof vi.fn> };
}

describe('isBrowserNetworkError', () => {
  it('detects axios failures where the browser did not receive a response', () => {
    expect(isBrowserNetworkError(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(true);
  });

  it('does not classify backend responses as browser network failures', () => {
    const error = new AxiosError('Bad request', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
      data: {}
    });

    expect(isBrowserNetworkError(error)).toBe(false);
  });
});

describe('executePublicRequest', () => {
  it('uses the primary API client when it succeeds', async () => {
    const primaryClient = clientThatResolves(successfulExecution);
    const fallbackClient = clientThatResolves({ ...successfulExecution, id: 'fallback' });

    await expect(executePublicRequest({ url: 'https://example.com' }, { primaryClient, fallbackClient, hostname: 'apiautopsy.com' })).resolves.toEqual(successfulExecution);
    expect(primaryClient.post).toHaveBeenCalledWith('/public/execute', { url: 'https://example.com' });
    expect(fallbackClient.post).not.toHaveBeenCalled();
  });

  it('retries through the same-origin API only for production browser network failures', async () => {
    const primaryClient = clientThatRejects(new AxiosError('Network Error', 'ERR_NETWORK'));
    const fallbackExecution = { ...successfulExecution, id: 'fallback' };
    const fallbackClient = clientThatResolves(fallbackExecution);

    await expect(executePublicRequest({ url: 'https://jsonplaceholder.typicode.com/todos/1' }, { primaryClient, fallbackClient, hostname: 'apiautopsy.com' })).resolves.toEqual(fallbackExecution);
    expect(fallbackClient.post).toHaveBeenCalledWith('/public/execute', { url: 'https://jsonplaceholder.typicode.com/todos/1' });
  });

  it('does not retry backend validation errors through the fallback', async () => {
    const backendError = new AxiosError('Bad request', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
      data: { message: 'Invalid URL' }
    });
    const primaryClient = clientThatRejects(backendError);
    const fallbackClient = clientThatResolves(successfulExecution);

    await expect(executePublicRequest({ url: 'invalid' }, { primaryClient, fallbackClient, hostname: 'apiautopsy.com' })).rejects.toBe(backendError);
    expect(fallbackClient.post).not.toHaveBeenCalled();
  });

  it('does not retry local development network failures through the production fallback', async () => {
    const networkError = new AxiosError('Network Error', 'ERR_NETWORK');
    const primaryClient = clientThatRejects(networkError);
    const fallbackClient = clientThatResolves(successfulExecution);

    await expect(executePublicRequest({ url: 'https://example.com' }, { primaryClient, fallbackClient, hostname: '127.0.0.1' })).rejects.toBe(networkError);
    expect(fallbackClient.post).not.toHaveBeenCalled();
  });
});
