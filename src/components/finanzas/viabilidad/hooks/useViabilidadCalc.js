import { useMemo } from "react"
import { peruNow } from "../../../../lib/finanzas/helpers"
import { useCalendarioOp } from "./useCalendarioOp"
import { usePersonalCalc } from "./usePersonalCalc"
import { useServiciosCalc } from "./useServiciosCalc"
import { useApoyosCalc } from "./useApoyosCalc"
import { useCajaCalc } from "./useCajaCalc"

// Orquestador. Compone los sub-hooks (calendario → personal/servicios/apoyos → caja)
// y agrega los escalares de nivel superior. El retorno mantiene la misma forma
// que antes de la separación para que ViabilidadModule y los tabs no cambien.
export function useViabilidadCalc(inputs) {
  const {
    year, month, workers, services, apoyos, tracker, cobExtra,
    diaAnalisis, cajaSemanaSol, cajaAcumMes, contarApoyo, diasOpSemana,
    tiendaConfig, setTrackerData,
  } = inputs

  const cobExtraPagadoAparte = cobExtra?.pagadoAparte || false
  const cobExtraMonto = cobExtra?.monto || 0

  const {
    diasCalendario, calendarDays, diasOpBase, effectiveTracker,
    diasOperados, diasDescansosCerrados, descansosProyectados, resumenDescansos,
  } = useCalendarioOp({ year, month, workers, tracker, cobExtra, tiendaConfig, setTrackerData })

  // "Fecha de referencia" para los KPIs diarios: hoy si estamos en el mes
  // actual, último día del mes si mirás un mes pasado o futuro. Así el KPI
  // "diario" refleja el estado vigente en ese momento (no hace promedios).
  const refDate = useMemo(() => {
    const now = peruNow()
    const isCurMonth = year === now.getFullYear() && month === (now.getMonth() + 1)
    return isCurMonth ? now : new Date(year, month - 1, diasCalendario)
  }, [year, month, diasCalendario])

  const { workersCalc, totalPersonal, costoDiarioPersonal } = usePersonalCalc({
    workers, calendarDays, effectiveTracker, year, month, refDate,
  })

  const {
    servicesCalc, totalServicios, costoDiarioServicios,
    vista3A, totalDevengado3A, totalFalta3A,
    vista3B, totalDevengado3B, totalFalta3B,
    proximosVencimientos,
  } = useServiciosCalc({
    services, diasOpBase, calendarDays, year, month, diasCalendario, refDate, diaAnalisis, diasOperados,
    diasDescansoTienda: tiendaConfig?.diasDescansoSemanal || [],
  })

  const { apoyosCalc, totalApoyos, apoyoDiarioExt } = useApoyosCalc({
    apoyos, diasCalendario, calendarDays, year, month, refDate,
  })

  // ── Top-level summary numbers ────────────────────────────────────────
  const costoCoberturaExtra = cobExtraPagadoAparte ? cobExtraMonto : 0
  const costoDiarioBruto = costoDiarioPersonal + costoDiarioServicios
  const metaMinimaBase = Math.max(0, costoDiarioBruto - apoyoDiarioExt)
  const costoMesProyectado = totalPersonal.costoMesProj + totalServicios.pagoMensual + costoCoberturaExtra
  const costoMesReal = totalPersonal.costoMesReal + totalServicios.costoMesReal + costoCoberturaExtra
  const apoyosMensuales = totalApoyos.montoMensualReal
  const netoMensual = Math.max(0, costoMesReal - apoyosMensuales)

  const {
    trabajadoresSemana, trabajadoresSemanaReal, proporcionServSemana, apoyoSemanal,
    hormigaSemanal, hormigaMes,
    gastoNetoSemanal, gastoPresupuestadoSemanal, cajaLibreSemana,
    trabRealMes, serviciosMes, apoyoMes, gastoRealMes,
    cajaVsGasto3A, cajaVsDevengado3A, cajaVsGasto3B, cajaVsDevengado3B,
    metaDiariaNecesaria, ritmoActual, diffRitmo,
  } = useCajaCalc({
    year, month, diasCalendario,
    workersCalc, servicesCalc, apoyosCalc,
    totalPersonal, totalServicios, totalApoyos,
    cajaSemanaSol, cajaAcumMes, contarApoyo, diasOpSemana,
    costoDiarioServicios,
    totalDevengado3A, totalDevengado3B,
    diasOperados, metaMinimaBase,
    tiendaConfig,
  })

  return {
    diasCalendario, calendarDays, diasOpBase, effectiveTracker,
    diasOperados, diasDescansosCerrados, descansosProyectados, resumenDescansos,
    workersCalc, totalPersonal,
    servicesCalc, totalServicios,
    apoyosCalc, totalApoyos,
    costoDiarioPersonal, costoDiarioServicios, costoDiarioBruto, apoyoDiarioExt,
    metaMinimaBase, costoMesProyectado, costoMesReal, apoyosMensuales, netoMensual,
    vista3A, totalDevengado3A, totalFalta3A,
    vista3B, totalDevengado3B, totalFalta3B,
    proximosVencimientos,
    trabajadoresSemana, trabajadoresSemanaReal, proporcionServSemana, apoyoSemanal, hormigaSemanal, hormigaMes, gastoNetoSemanal, gastoPresupuestadoSemanal, cajaLibreSemana,
    trabRealMes, serviciosMes, apoyoMes, gastoRealMes,
    cajaVsGasto3A, cajaVsDevengado3A, cajaVsGasto3B, cajaVsDevengado3B,
    metaDiariaNecesaria, ritmoActual, diffRitmo,
  }
}
