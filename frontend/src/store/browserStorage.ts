export function readBrowserStorage(key: string) {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeBrowserStorage(key: string, value: string) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  } catch {
    // Browsers can block storage in private or embedded contexts. The app should
    // keep working even when persistence is unavailable.
  }
}

export function removeBrowserStorage(key: string) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage so logout never leaves the UI stuck.
  }
}
