import { MESES } from "../../../../lib/finanzas/constants"

// Per-worker monthly calendar shown when a worker row is expanded.
// Click cycles state: rest day → trabajo → tienda → blank.
// Work day → noVino → blank.
export default function WorkerCalendar({ worker, calendarDays, effectiveTracker, year, month, onDayClick }) {
  return (
    <div className="bg-zinc-800/40 border-y border-zinc-700/40 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          📅 Calendario de {worker.name} — {MESES[month]} {year}
        </h4>
        <div className="flex gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-zinc-700 inline-block"></span>Normal</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/40 inline-block"></span>Descanso</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/40 inline-block"></span>No vino</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 inline-block"></span>Trabajó extra</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-sky-500/40 inline-block"></span>Atendió tienda</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {calendarDays.map(d => {
          const isRest = worker.diaDescanso && d.nombre === worker.diaDescanso
          const marca = (worker.diasMarcados || {})[d.dia] || ""
          const isFeriado = effectiveTracker[d.dia] === "Feriado"
          const disabled = isFeriado
          let bg = "bg-zinc-700/40 border-zinc-600/30 text-zinc-400"
          let label = ""
          if (isFeriado) { bg = "bg-purple-500/15 border-purple-500/30 text-purple-400"; label = "Feriado" }
          else if (isRest && !marca) { bg = "bg-amber-500/10 border-amber-500/25 text-amber-400/70"; label = "Desc." }
          else if (marca === "noVino") { bg = "bg-red-500/15 border-red-500/30 text-red-400"; label = "No vino" }
          else if (marca === "trabajo") { bg = "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"; label = "Trab." }
          else if (marca === "tienda") { bg = "bg-sky-500/15 border-sky-500/30 text-sky-400"; label = "Tienda" }
          return (
            <button key={d.dia} onClick={() => !disabled && onDayClick(d.dia, isRest)}
              className={`rounded-lg border p-1.5 text-center transition-all ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:brightness-125"} ${bg}`}>
              <div className="text-xs font-bold font-mono">{d.dia}</div>
              <div className="text-[8px] leading-tight">{d.nombre.slice(0, 3)}</div>
              {label && <div className="text-[7px] font-semibold mt-0.5 uppercase">{label}</div>}
            </button>
          )
        })}
      </div>
      <div className="mt-3 text-[10px] text-zinc-600">
        Día de trabajo → click = "No vino". Día de descanso → click = "Trabajó" → "Atendió tienda" → limpiar.
      </div>
    </div>
  )
}
