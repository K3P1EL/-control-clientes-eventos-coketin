import Card from "../../ui/Card"
import NumInput from "../../ui/NumInput"
import Select from "../../ui/Select"
import { fmt } from "../../../../lib/finanzas/helpers"
import JalarContratos from "../components/JalarContratos"

// Caja tab: manual cash inputs + "jalar contratos" to auto-fill +
// weekly/monthly viability analysis.
export default function CajaTab({
  cajaSemanaSol, setCajaSemanaSol,
  cajaAcumMes, setCajaAcumMes,
  contarApoyo, setContarApoyo,
  diasOpSemana, setDiasOpSemana,
  trabajadoresSemana, proporcionServSemana, apoyoSemanal, gastoNetoSemanal, cajaLibreSemana,
  trabRealMes, serviciosMes, apoyoMes, gastoRealMes,
  totalDevengado3A, totalDevengado3B,
  cajaVsGasto3A, cajaVsDevengado3A, cajaVsGasto3B, cajaVsDevengado3B,
  metaDiariaNecesaria, ritmoActual, diffRitmo,
}) {
  return (
    <div className="space-y-6">
      <Card title="Panel de caja — Entradas manuales" icon="💵" accent="sky">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">💵 Caja ESTA SEMANA (S/)</label>
            <div className="flex gap-1.5 items-center">
              <NumInput value={cajaSemanaSol} onChange={setCajaSemanaSol} />
              {cajaSemanaSol > 0 && <button onClick={() => setCajaSemanaSol(0)} className="w-7 h-7 rounded-lg border border-zinc-700 bg-zinc-800 text-red-400/60 hover:text-red-400 hover:border-red-500/40 flex items-center justify-center text-sm shrink-0 transition-all">×</button>}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">🏦 Caja ACUMULADA mes (S/)</label>
            <div className="flex gap-1.5 items-center">
              <NumInput value={cajaAcumMes} onChange={setCajaAcumMes} />
              {cajaAcumMes > 0 && <button onClick={() => setCajaAcumMes(0)} className="w-7 h-7 rounded-lg border border-zinc-700 bg-zinc-800 text-red-400/60 hover:text-red-400 hover:border-red-500/40 flex items-center justify-center text-sm shrink-0 transition-all">×</button>}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">🔁 ¿Contar apoyo externo?</label>
            <Select value={contarApoyo} onChange={setContarApoyo} options={["SI", "NO"]} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">📆 Días operados esta semana</label>
            <NumInput value={diasOpSemana} onChange={setDiasOpSemana} min={1} />
          </div>
        </div>

        <JalarContratos setCajaSemanaSol={setCajaSemanaSol} setCajaAcumMes={setCajaAcumMes} />
      </Card>

      <Card title="Análisis semanal — ¿Alcanza?" icon="📆" accent="amber">
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60">
            <span className="text-sm text-zinc-400">Trabajadores semana</span><span className="font-mono text-zinc-200">{fmt(trabajadoresSemana)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60">
            <span className="text-sm text-zinc-400">Proporción servicios semana</span><span className="font-mono text-zinc-200">{fmt(proporcionServSemana)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60">
            <span className="text-sm text-zinc-400">Apoyo semanal</span><span className="font-mono text-emerald-400">-{fmt(apoyoSemanal)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60 font-semibold">
            <span className="text-sm text-zinc-300">Gasto neto semanal</span><span className="font-mono text-zinc-100">{fmt(gastoNetoSemanal)}</span>
          </div>
          <div className={`flex justify-between items-center py-3 px-4 rounded-xl border ${cajaLibreSemana >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
            <span className="text-sm font-semibold">➡ Caja libre semana</span>
            <span className={`font-mono font-bold text-lg ${cajaLibreSemana >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {cajaLibreSemana >= 0 ? `✅ Sobran S/${fmt(cajaLibreSemana)}` : `🔴 FALTA S/${fmt(Math.abs(cajaLibreSemana))}`}
            </span>
          </div>
        </div>
      </Card>

      <Card title="Análisis mensual — Vista 3A" icon="📊" accent="sky">
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60"><span className="text-sm text-zinc-400">Trabajadores real mes</span><span className="font-mono text-zinc-200">{fmt(trabRealMes)}</span></div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60"><span className="text-sm text-zinc-400">Servicios mes</span><span className="font-mono text-zinc-200">{fmt(serviciosMes)}</span></div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60"><span className="text-sm text-zinc-400">Apoyo mes</span><span className="font-mono text-emerald-400">-{fmt(apoyoMes)}</span></div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60 font-semibold"><span className="text-sm text-zinc-300">Gasto real mes</span><span className="font-mono text-zinc-100">{fmt(gastoRealMes)}</span></div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60"><span className="text-sm text-zinc-400">Devengado 3A</span><span className="font-mono text-amber-400">{fmt(totalDevengado3A)}</span></div>
          <div className={`flex justify-between items-center py-3 px-4 rounded-xl border ${cajaVsGasto3A >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
            <span className="text-sm font-semibold">➡ Caja vs gasto real (3A)</span>
            <span className={`font-mono font-bold ${cajaVsGasto3A >= 0 ? "text-emerald-400" : "text-red-400"}`}>{cajaVsGasto3A >= 0 ? `✅ Sobran S/${fmt(cajaVsGasto3A)}` : `🔴 Falta S/${fmt(Math.abs(cajaVsGasto3A))}`}</span>
          </div>
          <div className={`flex justify-between items-center py-3 px-4 rounded-xl border ${cajaVsDevengado3A >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
            <span className="text-sm font-semibold">➡ Caja vs devengado (3A)</span>
            <span className={`font-mono font-bold ${cajaVsDevengado3A >= 0 ? "text-emerald-400" : "text-red-400"}`}>{cajaVsDevengado3A >= 0 ? `✅ Cubre — sobran S/${fmt(cajaVsDevengado3A)}` : `🔴 Faltan S/${fmt(Math.abs(cajaVsDevengado3A))}`}</span>
          </div>
        </div>
      </Card>

      <Card title="Análisis mensual — Vista 3B" icon="📊" accent="violet">
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60"><span className="text-sm text-zinc-400">Trabajadores real mes</span><span className="font-mono text-zinc-200">{fmt(trabRealMes)}</span></div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60"><span className="text-sm text-zinc-400">Servicios mes</span><span className="font-mono text-zinc-200">{fmt(serviciosMes)}</span></div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60"><span className="text-sm text-zinc-400">Apoyo mes</span><span className="font-mono text-emerald-400">-{fmt(apoyoMes)}</span></div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60 font-semibold"><span className="text-sm text-zinc-300">Gasto real mes</span><span className="font-mono text-zinc-100">{fmt(gastoRealMes)}</span></div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60"><span className="text-sm text-zinc-400">Devengado ciclo 3B</span><span className="font-mono text-violet-400">{fmt(totalDevengado3B)}</span></div>
          <div className={`flex justify-between items-center py-3 px-4 rounded-xl border ${cajaVsGasto3B >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
            <span className="text-sm font-semibold">➡ Caja vs gasto real (3B)</span>
            <span className={`font-mono font-bold ${cajaVsGasto3B >= 0 ? "text-emerald-400" : "text-red-400"}`}>{cajaVsGasto3B >= 0 ? `✅ Sobran S/${fmt(cajaVsGasto3B)}` : `🔴 Falta S/${fmt(Math.abs(cajaVsGasto3B))}`}</span>
          </div>
          <div className={`flex justify-between items-center py-3 px-4 rounded-xl border ${cajaVsDevengado3B >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
            <span className="text-sm font-semibold">➡ Caja vs devengado ciclo (3B)</span>
            <span className={`font-mono font-bold ${cajaVsDevengado3B >= 0 ? "text-emerald-400" : "text-red-400"}`}>{cajaVsDevengado3B >= 0 ? `✅ Cubre ciclo — sobran S/${fmt(cajaVsDevengado3B)}` : `🔴 Descubierto — faltan S/${fmt(Math.abs(cajaVsDevengado3B))}`}</span>
          </div>
        </div>
      </Card>

      <Card title="Ritmo del mes" icon="📊" accent="emerald">
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60"><span className="text-sm text-zinc-400">Meta diaria necesaria</span><span className="font-mono text-zinc-200">{fmt(metaDiariaNecesaria)}</span></div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-800/60"><span className="text-sm text-zinc-400">Ritmo actual (S/día)</span><span className="font-mono text-zinc-200">{ritmoActual !== null ? fmt(ritmoActual) : "Llena el tracker"}</span></div>
          {diffRitmo !== null ? (
            <div className={`flex justify-between items-center py-3 px-4 rounded-xl border ${diffRitmo >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
              <span className="text-sm font-semibold">➡ Diferencia vs meta</span>
              <span className={`font-mono font-bold ${diffRitmo >= 0 ? "text-emerald-400" : "text-red-400"}`}>{diffRitmo >= 0 ? `+${fmt(diffRitmo)}` : `${fmt(diffRitmo)}`}</span>
            </div>
          ) : (
            <div className="py-3 px-4 rounded-xl border border-zinc-700 bg-zinc-800/40 text-sm text-zinc-500">Marca el tracker para ver el ritmo</div>
          )}
        </div>
      </Card>
    </div>
  )
}
