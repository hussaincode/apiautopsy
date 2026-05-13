import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request } from 'express';
import { extractBearerToken, protectedResourceMetadata } from '../src/auth.js';

test('extractBearerToken reads bearer authorization headers', () => {
  const req = {
    header(name: string) {
      return name.toLowerCase() === 'authorization' ? 'Bearer aat_live_test' : undefined;
    }
  } as Request;

  assert.equal(extractBearerToken(req), 'aat_live_test');
});

test('protectedResourceMetadata uses forwarded public origin', () => {
  const req = {
    protocol: 'http',
    header(name: string) {
      const headers: Record<string, string> = {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'mcp.apiautopsy.com'
      };
      return headers[name.toLowerCase()];
    }
  } as Request;

  assert.deepEqual(protectedResourceMetadata(req), {
    resource: 'https://mcp.apiautopsy.com/mcp',
    authorization_servers: ['https://apiautopsy.com'],
    bearer_methods_supported: ['header'],
    resource_documentation: 'https://apiautopsy.com/settings'
  });
});
