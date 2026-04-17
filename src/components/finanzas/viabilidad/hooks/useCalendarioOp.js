import { useMemo } from "react"
import { DIAS_SEMANA } from "../../../../lib/finanzas/constants"
import { getDaysInMonth, getDayName, getWeekNumberCal, peruNow, isActiveOnDate } from "../../../../lib/finanzas/helpers"

// Calendario + tracker efectivo + resúmenes de descanso.
// No depende de workersCalc/servicesCalc/apoyosCalc — es el primer eslabón.
export function useCalendarioOp({ year, month, workers, tracker, cobExtra }) {
  const cobExtraDias = cobExtra?.dias || 0

  const diasCalendario = useMemo(() => getDaysInMonth(year, month), [year, month])

  const calendarDays = useMemo(() => {
    const arr = []
    for (let d = 1; d <= diasCalendario; d++) {
      arr.push({ dia: d, nombre: getDayName(year, month, d), semana: getWeekNumberCal(year, month, d) })
    }
    return arr
  }, [year, month, diasCalendario])

  // Operating-day baseline = calendar days - boss-rest days - holidays/closed
  // + days an employee covered the shop on a normal closed day + cobertura extra.
  const diasOpBase = useMemo(() => {
    const essentialWorkers = workers.filter(w => w.name && w.negocioDepende && w.diaDescanso)
    const diasDescansoEncargado = calendarDays.filter(d => {
      const fecha = new Date(year, month - 1, d.dia)
      return essentialWorkers.some(w => w.diaDescanso === d.nombre && isActiveOnDate(w, fecha))
    }).length
    const diasFeriadoCerrado = calendarDays.filter(d => {
      if (tracker[d.dia] !== "Feriado" && tracker[d.dia] !== "Cerrado") return false
      const fecha = new Date(year, month - 1, d.dia)
      const esDescansoEncargado = essentialWorkers.some(w => w.diaDescanso === d.nombre && isActiveOnDate(w, fecha))
      return !esDescansoEncargado
    }).length
    const diasAbiertosExtra = new Set()
    workers.forEach(w => {
      if (!w.name || !w.diasMarcados) return
      Object.entries(w.diasMarcados).forEach(([dia, marca]) => {
        if (marca !== "tienda") return
        const fecha = new Date(year, month - 1, Number(dia))
        if (isActiveOnDate(w, fecha)) diasAbiertosExtra.add(Number(dia))
      })
    })
    return diasCalendario - diasDescansoEncargado - diasFeriadoCerrado + diasAbiertosExtra.size + cobExtraDias
  }, [workers, calendarDays, diasCalendario, cobExtraDias, tracker, year, month])

  // For days the user hasn't manually marked: assume "Operó" for past days
  // (or "Descanso" if it's the boss's rest day) and leave future days blank.
  const effectiveTracker = useMemo(() => {
    const encargado = workers.find(w => w.name && w.negocioDepende && w.diaDescanso)
    const hoy = peruNow()
    const tomorrow = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1)
    const result = {}
    calendarDays.forEach(d => {
      if (tracker[d.dia]) {
        result[d.dia] = tracker[d.dia]
      } else {
        const fecha = new Date(year, month - 1, d.dia)
        const esPasado = fecha < tomorrow
        if (!esPasado) { /* leave blank */ }
        else if (encargado && d.nombre === encargado.diaDescanso && isActiveOnDate(encargado, fecha)) {
          result[d.dia] = "Descanso"
        }
        else { result[d.dia] = "Operó" }
      }
    })
    return result
  }, [calendarDays, tracker, workers, year, month])

  const diasOperados = useMemo(() => calendarDays.filter(d => effectiveTracker[d.dia] === "Operó").length, [calendarDays, effectiveTracker])
  const diasDescansosCerrados = useMemo(() => calendarDays.filter(d => ["Descanso", "Feriado", "Cerrado"].includes(effectiveTracker[d.dia])).length, [calendarDays, effectiveTracker])

  const descansosProyectados = useMemo(() => {
    const encargado = workers.find(w => w.name && w.negocioDepende && w.diaDescanso)
    const diaDesc = encargado ? encargado.diaDescanso : null
    const descPorDescanso = diaDesc ? calendarDays.filter(d => {
      if (d.nombre !== diaDesc) return false
      return isActiveOnDate(encargado, new Date(year, month - 1, d.dia))
    }).length : 0
    const feriadosCerrados = calendarDays.filter(d => {
      const t = tracker[d.dia]
      return (t === "Feriado" || t === "Cerrado") && d.nombre !== diaDesc
    }).length
    return { total: descPorDescanso + feriadosCerrados, dia: diaDesc, descPorDescanso, feriadosCerrados }
  }, [workers, calendarDays, tracker, year, month])

  const resumenDescansos = useMemo(() => {
    return DIAS_SEMANA.slice(1).concat(DIAS_SEMANA.slice(0, 1)).map(dia => {
      const diasOfWeekday = calendarDays.filter(d => d.nombre === dia)
      let trabCount = 0
      let total = 0
      workers.forEach(w => {
        if (!w.name || w.diaDescanso !== dia) return
        const activos = diasOfWeekday.filter(d => isActiveOnDate(w, new Date(year, month - 1, d.dia)))
        if (activos.length > 0) trabCount++
        total += activos.length
      })
      return { dia, trabajadores: trabCount, vecesMes: diasOfWeekday.length, descansosProyectados: total }
    })
  }, [workers, calendarDays, year, month])

  return {
    diasCalendario, calendarDays, diasOpBase, effectiveTracker,
    diasOperados, diasDescansosCerrados, descansosProyectados, resumenDescansos,
  }
}
