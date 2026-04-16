// Pure helpers shared across the Finanzas module.
// No React, no hooks. Anything date/format/calculation related lives here.

import { DIAS_SEMANA } from "./constants"

// ── Date helpers ─────────────────────────────────────────────────────────
export function getDaysInMonth(y, m) {
  return new Date(y, m, 0).getDate()
}

export function getDayName(y, m, d) {
  return DIAS_SEMANA[new Date(y, m - 1, d).getDay()]
}

// Calendar week of the month (1-6) — used for grouping days into rows.
export function getWeekNumberCal(y, m, d) {
  const first = new Date(y, m - 1, 1).getDay()
  return Math.ceil((d + (first === 0 ? 6 : first - 1)) / 7)
}

// ISO week number (1-53). Used by Contratos to bucket weeks consistently.
// Returns null if the input can't be parsed into a valid date — callers
// should handle that explicitly instead of getting a NaN week silently.
export function getWeekNumberISO(d) {
  const date = parseLocalDate(d) || (d instanceof Date ? d : null)
  if (!date || isNaN(date.getTime())) return null
  const safe = new Date(date.getTime())
  safe.setHours(0, 0, 0, 0)
  safe.setDate(safe.getDate() + 3 - ((safe.getDay() + 6) % 7))
  const week1 = new Date(safe.getFullYear(), 0, 4)
  return 1 + Math.round(((safe.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

// Returns the ISO year for a date (can differ from calendar year at
// year boundaries, e.g. Jan 1 2027 belongs to ISO year 2026 week 53).
export function getISOYear(d) {
  const date = parseLocalDate(d) || (d instanceof Date ? d : null)
  if (!date || isNaN(date.getTime())) return null
  const safe = new Date(date.getTime())
  safe.setHours(0, 0, 0, 0)
  safe.setDate(safe.getDate() + 3 - ((safe.getDay() + 6) % 7))
  return safe.getFullYear()
}

// "America/Lima" stays the source of truth for "today" — events are local.
export function peruNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }))
}

