import { useCallback } from "react"
import Card from "../../ui/Card"
import NumInput from "../../ui/NumInput"
import TextInput from "../../ui/TextInput"
import { fmt } from "../../../../lib/finanzas/helpers"

export default function ServiciosTab({ services, setServices, servicesCalc, totalServicios, diasOpBase }) {
  const updateService = useCallback((idx, field, val) => {
    setServices(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val }; return n })
  }, [setServices])

  const addService = useCallback(() => {
    setServices(prev => [...prev, { nombre: "", pagoMensual: 0, diaPago: "", divisor: diasOpBase, nota: "" }])
  }, [setServices, diasOpBase])

  const removeService = useCallback((idx) => {
    setServices(prev => prev.filter((_, i) => i !== idx))
  }, [setServices])

  return (
    <Card title="Servicios operativos mensuales" icon="🏢" accent="violet">
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 uppercase tracking-wider">
              <th className="text-left py-2 pr-2">Servicio</th>
              <th className="text-right px-2">Pago mensual</th>
              <th className="text-right px-2">Día pago</th>
              <th className="text-right px-2">Divisor diario</th>
              <th className="text-right px-2">Costo diario</th>
              <th className="text-right px-2">Costo mensual</th>
              <th className="text-left px-2">Nota</th>
              <th className="text-center px-2">⊘</th>
            </tr>
          </thead>
          <tbody>
            {servicesCalc.map((s, i) => (
              <tr key={i} className="border-t border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
                <td className="py-2 pr-2"><TextInput value={services[i].nombre} onChange={v => updateService(i, "nombre", v)} placeholder="Servicio" /></td>
                <td className="px-2"><NumInput value={services[i].pagoMensual} onChange={v => updateService(i, "pagoMensual", v)} /></td>
                <td className="px-2"><NumInput value={services[i].diaPago} onChange={v => updateService(i, "diaPago", v)} min={1} /></td>
                <td className="px-2"><NumInput value={services[i].divisor} onChange={v => updateService(i, "divisor", v)} min={1} /></td>
                <td className="px-2 text-right text-sky-400 font-mono">{fmt(s.costoDiario)}</td>
                <td className="px-2 text-right text-zinc-300 font-mono">{fmt(s.costoMensual)}</td>
                <td className="px-2"><TextInput value={services[i].nota} onChange={v => updateService(i, "nota", v)} placeholder="Nota" /></td>
                <td className="px-2 text-center"><button onClick={() => removeService(i)} className="text-red-400/60 hover:text-red-400 transition-colors text-lg">×</button></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-700 font-semibold text-zinc-200">
              <td className="py-2">Total</td>
              <td className="px-2 text-right font-mono">{fmt(totalServicios.pagoMensual, 0)}</td>
              <td></td><td></td>
              <td className="px-2 text-right text-sky-400 font-mono">{fmt(totalServicios.costoDiario)}</td>
              <td className="px-2 text-right font-mono">{fmt(totalServicios.costoMensual, 0)}</td>
              <td></td><td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button onClick={addService} className="mt-4 px-4 py-2 bg-violet-500/10 border border-violet-500/30 rounded-xl text-violet-400 text-sm hover:bg-violet-500/20 transition-all">+ Agregar servicio</button>
    </Card>
  )
}
