import { useState, useEffect, useCallback } from "react"
import { loadCierres, upsertCierre, deleteCierre } from "../../../../services/finanzas"
import { loadContratos } from "../../../../services/finanzas"
import { loadCaja } from "../../../../services/finanzas"
import { peruNow, getWeekNumberISO, parseLocalDate, calcContract } from "../../../../lib/finanzas/helpers"
import { getJSON } from "../../../../lib/storage"
import { STORAGE_KEYS } from "../../../../lib/finanzas/constants"
import { logError } from "../../../../lib/logger"

// Calculates real ganancia/enCaja from contracts for a specific week or month.
// Uses the contract's REAL DATE (fechaAdel or fechaCobro) instead of the
// manual semana/mes buckets, because those buckets are often the same for
// all contracts and don't distinguish between real weeks.
function calcContratosForPeriod(contracts, tipo, periodo, year) {
  let ganancia = 0, enCaja = 0
  ;(contracts || []).forEach(c => {
    if (c.eliminado) return
    // Determine the contract's "home date" from its actual dates.
    const dateStr = (!c.noTrackAdel && c.fechaAdel && c.fechaAdel.trim()) ? c.fechaAdel : c.fechaCobro
    const d = parseLocalDate(dateStr)
    if (!d) return
    if (d.getFullYear() !== year) return

    let match = false
    if (tipo === "semana") match = getWeekNumberISO(d) === periodo
    else if (tipo === "mes") match = (d.getMonth() + 1) === periodo

    if (match) {
      const calc = calcContract(c)
      ganancia += calc.ganancia
      enCaja += calc.enCaja
    }
  })
  return { ganancia, enCaja }
}

// Calculates real ingresos/egresos from caja entries for a specific week or month.
function calcCajaForPeriod(entries, tipo, periodo) {
  let ingresos = 0, egresos = 0
  ;(entries || []).forEach(e => {
    if (e.eliminado) return
    if (e.delNegocio === false) return
    if (!e.fecha) return
    const d = parseLocalDate(e.fecha)
    if (!d) return
    let match = false
    if (tipo === "semana") match = getWeekNumberISO(d) === periodo
    else if (tipo === "mes") match = (d.getMonth() + 1) === periodo
    if (!match) return
    if (e.tipo === "ingreso") ingresos += e.monto || 0
    else if (e.tipo === "egreso") egresos += e.monto || 0
  })
  return { ingresos, egresos, balance: ingresos - egresos }
}

// Owns the cierre history — loads from Supabase on mount, auto-generates
// cierres for past weeks that don't have one yet using REAL data from
// Contratos and Caja (not the calculator inputs).
export function useCierres(calc) {
  const [cierres, setCierres] = useState([])
  const [loaded, setLoaded] = useState(false)

  const now = peruNow()
  const currentWeek = getWeekNumberISO(now)
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  useEffect(() => {
    loadCierres()
      .then(data => { setCierres(data || []); setLoaded(true) })
      .catch(e => { logError("cierres.load", e); setLoaded(true) })
  }, [])

  // Auto-close past weeks using real Contratos + Caja data.
  const autoClose = useCallback(async () => {
    if (!loaded || !calc) return

    const existing = new Set(
      cierres.filter(c => c.tipo === "semana" && c.anio === currentYear).map(c => c.periodo)
    )

    const startWeek = Math.max(1, currentWeek - 4)
    const needsClose = []
    for (let w = startWeek; w < currentWeek; w++) {
      if (!existing.has(w)) needsClose.push(w)
    }
    if (needsClose.length === 0) return

    // Load real data from Contratos + Caja.
    let contracts = getJSON(STORAGE_KEYS.CONTRATOS) || []
    let cajaEntries = getJSON(STORAGE_KEYS.CAJA) || []
    try {
      const cloud = await loadContratos()
      if (Array.isArray(cloud)) contracts = cloud
    } catch {}
    try {
      const cloud = await loadCaja()
      if (Array.isArray(cloud)) cajaEntries = cloud
    } catch {}

    const gastoSemanal = calc.gastoNetoSemanal || 0
    const gastoMensual = calc.gastoRealMes || 0

    for (const w of needsClose) {
      const ct = calcContratosForPeriod(contracts, "semana", w, currentYear)
      const cj = calcCajaForPeriod(cajaEntries, "semana", w)
      const libre = ct.enCaja - gastoSemanal

      try {
        await upsertCierre({
          tipo: "semana",
          periodo: w,
          anio: currentYear,
          data: {
            ganancia: ct.ganancia,
            enCaja: ct.enCaja,
            gastoSemanal,
            libre,
            cajaIngresos: cj.ingresos,
            cajaEgresos: cj.egresos,
            cajaBalance: cj.balance,
          },
          viable: libre >= 0,
          nota: "",
        })
      } catch (e) {
        logError("cierres.autoClose", e)
      }
    }

    try {
      const fresh = await loadCierres()
      setCierres(fresh || [])
    } catch (e) {
      logError("cierres.reload", e)
    }
  }, [loaded, calc, cierres, currentWeek, currentYear])

  useEffect(() => { autoClose() }, [loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveCierre = useCallback(async (cierre) => {
    try {
      await upsertCierre(cierre)
      setCierres(prev => {
        const exists = prev.find(c => c.tipo === cierre.tipo && c.periodo === cierre.periodo && c.anio === cierre.anio)
        if (exists) return prev.map(c => (c.tipo === cierre.tipo && c.periodo === cierre.periodo && c.anio === cierre.anio) ? { ...c, ...cierre } : c)
        return [...prev, cierre]
      })
    } catch (e) {
      logError("cierres.save", e)
      alert("Error guardando cierre")
    }
  }, [])

  const removeCierre = useCallback(async (id) => {
    try {
      await deleteCierre(id)
      setCierres(prev => prev.filter(c => c.id !== id))
    } catch (e) {
      logError("cierres.delete", e)
      alert("Error eliminando cierre")
    }
  }, [])

  return { cierres, loaded, saveCierre, removeCierre, currentWeek, currentMonth, currentYear }
}
