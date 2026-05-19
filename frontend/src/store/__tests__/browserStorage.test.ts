import { afterEach, describe, expect, it } from 'vitest';
import { readBrowserStorage, removeBrowserStorage, writeBrowserStorage } from '../browserStorage';

const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

afterEach(() => {
  if (originalLocalStorage) Object.defineProperty(window, 'localStorage', originalLocalStorage);
  window.localStorage.clear();
});

describe('browser storage helpers', () => {
  it('reads, writes, and removes local storage values when storage is available', () => {
    writeBrowserStorage('apiautopsy_test', 'stored');

    expect(readBrowserStorage('apiautopsy_test')).toBe('stored');

    removeBrowserStorage('apiautopsy_test');
    expect(readBrowserStorage('apiautopsy_test')).toBeNull();
  });

  it('does not throw when browser storage is blocked', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('Storage is blocked');
      }
    });

    expect(readBrowserStorage('apiautopsy_test')).toBeNull();
    expect(() => writeBrowserStorage('apiautopsy_test', 'stored')).not.toThrow();
    expect(() => removeBrowserStorage('apiautopsy_test')).not.toThrow();
  });
});
