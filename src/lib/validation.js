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

