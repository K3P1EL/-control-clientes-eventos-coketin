import { useState, useEffect, useMemo } from "react"
import { MESES, STORAGE_KEYS } from "../../../../lib/finanzas/constants"
import { peruNow, getWeekNumberISO, parseLocalDate, fmtS } from "../../../../lib/finanzas/helpers"
import { loadCaja } from "../../../../services/finanzas"
import { getJSON } from "../../../../lib/storage"
import { logError } from "../../../../lib/logger"

const navBtn = { width: 28, height: 28, borderRadius: 8, border: "1px solid #3f3f46", background: "#27272a", color: "#a1a1aa", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }
const selStyle = { background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8, padding: "6px 12px", fontSize: 13, color: "#e4e4e7", cursor: "pointer" }

// Lightweight read-only snapshot of Caja entries (same pattern as
// useContratosSnapshot). Reads localStorage instantly, refreshes from
// Supabase in background.
function useCajaSnapshot() {
  const [entries, setEntries] = useState(() => {
    const local = getJSON(STORAGE_KEYS.CAJA)
    return Array.isArray(local) ? local : []
  })

  useEffect(() => {
    let cancelled = false
    loadCaja()
      .then(cloud => {
        if (cancelled) return
        if (Array.isArray(cloud)) setEntries(cloud)
      })
      .catch(e => logError("viabilidad.cajaSnapshot", e))
    return () => { cancelled = true }
  }, [])

  return entries
}

