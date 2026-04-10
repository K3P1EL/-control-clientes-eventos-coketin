import { useState, useMemo } from "react"
import { MESES } from "../../../../lib/finanzas/constants"
import { peruNow, getWeekNumberISO, calcContract, parseLocalDate, fmtS } from "../../../../lib/finanzas/helpers"
import { useContratosSnapshot } from "../../caja/hooks/useContratosSnapshot"

// "Jalar datos de contratos" — a collapsible panel that reads contracts
// from Supabase, lets the user pick a period, and auto-fills the caja
// inputs with one click. Hidden by default behind a button.
export default function JalarContratos({ setCajaSemanaSol, setCajaAcumMes, target, setTarget, semSel, setSemSel, mesSel, setMesSel }) {
  const contracts = useContratosSnapshot()
  const [open, setOpen] = useState(false)
  const now = peruNow()
  const currentWeek = getWeekNumberISO(now)
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const activeContracts = useMemo(() => contracts.filter(c => !c.eliminado), [contracts])

  // Available weeks/months from loaded contracts
  const semanas = useMemo(() => {
    const set = new Set()
    for (let i = 1; i <= currentWeek; i++) set.add(i)
    activeContracts.forEach(c => { if (c.semana) set.add(c.semana) })
    return [...set].sort((a, b) => a - b)
  }, [activeContracts, currentWeek])

  const meses = useMemo(() => {
    const set = new Set()
    for (let i = 1; i <= currentMonth; i++) set.add(i)
    activeContracts.forEach(c => { if (c.mes) set.add(c.mes) })
    return [...set].sort((a, b) => a - b)
  }, [activeContracts, currentMonth])

  // Calculate summary for selected period
  const data = useMemo(() => {
    if (!activeContracts.length) return null

    const dateInPeriod = (dateStr) => {
      const d = parseLocalDate(dateStr)
      if (!d || isNaN(d)) return false
      if (d.getFullYear() !== currentYear) return false
      if (target === "semanal") return getWeekNumberISO(d) === semSel
      if (target === "mensual") return d.getMonth() + 1 === mesSel
      return false
    }
    const getHomeDate = (c) => {
      if (!c.noTrackAdel && c.fechaAdel && c.fechaAdel !== "no trackeado" && c.fechaAdel.trim() !== "") return c.fechaAdel
      return c.fechaCobro || null
    }

    let registros = 0, deNuevos = 0, deAnteriores = 0, descuentos = 0, pendiente = 0
    activeContracts.forEach(c => {
      const homeDate = getHomeDate(c)
      const isHome = homeDate ? dateInPeriod(homeDate) : false
      const cobroInPeriod = dateInPeriod(c.fechaCobro)

      if (isHome) {
        registros++
        const valor = (c.total || 0) - (c.descuento || 0)
        deNuevos += valor
        descuentos += c.descuento || 0
        pendiente += calcContract(c).pendiente
      } else if (cobroInPeriod && (c.cobro || 0) > 0) {
        deAnteriores += c.cobro || 0
      }
    })
    const ganancia = deNuevos + deAnteriores
    const enCaja = ganancia - pendiente
    return { ganancia, enCaja, deNuevos, deAnteriores, descuentos, pendiente, count: registros }
  }, [activeContracts, target, semSel, mesSel, currentYear])

  if (!contracts.length) return null

  const setVal = target === "semanal" ? setCajaSemanaSol : setCajaAcumMes
  const targetLabel = target === "semanal" ? "Caja semanal" : "Caja mes"

  const pillStyle = (active) => ({
    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
    border: active ? "1px solid rgba(14,165,233,0.4)" : "1px solid #3f3f46",
    background: active ? "rgba(14,165,233,0.15)" : "#27272a",
    color: active ? "#38bdf8" : "#71717a", whiteSpace: "nowrap",
  })

  const navBtn = { width: 28, height: 28, borderRadius: 8, border: "1px solid #3f3f46", background: "#27272a", color: "#a1a1aa", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }

  const selStyle = { background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8, padding: "6px 12px", fontSize: 13, color: "#e4e4e7", cursor: "pointer" }

  return (
    <div className="mt-4 pt-3 border-t border-zinc-800/60">
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400 text-sm hover:bg-sky-500/20 transition-all flex items-center gap-2 font-semibold"
      >
        📊 Jalar datos de contratos
        <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="mt-3 bg-zinc-800/40 rounded-xl border border-sky-500/20 p-4">
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
                    const cnt = activeContracts.filter(c => c.semana === s).length
                    return <option key={s} value={s}>Semana {s} ({cnt} contrato{cnt !== 1 ? "s" : ""})</option>
                  })}
                </select>
                <button onClick={() => setSemSel(semSel + 1)} style={navBtn}>›</button>
              </>
            ) : (
              <>
                <button onClick={() => mesSel > 1 && setMesSel(mesSel - 1)} style={navBtn}>‹</button>
                <select value={mesSel} onChange={e => setMesSel(+e.target.value)} style={selStyle}>
                  {meses.map(m => {
                    const cnt = activeContracts.filter(c => c.mes === m).length
                    return <option key={m} value={m}>{MESES[m]} ({cnt} contrato{cnt !== 1 ? "s" : ""})</option>
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
                {data.count} contratos — tocá un valor → llena <span className="text-sky-400 font-bold">{targetLabel}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Ganancia", value: data.ganancia, color: "text-emerald-400", border: "border-emerald-500/30", bg: "hover:bg-emerald-500/10", sub: "Total − descuentos" },
                  { label: "En caja", value: data.enCaja, color: "text-sky-400", border: "border-sky-500/30", bg: "hover:bg-sky-500/10", sub: "Ganancia − pendiente" },
                  { label: "De contratos nuevos", value: data.deNuevos, color: "text-cyan-400", border: "border-cyan-500/30", bg: "hover:bg-cyan-500/10", sub: "Registrados este periodo" },
                  { label: "De anteriores", value: data.deAnteriores, color: "text-amber-400", border: "border-amber-500/30", bg: "hover:bg-amber-500/10", sub: "Cobros de periodos previos" },
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
            <div className="text-xs text-zinc-600">Sin contratos en este periodo</div>
          )}
        </div>
      )}
    </div>
  )
}
