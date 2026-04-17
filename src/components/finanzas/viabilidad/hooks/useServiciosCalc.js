import { useMemo } from "react"
import { isActiveOnDate, getRecordStatus } from "../../../../lib/finanzas/helpers"

// Cálculos de servicios: total, costo diario vigente, y las vistas de
// devengado 3A (ciclo mes) y 3B (ciclo proveedor) + próximos vencimientos.
export function useServiciosCalc({ services, diasOpBase, calendarDays, year, month, diasCalendario, refDate, diaAnalisis, diasOperados }) {
  // Servicios también soportan historial (internet cortado, pollo estacional,
  // alquiler que cambió). activeDays = días que estuvieron activos en el mes.
  // costoMesReal = pagoMensual prorrateado según proporción de días activos.
  const servicesCalc = useMemo(() => {
    return services.map(s => {
      if (!s.nombre) return { ...s, costoDiario: 0, costoMensual: 0, costoMesReal: 0, activeDays: 0, isActiveInMonth: false, status: { active: true, label: "", tone: "zinc" } }
      const activeCalDays = calendarDays.filter(d => isActiveOnDate(s, new Date(year, month - 1, d.dia)))
      const activeDays = activeCalDays.length
      const isActiveInMonth = activeDays > 0
      const div = s.divisor || diasOpBase
      const costoDiario = div > 0 ? s.pagoMensual / div : 0
      const costoMesReal = diasCalendario > 0 ? (s.pagoMensual || 0) * (activeDays / diasCalendario) : 0
      const status = getRecordStatus(s, year, month)
      return { ...s, costoDiario, costoMensual: s.pagoMensual, costoMesReal, activeDays, isActiveInMonth, status }
    })
  }, [services, diasOpBase, calendarDays, year, month, diasCalendario])

  const totalServicios = useMemo(() => {
    const active = servicesCalc.filter(s => s.nombre && s.isActiveInMonth)
    return {
      pagoMensual: active.reduce((s, v) => s + v.pagoMensual, 0),
      costoDiario: active.reduce((s, v) => s + v.costoDiario, 0),
      costoMensual: active.reduce((s, v) => s + v.costoMensual, 0),
      costoMesReal: active.reduce((s, v) => s + v.costoMesReal, 0),
    }
  }, [servicesCalc])

  const costoDiarioServicios = useMemo(() => {
    return servicesCalc
      .filter(s => s.nombre && isActiveOnDate(s, refDate))
      .reduce((s, v) => s + v.costoDiario, 0)
  }, [servicesCalc, refDate])

  // ── Vista 3A — month cycle (day 1 → day of payment) ─────────────────
  const vista3A = useMemo(() => {
    const simDay = diaAnalisis
    return servicesCalc.filter(s => s.nombre).map(s => {
      const diaPago = typeof s.diaPago === "number" ? s.diaPago : null
      if (diaPago === null) return { nombre: s.nombre, costoMensual: s.pagoMensual, diaPago: "Sin fecha", diasDeveng: "—", devengado: "—", faltaRecup: "—", diasRest: "—", estado: "Sin fecha" }
      const div = s.divisor || diasOpBase
      const costoDiario = div > 0 ? s.pagoMensual / div : 0
      const diasDeveng = diasOperados > 0 ? Math.min(diasOperados, diaPago) : Math.min(simDay, diaPago)
      const devengado = costoDiario * diasDeveng
      const faltaRecup = Math.max(0, s.pagoMensual - devengado)
      const diasRest = Math.max(0, diaPago - simDay)
      let estado = ""
      if (simDay >= diaPago) estado = "Completa"
      else if (diaPago - simDay <= 3) estado = `Vence en ${diasRest}d`
      else if (diaPago - simDay <= 7) estado = `Ojo ${diasRest}d`
      else estado = `Faltan ${diasRest}d`
      return { nombre: s.nombre, costoMensual: s.pagoMensual, diaPago, diasDeveng, devengado, faltaRecup, diasRest, estado }
    })
  }, [servicesCalc, diaAnalisis, diasOperados, diasOpBase])

  const totalDevengado3A = vista3A.reduce((s, v) => s + (typeof v.devengado === "number" ? v.devengado : 0), 0)
  const totalFalta3A = vista3A.reduce((s, v) => s + (typeof v.faltaRecup === "number" ? v.faltaRecup : 0), 0)

  // ── Vista 3B — provider cycle (last payment → next payment) ─────────
  const vista3B = useMemo(() => {
    const simDay = diaAnalisis
    return servicesCalc.filter(s => s.nombre).map(s => {
      const diaPago = typeof s.diaPago === "number" ? s.diaPago : null
      if (diaPago === null) return { nombre: s.nombre, costoMensual: s.pagoMensual, diaPago: "Sin fecha", diasCiclo: "—", devengadoCiclo: "—", faltaCiclo: "—", diasAlPago: "—", estadoCiclo: "Sin fecha" }
      const div = s.divisor || diasOpBase
      const costoDiario = div > 0 ? s.pagoMensual / div : 0
      const diasCiclo = simDay < diaPago ? (diasCalendario - diaPago + simDay) : (simDay - diaPago)
      const devengadoCiclo = costoDiario * diasCiclo
      const faltaCiclo = Math.max(0, s.pagoMensual - devengadoCiclo)
      const diasAlPago = simDay < diaPago ? (diaPago - simDay) : (diasCalendario - simDay + diaPago)
      let estadoCiclo = ""
      if (simDay === diaPago) estadoCiclo = "Pago HOY"
      else if (simDay > diaPago) estadoCiclo = `Nuevo ciclo ${simDay - diaPago}d`
      else if (diaPago - simDay <= 3) estadoCiclo = `Cierra ${diaPago - simDay}d`
      else if (diaPago - simDay <= 7) estadoCiclo = `Ojo ${diaPago - simDay}d`
      else estadoCiclo = `En curso ${diaPago - simDay}d`
      return { nombre: s.nombre, costoMensual: s.pagoMensual, diaPago, diasCiclo, devengadoCiclo, faltaCiclo, diasAlPago, estadoCiclo }
    })
  }, [servicesCalc, diaAnalisis, diasCalendario, diasOpBase])

  const totalDevengado3B = vista3B.reduce((s, v) => s + (typeof v.devengadoCiclo === "number" ? v.devengadoCiclo : 0), 0)
  const totalFalta3B = vista3B.reduce((s, v) => s + (typeof v.faltaCiclo === "number" ? v.faltaCiclo : 0), 0)

  const proximosVencimientos = useMemo(() => {
    return servicesCalc.filter(s => s.nombre && typeof s.diaPago === "number")
      .map(s => ({ nombre: s.nombre, diaPago: s.diaPago, diasRest: s.diaPago >= diaAnalisis ? s.diaPago - diaAnalisis : diasCalendario - diaAnalisis + s.diaPago }))
      .filter(v => v.diasRest <= 7 && v.diasRest > 0)
      .sort((a, b) => a.diasRest - b.diasRest)
  }, [servicesCalc, diaAnalisis, diasCalendario])

  return {
    servicesCalc, totalServicios, costoDiarioServicios,
    vista3A, totalDevengado3A, totalFalta3A,
    vista3B, totalDevengado3B, totalFalta3B,
    proximosVencimientos,
  }
}