// "Jalar datos de Caja" — collapsible panel that reads the real cash
// entries, filters by period, and shows clickable metric cards to
// auto-fill Caja semanal or Caja mes acumulado in Viabilidad.
export default function JalarCaja({ setCajaSemanaSol, setCajaAcumMes, target, setTarget, semSel, setSemSel, mesSel, setMesSel }) {
  const entries = useCajaSnapshot()
  const [open, setOpen] = useState(false)
  const now = peruNow()
  const currentWeek = getWeekNumberISO(now)
  const currentMonth = now.getMonth() + 1

  const activeEntries = useMemo(() => entries.filter(e => !e.eliminado), [entries])

  // Available weeks/months
  const semanas = useMemo(() => {
    const set = new Set()
    for (let i = 1; i <= currentWeek; i++) set.add(i)
    activeEntries.forEach(e => {
      if (!e.fecha) return
      const w = getWeekNumberISO(parseLocalDate(e.fecha))
      if (w) set.add(w)
    })
    return [...set].sort((a, b) => a - b)
  }, [activeEntries, currentWeek])

  const meses = useMemo(() => {
    const set = new Set()
    for (let i = 1; i <= currentMonth; i++) set.add(i)
    activeEntries.forEach(e => {
      if (!e.fecha) return
      const pd = parseLocalDate(e.fecha); const m = pd ? pd.getMonth() + 1 : null
      if (m) set.add(m)
    })
    return [...set].sort((a, b) => a - b)
  }, [activeEntries, currentMonth])

  // Calculate metrics for selected period
  const data = useMemo(() => {
    if (!activeEntries.length) return null

    const inPeriod = (fecha) => {
      if (!fecha) return false
      const d = parseLocalDate(fecha)
      if (!d) return false
      if (target === "semanal") return getWeekNumberISO(d) === semSel
      if (target === "mensual") return (d.getMonth() + 1) === mesSel
      return false
    }

    let ingNeg = 0, egrNeg = 0, ingCont = 0, egrCont = 0, ingTotal = 0, egrTotal = 0, count = 0

    activeEntries.forEach(e => {
      if (!inPeriod(e.fecha)) return
      if (e.tipo === "traspaso") return
      if (e.gastoAjeno) return // exclude non-business expenses from viability
      count++
      const m = e.monto || 0
      const isNeg = e.delNegocio !== false
      const isCont = isNeg && e.deContrato

      if (e.tipo === "ingreso") {
        ingTotal += m
        if (isNeg) ingNeg += m
        if (isCont) ingCont += m
      } else if (e.tipo === "egreso") {
        egrTotal += m
        if (isNeg) egrNeg += m
        if (isCont) egrCont += m
      }
    })

    return {
      count,
      ingresosNeg: ingNeg,
      balanceNeg: ingNeg - egrNeg,
      ingresosCont: ingCont - egrCont,
      balanceTotal: ingTotal - egrTotal,
    }
  }, [activeEntries, target, semSel, mesSel])

  if (!entries.length) return null

  const setVal = target === "semanal" ? setCajaSemanaSol : setCajaAcumMes
  const targetLabel = target === "semanal" ? "Caja semanal" : "Caja mes"

  const pillStyle = (active) => ({
    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
    border: active ? "1px solid rgba(16,185,129,0.4)" : "1px solid #3f3f46",
    background: active ? "rgba(16,185,129,0.15)" : "#27272a",
    color: active ? "#34d399" : "#71717a", whiteSpace: "nowrap",
  })

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm hover:bg-emerald-500/20 transition-all flex items-center gap-2 font-semibold"
      >
        💰 Jalar datos de Caja
        <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="mt-3 bg-zinc-800/40 rounded-xl border border-emerald-500/20 p-4">
          {/* Target selector */}
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Llenar →</span>
            {["semanal", "mensual"].map(t => (
              <button key={t} onClick={() => setTarget(t)} style={pillStyle(target === t)}>
                {t === "semanal" ? "💵 Caja semanal" : "🏦 Caja mes"}
              </button>
            ))}
          </div>

          {/* Period navigator */}
          <div className="flex items-center gap-2 mb-3">
            {target === "semanal" ? (
              <>
                <button onClick={() => semSel > 1 && setSemSel(semSel - 1)} style={navBtn}>‹</button>
                <select value={semSel} onChange={e => setSemSel(+e.target.value)} style={selStyle}>
                  {semanas.map(s => {
                    const cnt = activeEntries.filter(e => { if (!e.fecha) return false; return getWeekNumberISO(parseLocalDate(e.fecha)) === s }).length
                    return <option key={s} value={s}>Semana {s} ({cnt} movimiento{cnt !== 1 ? "s" : ""})</option>
                  })}
                </select>
                <button onClick={() => setSemSel(semSel + 1)} style={navBtn}>›</button>
              </>
            ) : (
              <>
                <button onClick={() => mesSel > 1 && setMesSel(mesSel - 1)} style={navBtn}>‹</button>
                <select value={mesSel} onChange={e => setMesSel(+e.target.value)} style={selStyle}>
                  {meses.map(m => {
                    const cnt = activeEntries.filter(e => { const pd = parseLocalDate(e.fecha); return pd && (pd.getMonth() + 1) === m }).length
                    return <option key={m} value={m}>{MESES[m]} ({cnt} movimiento{cnt !== 1 ? "s" : ""})</option>
                  })}
                </select>
                <button onClick={() => mesSel < 12 && setMesSel(mesSel + 1)} style={navBtn}>›</button>
              </>
            )}
          </div>

          {/* Clickable metric cards */}
          {data && data.count > 0 && (
            <>
              <div className="text-[10px] text-zinc-500 mb-2">
                {data.count} movimientos — tocá un valor → llena <span className="text-emerald-400 font-bold">{targetLabel}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Ingresos negocio", value: data.ingresosNeg, color: "text-emerald-400", border: "border-emerald-500/30", bg: "hover:bg-emerald-500/10", sub: "🏪 Solo del negocio" },
                  { label: "Balance negocio", value: data.balanceNeg, color: "text-sky-400", border: "border-sky-500/30", bg: "hover:bg-sky-500/10", sub: "🏪 Ingresos − egresos negocio" },
                  { label: "Ingresos contrato", value: data.ingresosCont, color: "text-cyan-400", border: "border-cyan-500/30", bg: "hover:bg-cyan-500/10", sub: "📋 Solo del contrato (neto)" },
                  { label: "Balance total", value: data.balanceTotal, color: "text-amber-400", border: "border-amber-500/30", bg: "hover:bg-amber-500/10", sub: "Todo: negocio + externo" },
                ].map(m => (
                  <button key={m.label} onClick={() => setVal(m.value)}
                    className={`bg-zinc-800/40 rounded-lg p-3 border ${m.border} text-left transition-all cursor-pointer ${m.bg} active:scale-95`}>
                    <div className="text-[10px] text-zinc-500 uppercase">{m.label}</div>
                    <div className={`text-base font-mono font-bold ${m.color} mt-0.5`}>{fmtS(m.value)}</div>
                    <div className="text-[9px] text-zinc-600 mt-1">{m.sub}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {data && data.count === 0 && (
            <div className="text-xs text-zinc-600">Sin movimientos en este periodo</div>
          )}
        </div>
      )}
    </div>
  )
}
