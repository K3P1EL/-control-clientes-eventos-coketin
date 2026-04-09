// Centralized error logger. Adds context, timestamp, and a single
// place to swap in remote logging (Sentry, Logflare, etc.) later.

const isDev = (typeof import.meta !== "undefined" && import.meta?.env?.DEV) || false

export function logError(context, error, extra) {
  const msg = error?.message || String(error)
  const stack = error?.stack
  const payload = { context, msg, ...(extra || {}) }
  // eslint-disable-next-line no-console
  console.error(`[${context}]`, msg, isDev && stack ? "\n" + stack : "", extra || "")
  return payload
}

export function logWarn(context, msg, extra) {
  // eslint-disable-next-line no-console
  console.warn(`[${context}]`, msg, extra || "")
}
