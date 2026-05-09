const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF]/g;

export function normalizeEmailInput(value: string) {
  return value.replace(INVISIBLE_CHARS, '').trim().toLowerCase();
}

export function normalizePasswordInput(value: string) {
  return value.replace(INVISIBLE_CHARS, '').trim();
}
