/** Decode answer keys serialized by the current quiz builder. */
export function decodeStoredCorrectAnswer(value: unknown): unknown {
  if (typeof value !== 'string' || value.length < 4) return value;
  const base64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!base64.test(value)) return value;

  try {
    const decoded = atob(value);
    // atob also accepts ordinary words; reject binary output to avoid turning
    // raw answers like "true" into corrupted Latin-1 text.
    if (!/^[\x20-\x7E\r\n\t]*$/.test(decoded)) return value;
    try {
      return JSON.parse(decoded);
    } catch {
      return decoded;
    }
  } catch {
    return value;
  }
}
