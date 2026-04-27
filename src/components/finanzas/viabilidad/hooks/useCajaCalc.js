import { useMemo } from "react"
import { getWeekNumberISO, peruNow, isActiveOnDate } from "../../../../lib/finanzas/helpers"

// Caja semanal/mensual: suma reales por asistencia (no flat).
// Personal: reads diasMarcados per worker. Services/apoyo: proportioned
// to actual week days (not the static diasOpSemana config).
export function useCajaCalc({
  year, month, calendarDays, diasCalendario,
  workersCalc, servicesCalc, apoyosCalc,
  totalPersonal, totalServicios, totalApoyos,
  cajaSemanaSol, cajaAcumMes, contarApoyo, diasOpSemana,
  costoDiarioServicios,
  totalDevengado3A, totalDevengado3B,
  diasOperados, metaMinimaBase,
}) {
  const currentWeekISO = getWeekNumberISO(peruNow())
  const now = peruNow()
  const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1)

  const weekCalc = useMemo(() => {
    if (!isCurrentMonth || currentWeekISO == null) return null

    // Days in THIS month that fall in the current ISO week (for worker marks)
    const weekDaysThisMonth = calendarDays.filter(d => {
      const date = new Date(year, month - 1, d.dia)
      const w = getWeekNumberISO(date)
      return w != null && w === currentWeekISO
    })

    // Fechas completas de la semana (incluyen días del mes anterior/siguiente).
    // Las usamos para prorratear servicios/apoyos respetando sus historiales.
    const allWeekDates = []
    for (let offset = -6; offset <= 6; offset++) {
      const d = new Date(year, month - 1, weekDaysThisMonth[0]?.dia || 1)
      d.setDate(d.getDate() + offset)
      if (getWeekNumberISO(d) === currentWeekISO) allWeekDates.push(d)
    }
    const fullWeekDays = allWeekDates.length || weekDaysThisMonth.length || 1
    if (weekDaysThisMonth.length === 0) return null

    // Personal: real cost from attendance (only days in this month have marks)
    // Solo cuentan los días en que el trabajador estaba en un período activo.
    // personalCost = real (con marcas), personalBudget = esperado (sin marcas
    // pero respetando historial y descansos fijos). El presupuesto se usa
    // arriba para mostrar "Presupuesto: …" — antes usaba totalPersonal.pagoSemanal
    // que incluía trabajadores dados de baja a mitad de mes.
    let personalCost = 0
    let personalBudget = 0
    workersCalc.forEach(w => {
      if (!w.name) return
      const marcas = w.diasMarcados || {}
      weekDaysThisMonth.forEach(d => {
        const fecha = new Date(year, month - 1, d.dia)
        if (!isActiveOnDate(w, fecha)) return
        const isRest = w.diaDescanso && d.nombre === w.diaDescanso
        if (!isRest) personalBudget += w.costoDiario
        const marca = marcas[d.dia] || ""
        if (marca === "noVino") return
        if (isRest && !marca) return
        personalCost += w.costoDiario
      })
    })

    // Servicios: cada uno aporta costoDiario por cada día que estuvo activo
    // dentro de la semana completa.
    let servCost = 0
    servicesCalc.forEach(s => {
      if (!s.nombre) return
      const activeInWeek = allWeekDates.filter(d => isActiveOnDate(s, d)).length
      servCost += s.costoDiario * activeInWeek
    })

    // Apoyos: mismo trato.
    let apoyoCost = 0
    if (contarApoyo === "SI") {
      apoyosCalc.forEach(a => {
        if (!a.concepto) return
        const activeInWeek = allWeekDates.filter(d => isActiveOnDate(a, d)).length
        apoyoCost += (a.apoyoDiario || 0) * activeInWeek
      })
    }

    return { personalCost, personalBudget, servCost, apoyoCost, realDays: fullWeekDays }
  }, [isCurrentMonth, currentWeekISO, calendarDays, workersCalc, servicesCalc, apoyosCalc, contarApoyo, year, month])

  // Presupuestado: respeta historial (baja/reingreso) y descansos fijos.
  // Si no estamos en el mes actual cae al pagoSemanal flat para meses pasados.
  const trabajadoresSemana = weekCalc ? weekCalc.personalBudget : totalPersonal.pagoSemanal
  const trabajadoresSemanaReal = weekCalc ? weekCalc.personalCost : trabajadoresSemana
  const proporcionServSemana = weekCalc ? weekCalc.servCost : costoDiarioServicios * diasOpSemana
  const apoyoSemanal = weekCalc ? weekCalc.apoyoCost : (contarApoyo === "SI" ? (totalApoyos.montoMensual / diasCalendario * diasOpSemana) : 0)
  const gastoNetoSemanal = trabajadoresSemanaReal + proporcionServSemana - apoyoSemanal
  const gastoPresupuestadoSemanal = trabajadoresSemana + (costoDiarioServicios * diasOpSemana) - (contarApoyo === "SI" ? (totalApoyos.montoMensual / diasCalendario * diasOpSemana) : 0)
  const cajaLibreSemana = cajaSemanaSol - gastoNetoSemanal

  const trabRealMes = totalPersonal.costoMesReal
  const serviciosMes = totalServicios.costoMesReal
  const apoyoMes = contarApoyo === "SI" ? totalApoyos.montoMensualReal : 0
  const gastoRealMes = trabRealMes + serviciosMes - apoyoMes
  const cajaVsGasto3A = cajaAcumMes - gastoRealMes
  const cajaVsDevengado3A = cajaAcumMes - totalDevengado3A
  const cajaVsGasto3B = cajaAcumMes - gastoRealMes
  const cajaVsDevengado3B = cajaAcumMes - totalDevengado3B

  const metaDiariaNecesaria = metaMinimaBase
  const ritmoActual = diasOperados > 0 ? cajaAcumMes / diasOperados : null
  const diffRitmo = ritmoActual !== null ? ritmoActual - metaDiariaNecesaria : null

  return {
    trabajadoresSemana, trabajadoresSemanaReal, proporcionServSemana, apoyoSemanal,
    gastoNetoSemanal, gastoPresupuestadoSemanal, cajaLibreSemana,
    trabRealMes, serviciosMes, apoyoMes, gastoRealMes,
    cajaVsGasto3A, cajaVsDevengado3A, cajaVsGasto3B, cajaVsDevengado3B,
    metaDiariaNecesaria, ritmoActual, diffRitmo,
  }
}
