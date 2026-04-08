export function ensureArray<T>(data: unknown, fallback: string): T[] {
  if (!Array.isArray(data)) {
    throw new Error(fallback);
  }
  return data as T[];
}

export function ensureObject<T>(data: unknown, fallback: string): T {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(fallback);
  }
  return data as T;
}
