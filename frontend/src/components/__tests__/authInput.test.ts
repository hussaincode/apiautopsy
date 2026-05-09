import { describe, expect, it } from 'vitest';
import { normalizeEmailInput, normalizePasswordInput } from '../authInput';

describe('auth input normalization', () => {
  it('normalizes Safari/autofill email values before submit', () => {
    expect(normalizeEmailInput('  HussainCode.In@Gmail.COM\u200B ')).toBe('hussaincode.in@gmail.com');
  });

  it('removes invisible and accidental surrounding password characters before submit', () => {
    expect(normalizePasswordInput('\uFEFF  CorrectHorseBatteryStaple\u200D  ')).toBe('CorrectHorseBatteryStaple');
  });
});
