import { api, sameOriginApi, shouldRetrySameOrigin } from './client';
import type { Execution } from '../types/domain';

type ExecuteSavedRequestOptions = {
  primaryClient?: typeof api;
  fallbackClient?: typeof sameOriginApi;
  hostname?: string;
};

export async function executeSavedRequest(workspaceId: string | undefined, requestId: string, options: ExecuteSavedRequestOptions = {}) {
  if (!workspaceId) {
    throw new Error('Workspace is still loading. Please try again in a moment.');
  }

  const primaryClient = options.primaryClient ?? api;
  const fallbackClient = options.fallbackClient ?? sameOriginApi;
  const path = `/workspaces/${workspaceId}/requests/${requestId}/execute`;

  try {
    return (await primaryClient.post<Execution>(path)).data;
  } catch (error) {
    if (!shouldRetrySameOrigin(error, options.hostname)) {
      throw error;
    }

    return (await fallbackClient.post<Execution>(path)).data;
  }
}
