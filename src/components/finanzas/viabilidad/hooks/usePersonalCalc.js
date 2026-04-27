import { useMemo } from "react"
import { isActiveOnDate, getRecordStatus, getMarcasMes } from "../../../../lib/finanzas/helpers"

// Cálculos por trabajador + total + costo diario vigente en refDate.
// Se calcula sobre los días en que el trabajador estuvo activo (historial).
export function usePersonalCalc({ workers, calendarDays, effectiveTracker, year, month, refDate }) {
  const workersCalc = useMemo(() => {
    return workers.map(w => {
      if (!w.name) return { ...w, descMes: 0, diasProj: 0, diasReales: 0, costoDiario: 0, costoMesProj: 0, costoMesReal: 0, extrasNo: 0, extrasWork: 0, extrasTienda: 0, activeDays: 0, isActiveInMonth: false, status: { active: true, label: "", tone: "zinc" } }

      const activeCalendarDays = calendarDays.filter(d => isActiveOnDate(w, new Date(year, month - 1, d.dia)))
      const activeDayNums = new Set(activeCalendarDays.map(d => d.dia))
      const isActiveInMonth = activeCalendarDays.length > 0

      const descMes = w.diaDescanso ? activeCalendarDays.filter(d => d.nombre === w.diaDescanso).length : 0
      const feriadosNoDescanso = activeCalendarDays.filter(d => effectiveTracker[d.dia] === "Feriado" && d.nombre !== w.diaDescanso).length
      const diasProj = Math.max(0, activeCalendarDays.length - descMes - feriadosNoDescanso)

      const marcas = getMarcasMes(w, year, month)
      const countMarks = (value) => Object.entries(marcas).filter(([dia, v]) => v === value && activeDayNums.has(Number(dia))).length
      const extrasNo = (w.extrasNoTrabajo || 0) + countMarks("noVino")
      const extrasWork = (w.extrasTrabajoExtra || 0) + countMarks("trabajo")
      const extrasTienda = (w.extrasTrabajoTienda || 0) + countMarks("tienda")
      const diasReales = Math.max(0, diasProj - extrasNo + extrasWork + extrasTienda)
      const costoDiario = (w.pagoSemanal && w.diasTrabSem && w.diasTrabSem > 0) ? w.pagoSemanal / w.diasTrabSem : 0
      const costoMesProj = costoDiario * diasProj
      const costoMesReal = costoDiario * diasReales

      const status = getRecordStatus(w, year, month)

      return { ...w, descMes, diasProj, diasReales, costoDiario, costoMesProj, costoMesReal, extrasNo, extrasWork, extrasTienda, activeDays: activeCalendarDays.length, isActiveInMonth, status }
    })
  }, [workers, calendarDays, effectiveTracker, year, month])

  const totalPersonal = useMemo(() => {
    // Solo sumamos los que tuvieron al menos un día activo este mes.
    // Un trabajador inactivo todo el mes no debe cargar su pagoSemanal al presupuesto.
    const active = workersCalc.filter(w => w.name && w.isActiveInMonth)
    return {
      pagoSemanal: active.reduce((s, w) => s + w.pagoSemanal, 0),
      descMes: active.reduce((s, w) => s + w.descMes, 0),
      extrasNo: active.reduce((s, w) => s + w.extrasNo, 0),
      diasProj: active.reduce((s, w) => s + w.diasProj, 0),
      diasReales: active.reduce((s, w) => s + w.diasReales, 0),
      costoDiario: active.reduce((s, w) => s + w.costoDiario, 0),
      costoMesProj: active.reduce((s, w) => s + w.costoMesProj, 0),
      costoMesReal: active.reduce((s, w) => s + w.costoMesReal, 0),
      extrasWork: active.reduce((s, w) => s + w.extrasWork, 0),
      extrasTienda: active.reduce((s, w) => s + w.extrasTienda, 0),
    }
  }, [workersCalc])

  const costoDiarioPersonal = useMemo(() => {
    return workersCalc
      .filter(w => w.name && isActiveOnDate(w, refDate))
      .reduce((s, w) => s + w.costoDiario, 0)
  }, [workersCalc, refDate])

  return { workersCalc, totalPersonal, costoDiarioPersonal }
}
