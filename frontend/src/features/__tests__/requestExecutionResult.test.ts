import axios from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { createFailedExecution, readableExecutionError } from '../requestExecutionResult';

describe('request execution result helpers', () => {
  it('creates a visible failed execution for browser network errors', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');
    const error = new axios.AxiosError('Network Error', 'ERR_NETWORK');

    const execution = createFailedExecution(error, { id: 'request-1' }, Date.now() - 42);

    expect(execution.id).toBe('local-error-00000000-0000-4000-8000-000000000001');
    expect(execution.apiRequestId).toBe('request-1');
    expect(execution.success).toBe(false);
    expect(execution.errorMessage).toMatch(/could not be reached/i);
    expect(execution.assertionPassed).toBe(false);
  });

  it('prefers backend validation messages when available', () => {
    const error = new axios.AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined, {
      data: { message: 'URL cannot be resolved safely' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: new axios.AxiosHeaders() }
    });

    expect(readableExecutionError(error)).toBe('URL cannot be resolved safely');
  });
});
