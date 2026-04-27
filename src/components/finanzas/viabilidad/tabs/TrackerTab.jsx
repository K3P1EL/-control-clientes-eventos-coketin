import { useCallback } from "react"
import Card from "../../ui/Card"
import { MESES, DIAS_SEMANA } from "../../../../lib/finanzas/constants"

const STATE_COLORS = {
  "Operó": "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
  "Descanso": "bg-amber-500/20 border-amber-500/40 text-amber-300",
  "Feriado": "bg-red-500/20 border-red-500/40 text-red-300",
  "Cerrado": "bg-zinc-700/40 border-zinc-600/40 text-zinc-400",
}

// Per-day calendar where the user marks what really happened.
// Past days are auto-filled (Operó or Descanso) but every cell is overridable.
export default function TrackerTab({
  year, setYear, month, setMonth,
  diasCalendario, diasOpBase, calendarDays,
  tracker, effectiveTracker, setTrackerData,
  tiendaConfig, setTiendaConfig,
}) {
  const diasDescansoTienda = tiendaConfig?.diasDescansoSemanal || []
  const toggleDiaDescanso = (dia) => {
    const set = new Set(diasDescansoTienda)
    if (set.has(dia)) set.delete(dia)
    else set.add(dia)
    setTiendaConfig({ ...(tiendaConfig || {}), diasDescansoSemanal: [...set] })
  }
  const ORDEN_SEMANAL = [...DIAS_SEMANA.slice(1), DIAS_SEMANA[0]]
  const updateTracker = useCallback((dia, val) => {
    setTrackerData(prev => {
      const key = `${year}-${month}`
      const current = prev[key] || {}
      const updated = { ...current, [dia]: val === current[dia] ? "" : val }
      return { ...prev, [key]: updated }
    })
  }, [year, month, setTrackerData])

  const semanas = [...new Set(calendarDays.map(d => d.semana))]

  return (
    <Card title="Tracker del mes" icon="📅" accent="sky">
      {/* Patrón semanal de la tienda — vive acá para que esté junto al
          calendario que afecta. Cambiar un día acá modifica el auto-llenado
          de los días futuros (los pasados ya están congelados). */}
      <div className="mb-5 bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/40">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            🏪 Patrón semanal de la tienda
          </h3>
          <span className="text-[10px] text-zinc-500">
            Días que la tienda no opera por default
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {ORDEN_SEMANAL.map(dia => {
            const active = diasDescansoTienda.includes(dia)
            return (
              <button key={dia} onClick={() => toggleDiaDescanso(dia)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  active
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                    : "bg-zinc-800/60 text-zinc-500 border-zinc-700 hover:text-zinc-300 hover:border-zinc-600"
                }`}>
                {active ? "✓" : ""} {dia}
              </button>
            )
          })}
        </div>
        {diasDescansoTienda.length === 0 && (
          <p className="mt-2 text-[11px] text-zinc-500 italic">Sin descansos — la tienda opera los 7 días.</p>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => { if (month === 1) { setMonth(12); setYear(year - 1) } else setMonth(month - 1) }}
          className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all text-lg">‹</button>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-200 font-semibold focus:outline-none focus:border-sky-500/60 appearance-none cursor-pointer text-center">
            {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-200 font-semibold focus:outline-none focus:border-sky-500/60 appearance-none cursor-pointer text-center">
            {Array.from({ length: year - 2020 + 2 }, (_, i) => 2020 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="text-[10px] text-zinc-500 ml-1">{diasCalendario}d · {diasOpBase} op.</div>
        </div>
        <button onClick={() => { if (month === 12) { setMonth(1); setYear(year + 1) } else setMonth(month + 1) }}
          className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all text-lg">›</button>
      </div>
      <div className="mb-4 flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500/60 inline-block"></span>Operó</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500/60 inline-block"></span>Descanso</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500/60 inline-block"></span>Feriado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-zinc-600/60 inline-block"></span>Cerrado</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block"></span>Editado</span>
      </div>
      <div className="mb-3 text-[10px] text-zinc-600">{(() => { const n = new Date(); return year === n.getFullYear() && month === (n.getMonth() + 1) ? "Días pasados se llenan auto. Solo editá lo que fue diferente." : "Mes anterior — editá manualmente los días que necesites." })()}</div>
      <div className="space-y-1">
        {semanas.map(sem => (
          <div key={sem}>
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1 mt-3">Semana {sem}</div>
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.filter(d => d.semana === sem).map(d => {
                const st = effectiveTracker[d.dia] || ""
                const isOverride = !!tracker[d.dia]
                return (
                  <div key={d.dia} className={`rounded-xl border p-2 cursor-pointer transition-all ${STATE_COLORS[st] || "bg-zinc-800/40 border-zinc-700/40 text-zinc-500 hover:border-zinc-600"}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-base font-bold font-mono">{d.dia}</span>
                      <div className="flex items-center gap-1">
                        {isOverride && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" title="Editado"></span>}
                        <span className="text-[9px] uppercase">{d.nombre.slice(0, 3)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {["Operó", "Descanso", "Feriado", "Cerrado"].map(opt => (
                        <button key={opt} onClick={() => updateTracker(d.dia, opt)}
                          className={`text-[8px] px-1.5 py-0.5 rounded-md transition-all ${st === opt ? "opacity-100 font-bold" : "opacity-40 hover:opacity-70"} ${opt === "Operó" ? "bg-emerald-500/30" : opt === "Descanso" ? "bg-amber-500/30" : opt === "Feriado" ? "bg-red-500/30" : "bg-zinc-600/30"}`}>
                          {opt.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/50">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">📖 Reglas del tracker</h3>
        <div className="text-xs text-zinc-500 space-y-1.5 leading-relaxed">
          <p><strong className="text-zinc-400">Patrón semanal</strong> = qué hace la tienda <em>normalmente</em>. Aplica a días futuros y a pasados que aún no se editaron.</p>
          <p><strong className="text-zinc-400">Calendario</strong> = qué pasó/pasa cada día específico. Override puntual.</p>
          <p>—</p>
          <p>📌 <strong className="text-zinc-400">Día pasado:</strong> queda <strong>congelado</strong> con lo que mostraba — cambiar el patrón después <strong>NO lo reescribe</strong>.</p>
          <p>📌 <strong className="text-zinc-400">Día futuro:</strong> usa el patrón actual; si lo editás, queda fijo desde ese momento.</p>
          <p>📌 <strong className="text-zinc-400">Override (puntito 🔵):</strong> click en cualquier botón → ese día queda <em>fijado</em> a esa elección, ignora el patrón.</p>
          <p>📌 <strong className="text-zinc-400">Cambiar el patrón</strong> (arriba): solo afecta días que <strong>aún no pasaron</strong>. El historial nunca se modifica.</p>
          <p>—</p>
          <p>💡 <strong className="text-zinc-400">Casos típicos:</strong></p>
          <p>· "Este domingo abrí extra" → click en ese día → "Operó"</p>
          <p>· "Cerré el martes 28 por inventario" → click → "Cerrado"</p>
          <p>· "Cambié de día de descanso permanente" → editá el patrón arriba</p>
          <p>· "Es 1 de mayo, feriado" → click en el día 1 → "Feriado"</p>
        </div>
      </div>
    </Card>
  )
}
