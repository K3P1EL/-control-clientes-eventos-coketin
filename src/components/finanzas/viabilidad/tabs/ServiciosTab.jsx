import React, { useCallback, useState } from "react"
import Card from "../../ui/Card"
import NumInput from "../../ui/NumInput"
import TextInput from "../../ui/TextInput"
import { fmt, safeRemoveRecord } from "../../../../lib/finanzas/helpers"
import PeriodosEditor from "../components/PeriodosEditor"

const TONE_BADGE = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sky: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  zinc: "bg-zinc-700/30 text-zinc-400 border-zinc-600/40",
}

export default function ServiciosTab({ services, setServices, servicesCalc, totalServicios, diasOpBase }) {
  const [expanded, setExpanded] = useState(null)

  const updateService = useCallback((idx, field, val) => {
    setServices(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val }; return n })
  }, [setServices])

  const updateServiceHistorial = useCallback((idx, nuevo) => {
    setServices(prev => { const n = [...prev]; n[idx] = { ...n[idx], historial: nuevo, periodos: undefined }; return n })
  }, [setServices])

  const addService = useCallback(() => {
    setServices(prev => [...prev, { nombre: "", pagoMensual: 0, diaPago: "", divisor: diasOpBase, nota: "", modo: "operativo" }])
  }, [setServices, diasOpBase])

  // No-destructive remove: si el servicio está activo lo da de baja con
  // fecha de hoy en lugar de borrarlo, así no se pierde el historial.
  // Solo elimina realmente si la fila está vacía o si ya estaba inactivo
  // (en este último caso pide confirmación).
  const removeService = useCallback((idx) => {
    setServices(prev => safeRemoveRecord(prev, idx, "nombre").list)
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
              <th className="text-center px-2" title="Cómo se prorratea">Modo</th>
              <th className="text-right px-2">Divisor diario</th>
              <th className="text-right px-2">Costo diario</th>
              <th className="text-right px-2">Mes real</th>
              <th className="text-left px-2">Nota</th>
              <th className="text-center px-2">⊘</th>
            </tr>
          </thead>
          <tbody>
            {servicesCalc.map((s, i) => (
              <React.Fragment key={i}>
                <tr className={`border-t border-zinc-800/60 hover:bg-zinc-800/30 transition-colors ${s.nombre && !s.isActiveInMonth ? "opacity-40" : ""}`}>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setExpanded(expanded === i ? null : i)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all shrink-0 ${expanded === i ? "bg-violet-500/20 text-violet-400 border border-violet-500/40" : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300"}`}>
                        {expanded === i ? "▾" : "▸"}
                      </button>
                      <TextInput value={services[i].nombre} onChange={v => updateService(i, "nombre", v)} placeholder="Servicio" />
                    </div>
                    {s.nombre && s.status?.label && (
                      <div className="mt-1 ml-7">
                        <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${TONE_BADGE[s.status.tone] || TONE_BADGE.zinc}`}>
                          {s.status.label}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-2"><NumInput value={services[i].pagoMensual} onChange={v => updateService(i, "pagoMensual", v)} /></td>
                  <td className="px-2"><NumInput value={services[i].diaPago} onChange={v => updateService(i, "diaPago", v)} min={1} /></td>
                  <td className="px-2 text-center">
                    <select
                      value={services[i].modo || "operativo"}
                      onChange={e => updateService(i, "modo", e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-violet-500/60 cursor-pointer"
                      title={
                        services[i].modo === "calendario"
                          ? "🗓️ Se cobra todos los días del mes (abras o no)"
                          : "🏪 Se cobra solo días que la tienda opera"
                      }
                    >
                      <option value="operativo">🏪 Op</option>
                      <option value="calendario">🗓️ Cal</option>
                    </select>
                  </td>
                  <td className="px-2"><NumInput value={services[i].divisor} onChange={v => updateService(i, "divisor", v)} min={1} /></td>
                  <td className="px-2 text-right text-sky-400 font-mono">{fmt(s.costoDiario)}</td>
                  <td className="px-2 text-right text-zinc-200 font-mono font-semibold">{fmt(s.costoMesReal)}</td>
                  <td className="px-2"><TextInput value={services[i].nota} onChange={v => updateService(i, "nota", v)} placeholder="Nota" /></td>
                  <td className="px-2 text-center"><button onClick={() => removeService(i)} className="text-red-400/60 hover:text-red-400 transition-colors text-lg">×</button></td>
                </tr>
                {expanded === i && (
                  <tr>
                    <td colSpan={9} className="p-0">
                      <div className="px-5 py-4 bg-zinc-800/40 border-y border-zinc-700/40">
                        <PeriodosEditor
                          record={services[i]}
                          onChange={nuevo => updateServiceHistorial(i, nuevo)}
                          label={`Historial del servicio ${services[i].nombre || ""}`}
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
              <td className="px-2 text-right font-mono">{fmt(totalServicios.pagoMensual, 0)}</td>
              <td></td><td></td><td></td>
              <td className="px-2 text-right text-sky-400 font-mono">{fmt(totalServicios.costoDiario)}</td>
              <td className="px-2 text-right font-mono">{fmt(totalServicios.costoMesReal, 0)}</td>
              <td></td><td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button onClick={addService} className="mt-4 px-4 py-2 bg-violet-500/10 border border-violet-500/30 rounded-xl text-violet-400 text-sm hover:bg-violet-500/20 transition-all">+ Agregar servicio</button>
    </Card>
  )
}
