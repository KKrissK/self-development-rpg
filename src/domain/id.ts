/**
 * Produces an identifier even in browsers that only expose Web Crypto on HTTPS.
 * A LAN Vite preview is served over HTTP, so randomUUID is not guaranteed there.
 */
export function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()

  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
