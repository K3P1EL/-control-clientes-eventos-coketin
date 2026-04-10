// Centralized input validation for Peruvian DNI, phones, and contract codes.
// Each validator returns { ok: boolean, value?: string, error?: string }
// so callers can decide whether to surface the error or just discard the input.

// ── DNI peruano: exactamente 8 dígitos ───────────────────────────────────
export function validateDNI(raw) {
  const v = String(raw || "").replace(/\D/g, "")
  if (!v) return { ok: false, error: "DNI vacío" }
  if (v.length !== 8) return { ok: false, error: "DNI debe tener 8 dígitos" }
  return { ok: true, value: v }
}

export const isValidDNI = (raw) => validateDNI(raw).ok

// ── Teléfono peruano ─────────────────────────────────────────────────────
// Acepta: 9 dígitos (móvil empezando en 9), 7 dígitos (fijo Lima),
// o cualquiera de los anteriores con prefijo +51 / 51.
export function validatePhone(raw) {
  let v = String(raw || "").replace(/[^\d+]/g, "")
  if (!v) return { ok: false, error: "Teléfono vacío" }
  if (v.startsWith("+51")) v = v.slice(3)
  else if (v.startsWith("51") && v.length > 9) v = v.slice(2)
  if (!/^\d+$/.test(v)) return { ok: false, error: "Teléfono inválido" }
  if (v.length === 9 && v.startsWith("9")) return { ok: true, value: v }
  if (v.length === 7) return { ok: true, value: v }
  return { ok: false, error: "Teléfono debe tener 9 dígitos (móvil) o 7 (fijo)" }
}

export const isValidPhone = (raw) => validatePhone(raw).ok

// Normaliza un teléfono al formato canónico (sin espacios/guiones/+).
// Si no es válido, devuelve el original limpio para no perder data legacy.
export function normalizePhone(raw) {
  const r = validatePhone(raw)
  return r.ok ? r.value : String(raw || "").replace(/[^\d+]/g, "")
}

// ── Número de contrato ───────────────────────────────────────────────────
// Solo dígitos, entre 1 y 12 caracteres. Acepta opcionalmente guiones.
export function validateContrato(raw) {
  const v = String(raw || "").trim()
  if (!v) return { ok: false, error: "Número de contrato vacío" }
  const digits = v.replace(/\D/g, "")
  if (!digits) return { ok: false, error: "Número de contrato inválido" }
  if (digits.length > 12) return { ok: false, error: "Número de contrato muy largo" }
  return { ok: true, value: digits }
}

export const isValidContrato = (raw) => validateContrato(raw).ok

// ── Email ────────────────────────────────────────────────────────────────
// Cheap RFC-ish check — enough for forms, not for security boundaries.
export function validateEmail(raw) {
  const v = String(raw || "").trim().toLowerCase()
  if (!v) return { ok: false, error: "Email vacío" }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { ok: false, error: "Email inválido" }
  if (v.length > 254) return { ok: false, error: "Email muy largo" }
  return { ok: true, value: v }
}

export const isValidEmail = (raw) => validateEmail(raw).ok

// ── Number with optional min/max ─────────────────────────────────────────
// Accepts numbers or numeric strings. Returns the parsed number on success.
export function validateNumber(raw, { min, max, integer = false } = {}) {
  if (raw === null || raw === undefined || raw === "") return { ok: false, error: "Vacío" }
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."))
  if (isNaN(n)) return { ok: false, error: "No es un número" }
  if (integer && !Number.isInteger(n)) return { ok: false, error: "Debe ser entero" }
  if (typeof min === "number" && n < min) return { ok: false, error: `Mínimo ${min}` }
  if (typeof max === "number" && n > max) return { ok: false, error: `Máximo ${max}` }
  return { ok: true, value: n }
}

export const isValidNumber = (raw, opts) => validateNumber(raw, opts).ok
