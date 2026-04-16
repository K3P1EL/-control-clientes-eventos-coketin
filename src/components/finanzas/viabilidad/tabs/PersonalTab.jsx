import React, { useState, useCallback, useMemo } from "react"
import Card from "../../ui/Card"
import NumInput from "../../ui/NumInput"
import TextInput from "../../ui/TextInput"
import Select from "../../ui/Select"
import { fmt, fmtS, peruNow, getWeekNumberISO, isActiveOnDate } from "../../../../lib/finanzas/helpers"
import WorkerCalendar from "../components/WorkerCalendar"
import PeriodosEditor from "../components/PeriodosEditor"

const TONE_BADGE = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sky: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  zinc: "bg-zinc-700/30 text-zinc-400 border-zinc-600/40",
}

function WeeklyPaySummary({ workersCalc, calendarDays, year, month }) {
  const now = peruNow()
  const currentWeek = getWeekNumberISO(now)
  const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1)

  const summary = useMemo(() => {
    if (!isCurrentMonth) return null
    const weekDays = calendarDays.filter(d => {
      const date = new Date(year, month - 1, d.dia)
      return getWeekNumberISO(date) === currentWeek
    })
    if (weekDays.length === 0) return null

    const rows = workersCalc.filter(w => w.name).map(w => {
      const marcas = w.diasMarcados || {}
      let diasTrabajados = 0
      let diasFaltados = 0
      weekDays.forEach(d => {
        const fecha = new Date(year, month - 1, d.dia)
        if (!isActiveOnDate(w, fecha)) return
        const marca = marcas[d.dia] || ""
        const isRest = w.diaDescanso && d.nombre === w.diaDescanso
        if (marca === "noVino") { diasFaltados++; return }
        if (isRest && !marca) return
        diasTrabajados++
      })
      const pago = diasTrabajados * w.costoDiario
      const pagoCompleto = w.pagoSemanal
      return { name: w.name, diasTrabajados, diasFaltados, costoDiario: w.costoDiario, pago, pagoCompleto }
    }).filter(r => r.diasTrabajados > 0 || r.diasFaltados > 0)

    const total = rows.reduce((s, r) => s + r.pago, 0)
    const totalPresupuestado = rows.reduce((s, r) => s + r.pagoCompleto, 0)
    return { rows, total, totalPresupuestado, weekDays: weekDays.length }
  }, [isCurrentMonth, calendarDays, workersCalc, year, month, currentWeek])

  if (!summary) return null

  const hayDiferencia = summary.total !== summary.totalPresupuestado

  return (
    <div className="mt-5 pt-4 border-t border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider flex items-center gap-2">
        💵 Pago esta semana <span className="text-zinc-600 font-normal normal-case">(Semana {currentWeek})</span>
      </h3>
      <div className="bg-zinc-800/40 rounded-xl border border-zinc-700/40 overflow-hidden">
        <div className="divide-y divide-zinc-700/30">
          {summary.rows.map(r => (
            <div key={r.name} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-zinc-200 w-24">{r.name}</span>
                <span className="text-xs text-zinc-500 font-mono">
                  {r.diasTrabajados}d × S/{fmt(r.costoDiario, 0)}
                </span>
                {r.diasFaltados > 0 && (
                  <span className="text-[10px] font-semibold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-lg">
                    faltó {r.diasFaltados}
                  </span>
                )}
              </div>
              <span className={`text-sm font-bold font-mono ${r.diasFaltados > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {fmtS(r.pago)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-700/20 border-t border-zinc-600/30">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-zinc-200">Total</span>
            {hayDiferencia && (
              <span className="text-[10px] text-zinc-500">
                presupuestado: <span className="font-mono">{fmtS(summary.totalPresupuestado)}</span>
              </span>
            )}
          </div>
          <span className={`text-base font-bold font-mono ${hayDiferencia ? "text-amber-400" : "text-emerald-400"}`}>
            {fmtS(summary.total)}
          </span>
        </div>
      </div>
    </div>
  )
}

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

  const updateWorkerHistorial = useCallback((idx, nuevoHistorial) => {
    setWorkers(prev => { const n = [...prev]; n[idx] = { ...n[idx], historial: nuevoHistorial, periodos: undefined }; return n })
  }, [setWorkers])

  const updateWorkerDay = useCallback((workerIdx, dia, isRestDay) => {
    setWorkers(prev => {
      const n = [...prev]
      const w = { ...n[workerIdx] }
      const m = { ...(w.diasMarcados || {}) }
      const current = m[dia] || ""
      if (isRestDay) {
        // Rest day: click = "trabajó" (paid extra) → clear
        if (!current) m[dia] = "trabajo"
        else delete m[dia]
      } else {
        // Work day: click = "noVino" → "tienda" (went to shop instead, same pay) → clear
        if (!current) m[dia] = "noVino"
        else if (current === "noVino") m[dia] = "tienda"
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
              <th className="text-right px-2">Desc.</th>
              <th className="text-right px-2" title="Días marcados como No vino (del calendario)">Faltas</th>
              <th className="text-right px-2" title="Días extra trabajados en descanso (del calendario)">Extras</th>
              <th className="text-right px-2" title="Días que atendió tienda en vez de eventos">Tienda</th>
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
                <tr className={`border-t border-zinc-800/60 hover:bg-zinc-800/30 transition-colors ${w.name && !w.isActiveInMonth ? "opacity-40" : ""}`}>
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
                    {w.name && w.status?.label && (
                      <div className="mt-1 ml-7">
                        <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${TONE_BADGE[w.status.tone] || TONE_BADGE.zinc}`}>
                          {w.status.label}
                        </span>
                      </div>
                    )}
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
                  <td className="px-2 text-right font-mono" style={{ color: w.extrasNo > 0 ? "#f87171" : "#3f3f46" }}>{w.extrasNo || "—"}</td>
                  <td className="px-2 text-right font-mono" style={{ color: w.extrasWork > 0 ? "#34d399" : "#3f3f46" }}>{w.extrasWork || "—"}</td>
                  <td className="px-2 text-right font-mono" style={{ color: w.extrasTienda > 0 ? "#38bdf8" : "#3f3f46" }}>{w.extrasTienda || "—"}</td>
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
                      <div className="px-5 pb-4">
                        <PeriodosEditor
                          record={workers[i]}
                          onChange={nuevo => updateWorkerHistorial(i, nuevo)}
                          label={`Historial laboral de ${w.name || "trabajador"}`}
                        />
                      </div>
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
              <td className="px-2 text-right font-mono" style={{ color: totalPersonal.extrasNo > 0 ? "#f87171" : "#3f3f46" }}>{totalPersonal.extrasNo || "—"}</td>
              <td className="px-2 text-right font-mono" style={{ color: totalPersonal.extrasWork > 0 ? "#34d399" : "#3f3f46" }}>{totalPersonal.extrasWork || "—"}</td>
              <td className="px-2 text-right font-mono" style={{ color: totalPersonal.extrasTienda > 0 ? "#38bdf8" : "#3f3f46" }}>{totalPersonal.extrasTienda || "—"}</td>
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

      {/* Weekly pay summary for current week */}
      <WeeklyPaySummary workersCalc={workersCalc} calendarDays={calendarDays} year={year} month={month} />

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
