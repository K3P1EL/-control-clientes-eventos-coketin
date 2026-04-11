import { MESES } from "../../../../lib/finanzas/constants"

const STATE_COLORS = {
  normal: "bg-emerald-500/15 border-emerald-500/35 text-emerald-300",
  descanso: "bg-amber-500/15 border-amber-500/35 text-amber-300",
  noVino: "bg-red-500/20 border-red-500/40 text-red-300",
  trabajo: "bg-emerald-500/25 border-emerald-500/50 text-emerald-200",
  tienda: "bg-sky-500/20 border-sky-500/40 text-sky-300",
  feriado: "bg-purple-500/15 border-purple-500/35 text-purple-300",
}

// Per-worker monthly calendar shown when a worker row is expanded.
// Styled to match the Tracker tab — same card structure, colors, and spacing.
// Click cycles: work day → noVino → blank. Rest day → trabajo → tienda → blank.
export default function WorkerCalendar({ worker, calendarDays, effectiveTracker, year, month, onDayClick }) {
  const semanas = [...new Set(calendarDays.map(d => d.semana))]

  return (
    <div className="bg-zinc-800/40 border-y border-zinc-700/40 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          📅 Calendario de {worker.name} — {MESES[month]} {year}
        </h4>
        <div className="flex gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 inline-block"></span>Trabajó</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 inline-block"></span>Descanso</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/60 inline-block"></span>No vino</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>Trabajó extra</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500/60 inline-block"></span>Atendió tienda</span>
        </div>
      </div>
      <div className="space-y-1">
        {semanas.map(sem => (
          <div key={sem}>
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1 mt-3">Semana {sem}</div>
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.filter(d => d.semana === sem).map(d => {
                const isRest = worker.diaDescanso && d.nombre === worker.diaDescanso
                const marca = (worker.diasMarcados || {})[d.dia] || ""
                const isFeriado = effectiveTracker[d.dia] === "Feriado"

                let colorClass, label
                if (isFeriado) {
                  colorClass = STATE_COLORS.feriado
                  label = "Feriado"
                } else if (marca === "noVino") {
                  colorClass = STATE_COLORS.noVino
                  label = "No vino"
                } else if (marca === "trabajo") {
                  colorClass = STATE_COLORS.trabajo
                  label = "Trabajó"
                } else if (marca === "tienda") {
                  colorClass = STATE_COLORS.tienda
                  label = "Tienda"
                } else if (isRest) {
                  colorClass = STATE_COLORS.descanso
                  label = "Desc."
                } else {
                  colorClass = STATE_COLORS.normal
                  label = ""
                }

                return (
                  <div
                    key={d.dia}
                    onClick={() => !isFeriado && onDayClick(d.dia, isRest)}
                    className={`rounded-xl border p-2 transition-all ${isFeriado ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:brightness-125"} ${colorClass}`}
                  >
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="text-base font-bold font-mono">{d.dia}</span>
                      <span className="text-[9px] uppercase">{d.nombre.slice(0, 3)}</span>
                    </div>
                    {label && (
                      <div className="text-[8px] font-semibold uppercase mt-0.5">{label}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-zinc-600">
        Día de trabajo → click = "No vino". Día de descanso → click = "Trabajó" → "Atendió tienda" → limpiar.
      </div>
    </div>
  )
}
