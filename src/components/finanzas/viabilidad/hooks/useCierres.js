import { useState, useEffect, useCallback, useRef } from "react"
import { loadCierres, upsertCierre, deleteCierre } from "../../../../services/finanzas"
import { peruNow, getWeekNumberISO, getISOYear, getDaysInMonth, parseLocalDate, calcContract } from "../../../../lib/finanzas/helpers"
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
// Use the same lightweight caja snapshot pattern
import { loadCaja } from "../../../../services/finanzas"
import { getJSON } from "../../../../lib/storage"
import { STORAGE_KEYS } from "../../../../lib/finanzas/constants"

function useCajaSnapshot() {
  const [entries, setEntries] = useState(() => {
    const local = getJSON(STORAGE_KEYS.CAJA)
    return Array.isArray(local) ? local : []
  })
  useEffect(() => {
    loadCaja()
      .then(cloud => { if (Array.isArray(cloud)) setEntries(cloud) })
      .catch(() => {})
  }, [])
  return entries
}

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
function calcGastoSemanaReal(workers, services, apoyos, contarApoyo, year, month, targetWeek, diasOpBase) {
  const daysInMonth = getDaysInMonth(year, month)
  const weekDays = []
  for (let dia = 1; dia <= daysInMonth; dia++) {
    const d = new Date(year, month - 1, dia)
    const w = getWeekNumberISO(d)
    if (w != null && w === targetWeek) weekDays.push({ dia, nombre: DIAS_SEMANA[d.getDay()] })
  }
  if (weekDays.length === 0) return null

  let personalCost = 0
  workers.forEach(w => {
    if (!w.name) return
    const costoDiario = (w.pagoSemanal && w.diasTrabSem > 0) ? w.pagoSemanal / w.diasTrabSem : 0
    const marcas = w.diasMarcados || {}
    weekDays.forEach(({ dia, nombre }) => {
      const marca = marcas[dia] || ""
      const isRest = w.diaDescanso && nombre === w.diaDescanso
      if (marca === "noVino") return
      if (isRest && !marca) return
      personalCost += costoDiario
    })
  })

  // Services: use custom divisor per service (same as useViabilidadCalc)
  const realDays = weekDays.length
  let servProportion = 0
  services.forEach(s => {
    if (!s.nombre) return
    const div = s.divisor || diasOpBase || Math.max(1, daysInMonth - 4)
    const costoDiario = div > 0 ? (s.pagoMensual || 0) / div : 0
    servProportion += costoDiario * realDays
  })

  const totalApoyoMensual = apoyos.filter(a => a.concepto).reduce((s, a) => s + (a.montoMensual || 0), 0)
  const apoyoProportion = contarApoyo === "SI" ? (totalApoyoMensual / daysInMonth) * realDays : 0

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
        let ganancia = 0, enCaja = 0, hasContracts = false
        contracts.forEach(ct => {
          if (ct.eliminado) return
          if ((ct.anio || currentYear) !== wYear) return
          if (ct.semana !== w) return
          hasContracts = true
          const cc = calcContract(ct)
          ganancia += cc.ganancia
          enCaja += cc.enCaja
        })

        let cajaIng = 0, cajaEgr = 0, hasCaja = false
        cajaEntries.forEach(e => {
          if (e.eliminado) return
          if (e.delNegocio === false) return
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
            data: { ganancia, enCaja, gastoSemanal, apoyo, libre, cajaIngresos: cajaIng, cajaEgresos: cajaEgr, cajaBalance: cajaIng - cajaEgr },
            viable: libre >= 0, nota: existing?.nota || "",
          })
          changed = true
        } catch (e) { logError("cierres.autoClose", e) }
      }

      // ── Monthly cierres ──
      for (const mItem of months) {
        const mNum = typeof mItem === "number" ? mItem : mItem.month
        const mYear = typeof mItem === "number" ? currentYear : mItem.year

        let ganancia = 0, enCaja = 0, hasContracts = false
        contracts.forEach(ct => {
          if (ct.eliminado) return
          if ((ct.anio || mYear) !== mYear) return
          if (ct.mes !== mNum) return
          hasContracts = true
          const cc = calcContract(ct)
          ganancia += cc.ganancia
          enCaja += cc.enCaja
        })

        let cajaIng = 0, cajaEgr = 0, hasCaja = false
        cajaEntries.forEach(e => {
          if (e.eliminado) return
          if (e.delNegocio === false) return
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
            data: { ganancia, enCaja, gastoMes, apoyo, libre, cajaIngresos: cajaIng, cajaEgresos: cajaEgr, cajaBalance: cajaIng - cajaEgr },
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
