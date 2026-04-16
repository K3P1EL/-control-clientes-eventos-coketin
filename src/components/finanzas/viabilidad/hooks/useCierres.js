import { useState, useEffect, useCallback, useRef } from "react"
import { loadCierres, upsertCierre, deleteCierre } from "../../../../services/finanzas"
import { peruNow, getWeekNumberISO, getISOYear, getDaysInMonth, parseLocalDate, calcContract, isActiveOnDate } from "../../../../lib/finanzas/helpers"
import { DIAS_SEMANA } from "../../../../lib/finanzas/constants"
import { logError } from "../../../../lib/logger"
import { useContratosSnapshot } from "../../caja/hooks/useContratosSnapshot"

// HISTORICAL CLOSINGS — auto-generated, NOT manual.
// Unlike the "Jalar" buttons in Viabilidad (which are for the owner to
// play with scenarios in real-time), cierres are frozen snapshots that
// the system generates automatically when a week/month ends. They pull
// real data from Contratos and Caja at close time, so the historical
// record is always based on actuals, not on whatever the owner last "jaló".
//
// Two modes coexist:
//   - Real-time (Viabilidad tabs): owner "jala" manually to simulate/analyze
//   - Historical (HistorialTab cierres): auto-closed with real data
//
import { useCajaSnapshot } from "./useCajaSnapshot"

// Caja entries use real dates for week/month (same as CajaModule).
function getEntryDate(e) {
  if (!e.fecha) return null
  const d = parseLocalDate(e.fecha)
  if (!d) return null
  return { week: getWeekNumberISO(d), month: d.getMonth() + 1, year: d.getFullYear() }
}

// Calculate real personal cost for a specific ISO week by reading worker
// calendars. Returns the actual cost based on days each worker was present
// (not the flat pagoSemanal), plus the proportional services and apoyo.
//
// ISO weeks can cross month boundaries (e.g. week 14 = Mar 30 – Apr 5).
// We find the actual 7 days of the week by starting from a known Thursday
// in that ISO week, then walking Mon–Sun. Worker marks (diasMarcados) are
// keyed by day-of-month, so we use the day number from whichever month
// each date falls in.
function calcGastoSemanaReal(workers, services, apoyos, contarApoyo, year, month, targetWeek, diasOpBase) {
  // Find the 7 real calendar dates for this ISO week.
  // Strategy: scan a range around the target month to find days matching the week.
  const weekDays = []
  const scanStart = new Date(year, month - 2, 1)  // prev month start
  const scanEnd = new Date(year, month, 0)         // current month end
  for (let d = new Date(scanStart); d <= scanEnd; d.setDate(d.getDate() + 1)) {
    if (getWeekNumberISO(d) === targetWeek) {
      weekDays.push({ dia: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear(), nombre: DIAS_SEMANA[d.getDay()] })
    }
  }
  if (weekDays.length === 0) return null

  let personalCost = 0
  workers.forEach(w => {
    if (!w.name) return
    const costoDiario = (w.pagoSemanal && w.diasTrabSem > 0) ? w.pagoSemanal / w.diasTrabSem : 0
    const marcas = w.diasMarcados || {}
    weekDays.forEach(({ dia, month: dm, year: dy, nombre }) => {
      if (!isActiveOnDate(w, new Date(dy, dm - 1, dia))) return
      const marca = marcas[dia] || ""
      const isRest = w.diaDescanso && nombre === w.diaDescanso
      if (marca === "noVino") return
      if (isRest && !marca) return
      personalCost += costoDiario
    })
  })

  // Services: respetan historial. Cada servicio aporta costoDiario por cada
  // día de la semana que estuvo activo.
  const realDays = weekDays.length
  const daysInMonth = getDaysInMonth(year, month)
  let servProportion = 0
  services.forEach(s => {
    if (!s.nombre) return
    const div = s.divisor || diasOpBase || Math.max(1, daysInMonth - 4)
    const costoDiario = div > 0 ? (s.pagoMensual || 0) / div : 0
    const activeInWeek = weekDays.filter(({ dia, month: dm, year: dy }) =>
      isActiveOnDate(s, new Date(dy, dm - 1, dia))
    ).length
    servProportion += costoDiario * activeInWeek
  })

  // Apoyos: igual trato, por día activo
  let apoyoProportion = 0
  if (contarApoyo === "SI") {
    apoyos.forEach(a => {
      if (!a.concepto) return
      const costoDiario = (a.montoMensual || 0) / daysInMonth
      const activeInWeek = weekDays.filter(({ dia, month: dm, year: dy }) =>
        isActiveOnDate(a, new Date(dy, dm - 1, dia))
      ).length
      apoyoProportion += costoDiario * activeInWeek
    })
  }

  const gastoNeto = personalCost + servProportion - apoyoProportion
  return { gastoNeto, personalCost, servProportion, apoyo: apoyoProportion }
}

