import { useMemo, useEffect, useRef } from "react"
import { DIAS_SEMANA } from "../../../../lib/finanzas/constants"
import { getDaysInMonth, getDayName, getWeekNumberCal, peruNow, isActiveOnDate, getMarcasMes, countDiasOperativosMes } from "../../../../lib/finanzas/helpers"

// Calendario + tracker efectivo + resúmenes de descanso.
// No depende de workersCalc/servicesCalc/apoyosCalc — es el primer eslabón.
//
// `tiendaConfig.diasDescansoSemanal` define qué días de la semana la tienda
// NO opera por default. Es independiente de los workers — cambiar de
// encargada o ajustar su descanso personal NO toca el tracker.
export function useCalendarioOp({ year, month, workers, tracker, cobExtra, tiendaConfig, setTrackerData }) {
  const cobExtraDias = cobExtra?.dias || 0
  // useMemo para que la referencia sea estable cuando tiendaConfig no cambia
  // (sino cada render genera un [] nuevo y refresca todos los useMemo de abajo).
  const diasDescansoTienda = useMemo(() => tiendaConfig?.diasDescansoSemanal || [], [tiendaConfig])

  const diasCalendario = useMemo(() => getDaysInMonth(year, month), [year, month])

  const calendarDays = useMemo(() => {
    const arr = []
    for (let d = 1; d <= diasCalendario; d++) {
      arr.push({ dia: d, nombre: getDayName(year, month, d), semana: getWeekNumberCal(year, month, d) })
    }
    return arr
  }, [year, month, diasCalendario])

  // Operating-day baseline = calendar days - tienda rest days - holidays/closed
  // + days an employee covered the shop on a normally-closed day + cobertura extra.
  const diasOpBase = useMemo(() => {
    const diasDescansoTiendaCount = calendarDays.filter(d => diasDescansoTienda.includes(d.nombre)).length
    const diasFeriadoCerrado = calendarDays.filter(d => {
      if (tracker[d.dia] !== "Feriado" && tracker[d.dia] !== "Cerrado") return false
      // No descontar dos veces si ya es descanso de la tienda
      return !diasDescansoTienda.includes(d.nombre)
    }).length
    const diasAbiertosExtra = new Set()
    workers.forEach(w => {
      if (!w.name) return
      const marcas = getMarcasMes(w, year, month)
      Object.entries(marcas).forEach(([dia, marca]) => {
        if (marca !== "tienda") return
        const fecha = new Date(year, month - 1, Number(dia))
        if (isActiveOnDate(w, fecha)) diasAbiertosExtra.add(Number(dia))
      })
    })
    return diasCalendario - diasDescansoTiendaCount - diasFeriadoCerrado + diasAbiertosExtra.size + cobExtraDias
  }, [workers, calendarDays, diasCalendario, cobExtraDias, tracker, year, month, diasDescansoTienda])

  // For days the user hasn't manually marked: assume "Operó" for past days
  // (or "Descanso" if it's a tienda rest day) and leave future days blank.
  // El descanso ahora viene de tiendaConfig, no de un worker — así cambiar
  // de encargada NO reescribe el pasado.
  const effectiveTracker = useMemo(() => {
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
        else if (diasDescansoTienda.includes(d.nombre)) {
          result[d.dia] = "Descanso"
        }
        else { result[d.dia] = "Operó" }
      }
    })
    return result
  }, [calendarDays, tracker, year, month, diasDescansoTienda])

  // Materialización del pasado: una vez que un día pasa, el sistema lo
  // congela como override en trackerData. Así si después cambia el config
  // de la tienda (otro día de descanso, encargada nueva, etc.), los días
  // ya pasados NO se reescriben.
  //
  // Solo congela días pasados SIN override existente. No toca días futuros
  // ni días ya editados manualmente. Idempotente: si todos están materializados
  // no hace nada. Una sola escritura por mes/día que falte materializar.
  const persistRef = useRef(null)
  persistRef.current = setTrackerData
  useEffect(() => {
    if (!setTrackerData) return
    const hoy = peruNow()
    const todayKey = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`
    const pendientes = {}
    calendarDays.forEach(d => {
      if (tracker[d.dia]) return // ya tiene override
      const dayKey = `${year}-${String(month).padStart(2, "0")}-${String(d.dia).padStart(2, "0")}`
      if (dayKey >= todayKey) return // hoy o futuro: no congelar
      pendientes[d.dia] = diasDescansoTienda.includes(d.nombre) ? "Descanso" : "Operó"
    })
    if (Object.keys(pendientes).length === 0) return
    setTrackerData(prev => {
      const key = `${year}-${month}`
      const existing = prev[key] || {}
      const merged = { ...pendientes, ...existing } // overrides existentes ganan
      // Si nada cambió (todo ya estaba), evitamos rerender
      const changed = Object.keys(pendientes).some(k => existing[k] === undefined)
      if (!changed) return prev
      return { ...prev, [key]: merged }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarDays, tracker, year, month, diasDescansoTienda.join(",")])

  const diasOperados = useMemo(() => calendarDays.filter(d => effectiveTracker[d.dia] === "Operó").length, [calendarDays, effectiveTracker])
  const diasDescansosCerrados = useMemo(() => calendarDays.filter(d => ["Descanso", "Feriado", "Cerrado"].includes(effectiveTracker[d.dia])).length, [calendarDays, effectiveTracker])

  // Descansos proyectados del MES = días de descanso default de la tienda
  // + feriados/cerrados manuales que NO caen en un descanso. La etiqueta
  // `dia` muestra el primer descanso de la tienda (para textos "se proyecta
  // a X domingos"); si hay varios o ninguno, queda null.
  const descansosProyectados = useMemo(() => {
    const descPorDescanso = calendarDays.filter(d => diasDescansoTienda.includes(d.nombre)).length
    const feriadosCerrados = calendarDays.filter(d => {
      const t = tracker[d.dia]
      return (t === "Feriado" || t === "Cerrado") && !diasDescansoTienda.includes(d.nombre)
    }).length
    const diaDesc = diasDescansoTienda.length === 1 ? diasDescansoTienda[0] : null
    return { total: descPorDescanso + feriadosCerrados, dia: diaDesc, descPorDescanso, feriadosCerrados }
  }, [calendarDays, tracker, diasDescansoTienda])

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

  // Días realmente operativos del mes = patrón − Feriados/Cerrados del tracker.
  // No suma extras (cobertura, días abiertos extra) porque esos son aperturas
  // por encima de lo normal — el divisor sigue siendo "lo planeado" para
  // que el costo/día sea estable.
  const diasOpReal = useMemo(() => {
    const patron = countDiasOperativosMes(year, month, diasDescansoTienda)
    const feriadosCerrados = calendarDays.filter(d => {
      if (tracker[d.dia] !== "Feriado" && tracker[d.dia] !== "Cerrado") return false
      return !diasDescansoTienda.includes(d.nombre)
    }).length
    return Math.max(1, patron - feriadosCerrados)
  }, [year, month, diasDescansoTienda, calendarDays, tracker])

  return {
    diasCalendario, calendarDays, diasOpBase, effectiveTracker, diasOpReal,
    diasOperados, diasDescansosCerrados, descansosProyectados, resumenDescansos,
  }
}
