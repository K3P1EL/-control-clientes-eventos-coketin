import Card from "../../ui/Card"
import NumInput from "../../ui/NumInput"
import { MESES } from "../../../../lib/finanzas/constants"
import CoberturaExtra from "../components/CoberturaExtra"

// Year/month picker + cobertura extra + how-to-use guide.
// All numeric inputs are pure controlled fields — state lives in
// useViabilidadState in the parent.
export default function ConfigTab({
  year, setYear, month, setMonth,
  diasCalendario, diasOpBase,
  workers, cobExtra, setCobExtra,
}) {
  return (
    <Card title="Configuración del mes" icon="⚙️" accent="sky">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Año</label>
          <NumInput value={year} onChange={v => setYear(v || 2026)} min={2020} />
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

      <CoberturaExtra workers={workers} diasOpBase={diasOpBase} cobExtra={cobExtra} setCobExtra={setCobExtra} />

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
