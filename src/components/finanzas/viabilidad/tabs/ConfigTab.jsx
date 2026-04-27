import Card from "../../ui/Card"
import NumInput from "../../ui/NumInput"
import { MESES, DIAS_SEMANA } from "../../../../lib/finanzas/constants"
import { peruNow } from "../../../../lib/finanzas/helpers"
import CoberturaExtra from "../components/CoberturaExtra"

// Year/month picker + tienda config + cobertura extra + how-to-use guide.
// All numeric inputs are pure controlled fields — state lives in
// useViabilidadState in the parent.
export default function ConfigTab({
  year, setYear, month, setMonth,
  diasCalendario, diasOpBase,
  workers, workersCalc, calendarDays, effectiveTracker,
  cobExtra, setCobExtra,
  tiendaConfig, setTiendaConfig,
}) {
  const diasDescansoTienda = tiendaConfig?.diasDescansoSemanal || []
  const toggleDiaDescanso = (dia) => {
    const set = new Set(diasDescansoTienda)
    if (set.has(dia)) set.delete(dia)
    else set.add(dia)
    setTiendaConfig({ ...(tiendaConfig || {}), diasDescansoSemanal: [...set] })
  }
  // Lunes primero, Domingo al final (DIAS_SEMANA arranca con Domingo)
  const ORDEN_SEMANAL = [...DIAS_SEMANA.slice(1), DIAS_SEMANA[0]]
  return (
    <Card title="Configuración del mes" icon="⚙️" accent="sky">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Año</label>
          <NumInput value={year} onChange={v => setYear(v || peruNow().getFullYear())} min={2020} />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Mes (1-12)</label>
          <NumInput value={month} onChange={v => setMonth(Math.max(1, Math.min(12, v || 1)))} min={1} />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Días calendario</label>
          <div className="bg-zinc-800/50 rounded-lg px-3 py-1.5 text-sm text-zinc-400 border border-zinc-700">{diasCalendario}</div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 mb-1 block">Días operativos base</label>
          <div className="bg-sky-500/10 rounded-lg px-3 py-1.5 text-sm text-sky-400 border border-sky-500/30 font-mono font-bold">
            {diasOpBase}
            <span className="text-[10px] text-zinc-500 font-normal ml-2">({diasCalendario} - {diasCalendario - diasOpBase} cerrados)</span>
          </div>
          <div className="text-[10px] text-zinc-600 mt-1">Auto: según 🏪 en Personal</div>
        </div>
      </div>

      {(() => {
        const now = new Date()
        const mesActual = now.getMonth() + 1
        const yearActual = now.getFullYear()
        return (year !== yearActual || month !== mesActual) ? (
          <button onClick={() => { const now2 = new Date(); setYear(now2.getFullYear()); setMonth(now2.getMonth() + 1) }}
            className="mt-3 px-4 py-2 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400 text-sm hover:bg-sky-500/20 transition-all flex items-center gap-2">
            📍 Ir a {MESES[mesActual]} {yearActual}
          </button>
        ) : (
          <div className="mt-3 text-xs text-emerald-400/70 flex items-center gap-1.5">✅ Estás en el mes actual</div>
        )
      })()}

      <div className="mt-6 bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/50">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            🏪 Días de descanso de la tienda
          </h3>
          <span className="text-[10px] text-zinc-500">
            Independiente del personal — define cuándo la tienda no opera por default
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

      <CoberturaExtra workers={workers} workersCalc={workersCalc} calendarDays={calendarDays} effectiveTracker={effectiveTracker} diasOpBase={diasOpBase} cobExtra={cobExtra} setCobExtra={setCobExtra} year={year} month={month} />

      <div className="mt-6 bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/50">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">📖 Cómo usar</h3>
        <div className="text-xs text-zinc-500 space-y-1.5 leading-relaxed">
          <p><strong className="text-zinc-400">1)</strong> Cambia Año y Mes.</p>
          <p><strong className="text-zinc-400">2)</strong> En PERSONAL, marca con 🏪 al encargado de la tienda.</p>
          <p><strong className="text-zinc-400">3)</strong> Cada trabajador tiene su propio día fijo de descanso.</p>
          <p><strong className="text-zinc-400">4)</strong> En SERVICIOS, agrega más gastos mensuales.</p>
          <p><strong className="text-zinc-400">5)</strong> En APOYOS, pon ingresos externos como alquiler.</p>
          <p><strong className="text-zinc-400">6)</strong> En el TRACKER marca cada fecha.</p>
          <p><strong className="text-zinc-400">7)</strong> Revisá la Meta diaria real.</p>
        </div>
      </div>
    </Card>
  )
}