export function useCierres(calc, state) {
  const [cierres, setCierres] = useState([])
  const [loaded, setLoaded] = useState(false)
  const contracts = useContratosSnapshot()
  const cajaEntries = useCajaSnapshot()

  const now = peruNow()
  const currentWeek = getWeekNumberISO(now)
  const currentISOYear = getISOYear(now) // can differ from calendar year at boundaries
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  useEffect(() => {
    loadCierres()
      .then(data => { setCierres(data || []); setLoaded(true) })
      .catch(e => { logError("cierres.load", e); setLoaded(true) })
  }, [])

  // Keep refs so the effect reads fresh values without re-triggering.
  const calcRef = useRef(calc)
  calcRef.current = calc
  const stateRef = useRef(state)
  stateRef.current = state

  // Auto-close past periods.
  // - Contratos/caja = always recalculated (they're facts that can be corrected)
  // - Gastos = frozen at first close (config changes shouldn't alter history)
  //
  // If a cierre already exists, we recalculate ganancia/enCaja/caja* from
  // live data but keep the original gastoSemanal/gastoMes. For new cierres
  // we use the current calc values.
  useEffect(() => {
    const c = calcRef.current
    if (!loaded || !c || !contracts.length) return

    // Index existing cierres by "anio-periodo" key for quick lookup
    const existingSemMap = new Map()
    const existingMesMap = new Map()
    cierres.forEach(x => {
      if (x.tipo === "semana") existingSemMap.set(`${x.anio}-${x.periodo}`, x)
      if (x.tipo === "mes") existingMesMap.set(`${x.anio}-${x.periodo}`, x)
    })

    // Build list of past weeks to close. Use ISO year (not calendar year)
    // so week 53 of 2026 is handled correctly even in January 2027.
    const weeks = []
    const startWeek = Math.max(1, currentWeek - 4)
    if (startWeek <= currentWeek) {
      for (let w = startWeek; w < currentWeek; w++) {
        weeks.push({ week: w, isoYear: currentISOYear })
      }
    }
    // If we're in early January and ISO year differs from calendar year,
    // also close the last weeks of the previous ISO year
    if (currentISOYear === currentYear && currentWeek <= 4) {
      // Check if previous year's last weeks need closing (weeks 49-53)
      const prevYear = currentYear - 1
      const dec31 = new Date(prevYear, 11, 31)
      const maxWeekPrevYear = getWeekNumberISO(dec31) || 52
      for (let w = Math.max(1, maxWeekPrevYear - 3); w <= maxWeekPrevYear; w++) {
        if (!existingSemMap.has(`${prevYear}-${w}`)) {
          weeks.push({ week: w, isoYear: prevYear })
        }
      }
    }

    const months = []
    for (let m = 1; m < currentMonth; m++) months.push(m)
    // If January, also close December of previous year
    if (currentMonth === 1) {
      const prevYear = currentYear - 1
      if (!existingMesMap.has(`${prevYear}-12`)) months.push({ month: 12, year: prevYear })
    }

    if (weeks.length === 0 && months.length === 0) return

    const currentGastoSemanal = c.gastoNetoSemanal || 0
    const currentGastoMes = c.gastoRealMes || 0
    const currentApoyoSemanal = c.apoyoSemanal || 0
    const currentApoyoMes = c.apoyoMes || 0

    const doClose = async () => {
      let changed = false

      // ── Weekly cierres ──
      for (const { week: w, isoYear: wYear } of weeks) {
        let deNuevos = 0, deAnteriores = 0, enCaja = 0, hasContracts = false
        contracts.forEach(ct => {
          if (ct.eliminado || ct.cancelado) return
          const isHome = (ct.anio || currentYear) === wYear && ct.semana === w
          if (isHome) {
            hasContracts = true
            const cc = calcContract(ct)
            deNuevos += cc.ganancia
            enCaja += cc.enCaja
          } else {
            // Cobros from other weeks that landed in this week
            ;(ct.cobros || []).filter(a => !a.noTrack && a.enCaja && a.fecha).forEach(a => {
              const d = parseLocalDate(a.fecha)
              if (d && getWeekNumberISO(d) === w && getISOYear(d) === wYear) {
                deAnteriores += a.monto || 0
                hasContracts = true
              }
            })
          }
        })
        const ganancia = deNuevos + deAnteriores

        let cajaIng = 0, cajaEgr = 0, hasCaja = false
        cajaEntries.forEach(e => {
          if (e.eliminado) return
          if (e.delNegocio === false) return
          if (e.gastoAjeno) return // exclude non-business expenses from viability history
          const ed = getEntryDate(e)
          if (!ed) return
          // Match by ISO year + week (not calendar year)
          const entryISOYear = getISOYear(parseLocalDate(e.fecha))
          if (entryISOYear !== wYear || ed.week !== w) return
          hasCaja = true
          if (e.tipo === "ingreso") cajaIng += e.monto || 0
          else if (e.tipo === "egreso") cajaEgr += e.monto || 0
        })

        if (!hasContracts && !hasCaja) continue

        // Calculate real weekly cost from worker calendars (or use frozen value)
        const existing = existingSemMap.get(`${wYear}-${w}`)
        const st = stateRef.current
        let gastoSemanal, apoyo
        if (existing?.data?.gastoSemanal != null) {
          gastoSemanal = existing.data.gastoSemanal
          apoyo = existing.data.apoyo ?? 0
        } else if (st) {
          const real = calcGastoSemanaReal(st.workers, st.services, st.apoyos, st.contarApoyo, currentYear, currentMonth, w, c.diasOpBase)
          gastoSemanal = real ? real.gastoNeto : currentGastoSemanal
          apoyo = real ? real.apoyo : currentApoyoSemanal
        } else {
          gastoSemanal = currentGastoSemanal
          apoyo = currentApoyoSemanal
        }
        const libre = enCaja - gastoSemanal

        try {
          await upsertCierre({
            tipo: "semana", periodo: w, anio: wYear,
            data: { ganancia, deNuevos, deAnteriores, enCaja, gastoSemanal, apoyo, libre, cajaIngresos: cajaIng, cajaEgresos: cajaEgr, cajaBalance: cajaIng - cajaEgr },
            viable: libre >= 0, nota: existing?.nota || "",
          })
          changed = true
        } catch (e) { logError("cierres.autoClose", e) }
      }

      // ── Monthly cierres ──
      for (const mItem of months) {
        const mNum = typeof mItem === "number" ? mItem : mItem.month
        const mYear = typeof mItem === "number" ? currentYear : mItem.year

        let deNuevosM = 0, deAnterioresM = 0, enCaja = 0, hasContracts = false
        contracts.forEach(ct => {
          if (ct.eliminado || ct.cancelado) return
          const isHome = (ct.anio || mYear) === mYear && ct.mes === mNum
          if (isHome) {
            hasContracts = true
            const cc = calcContract(ct)
            deNuevosM += cc.ganancia
            enCaja += cc.enCaja
          } else {
            ;(ct.cobros || []).filter(a => !a.noTrack && a.enCaja && a.fecha).forEach(a => {
              const d = parseLocalDate(a.fecha)
              if (d && d.getFullYear() === mYear && (d.getMonth() + 1) === mNum) {
                deAnterioresM += a.monto || 0
                hasContracts = true
              }
            })
          }
        })
        const ganancia = deNuevosM + deAnterioresM

        let cajaIng = 0, cajaEgr = 0, hasCaja = false
        cajaEntries.forEach(e => {
          if (e.eliminado) return
          if (e.delNegocio === false) return
          if (e.gastoAjeno) return
          const ed = getEntryDate(e)
          if (!ed || ed.year !== mYear || ed.month !== mNum) return
          hasCaja = true
          if (e.tipo === "ingreso") cajaIng += e.monto || 0
          else if (e.tipo === "egreso") cajaEgr += e.monto || 0
        })

        if (!hasContracts && !hasCaja) continue

        const existing = existingMesMap.get(`${mYear}-${mNum}`)
        const gastoMes = existing?.data?.gastoMes ?? currentGastoMes
        const apoyo = existing ? (existing.data?.apoyo ?? 0) : currentApoyoMes
        const libre = enCaja - gastoMes

        try {
          await upsertCierre({
            tipo: "mes", periodo: mNum, anio: mYear,
            data: { ganancia, deNuevos: deNuevosM, deAnteriores: deAnterioresM, enCaja, gastoMes, apoyo, libre, cajaIngresos: cajaIng, cajaEgresos: cajaEgr, cajaBalance: cajaIng - cajaEgr },
            viable: libre >= 0, nota: existing?.nota || "",
          })
          changed = true
        } catch (e) { logError("cierres.autoClose", e) }
      }

      if (changed) {
        try {
          const fresh = await loadCierres()
          setCierres(fresh || [])
        } catch (e) { logError("cierres.reload", e) }
      }
    }

    doClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, contracts.length])

  const saveCierre = useCallback(async (cierre) => {
    try {
      await upsertCierre(cierre)
      setCierres(prev => {
        const exists = prev.find(c => c.tipo === cierre.tipo && c.periodo === cierre.periodo && c.anio === cierre.anio)
        if (exists) return prev.map(c => (c.tipo === cierre.tipo && c.periodo === cierre.periodo && c.anio === cierre.anio) ? { ...c, ...cierre } : c)
        return [...prev, cierre]
      })
    } catch (e) { logError("cierres.save", e); alert("Error guardando cierre") }
  }, [])

  const removeCierre = useCallback(async (id) => {
    try { await deleteCierre(id); setCierres(prev => prev.filter(c => c.id !== id)) }
    catch (e) { logError("cierres.delete", e); alert("Error eliminando cierre") }
  }, [])

  return { cierres, loaded, saveCierre, removeCierre, currentWeek, currentMonth, currentYear }
}
