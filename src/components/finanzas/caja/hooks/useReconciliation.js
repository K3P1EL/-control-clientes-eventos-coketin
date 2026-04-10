import { useMemo } from "react"
import { parseLocalDate, getWeekNumberISO } from "../../../../lib/finanzas/helpers"

// Computes the cross-module reconciliation between Contratos and Caja.
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
// `period` is { type: "semana"|"mes"|null, value: number|null }. null
// means "all time".
export function useReconciliation(contracts, entries, period) {
  return useMemo(() => {
    const dateInPeriod = (dateStr) => {
      if (!period || !period.type) return true
      const d = parseLocalDate(dateStr)
      if (!d) return false
      if (period.type === "semana") return getWeekNumberISO(d) === period.value
      if (period.type === "mes") return (d.getMonth() + 1) === period.value
      return true
    }

    // ── Esperado: sum up adelanto and cobro separately per date ─────
    let esperado = 0
    let contratosCount = 0
    contracts.forEach(c => {
      if (c.eliminado) return
      let contributed = false

      // Adelanto piece: date is fechaAdel
      if (c.enCajaAdel && !c.noTrackAdel) {
        const adelDate = c.fechaAdel && c.fechaAdel.trim() ? c.fechaAdel : c.fechaCobro
        if (dateInPeriod(adelDate)) {
          esperado += (c.adelanto || 0)
          contributed = true
        }
      }

      // Cobro piece: date is fechaCobro
      if (c.enCajaCobro && !c.noTrackCobro) {
        if (dateInPeriod(c.fechaCobro)) {
          esperado += (c.cobro || 0)
          contributed = true
        }
      }

      // Descuento: subtract from the cobro's period (or adelanto if no cobro)
      if (c.descuento > 0) {
        const descDate = c.fechaCobro || c.fechaAdel
        if (dateInPeriod(descDate)) {
          esperado -= (c.descuento || 0)
          contributed = true
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
