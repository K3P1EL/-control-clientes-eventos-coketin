import { useMemo } from "react"
import { getWeekNumberISO, peruNow, isActiveOnDate, getDiaMarca } from "../../../../lib/finanzas/helpers"
import { DIAS_SEMANA } from "../../../../lib/finanzas/constants"

// Caja semanal/mensual: suma reales por asistencia (no flat).
// Personal: reads diasMarcados per worker. Services/apoyo: proportioned
// to actual week days (not the static diasOpSemana config).
export function useCajaCalc({
  year, month, diasCalendario,
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

    // Los 7 días reales de la semana ISO actual, anclados al lunes de la
    // semana 1 del año del mes vigente y avanzando. Esto NO depende del mes
    // — funciona aunque la semana cruce abril/mayo, dic/ene, etc.
    const jan4 = new Date(year, 0, 4)
    const jan4Dow = (jan4.getDay() + 6) % 7  // Mon=0..Sun=6
    const week1Mon = new Date(jan4)
    week1Mon.setDate(jan4.getDate() - jan4Dow)
    const allWeekDates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(week1Mon)
      d.setDate(week1Mon.getDate() + (currentWeekISO - 1) * 7 + i)
      allWeekDates.push(d)
    }
    if (allWeekDates.length === 0) return null

    // Personal: ahora sí usamos los 7 días reales. Las marcas se leen del
    // mes correspondiente a cada fecha (los `diasMarcados` son por mes).
    // personalCost = real (con marcas), personalBudget = esperado (respeta
    // historial y descansos fijos pero no marcas).
    let personalCost = 0
    let personalBudget = 0
    workersCalc.forEach(w => {
      if (!w.name) return
      allWeekDates.forEach(date => {
        if (!isActiveOnDate(w, date)) return
        const dyName = DIAS_SEMANA[date.getDay()]
        const isRest = w.diaDescanso && dyName === w.diaDescanso
        if (!isRest) personalBudget += w.costoDiario
        const marca = getDiaMarca(w, date.getFullYear(), date.getMonth() + 1, date.getDate())
        if (marca === "noVino") return
        if (isRest && !marca) return
        personalCost += w.costoDiario
      })
    })

    // Servicios: cada uno aporta costoDiario por cada día activo de la semana.
    let servCost = 0
    servicesCalc.forEach(s => {
      if (!s.nombre) return
      const activeInWeek = allWeekDates.filter(d => isActiveOnDate(s, d)).length
      servCost += s.costoDiario * activeInWeek
    })

    // Apoyos: idem.
    let apoyoCost = 0
    if (contarApoyo === "SI") {
      apoyosCalc.forEach(a => {
        if (!a.concepto) return
        const activeInWeek = allWeekDates.filter(d => isActiveOnDate(a, d)).length
        apoyoCost += (a.apoyoDiario || 0) * activeInWeek
      })
    }

    return { personalCost, personalBudget, servCost, apoyoCost, realDays: allWeekDates.length }
  }, [isCurrentMonth, currentWeekISO, workersCalc, servicesCalc, apoyosCalc, contarApoyo, year])

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
