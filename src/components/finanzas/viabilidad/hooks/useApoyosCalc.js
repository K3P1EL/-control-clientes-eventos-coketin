import { useMemo } from "react"
import { isActiveOnDate, getRecordStatus } from "../../../../lib/finanzas/helpers"

// Cálculos de apoyos externos: total mensual prorrateado + apoyo diario vigente.
export function useApoyosCalc({ apoyos, diasCalendario, calendarDays, year, month, refDate }) {
  const apoyosCalc = useMemo(() => {
    return apoyos.map(a => {
      if (!a.concepto) return { ...a, apoyoDiario: 0, apoyoMesReal: 0, activeDays: 0, isActiveInMonth: false, status: { active: true, label: "", tone: "zinc" } }
      const activeCalDays = calendarDays.filter(d => isActiveOnDate(a, new Date(year, month - 1, d.dia)))
      const activeDays = activeCalDays.length
      const isActiveInMonth = activeDays > 0
      const div = a.divisor || diasCalendario
      const apoyoDiario = div > 0 ? a.montoMensual / div : 0
      const apoyoMesReal = diasCalendario > 0 ? (a.montoMensual || 0) * (activeDays / diasCalendario) : 0
      const status = getRecordStatus(a, year, month)
      return { ...a, apoyoDiario, apoyoMesReal, activeDays, isActiveInMonth, status }
    })
  }, [apoyos, diasCalendario, calendarDays, year, month])

  const totalApoyos = useMemo(() => {
    const active = apoyosCalc.filter(a => a.concepto && a.isActiveInMonth)
    return {
      montoMensual: active.reduce((s, a) => s + a.montoMensual, 0),
      apoyoDiario: active.reduce((s, a) => s + a.apoyoDiario, 0),
      montoMensualReal: active.reduce((s, a) => s + a.apoyoMesReal, 0),
    }
  }, [apoyosCalc])

  const apoyoDiarioExt = useMemo(() => {
    return apoyosCalc
      .filter(a => a.concepto && isActiveOnDate(a, refDate))
      .reduce((s, a) => s + a.apoyoDiario, 0)
  }, [apoyosCalc, refDate])

  return { apoyosCalc, totalApoyos, apoyoDiarioExt }
}
