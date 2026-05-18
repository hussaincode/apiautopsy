import { describe, expect, it } from 'vitest';
import { shouldUpdateAuthenticatedRequest } from '../Dashboard';

describe('Dashboard authenticated request persistence', () => {
  it('creates a backend request when a local draft id is not part of the authenticated workspace', () => {
    expect(shouldUpdateAuthenticatedRequest([], 'local-draft-id')).toBe(false);
    expect(shouldUpdateAuthenticatedRequest([{ id: 'backend-request-id' }], 'local-draft-id')).toBe(false);
  });

  it('updates only when the draft id belongs to the authenticated workspace', () => {
    expect(shouldUpdateAuthenticatedRequest([{ id: 'backend-request-id' }], 'backend-request-id')).toBe(true);
  });
});
