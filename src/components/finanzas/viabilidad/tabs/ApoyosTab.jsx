import { useCallback } from "react"
import Card from "../../ui/Card"
import NumInput from "../../ui/NumInput"
import TextInput from "../../ui/TextInput"
import { fmt } from "../../../../lib/finanzas/helpers"

export default function ApoyosTab({ apoyos, setApoyos, apoyosCalc, totalApoyos, diasCalendario }) {
  const updateApoyo = useCallback((idx, field, val) => {
    setApoyos(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val }; return n })
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
              <th className="text-left px-2">Nota</th>
              <th className="text-center px-2">⊘</th>
            </tr>
          </thead>
          <tbody>
            {apoyosCalc.map((a, i) => (
              <tr key={i} className="border-t border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
                <td className="py-2 pr-2"><TextInput value={apoyos[i].concepto} onChange={v => updateApoyo(i, "concepto", v)} placeholder="Concepto" /></td>
                <td className="px-2"><NumInput value={apoyos[i].montoMensual} onChange={v => updateApoyo(i, "montoMensual", v)} /></td>
                <td className="px-2"><NumInput value={apoyos[i].divisor} onChange={v => updateApoyo(i, "divisor", v)} min={1} /></td>
                <td className="px-2 text-right text-emerald-400 font-mono">{fmt(a.apoyoDiario)}</td>
                <td className="px-2"><TextInput value={apoyos[i].nota} onChange={v => updateApoyo(i, "nota", v)} placeholder="Nota" /></td>
                <td className="px-2 text-center"><button onClick={() => removeApoyo(i)} className="text-red-400/60 hover:text-red-400 transition-colors text-lg">×</button></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-700 font-semibold text-zinc-200">
              <td className="py-2">Total</td>
              <td className="px-2 text-right font-mono">{fmt(totalApoyos.montoMensual, 0)}</td>
              <td></td>
              <td className="px-2 text-right text-emerald-400 font-mono">{fmt(totalApoyos.apoyoDiario)}</td>
              <td></td><td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button onClick={addApoyo} className="mt-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm hover:bg-emerald-500/20 transition-all">+ Agregar apoyo</button>
    </Card>
  )
}
