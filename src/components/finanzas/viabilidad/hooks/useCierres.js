import { useState, useEffect, useCallback } from "react"
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

// Match by real date (ISO week or month number).
// Returns { week, year } or null so we can filter by both.
function getContractDate(c) {
  const dateStr = (!c.noTrackAdel && c.fechaAdel && c.fechaAdel.trim()) ? c.fechaAdel : c.fechaCobro
  const d = parseLocalDate(dateStr)
  if (!d) return null
  return { week: getWeekNumberISO(d), month: d.getMonth() + 1, year: d.getFullYear() }
}
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

  // Auto-close past weeks using the live snapshots of Contratos + Caja.
  useEffect(() => {
    if (!loaded || !calc || !contracts.length) return

    const existing = new Set(
      cierres.filter(c => c.tipo === "semana" && c.anio === currentYear).map(c => c.periodo)
    )

    const startWeek = Math.max(1, currentWeek - 4)
    const needsClose = []
    for (let w = startWeek; w < currentWeek; w++) {
      if (!existing.has(w)) needsClose.push(w)
    }
    if (needsClose.length === 0) return

    const gastoSemanal = calc.gastoNetoSemanal || 0

    const doClose = async () => {
      for (const w of needsClose) {
        // Filter contracts by real date + year
        let ganancia = 0, enCaja = 0
        contracts.forEach(c => {
          if (c.eliminado) return
          const cd = getContractDate(c)
          if (!cd || cd.year !== currentYear || cd.week !== w) return
          const cc = calcContract(c)
          ganancia += cc.ganancia
          enCaja += cc.enCaja
        })

        // Filter caja entries by real date + year
        let cajaIng = 0, cajaEgr = 0
        cajaEntries.forEach(e => {
          if (e.eliminado) return
          if (e.delNegocio === false) return
          const ed = getEntryDate(e)
          if (!ed || ed.year !== currentYear || ed.week !== w) return
          if (e.tipo === "ingreso") cajaIng += e.monto || 0
          else if (e.tipo === "egreso") cajaEgr += e.monto || 0
        })

        const libre = enCaja - gastoSemanal

        try {
          await upsertCierre({
            tipo: "semana",
            periodo: w,
            anio: currentYear,
            data: { ganancia, enCaja, gastoSemanal, libre, cajaIngresos: cajaIng, cajaEgresos: cajaEgr, cajaBalance: cajaIng - cajaEgr },
            viable: libre >= 0,
            nota: "",
          })
        } catch (e) { logError("cierres.autoClose", e) }
      }

      try {
        const fresh = await loadCierres()
        setCierres(fresh || [])
      } catch (e) { logError("cierres.reload", e) }
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
