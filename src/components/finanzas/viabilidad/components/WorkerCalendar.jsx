import { MESES } from "../../../../lib/finanzas/constants"
import { peruNow, isActiveOnDate } from "../../../../lib/finanzas/helpers"

// Per-worker monthly calendar shown when a worker row is expanded.
// Click cycles: work day → noVino → tienda → clear. Rest day → trabajo → clear.
export default function WorkerCalendar({ worker, calendarDays, effectiveTracker, year, month, onDayClick }) {
  const semanas = [...new Set(calendarDays.map(d => d.semana))]
  const now = peruNow()
  const today = now.getFullYear() === year && (now.getMonth() + 1) === month ? now.getDate() : 0
  // For past months, treat all days as past
  const isPastMonth = year < now.getFullYear() || (year === now.getFullYear() && month < (now.getMonth() + 1))

  return (
    <div className="bg-zinc-800/40 border-y border-zinc-700/40 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          📅 Calendario de {worker.name} — {MESES[month]} {year}
        </h4>
        <div className="flex gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 inline-block"></span>Trabajó</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500/40 inline-block"></span>Descanso</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/40 inline-block"></span>No vino</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500/40 inline-block"></span>Tienda</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block"></span>Extra (desc.)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-zinc-600/40 inline-block"></span>Inactivo</span>
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
                const isPast = isPastMonth || d.dia <= today
                const isToday = d.dia === today && !isPastMonth
                const fecha = new Date(year, month - 1, d.dia)
                const isInactive = !isActiveOnDate(worker, fecha)

                let bg, borderColor, textColor, label
                if (isInactive) {
                  bg = "rgba(39,39,42,0.2)"; borderColor = "rgba(63,63,70,0.25)"; textColor = "#3f3f46"; label = "Inactivo"
                } else if (isFeriado) {
                  bg = "rgba(168,85,247,0.15)"; borderColor = "rgba(168,85,247,0.35)"; textColor = "#c084fc"; label = "Feriado"
                } else if (marca === "noVino") {
                  bg = "rgba(239,68,68,0.2)"; borderColor = "rgba(239,68,68,0.5)"; textColor = "#f87171"; label = "No vino"
                } else if (marca === "trabajo") {
                  bg = "rgba(16,185,129,0.25)"; borderColor = "rgba(16,185,129,0.5)"; textColor = "#34d399"; label = "Extra"
                } else if (marca === "tienda") {
                  bg = "rgba(56,189,248,0.2)"; borderColor = "rgba(56,189,248,0.45)"; textColor = "#38bdf8"; label = "Tienda"
                } else if (isRest) {
                  bg = "rgba(245,158,11,0.15)"; borderColor = "rgba(245,158,11,0.35)"; textColor = "#fbbf24"; label = "Desc."
                } else if (isPast) {
                  bg = "rgba(16,185,129,0.1)"; borderColor = "rgba(16,185,129,0.25)"; textColor = "#34d399"; label = "Trabajó"
                } else {
                  bg = "rgba(39,39,42,0.4)"; borderColor = "rgba(63,63,70,0.4)"; textColor = "#52525b"; label = ""
                }

                const disabled = isFeriado || isInactive
                return (
                  <div
                    key={d.dia}
                    onClick={() => !disabled && onDayClick(d.dia, isRest)}
                    style={{
                      background: bg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 12,
                      padding: "8px 10px",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.35 : 1,
                      transition: "all 0.15s",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: textColor }}>{d.dia}</span>
                      <span style={{ fontSize: 9, textTransform: "uppercase", color: "#52525b" }}>{d.nombre.slice(0, 3)}</span>
                    </div>
                    {label && (
                      <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: textColor, marginTop: 1 }}>{label}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-zinc-600">
        Día de trabajo → click = "No vino" → "Tienda" → limpiar. Día de descanso → click = "Trabajó" (pagado) → limpiar.
      </div>
    </div>
  )
}
