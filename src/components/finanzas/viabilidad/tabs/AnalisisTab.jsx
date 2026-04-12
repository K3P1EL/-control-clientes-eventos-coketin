import { useState } from "react"
import Card from "../../ui/Card"
import NumInput from "../../ui/NumInput"
import StatusBadge from "../../ui/StatusBadge"
import { fmt, peruNow } from "../../../../lib/finanzas/helpers"

// 3A and 3B service-cycle analysis tables. The math is computed
// upstream by useViabilidadCalc; this component is pure presentation.
export default function AnalisisTab({
  diaAnalisis, setDiaAnalisis, diasCalendario, diasOperados,
  proximosVencimientos,
  vista3A, totalDevengado3A, totalFalta3A,
  vista3B, totalDevengado3B, totalFalta3B,
}) {
  return (
    <div className="space-y-6">
      <Card title="Día de análisis" icon="📅" accent="sky">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Día a simular</label>
            <div className="flex items-center gap-2">
              <NumInput value={diaAnalisis} onChange={v => setDiaAnalisis(Math.max(1, Math.min(diasCalendario, v || 1)))} min={1} className="w-24" />
              {diaAnalisis !== peruNow().getDate() && (
                <button onClick={() => setDiaAnalisis(peruNow().getDate())}
                  style={{ padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: "pointer", border: "1px solid rgba(14,165,233,0.3)", background: "rgba(14,165,233,0.1)", color: "#38bdf8" }}>
                  Hoy ({peruNow().getDate()})
                </button>
              )}
            </div>
          </div>
          {proximosVencimientos.length > 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2">
              <span className="text-xs text-amber-400 font-semibold">⚠️ Próximos vencimientos:</span>
              <div className="flex gap-3 mt-1">
                {proximosVencimientos.map(v => (
                  <span key={v.nombre} className="text-xs text-amber-300">{v.nombre} en {v.diasRest}d (día {v.diaPago})</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2">
              <span className="text-xs text-emerald-400">✅ Sin vencimientos urgentes</span>
            </div>
          )}
        </div>
      </Card>

      <Card title="Vista 3A — Ciclo del mes (día 1 → día de pago)" icon="📊" accent="amber">
        <p className="text-xs text-zinc-500 mb-3">Día {diaAnalisis} | Operados: {diasOperados}{diasOperados === 0 ? " (tracker vacío)" : ""}</p>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 uppercase tracking-wider">
                <th className="text-left py-2">Servicio</th>
                <th className="text-right px-2">Costo mensual</th>
                <th className="text-right px-2">Día pago</th>
                <th className="text-right px-2">Días deveng.</th>
                <th className="text-right px-2">Devengado</th>
                <th className="text-right px-2">Falta recup.</th>
                <th className="text-right px-2">Días rest.</th>
                <th className="text-left px-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {vista3A.map((v, i) => (
                <tr key={i} className="border-t border-zinc-800/60">
                  <td className="py-2 text-zinc-300">{v.nombre}</td>
                  <td className="px-2 text-right font-mono">{fmt(v.costoMensual, 0)}</td>
                  <td className="px-2 text-right font-mono">{v.diaPago}</td>
                  <td className="px-2 text-right font-mono text-zinc-400">{v.diasDeveng}</td>
                  <td className="px-2 text-right font-mono text-amber-400">{typeof v.devengado === "number" ? fmt(v.devengado) : v.devengado}</td>
                  <td className="px-2 text-right font-mono text-red-400">{typeof v.faltaRecup === "number" ? fmt(v.faltaRecup) : v.faltaRecup}</td>
                  <td className="px-2 text-right font-mono text-zinc-400">{v.diasRest}</td>
                  <td className="px-2">
                    <StatusBadge text={v.estado} type={v.estado === "Sin fecha" ? "muted" : v.estado === "Completa" ? "ok" : v.estado.includes("Vence") ? "danger" : v.estado.includes("Ojo") ? "warn" : "info"} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-700 font-semibold">
                <td className="py-2" colSpan={4}>Total devengado 3A (día {diaAnalisis})</td>
                <td className="px-2 text-right font-mono text-amber-400">{fmt(totalDevengado3A)}</td>
                <td className="px-2 text-right font-mono text-red-400">{fmt(totalFalta3A)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card title="Vista 3B — Ciclo del proveedor" icon="📊" accent="violet">
        <p className="text-xs text-zinc-500 mb-3">Día {diaAnalisis} — Desde último pago al próximo</p>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 uppercase tracking-wider">
                <th className="text-left py-2">Servicio</th>
                <th className="text-right px-2">Costo mensual</th>
                <th className="text-right px-2">Día pago</th>
                <th className="text-right px-2">Días ciclo</th>
                <th className="text-right px-2">Deveng. ciclo</th>
                <th className="text-right px-2">Falta ciclo</th>
                <th className="text-right px-2">Días al pago</th>
                <th className="text-left px-2">Estado ciclo</th>
              </tr>
            </thead>
            <tbody>
              {vista3B.map((v, i) => (
                <tr key={i} className="border-t border-zinc-800/60">
                  <td className="py-2 text-zinc-300">{v.nombre}</td>
                  <td className="px-2 text-right font-mono">{fmt(v.costoMensual, 0)}</td>
                  <td className="px-2 text-right font-mono">{v.diaPago}</td>
                  <td className="px-2 text-right font-mono text-zinc-400">{v.diasCiclo}</td>
                  <td className="px-2 text-right font-mono text-violet-400">{typeof v.devengadoCiclo === "number" ? fmt(v.devengadoCiclo) : v.devengadoCiclo}</td>
                  <td className="px-2 text-right font-mono text-red-400">{typeof v.faltaCiclo === "number" ? fmt(v.faltaCiclo) : v.faltaCiclo}</td>
                  <td className="px-2 text-right font-mono text-zinc-400">{v.diasAlPago}</td>
                  <td className="px-2">
                    <StatusBadge text={v.estadoCiclo} type={v.estadoCiclo === "Sin fecha" ? "muted" : v.estadoCiclo === "Pago HOY" ? "danger" : v.estadoCiclo.includes("Cierra") ? "warn" : v.estadoCiclo.includes("Ojo") ? "warn" : "info"} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-700 font-semibold">
                <td className="py-2" colSpan={4}>Total devengado 3B (día {diaAnalisis})</td>
                <td className="px-2 text-right font-mono text-violet-400">{fmt(totalDevengado3B)}</td>
                <td className="px-2 text-right font-mono text-red-400">{fmt(totalFalta3B)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
