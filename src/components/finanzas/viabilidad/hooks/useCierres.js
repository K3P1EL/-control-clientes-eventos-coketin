import { useState, useEffect, useCallback, useRef } from "react"
import { loadCierres, upsertCierre, deleteCierre } from "../../../../services/finanzas"
import { peruNow, getWeekNumberISO, parseLocalDate, calcContract } from "../../../../lib/finanzas/helpers"
import { logError } from "../../../../lib/logger"
import { useContratosSnapshot } from "../../caja/hooks/useContratosSnapshot"

// Use the same lightweight caja snapshot pattern
import { loadCaja } from "../../../../services/finanzas"
import { getJSON } from "../../../../lib/storage"
import { STORAGE_KEYS } from "../../../../lib/finanzas/constants"

function useCajaSnapshot() {
  const [entries, setEntries] = useState(() => {
    const local = getJSON(STORAGE_KEYS.CAJA)
    return Array.isArray(local) ? local : []
  })
  useEffect(() => {
    loadCaja()
      .then(cloud => { if (Array.isArray(cloud)) setEntries(cloud) })
      .catch(() => {})
  }, [])
  return entries
}

// Caja entries use real dates for week/month (same as CajaModule).
function getEntryDate(e) {
  if (!e.fecha) return null
  const d = parseLocalDate(e.fecha)
  if (!d) return null
  return { week: getWeekNumberISO(d), month: d.getMonth() + 1, year: d.getFullYear() }
}

