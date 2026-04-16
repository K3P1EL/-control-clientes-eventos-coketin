import React, { useCallback, useState } from "react"
import Card from "../../ui/Card"
import NumInput from "../../ui/NumInput"
import TextInput from "../../ui/TextInput"
import { fmt } from "../../../../lib/finanzas/helpers"
import PeriodosEditor from "../components/PeriodosEditor"

const TONE_BADGE = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sky: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  zinc: "bg-zinc-700/30 text-zinc-400 border-zinc-600/40",
}

export default function ApoyosTab({ apoyos, setApoyos, apoyosCalc, totalApoyos, diasCalendario }) {
  const [expanded, setExpanded] = useState(null)

  const updateApoyo = useCallback((idx, field, val) => {
    setApoyos(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val }; return n })
  }, [setApoyos])

  const updateApoyoHistorial = useCallback((idx, nuevo) => {
    setApoyos(prev => { const n = [...prev]; n[idx] = { ...n[idx], historial: nuevo, periodos: undefined }; return n })
  }, [setApoyos])

  const addApoyo = useCallback(() => {
    setApoyos(prev => [...prev, { concepto: "", montoMensual: 0, divisor: diasCalendario, nota: "" }])
  }, [setApoyos, diasCalendario])

  const removeApoyo = useCallback((idx) => {
    setApoyos(prev => prev.filter((_, i) => i !== idx))
  }, [setApoyos])

  return (
    <Card title="Apoyos externos / Ingresos" icon="🤝" accent="emerald">
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 uppercase tracking-wider">
              <th className="text-left py-2 pr-2">Concepto</th>
              <th className="text-right px-2">Monto mensual</th>
              <th className="text-right px-2">Divisor diario</th>
              <th className="text-right px-2">Apoyo diario</th>
              <th className="text-right px-2">Mes real</th>
              <th className="text-left px-2">Nota</th>
              <th className="text-center px-2">⊘</th>
            </tr>
          </thead>
          <tbody>
            {apoyosCalc.map((a, i) => (
              <React.Fragment key={i}>
                <tr className={`border-t border-zinc-800/60 hover:bg-zinc-800/30 transition-colors ${a.concepto && !a.isActiveInMonth ? "opacity-40" : ""}`}>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setExpanded(expanded === i ? null : i)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all shrink-0 ${expanded === i ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300"}`}>
                        {expanded === i ? "▾" : "▸"}
                      </button>
                      <TextInput value={apoyos[i].concepto} onChange={v => updateApoyo(i, "concepto", v)} placeholder="Concepto" />
                    </div>
                    {a.concepto && a.status?.label && (
                      <div className="mt-1 ml-7">
                        <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${TONE_BADGE[a.status.tone] || TONE_BADGE.zinc}`}>
                          {a.status.label}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-2"><NumInput value={apoyos[i].montoMensual} onChange={v => updateApoyo(i, "montoMensual", v)} /></td>
                  <td className="px-2"><NumInput value={apoyos[i].divisor} onChange={v => updateApoyo(i, "divisor", v)} min={1} /></td>
                  <td className="px-2 text-right text-emerald-400 font-mono">{fmt(a.apoyoDiario)}</td>
                  <td className="px-2 text-right text-zinc-200 font-mono font-semibold">{fmt(a.apoyoMesReal)}</td>
                  <td className="px-2"><TextInput value={apoyos[i].nota} onChange={v => updateApoyo(i, "nota", v)} placeholder="Nota" /></td>
                  <td className="px-2 text-center"><button onClick={() => removeApoyo(i)} className="text-red-400/60 hover:text-red-400 transition-colors text-lg">×</button></td>
                </tr>
                {expanded === i && (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <div className="px-5 py-4 bg-zinc-800/40 border-y border-zinc-700/40">
                        <PeriodosEditor
                          record={apoyos[i]}
                          onChange={nuevo => updateApoyoHistorial(i, nuevo)}
                          label={`Historial del apoyo ${apoyos[i].concepto || ""}`}
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
              <td className="py-2">Total</td>
              <td className="px-2 text-right font-mono">{fmt(totalApoyos.montoMensual, 0)}</td>
              <td></td>
              <td className="px-2 text-right text-emerald-400 font-mono">{fmt(totalApoyos.apoyoDiario)}</td>
              <td className="px-2 text-right font-mono">{fmt(totalApoyos.montoMensualReal, 0)}</td>
              <td></td><td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button onClick={addApoyo} className="mt-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm hover:bg-emerald-500/20 transition-all">+ Agregar apoyo</button>
    </Card>
  )
}
