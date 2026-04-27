import { useMemo } from "react"
import { parseLocalDate, getWeekNumberISO, getISOYear, getGastosTotal } from "../../../../lib/finanzas/helpers"

// Computes the cross-module reconciliation between Contratos and Caja.
//
// IMPORTANT BUSINESS CONTEXT: Contratos and Caja are filled by DIFFERENT
// people. Contratos = what employees report they collected. Caja = what
// the owner actually received. They are NOT expected to match perfectly.
// The difference is a control tool: "my employee says they collected
// S/300 but I only got S/190 — where are the other S/110?"
//
// Key insight: a single contract can have its adelanto in one month and
// its cobro in another (e.g. adelanto 31-mar, cobro 01-abr). The old
// approach assigned the ENTIRE `enCaja` to whichever month the "home
// date" fell in, which caused false mismatches on month boundaries.
//
// New approach: split each contract into TWO date-specific amounts —
// the adelanto and the cobro — and check each one's date independently
// against the period. This mirrors exactly what the user does when they
// create two separate entries in Caja for the same contract.
//
// `period` is { type: "semana"|"mes"|null, value: number|null, year: number|null }.
// null type means "all time". `year` filtra por año (calendar para mes,
// ISO para semana). Si no se pasa, no se filtra por año.
export function useReconciliation(contracts, entries, period) {
  return useMemo(() => {
    const dateInPeriod = (dateStr) => {
      if (!period || !period.type) return true
      const d = parseLocalDate(dateStr)
      if (!d) return false
      if (period.type === "semana") {
        if (getWeekNumberISO(d) !== period.value) return false
        if (period.year != null) {
          const isoY = getISOYear(d)
          // Tolerancia de ±1 año para sem 53 / sem 1 que cruzan año.
          return isoY === period.year || isoY === period.year - 1 || isoY === period.year + 1
        }
        return true
      }
      if (period.type === "mes") {
        if ((d.getMonth() + 1) !== period.value) return false
        if (period.year != null && d.getFullYear() !== period.year) return false
        return true
      }
      return true
    }

    // ── Esperado: sum up each adelanto/cobro entry by its own date ──
    let esperado = 0
    let contratosCount = 0
    contracts.forEach(c => {
      if (c.eliminado) return
      if (c.cancelado) return // cancelled contracts don't count for reconciliation
      let contributed = false

      // Adelantos: each entry has its own date
      ;(c.adelantos || []).forEach(a => {
        if (a.noTrack || !a.enCaja) return
        const adelDate = (a.fecha && a.fecha.trim()) ? a.fecha : (c.cobros || []).find(cb => cb.fecha)?.fecha || ""
        if (dateInPeriod(adelDate)) {
          esperado += (a.monto || 0)
          contributed = true
        }
      })

      // Cobros: each entry has its own date
      ;(c.cobros || []).forEach(a => {
        if (a.noTrack || !a.enCaja) return
        if (dateInPeriod(a.fecha)) {
          esperado += (a.monto || 0)
          contributed = true
        }
      })

      // Gastos: costs to fulfill the contract (reduces what's in caja).
      // Descuento reduces the client price but doesn't take money out of caja.
      // Con array de gastos, cada uno puede tener su propia fecha: se aplican
      // los que caen en el período. Fallback a home date si un gasto no la tiene.
      if (Array.isArray(c.gastos)) {
        const lastCobro = (c.cobros || []).filter(a => a.fecha).slice(-1)[0]
        const firstAdel = (c.adelantos || []).filter(a => a.fecha)[0]
        const homeDate = lastCobro?.fecha || firstAdel?.fecha || ""
        c.gastos.forEach(g => {
          if (!g || !(g.monto > 0)) return
          const gDate = g.fecha || homeDate
          if (dateInPeriod(gDate)) {
            esperado -= g.monto
            contributed = true
          }
        })
      } else {
        const totalGastos = getGastosTotal(c)
        if (totalGastos > 0) {
          const lastCobro = (c.cobros || []).filter(a => a.fecha).slice(-1)[0]
          const firstAdel = (c.adelantos || []).filter(a => a.fecha)[0]
          const gastosDate = lastCobro?.fecha || firstAdel?.fecha || ""
          if (dateInPeriod(gastosDate)) {
            esperado -= totalGastos
            contributed = true
          }
        }
      }

      if (contributed) contratosCount++
    })

    // ── Real: what Caja actually has flagged as "del contrato" ──────
    let real = 0
    let entriesCount = 0
    entries.forEach(e => {
      if (e.eliminado) return
      if (e.delNegocio === false) return
      if (e.gastoAjeno) return // simétrico con cierres — no entra en reconciliación
      if (!e.deContrato) return
      if (!dateInPeriod(e.fecha)) return
      const m = e.monto || 0
      if (e.tipo === "ingreso") real += m
      else if (e.tipo === "egreso") real -= m
      entriesCount++
    })

    const diff = real - esperado
    const matches = Math.abs(diff) < 0.01

    return { esperado, real, diff, matches, contratosCount, entriesCount }
  }, [contracts, entries, period])
}
