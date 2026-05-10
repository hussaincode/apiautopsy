import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGuestRequest, GUEST_COLLECTIONS_KEY, persistGuestCollections, persistGuestRequests, readGuestCollections, readGuestRequests } from '../guestWorkspace';

describe('guest workspace storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');
  });

  it('creates local requests without requiring an authenticated workspace', () => {
    const request = createGuestRequest({
      name: 'Guest request',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      headers: { Accept: 'application/json' },
      queryParams: {},
      bodyType: 'NONE',
      body: {},
      authType: 'NONE'
    });

    expect(request.id).toBe('00000000-0000-4000-8000-000000000001');
    expect(request.name).toBe('Guest request');
  });

  it('can update an existing local request when an id is provided', () => {
    const request = createGuestRequest({
      name: 'Updated request',
      method: 'POST',
      url: 'https://example.com',
      headers: {},
      queryParams: {},
      bodyType: 'JSON',
      body: { ok: true },
      authType: 'NONE'
    }, 'request-id');

    expect(request.id).toBe('request-id');
    expect(request.method).toBe('POST');
  });

  it('persists collections and requests locally for guests', () => {
    persistGuestCollections([{ id: 'collection-id', name: 'Guest collection' }]);
    persistGuestRequests([createGuestRequest({
      collectionId: 'collection-id',
      name: 'Saved locally',
      method: 'GET',
      url: 'https://example.com',
      headers: {},
      queryParams: {},
      bodyType: 'NONE',
      body: {},
      authType: 'NONE'
    }, 'request-id')]);

    expect(localStorage.getItem(GUEST_COLLECTIONS_KEY)).toContain('Guest collection');
    expect(readGuestCollections()).toHaveLength(1);
    expect(readGuestRequests()[0].id).toBe('request-id');
  });
});