export function peruToday() {
  const d = peruNow()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// Accepts "YYYY-MM-DD" or a Date. Returns a Date at local midnight.
// Returns null for empty / "no trackeado" sentinel, OR for any string
// that doesn't parse to a valid date — that way callers can rely on the
// return either being a valid Date or being null, never an Invalid Date.
export function parseLocalDate(d) {
  if (!d || d === "no trackeado") return null
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d
  const s = String(d).trim()
  if (!s) return null
  const parsed = new Date(s.includes("T") ? s : s + "T00:00:00")
  return isNaN(parsed.getTime()) ? null : parsed
}

// ── Períodos (altas / bajas / reingresos) ───────────────────────────────
// Un "record" (worker, servicio, apoyo) puede tener un array `periodos`:
//   [{ desde: "YYYY-MM-DD" | null, hasta: "YYYY-MM-DD" | null }, ...]
// `desde: null` = "desde siempre". `hasta: null` = "abierto / sigue activo".
// Si no hay `periodos` (o está vacío) → se trata como siempre activo
// (compatibilidad con datos anteriores).
export function isActiveOnDate(record, date) {
  const periodos = record?.periodos
  if (!Array.isArray(periodos) || periodos.length === 0) return true
  const d = date instanceof Date ? date : parseLocalDate(date)
  if (!d) return true
  const ref = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return periodos.some(p => {
    const desde = p.desde ? parseLocalDate(p.desde) : null
    const hasta = p.hasta ? parseLocalDate(p.hasta) : null
    if (desde && ref < desde) return false
    if (hasta && ref > hasta) return false
    return true
  })
}

export function getOpenPeriod(record) {
  const periodos = record?.periodos
  if (!Array.isArray(periodos)) return null
  return periodos.find(p => !p.hasta) || null
}

// Para mostrar un badge de estado en la tabla según el mes visto.
export function getRecordStatus(record, viewYear, viewMonth) {
  const periodos = record?.periodos
  if (!Array.isArray(periodos) || periodos.length === 0) {
    return { active: true, label: "Activo", tone: "emerald" }
  }
  const firstDay = new Date(viewYear, viewMonth - 1, 1)
  const lastDay = new Date(viewYear, viewMonth - 1, getDaysInMonth(viewYear, viewMonth))
  const activeStart = isActiveOnDate(record, firstDay)
  const activeEnd = isActiveOnDate(record, lastDay)
  const open = getOpenPeriod(record)

  if (activeStart && activeEnd) return { active: true, label: "Activo", tone: "emerald" }
  if (!activeStart && activeEnd && open?.desde) {
    return { active: true, label: `Regresó ${fmtFecha(open.desde)}`, tone: "sky" }
  }
  if (activeStart && !activeEnd) {
    const lastClosed = [...periodos].reverse().find(p => p.hasta)
    return { active: false, label: `Baja ${fmtFecha(lastClosed?.hasta)}`, tone: "amber" }
  }
  // Ningún día del mes activo
  const lastClosed = [...periodos].reverse().find(p => p.hasta)
  return {
    active: false,
    label: lastClosed ? `Inactivo desde ${fmtFecha(lastClosed.hasta)}` : "Inactivo",
    tone: "zinc",
  }
}

// Acciones que agregan / cierran períodos. Devuelven el array nuevo.
export function darDeBaja(periodos, fecha) {
  const arr = Array.isArray(periodos) ? [...periodos] : []
  if (arr.length === 0) return [{ desde: null, hasta: fecha }]
  const openIdx = arr.findIndex(p => !p.hasta)
  if (openIdx >= 0) arr[openIdx] = { ...arr[openIdx], hasta: fecha }
  else arr.push({ desde: null, hasta: fecha })
  return arr
}

export function readmitir(periodos, fecha) {
  const arr = Array.isArray(periodos) ? [...periodos] : []
  if (arr.some(p => !p.hasta)) return arr // ya hay uno abierto
  arr.push({ desde: fecha, hasta: null })
  return arr
}

// ── Date display ────────────────────────────────────────────────────────
export function fmtFecha(f) {
  if (!f) return "—"
  const p = f.split("-")
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : f
}

// ── Number formatting ────────────────────────────────────────────────────
export function fmt(n, dec = 2) {
  if (n === null || n === undefined || n === "") return "—"
  return Number(n).toLocaleString("es-PE", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

export function fmtS(n) {
  return "S/ " + fmt(n)
}

// Used by Contratos/Caja which prefer integer-style "S/ 1,234".
export function formatMoney(n) {
  if (n === 0) return "S/ 0"
  return `S/ ${Number(n).toLocaleString("es-PE")}`
}

// ── Contract normalization ───────────────────────────────────────────────
// Migrates old single-adelanto/cobro contracts to the new arrays format.
// Safe to call multiple times — already-migrated contracts pass through.
export function normalizeContract(c) {
  if (Array.isArray(c.adelantos) && Array.isArray(c.cobros)) return c

  const adelantos = []
  if (c.noTrackAdel) {
    adelantos.push({ monto: 0, modalidad: "", recibio: "", fecha: "", enCaja: false, noTrack: true })
  } else if ((c.adelanto || 0) > 0 || (c.fechaAdel && c.fechaAdel.trim())) {
    adelantos.push({ monto: c.adelanto || 0, modalidad: c.modalAdel || "", recibio: c.recibioAdel || "", fecha: c.fechaAdel || "", enCaja: c.enCajaAdel || false, noTrack: false })
  }

  const cobros = []
  if (c.noTrackCobro) {
    cobros.push({ monto: 0, modalidad: "", recibio: "", fecha: "", enCaja: false, noTrack: true })
  } else if ((c.cobro || 0) > 0 || (c.fechaCobro && c.fechaCobro.trim())) {
    cobros.push({ monto: c.cobro || 0, modalidad: c.modalCobro || "", recibio: c.recibioCobro || "", fecha: c.fechaCobro || "", enCaja: c.enCajaCobro || false, noTrack: false })
  }

  const { adelanto, modalAdel, recibioAdel, fechaAdel, enCajaAdel, noTrackAdel,
          cobro, modalCobro, recibioCobro, fechaCobro, enCajaCobro, noTrackCobro,
          ...rest } = c
  return { ...rest, adelantos, cobros }
}

// Fill empty dates on payments with the contract's home date so they
// appear in the correct period for reconciliation. Called once at load.
export function fillMissingPaymentDates(c) {
  const home = getContractHomeDate(c)
  if (!home) return c
  let changed = false
  const adelantos = (c.adelantos || []).map(a => {
    if (!a.noTrack && a.monto > 0 && !a.fecha) { changed = true; return { ...a, fecha: home } }
    return a
  })
  const cobros = (c.cobros || []).map(a => {
    if (!a.noTrack && a.monto > 0 && !a.fecha) { changed = true; return { ...a, fecha: home } }
    return a
  })
  return changed ? { ...c, adelantos, cobros } : c
}

export function getContractHomeDate(c) {
  const firstAdel = (c.adelantos || []).find(a => !a.noTrack && a.fecha && a.fecha.trim())
  if (firstAdel) return firstAdel.fecha
  const firstCobro = (c.cobros || []).find(a => !a.noTrack && a.fecha && a.fecha.trim())
  return firstCobro?.fecha || null
}

// ── Contract math ────────────────────────────────────────────────────────
// Single source of truth for the derived numbers of one contract.
// Supports both old scalar format and new arrays format.
export function calcContract(c) {
  // Cancelled contract: only the retained amount counts as ganancia.
  // Everything else is 0. Caja movements are handled manually by the owner.
  if (c.cancelado) {
    const retenido = c.cancelInfo?.montoRetenido || 0
    return {
      precioFinal: retenido, porCobrar: 0, pendiente: 0, ganancia: retenido,
      enCaja: retenido, porRecibir: 0, exceso: 0,
      estado: "Cancelado",
    }
  }

  const totalAdel = Array.isArray(c.adelantos)
    ? c.adelantos.reduce((s, a) => s + (a.monto || 0), 0)
    : (c.adelanto || 0)
  const totalCobro = Array.isArray(c.cobros)
    ? c.cobros.reduce((s, a) => s + (a.monto || 0), 0)
    : (c.cobro || 0)

  // descuento = rebaja al cliente (reduce lo que paga)
  // gastos = costos para cumplir el contrato (reduce tu ganancia, no lo que el cliente paga)
  const precioFinal = (c.total || 0) - (c.descuento || 0)
  const gastos = c.gastos || 0
  const totalPagado = totalAdel + totalCobro
  const excedente = Math.max(0, totalPagado - precioFinal)
  const ganancia = precioFinal - gastos + excedente
  const porCobrar = Math.max(0, precioFinal - totalAdel)
  const pendiente = Math.max(0, porCobrar - totalCobro)
  const exceso = excedente

  let enCajaAdel, enCajaCobro
  if (Array.isArray(c.adelantos)) {
    enCajaAdel = c.adelantos.reduce((s, a) => s + (a.enCaja ? (a.monto || 0) : 0), 0)
  } else {
    enCajaAdel = c.enCajaAdel ? (c.adelanto || 0) : 0
  }
  if (Array.isArray(c.cobros)) {
    enCajaCobro = c.cobros.reduce((s, a) => s + (a.enCaja ? (a.monto || 0) : 0), 0)
  } else {
    enCajaCobro = c.enCajaCobro ? (c.cobro || 0) : 0
  }

  // enCaja puede ser negativo si gastos > pagos — refleja contratos con pérdida real
  const enCaja = enCajaAdel + enCajaCobro - gastos
  const porRecibir = ganancia - enCaja
  const estado = c.eliminado ? "Eliminado" : pendiente === 0 && c.total > 0 ? "Pagado" : "Pendiente"
  return { precioFinal, porCobrar, pendiente, ganancia, enCaja, porRecibir, exceso, estado }
}
