export const toCamel = (s: string) =>
  s.replace(/[_-][a-z]/g, (m) => m.slice(1).toUpperCase());

export function keysToCamel<T extends Record<string, unknown>>(obj: T): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(keysToCamel);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[toCamel(k)] = keysToCamel(v as unknown);
  return out;
}

export function keysToSnake<T extends Record<string, unknown>>(obj: T): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(keysToSnake);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const snake = k
      .replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)
      .replace(/[-\s]+/g, '_');
    out[snake] = keysToSnake(v as unknown);
  }
  return out;
}

