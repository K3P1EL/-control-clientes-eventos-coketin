import { useMemo } from "react"
import { calcContract, parseLocalDate, getWeekNumberISO } from "../../../../lib/finanzas/helpers"

// Computes the cross-module reconciliation between Contratos and Caja:
//
//   esperadoContrato = Σ calcContract(c).enCaja for active contracts in period
//   realCaja         = Σ ingresos del contrato − Σ egresos del contrato
//                       (active entries marked deNegocio + deContrato in period)
//
// If the two match, everything is consistent. If not, the difference is
// either money the workers reported but you haven't deposited yet, or
// money you deposited that no contract claims (rare).
//
// `period` is { type: "semana"|"mes"|null, value: number|null }. null
// means "all time". The same period filter that the table is using.
export function useReconciliation(contracts, entries, period) {
  return useMemo(() => {
    // ── Esperado: what Contratos says is "en caja" ──────────────────
    const inPeriodContract = (c) => {
      if (!period || !period.type) return true
      // Contract's "home date" is fechaAdel (or fechaCobro if no adel)
      const dateStr = (!c.noTrackAdel && c.fechaAdel && c.fechaAdel !== "no trackeado" && c.fechaAdel.trim()) ? c.fechaAdel : c.fechaCobro
      const d = parseLocalDate(dateStr)
      if (!d) return false
      if (period.type === "semana") return getWeekNumberISO(d) === period.value
      if (period.type === "mes") return (d.getMonth() + 1) === period.value
      return true
    }

    let esperado = 0
    let contratosCount = 0
    contracts.forEach(c => {
      if (c.eliminado) return
      if (!inPeriodContract(c)) return
      const calc = calcContract(c)
      esperado += calc.enCaja
      contratosCount++
    })

    // ── Real: what Caja actually has flagged as "del contrato" ──────
    const inPeriodEntry = (e) => {
      if (!period || !period.type) return true
      if (!e.fecha) return false
      const d = parseLocalDate(e.fecha)
      if (!d) return false
      if (period.type === "semana") return getWeekNumberISO(d) === period.value
      if (period.type === "mes") return (d.getMonth() + 1) === period.value
      return true
    }

    let real = 0
    let entriesCount = 0
    entries.forEach(e => {
      if (e.eliminado) return
      if (e.delNegocio === false) return
      if (!e.deContrato) return
      if (!inPeriodEntry(e)) return
      const m = e.monto || 0
      if (e.tipo === "ingreso") real += m
      else if (e.tipo === "egreso") real -= m
      entriesCount++
    })

    const diff = real - esperado
    // Tolerate 0.01 sol of float drift.
    const matches = Math.abs(diff) < 0.01

    return { esperado, real, diff, matches, contratosCount, entriesCount }
  }, [contracts, entries, period])
}