export function useCierres(calc) {
  const [cierres, setCierres] = useState([])
  const [loaded, setLoaded] = useState(false)
  const contracts = useContratosSnapshot()
  const cajaEntries = useCajaSnapshot()

  const now = peruNow()
  const currentWeek = getWeekNumberISO(now)
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  useEffect(() => {
    loadCierres()
      .then(data => { setCierres(data || []); setLoaded(true) })
      .catch(e => { logError("cierres.load", e); setLoaded(true) })
  }, [])

  // Keep a ref to calc so the effect reads fresh values without
  // re-triggering on every calc change (which would cause loops).
  const calcRef = useRef(calc)
  calcRef.current = calc

  // Auto-close past periods.
  // - Contratos/caja = always recalculated (they're facts that can be corrected)
  // - Gastos = frozen at first close (config changes shouldn't alter history)
  //
  // If a cierre already exists, we recalculate ganancia/enCaja/caja* from
  // live data but keep the original gastoSemanal/gastoMes. For new cierres
  // we use the current calc values.
  useEffect(() => {
    const c = calcRef.current
    if (!loaded || !c || !contracts.length) return

    // Index existing cierres by period for quick lookup
    const existingSemMap = new Map()
    const existingMesMap = new Map()
    cierres.forEach(x => {
      if (x.anio !== currentYear) return
      if (x.tipo === "semana") existingSemMap.set(x.periodo, x)
      if (x.tipo === "mes") existingMesMap.set(x.periodo, x)
    })

    const startWeek = Math.max(1, currentWeek - 4)
    const weeks = []
    for (let w = startWeek; w < currentWeek; w++) weeks.push(w)

    const months = []
    for (let m = 1; m < currentMonth; m++) months.push(m)

    if (weeks.length === 0 && months.length === 0) return

    const currentGastoSemanal = c.gastoNetoSemanal || 0
    const currentGastoMes = c.gastoRealMes || 0
    const currentApoyoSemanal = c.apoyoSemanal || 0
    const currentApoyoMes = c.apoyoMes || 0

    const doClose = async () => {
      let changed = false

      // ── Weekly cierres ──
      for (const w of weeks) {
        let ganancia = 0, enCaja = 0, hasContracts = false
        contracts.forEach(c => {
          if (c.eliminado) return
          if ((c.anio || currentYear) !== currentYear) return
          if (c.semana !== w) return
          hasContracts = true
          const cc = calcContract(c)
          ganancia += cc.ganancia
          enCaja += cc.enCaja
        })

        let cajaIng = 0, cajaEgr = 0, hasCaja = false
        cajaEntries.forEach(e => {
          if (e.eliminado) return
          if (e.delNegocio === false) return
          const ed = getEntryDate(e)
          if (!ed || ed.year !== currentYear || ed.week !== w) return
          hasCaja = true
          if (e.tipo === "ingreso") cajaIng += e.monto || 0
          else if (e.tipo === "egreso") cajaEgr += e.monto || 0
        })

        if (!hasContracts && !hasCaja) continue

        // Freeze gastos + apoyo: use stored value if cierre exists, otherwise current
        const existing = existingSemMap.get(w)
        const gastoSemanal = existing?.data?.gastoSemanal ?? currentGastoSemanal
        const apoyo = existing?.data?.apoyo ?? currentApoyoSemanal
        const libre = enCaja - gastoSemanal

        try {
          await upsertCierre({
            tipo: "semana", periodo: w, anio: currentYear,
            data: { ganancia, enCaja, gastoSemanal, apoyo, libre, cajaIngresos: cajaIng, cajaEgresos: cajaEgr, cajaBalance: cajaIng - cajaEgr },
            viable: libre >= 0, nota: existing?.nota || "",
          })
          changed = true
        } catch (e) { logError("cierres.autoClose", e) }
      }

      // ── Monthly cierres ──
      for (const m of months) {
        let ganancia = 0, enCaja = 0, hasContracts = false
        contracts.forEach(c => {
          if (c.eliminado) return
          if ((c.anio || currentYear) !== currentYear) return
          if (c.mes !== m) return
          hasContracts = true
          const cc = calcContract(c)
          ganancia += cc.ganancia
          enCaja += cc.enCaja
        })

        let cajaIng = 0, cajaEgr = 0, hasCaja = false
        cajaEntries.forEach(e => {
          if (e.eliminado) return
          if (e.delNegocio === false) return
          const ed = getEntryDate(e)
          if (!ed || ed.year !== currentYear || ed.month !== m) return
          hasCaja = true
          if (e.tipo === "ingreso") cajaIng += e.monto || 0
          else if (e.tipo === "egreso") cajaEgr += e.monto || 0
        })

        if (!hasContracts && !hasCaja) continue

        const existing = existingMesMap.get(m)
        const gastoMes = existing?.data?.gastoMes ?? currentGastoMes
        const apoyo = existing?.data?.apoyo ?? currentApoyoMes
        const libre = enCaja - gastoMes

        try {
          await upsertCierre({
            tipo: "mes", periodo: m, anio: currentYear,
            data: { ganancia, enCaja, gastoMes, apoyo, libre, cajaIngresos: cajaIng, cajaEgresos: cajaEgr, cajaBalance: cajaIng - cajaEgr },
            viable: libre >= 0, nota: existing?.nota || "",
          })
          changed = true
        } catch (e) { logError("cierres.autoClose", e) }
      }

      if (changed) {
        try {
          const fresh = await loadCierres()
          setCierres(fresh || [])
        } catch (e) { logError("cierres.reload", e) }
      }
    }

    doClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, contracts.length])

  const saveCierre = useCallback(async (cierre) => {
    try {
      await upsertCierre(cierre)
      setCierres(prev => {
        const exists = prev.find(c => c.tipo === cierre.tipo && c.periodo === cierre.periodo && c.anio === cierre.anio)
        if (exists) return prev.map(c => (c.tipo === cierre.tipo && c.periodo === cierre.periodo && c.anio === cierre.anio) ? { ...c, ...cierre } : c)
        return [...prev, cierre]
      })
    } catch (e) { logError("cierres.save", e); alert("Error guardando cierre") }
  }, [])

  const removeCierre = useCallback(async (id) => {
    try { await deleteCierre(id); setCierres(prev => prev.filter(c => c.id !== id)) }
    catch (e) { logError("cierres.delete", e); alert("Error eliminando cierre") }
  }, [])

  return { cierres, loaded, saveCierre, removeCierre, currentWeek, currentMonth, currentYear }
}
