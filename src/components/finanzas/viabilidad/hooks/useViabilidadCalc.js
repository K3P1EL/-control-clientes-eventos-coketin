import { useMemo } from "react"
import { DIAS_SEMANA } from "../../../../lib/finanzas/constants"
import { getDaysInMonth, getDayName, getWeekNumberCal, getWeekNumberISO, peruNow, isActiveOnDate, getRecordStatus } from "../../../../lib/finanzas/helpers"

// All the derived numbers for one month live here. Pure useMemo chain —
// nothing reads from outside its `inputs` object, so adding/removing a
// derivation never accidentally invalidates an unrelated one.
//
// Inputs: the raw state (year, month, workers, services, apoyos, tracker,
//   cobExtra). Returns an object with every derived array/total used by
//   the tabs.
export function useViabilidadCalc(inputs) {
  const {
    year, month, workers, services, apoyos, tracker, cobExtra,
    diaAnalisis, cajaSemanaSol, cajaAcumMes, contarApoyo, diasOpSemana,
  } = inputs

  const cobExtraDias = cobExtra?.dias || 0
  const cobExtraPagadoAparte = cobExtra?.pagadoAparte || false
  const cobExtraMonto = cobExtra?.monto || 0

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
  // Un trabajador "encargado" solo resta descansos en los días que estuvo activo
  // (períodos). Un trabajador inactivo todo el día no cierra la tienda ese día.
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
  // Uses peruNow() so the cutoff doesn't shift around midnight depending on
  // the user's machine timezone.
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

  // Por trabajador: se calcula sobre los días en que estuvo en algún período
  // activo. Si renunció a mitad de mes, sus días proyectados se recortan al
  // período efectivo. `isActiveInMonth` permite ocultar/marcar trabajadores
  // que no estuvieron ningún día del mes visto.
  const workersCalc = useMemo(() => {
    return workers.map(w => {
      if (!w.name) return { ...w, descMes: 0, diasProj: 0, diasReales: 0, costoDiario: 0, costoMesProj: 0, costoMesReal: 0, extrasNo: 0, extrasWork: 0, extrasTienda: 0, activeDays: 0, isActiveInMonth: false, status: { active: true, label: "", tone: "zinc" } }

      const activeCalendarDays = calendarDays.filter(d => isActiveOnDate(w, new Date(year, month - 1, d.dia)))
      const activeDayNums = new Set(activeCalendarDays.map(d => d.dia))
      const isActiveInMonth = activeCalendarDays.length > 0

      const descMes = w.diaDescanso ? activeCalendarDays.filter(d => d.nombre === w.diaDescanso).length : 0
      const feriadosNoDescanso = activeCalendarDays.filter(d => effectiveTracker[d.dia] === "Feriado" && d.nombre !== w.diaDescanso).length
      const diasProj = Math.max(0, activeCalendarDays.length - descMes - feriadosNoDescanso)

      const marcas = w.diasMarcados || {}
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

  // ── Top-level summary numbers ────────────────────────────────────────
  const costoCoberturaExtra = cobExtraPagadoAparte ? cobExtraMonto : 0

  // "Fecha de referencia" para los KPIs diarios: hoy si estamos en el mes
  // actual, último día del mes si mirás un mes pasado o futuro. Así el KPI
  // "diario" refleja el estado vigente en ese momento (no hace promedios).
  const refDate = useMemo(() => {
    const now = peruNow()
    const isCurMonth = year === now.getFullYear() && month === (now.getMonth() + 1)
    return isCurMonth ? now : new Date(year, month - 1, diasCalendario)
  }, [year, month, diasCalendario])

  const costoDiarioPersonal = useMemo(() => {
    return workersCalc
      .filter(w => w.name && isActiveOnDate(w, refDate))
      .reduce((s, w) => s + w.costoDiario, 0)
  }, [workersCalc, refDate])

  const costoDiarioServicios = useMemo(() => {
    return servicesCalc
      .filter(s => s.nombre && isActiveOnDate(s, refDate))
      .reduce((s, v) => s + v.costoDiario, 0)
  }, [servicesCalc, refDate])

  const apoyoDiarioExt = useMemo(() => {
    return apoyosCalc
      .filter(a => a.concepto && isActiveOnDate(a, refDate))
      .reduce((s, a) => s + a.apoyoDiario, 0)
  }, [apoyosCalc, refDate])

  const costoDiarioBruto = costoDiarioPersonal + costoDiarioServicios
  const metaMinimaBase = Math.max(0, costoDiarioBruto - apoyoDiarioExt)
  const costoMesProyectado = totalPersonal.costoMesProj + totalServicios.pagoMensual + costoCoberturaExtra
  const costoMesReal = totalPersonal.costoMesReal + totalServicios.costoMesReal + costoCoberturaExtra
  const apoyosMensuales = totalApoyos.montoMensualReal
  const netoMensual = Math.max(0, costoMesReal - apoyosMensuales)

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

  // ── Caja calculations ─────────────────────────────────────────────────
  // Calculate REAL weekly costs from calendar marks for current week.
  // Personal: reads diasMarcados per worker. Services/apoyo: proportioned
  // to actual week days (not the static diasOpSemana config).
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
    let personalCost = 0
    workersCalc.forEach(w => {
      if (!w.name) return
      const marcas = w.diasMarcados || {}
      weekDaysThisMonth.forEach(d => {
        const fecha = new Date(year, month - 1, d.dia)
        if (!isActiveOnDate(w, fecha)) return
        const marca = marcas[d.dia] || ""
        const isRest = w.diaDescanso && d.nombre === w.diaDescanso
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

    return { personalCost, servCost, apoyoCost, realDays: fullWeekDays }
  }, [isCurrentMonth, currentWeekISO, calendarDays, workersCalc, servicesCalc, apoyosCalc, contarApoyo, year, month])

  const trabajadoresSemana = totalPersonal.pagoSemanal // presupuestado (flat)
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
    trabajadoresSemana, trabajadoresSemanaReal, proporcionServSemana, apoyoSemanal, gastoNetoSemanal, gastoPresupuestadoSemanal, cajaLibreSemana,
    trabRealMes, serviciosMes, apoyoMes, gastoRealMes,
    cajaVsGasto3A, cajaVsDevengado3A, cajaVsGasto3B, cajaVsDevengado3B,
    metaDiariaNecesaria, ritmoActual, diffRitmo,
  }
}
