import { useState, useEffect, useCallback } from "react"
import { loadCierres, upsertCierre, deleteCierre } from "../../../../services/finanzas"
import { peruNow, getWeekNumberISO } from "../../../../lib/finanzas/helpers"
import { logError } from "../../../../lib/logger"

// Owns the cierre history — loads from Supabase on mount, auto-generates
// cierres for past weeks/months that don't have one yet.
//
// A "cierre" is a frozen snapshot of the key numbers for one week or
// month. The current (incomplete) week/month is NOT closed — it shows
// as "en proceso" in the UI.
export function useCierres(calc) {
  const [cierres, setCierres] = useState([])
  const [loaded, setLoaded] = useState(false)

  const now = peruNow()
  const currentWeek = getWeekNumberISO(now)
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Load existing cierres from Supabase.
  useEffect(() => {
    loadCierres()
      .then(data => { setCierres(data || []); setLoaded(true) })
      .catch(e => { logError("cierres.load", e); setLoaded(true) })
  }, [])

  // Auto-close past weeks that don't have a cierre yet.
  // Runs once after cierres are loaded AND calc data is available.
  // Only creates cierres for weeks < currentWeek in the current year.
  const autoClose = useCallback(async () => {
    if (!loaded || !calc) return

    const existing = new Set(
      cierres.filter(c => c.tipo === "semana" && c.anio === currentYear).map(c => c.periodo)
    )

    // Only auto-close the last 4 weeks max to avoid flooding on first load.
    const startWeek = Math.max(1, currentWeek - 4)
    const toClose = []

    for (let w = startWeek; w < currentWeek; w++) {
      if (existing.has(w)) continue
      toClose.push({
        tipo: "semana",
        periodo: w,
        anio: currentYear,
        data: {
          ganancia: calc.costoMesReal, // placeholder — the real data comes from Contratos/Caja snapshots
          gastoNeto: calc.gastoNetoSemanal || 0,
          costoDiarioBruto: calc.costoDiarioBruto || 0,
          metaDiaria: calc.metaMinimaBase || 0,
          diasOperados: calc.diasOperados || 0,
          costoPersonal: calc.costoDiarioPersonal || 0,
          costoServicios: calc.costoDiarioServicios || 0,
          apoyoDiario: calc.apoyoDiarioExt || 0,
        },
        viable: (calc.cajaLibreSemana || 0) >= 0,
        nota: "",
      })
    }

    if (toClose.length === 0) return

    for (const cierre of toClose) {
      try {
        await upsertCierre(cierre)
      } catch (e) {
        logError("cierres.autoClose", e)
      }
    }

    // Reload after auto-close.
    try {
      const fresh = await loadCierres()
      setCierres(fresh || [])
    } catch (e) {
      logError("cierres.reload", e)
    }
  }, [loaded, calc, cierres, currentWeek, currentYear])

  useEffect(() => { autoClose() }, [loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // Manual save (for editing notes or overriding viability).
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
