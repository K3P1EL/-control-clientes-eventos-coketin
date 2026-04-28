// Safe localStorage wrappers — never throw, validate types on read.
// Use these instead of localStorage directly so corrupted/missing values
// can't break critical UI state.

export function getStr(key, fallback = null) {
  try {
    const v = localStorage.getItem(key)
    return typeof v === "string" && v.length ? v : fallback
  } catch { return fallback }
}

export function setStr(key, value) {
  try {
    if (value == null || value === "") localStorage.removeItem(key)
    else localStorage.setItem(key, String(value))
  } catch { /* localStorage unavailable */ }
}

export function remove(key) {
  try { localStorage.removeItem(key) } catch { /* localStorage unavailable */ }
}

export function getJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch { return fallback }
}

export function setJSON(key, value) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch { /* localStorage unavailable */ }
}
