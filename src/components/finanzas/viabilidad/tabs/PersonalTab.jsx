import React, { useState, useCallback } from "react"
import Card from "../../ui/Card"
import NumInput from "../../ui/NumInput"
import TextInput from "../../ui/TextInput"
import Select from "../../ui/Select"
import { fmt } from "../../../../lib/finanzas/helpers"
import WorkerCalendar from "../components/WorkerCalendar"

// Personal table + per-worker calendar + weekday rest summary.
// `workers` is the raw state, `workersCalc` are the derived numbers.
export default function PersonalTab({
  workers, setWorkers, workersCalc, totalPersonal,
  calendarDays, effectiveTracker, year, month, resumenDescansos,
}) {
  const [expandedWorker, setExpandedWorker] = useState(null)

  const updateWorker = useCallback((idx, field, val) => {
    setWorkers(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val }; return n })
  }, [setWorkers])

  const updateWorkerDay = useCallback((workerIdx, dia, isRestDay) => {
    setWorkers(prev => {
      const n = [...prev]
      const w = { ...n[workerIdx] }
      const m = { ...(w.diasMarcados || {}) }
      const current = m[dia] || ""
      if (isRestDay) {
        if (!current) m[dia] = "trabajo"
        else if (current === "trabajo") m[dia] = "tienda"
        else delete m[dia]
      } else {
        if (!current) m[dia] = "noVino"
        else delete m[dia]
      }
      w.diasMarcados = m
      n[workerIdx] = w
      return n
    })
  }, [setWorkers])

  const addWorker = useCallback(() => {
    setWorkers(prev => [...prev, { name: "", pagoSemanal: 0, diasTrabSem: 6, diaDescanso: "", extrasNoTrabajo: 0, extrasTrabajoExtra: 0, extrasTrabajoTienda: 0, diasMarcados: {}, negocioDepende: false }])
  }, [setWorkers])

  const removeWorker = useCallback((idx) => {
    setWorkers(prev => prev.filter((_, i) => i !== idx))
  }, [setWorkers])

  return (
    <Card title="Personal semanal" icon="👷" accent="amber">
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 uppercase tracking-wider">
              <th className="text-left py-2 pr-2">Nombre</th>
              <th className="text-right px-2">Pago sem.</th>
              <th className="text-right px-2">Días/sem</th>
              <th className="text-left px-2">Descanso</th>
              <th className="text-center px-2" title="Si este trabajador descansa, la tienda cierra">🏪</th>
              <th className="text-right px-2">Desc. mes</th>
              <th className="text-right px-2">Extra no trab.</th>
              <th className="text-right px-2">Extra trab.</th>
              <th className="text-right px-2">Extra tienda</th>
              <th className="text-right px-2">Días proj.</th>
              <th className="text-right px-2">Días real.</th>
              <th className="text-right px-2">$/día</th>
              <th className="text-right px-2">$ mes proj.</th>
              <th className="text-right px-2">$ mes real</th>
              <th className="text-center px-2">⊘</th>
            </tr>
          </thead>
          <tbody>
            {workersCalc.map((w, i) => (
              <React.Fragment key={i}>
                <tr className="border-t border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setExpandedWorker(expandedWorker === i ? null : i)}
                        aria-expanded={expandedWorker === i}
                        aria-label={`Calendario de ${w.name || "trabajador"}`}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all shrink-0 ${expandedWorker === i ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300"}`}>
                        {expandedWorker === i ? "▾" : "▸"}
                      </button>
                      <TextInput value={w.name} onChange={v => updateWorker(i, "name", v)} placeholder="Nombre" />
                    </div>
                  </td>
                  <td className="px-2"><NumInput value={workers[i].pagoSemanal} onChange={v => updateWorker(i, "pagoSemanal", v)} /></td>
                  <td className="px-2"><NumInput value={workers[i].diasTrabSem} onChange={v => updateWorker(i, "diasTrabSem", v)} min={1} /></td>
                  <td className="px-2"><Select value={workers[i].diaDescanso} onChange={v => updateWorker(i, "diaDescanso", v)} options={["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]} /></td>
                  <td className="px-2 text-center">{(() => {
                    const hayEncargado = workers.some((ww, ii) => ii !== i && ww.negocioDepende)
                    const esEste = workers[i].negocioDepende
                    const disabled = hayEncargado && !esEste
                    return (
                      <button onClick={() => !disabled && updateWorker(i, "negocioDepende", !esEste)}
                        className={`w-7 h-7 rounded-lg border-2 transition-all flex items-center justify-center text-xs font-bold ${esEste ? "bg-sky-500/20 border-sky-500 text-sky-400" : disabled ? "border-zinc-700/40 text-transparent cursor-not-allowed opacity-30" : "border-zinc-600 text-transparent hover:border-zinc-500 cursor-pointer"}`}>
                        {esEste ? "✓" : ""}
                      </button>
                    )
                  })()}</td>
                  <td className="px-2 text-right text-zinc-400 font-mono">{w.descMes}</td>
                  <td className="px-2"><NumInput value={workers[i].extrasNoTrabajo} onChange={v => updateWorker(i, "extrasNoTrabajo", v)} /></td>
                  <td className="px-2"><NumInput value={workers[i].extrasTrabajoExtra} onChange={v => updateWorker(i, "extrasTrabajoExtra", v)} /></td>
                  <td className="px-2"><NumInput value={workers[i].extrasTrabajoTienda} onChange={v => updateWorker(i, "extrasTrabajoTienda", v)} /></td>
                  <td className="px-2 text-right text-zinc-400 font-mono">{w.diasProj}</td>
                  <td className="px-2 text-right text-zinc-300 font-mono font-semibold">{w.diasReales}</td>
                  <td className="px-2 text-right text-sky-400 font-mono">{fmt(w.costoDiario)}</td>
                  <td className="px-2 text-right text-zinc-400 font-mono">{fmt(w.costoMesProj)}</td>
                  <td className="px-2 text-right text-zinc-200 font-mono font-semibold">{fmt(w.costoMesReal)}</td>
                  <td className="px-2 text-center"><button onClick={() => removeWorker(i)} className="text-red-400/60 hover:text-red-400 transition-colors text-lg">×</button></td>
                </tr>
                {expandedWorker === i && (
                  <tr>
                    <td colSpan={15} className="p-0">
                      <WorkerCalendar
                        worker={w}
                        calendarDays={calendarDays}
                        effectiveTracker={effectiveTracker}
                        year={year}
                        month={month}
                        onDayClick={(dia, isRest) => updateWorkerDay(i, dia, isRest)}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-700 font-semibold text-zinc-200">
              <td className="py-2 pr-2">Total</td>
              <td className="px-2 text-right font-mono">{fmt(totalPersonal.pagoSemanal, 0)}</td>
              <td></td><td></td><td></td>
              <td className="px-2 text-right font-mono">{totalPersonal.descMes}</td>
              <td className="px-2 text-right font-mono">{totalPersonal.extrasNo}</td>
              <td className="px-2 text-right font-mono">{totalPersonal.extrasWork}</td>
              <td className="px-2 text-right font-mono">{totalPersonal.extrasTienda}</td>
              <td className="px-2 text-right font-mono">{totalPersonal.diasProj}</td>
              <td className="px-2 text-right font-mono">{totalPersonal.diasReales}</td>
              <td className="px-2 text-right text-sky-400 font-mono">{fmt(totalPersonal.costoDiario)}</td>
              <td className="px-2 text-right font-mono">{fmt(totalPersonal.costoMesProj)}</td>
              <td className="px-2 text-right font-mono">{fmt(totalPersonal.costoMesReal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button onClick={addWorker} className="mt-4 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm hover:bg-amber-500/20 transition-all">+ Agregar trabajador</button>
      <div className="mt-6 pt-4 border-t border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Resumen de descansos fijos por día</h3>
        <div className="grid grid-cols-7 gap-2">
          {resumenDescansos.map(r => (
            <div key={r.dia} className={`rounded-xl p-3 text-center border ${r.descansosProyectados > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-zinc-800/40 border-zinc-700/40"}`}>
              <div className="text-xs font-medium text-zinc-400">{r.dia.slice(0, 3)}</div>
              <div className="text-lg font-bold font-mono mt-1 text-zinc-200">{r.descansosProyectados}</div>
              <div className="text-[10px] text-zinc-600 mt-0.5">{r.trabajadores} trab. × {r.vecesMes}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
