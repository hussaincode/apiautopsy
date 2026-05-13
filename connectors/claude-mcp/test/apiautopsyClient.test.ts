import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiAutopsyClient, encodeSegment } from '../src/apiautopsyClient.js';

test('encodeSegment rejects empty path parameters', () => {
  assert.throws(() => encodeSegment(' '), /cannot be empty/);
});

test('encodeSegment escapes unsafe path characters', () => {
  assert.equal(encodeSegment('status/page'), 'status%2Fpage');
});

test('client requires token for authenticated tools', async () => {
  const client = new ApiAutopsyClient('https://api.apiautopsy.com');
  await assert.rejects(() => client.request('/api/workspaces'), /APIAUTOPSY_TOKEN/);
});

test('client rejects non-http base urls', () => {
  assert.throws(() => new ApiAutopsyClient('file:///tmp/token'), /http or https/);
});
