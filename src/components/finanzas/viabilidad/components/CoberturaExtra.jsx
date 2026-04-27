import { useState, useMemo, useEffect } from "react"
import NumInput from "../../ui/NumInput"
import TextInput from "../../ui/TextInput"
import { fmtS, getDiaMarca } from "../../../../lib/finanzas/helpers"

// Auto-computed cobertura extra panel. Reads from the Tracker and worker
// calendars to detect when the shop operated on a normally-closed day.
// Also allows adding external people (not in planilla) manually.
export default function CoberturaExtra({ workers, workersCalc, calendarDays, effectiveTracker, diasOpBase, cobExtra, setCobExtra, year, month }) {
  const [open, setOpen] = useState(false)

  // Manual fields for external coverage (people not in planilla)
  const cobExtraMonto = cobExtra?.monto || 0
  const cobExtraNota = cobExtra?.nota || ""
  const cobExtraPagadoAparte = cobExtra?.pagadoAparte || false

  // Auto-detect: days where the essential worker rests but shop operated
  const autoData = useMemo(() => {
    const essential = workers.find(w => w.name && w.negocioDepende)
    if (!essential || !essential.diaDescanso) return { dias: 0, quienCubrio: [] }

    const restDayName = essential.diaDescanso
    let diasCubiertos = 0
    const quienCubrio = new Map() // name → count

    calendarDays.forEach(d => {
      if (d.nombre !== restDayName) return
      const trackerState = effectiveTracker[d.dia]
      // If tracker says "Operó" on a rest day, someone covered
      if (trackerState !== "Operó") return

      diasCubiertos++
      // Find who worked that day from worker calendars
      workersCalc.forEach(w => {
        if (!w.name) return
        const marca = getDiaMarca(w, year, month, d.dia)
        const isTheirRest = w.diaDescanso && d.nombre === w.diaDescanso
        if (isTheirRest && (marca === "trabajo" || marca === "tienda")) {
          quienCubrio.set(w.name, (quienCubrio.get(w.name) || 0) + 1)
        } else if (!isTheirRest && marca !== "noVino") {
          // Normal work day for this worker and they showed up
          quienCubrio.set(w.name, (quienCubrio.get(w.name) || 0) + 1)
        }
      })
    })

    return {
      dias: diasCubiertos,
      quienCubrio: [...quienCubrio.entries()].map(([name, count]) => ({ name, count })),
      restDay: restDayName,
      essentialName: essential.name,
    }
  }, [workers, workersCalc, calendarDays, effectiveTracker, year, month])

  // Sync auto-detected days into cobExtra.dias so useViabilidadCalc includes them in diasOpBase
  useEffect(() => {
    if ((cobExtra?.dias || 0) !== autoData.dias) setCobExtra("dias", autoData.dias)
  }, [autoData.dias, cobExtra?.dias, setCobExtra])

  const totalDias = autoData.dias + (cobExtra?.diasExterno || 0)

  return (
    <div className={`mt-5 rounded-xl border overflow-hidden transition-all ${open ? "bg-zinc-900 border-amber-500/60 shadow-lg shadow-amber-500/10" : "bg-zinc-800/60 border-amber-500/30"}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full px-4 py-3 flex items-center justify-between transition-all ${open ? "bg-amber-500/10 border-b border-amber-500/30" : "hover:bg-zinc-700/40"}`}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-amber-400">👤 Cobertura extra</h3>
          {totalDias > 0 && !open && (
            <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
              {totalDias} día{totalDias !== 1 ? "s" : ""} cubiertos
            </span>
          )}
        </div>
        <span className={`text-amber-400 text-sm font-bold transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          {/* Auto-detected coverage */}
          {autoData.dias > 0 ? (
            <div className="mt-3 mb-4">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Detectado del Tracker + Calendario</div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <div className="text-sm text-zinc-300 mb-2">
                  La tienda normalmente cierra los <strong className="text-amber-400">{autoData.restDay}</strong> (descanso de {autoData.essentialName}),
                  pero operó <strong className="text-emerald-400">{autoData.dias} día{autoData.dias !== 1 ? "s" : ""}</strong> este mes.
                </div>
                {autoData.quienCubrio.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {autoData.quienCubrio.map(({ name, count }) => (
                      <span key={name} className="text-xs bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/30 font-semibold">
                        {name}: {count} día{count !== 1 ? "s" : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 my-3">
              No se detectaron días cubiertos. Marcá "Operó" en el Tracker en los días de descanso que la tienda abrió.
            </p>
          )}

          {/* Manual: external person coverage */}
          <div className="border-t border-zinc-700/40 pt-4 mt-2">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Cobertura externa (fuera de planilla)</div>
            <p className="text-xs text-zinc-500 mb-3">Si alguien que no está en la lista cubrió algún día.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Días cubiertos</label>
                <NumInput value={cobExtra?.diasExterno || 0} onChange={v => setCobExtra("diasExterno", v || 0)} min={0} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Monto total pagado (S/)</label>
                <NumInput value={cobExtraMonto} onChange={v => setCobExtra("monto", v || 0)} min={0} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">¿Pago aparte?</label>
                <button onClick={() => setCobExtra("pagadoAparte", !cobExtraPagadoAparte)}
                  className={`w-full rounded-lg px-3 py-2 text-xs border transition-all flex items-center gap-2 ${cobExtraPagadoAparte ? "bg-amber-500/15 border-amber-500/40 text-amber-400" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[9px] font-bold shrink-0 ${cobExtraPagadoAparte ? "border-amber-500 bg-amber-500/20 text-amber-400" : "border-zinc-600"}`}>{cobExtraPagadoAparte ? "✓" : ""}</span>
                  {cobExtraPagadoAparte ? "Sí, pagado aparte" : "No, incluido"}
                </button>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Nota</label>
                <TextInput value={cobExtraNota} onChange={v => setCobExtra("nota", v)} placeholder="Ej: Vino el primo" />
              </div>
            </div>
          </div>

          {/* Summary */}
          {totalDias > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-700/40">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Resumen total</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/40">
                  <div className="text-[10px] text-zinc-500 uppercase">Total días cubiertos</div>
                  <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">{totalDias}</div>
                  <div className="text-[9px] text-zinc-600">{autoData.dias} auto + {cobExtra?.diasExterno || 0} externo</div>
                </div>
                <div className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/40">
                  <div className="text-[10px] text-zinc-500 uppercase">Días op. con cobertura</div>
                  <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">{diasOpBase}</div>
                </div>
                <div className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/40">
                  <div className="text-[10px] text-zinc-500 uppercase">Costo externo</div>
                  <div className={`text-sm font-mono font-bold mt-0.5 ${cobExtraPagadoAparte && cobExtraMonto > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {cobExtraPagadoAparte && cobExtraMonto > 0 ? `+${fmtS(cobExtraMonto)}` : "S/ 0"}
                  </div>
                </div>
                <div className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/40">
                  <div className="text-[10px] text-zinc-500 uppercase">Quién cubrió</div>
                  <div className="text-xs font-semibold text-zinc-300 mt-0.5">
                    {autoData.quienCubrio.length > 0 ? autoData.quienCubrio.map(q => q.name).join(", ") : "—"}
                    {(cobExtra?.diasExterno || 0) > 0 ? " + externo" : ""}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
