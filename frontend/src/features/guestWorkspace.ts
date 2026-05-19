import type { ApiRequest, Collection } from '../types/domain';
import { readBrowserStorage, writeBrowserStorage } from '../store/browserStorage';

export const GUEST_COLLECTIONS_KEY = 'apiautopsy_guest_collections';
export const GUEST_REQUESTS_KEY = 'apiautopsy_guest_requests';

export function createGuestRequest(payload: {
  collectionId?: string;
  name: string;
  method: ApiRequest['method'];
  url: string;
  headers: Record<string, unknown>;
  queryParams: Record<string, unknown>;
  bodyType: ApiRequest['bodyType'];
  body: Record<string, unknown>;
  authType: ApiRequest['authType'];
  certificateId?: string;
}, existingId?: string): ApiRequest {
  return {
    id: existingId || crypto.randomUUID(),
    collectionId: payload.collectionId,
    name: payload.name,
    method: payload.method,
    url: payload.url,
    headers: payload.headers,
    queryParams: payload.queryParams,
    bodyType: payload.bodyType,
    body: payload.body,
    authType: payload.authType,
    certificateId: payload.certificateId
  };
}

export function readGuestCollections(): Collection[] {
  return readGuestStorage<Collection[]>(GUEST_COLLECTIONS_KEY, []);
}

export function readGuestRequests(): ApiRequest[] {
  return readGuestStorage<ApiRequest[]>(GUEST_REQUESTS_KEY, []);
}

export function persistGuestCollections(collections: Collection[]) {
  writeBrowserStorage(GUEST_COLLECTIONS_KEY, JSON.stringify(collections));
  return collections;
}

export function persistGuestRequests(requests: ApiRequest[]) {
  writeBrowserStorage(GUEST_REQUESTS_KEY, JSON.stringify(requests));
  return requests;
}

function readGuestStorage<T>(key: string, fallback: T): T {
  try {
    const raw = readBrowserStorage(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}
