import { peruToday, registrarBaja, registrarReingreso, fmtFecha, ensureHistorial, isActiveNow } from "../../../../lib/finanzas/helpers"

// Editor genérico de historial laboral (altas / bajas / reingresos).
// Modelo: lista cronológica de eventos con UNA sola fecha cada uno.
//   - "Dejó de trabajar el DD/MM/YYYY" (baja)
//   - "Volvió a trabajar el DD/MM/YYYY" (reingreso)
// El botón principal cambia según el estado actual: si está activo ofrece
// "Registrar baja hoy"; si está inactivo ofrece "Registrar reingreso hoy".
// Cada evento se puede editar (fecha) o eliminar.
// Reutilizable: record/onChange/label — no sabe nada específico del dominio.
export default function PeriodosEditor({ record, onChange, label = "Historial laboral" }) {
  const historial = ensureHistorial(record)
  const sorted = [...historial].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""))
  const activoHoy = isActiveNow({ historial })

  const handleBaja = () => onChange(registrarBaja(historial, peruToday()))
  const handleReingreso = () => onChange(registrarReingreso(historial, peruToday()))

  const updateFecha = (idx, fecha) => {
    const next = historial.map((ev, i) => i === idx ? { ...ev, fecha: fecha || ev.fecha } : ev)
    next.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""))
    onChange(next)
  }
  const toggleTipo = (idx) => {
    const next = historial.map((ev, i) => i === idx ? { ...ev, tipo: ev.tipo === "baja" ? "reingreso" : "baja" } : ev)
    onChange(next)
  }
  const removeEvento = (idx) => onChange(historial.filter((_, i) => i !== idx))
  const agregarEvento = () => {
    const ultimo = sorted[sorted.length - 1]
    const nextTipo = ultimo?.tipo === "baja" ? "reingreso" : "baja"
    const next = [...historial, { tipo: nextTipo, fecha: peruToday() }]
    next.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""))
    onChange(next)
  }
  const limpiarHistorial = () => {
    if (confirm("¿Borrar todo el historial y volver a 'activo desde siempre'?")) {
      onChange([])
    }
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          📋 {label}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activoHoy ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-zinc-700/40 text-zinc-400 border border-zinc-600/40"}`}>
            {activoHoy ? "ACTIVO HOY" : "INACTIVO HOY"}
          </span>
        </h4>
        <div className="flex gap-2">
          {activoHoy ? (
            <button onClick={handleBaja}
              className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-all">
              📤 Dejó de trabajar hoy
            </button>
          ) : (
            <button onClick={handleReingreso}
              className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all">
              📥 Volvió a trabajar hoy
            </button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-[11px] text-zinc-500 italic">
          Sin historial — se trata como activo desde siempre. Usá el botón de arriba cuando renuncie (o edítalo abajo para cargar una fecha pasada).
        </p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((ev, i) => {
            const isBaja = ev.tipo === "baja"
            const icon = isBaja ? "✗" : "●"
            const text = isBaja ? "Dejó de trabajar el" : "Volvió a trabajar el"
            const color = isBaja ? "text-amber-400" : "text-emerald-400"
            const bg = isBaja ? "bg-amber-500/5 border-amber-500/20" : "bg-emerald-500/5 border-emerald-500/20"
            return (
              <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${bg}`}>
                <button onClick={() => toggleTipo(i)}
                  className={`font-bold ${color} w-4 hover:scale-125 transition-transform`}
                  title="Click para cambiar entre baja / reingreso">{icon}</button>
                <span className={`${color} font-medium`}>{text}</span>
                <input type="date" value={ev.fecha || ""}
                  onChange={e => updateFecha(i, e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-sky-500/60" />
                <button onClick={() => removeEvento(i)}
                  className="ml-auto text-red-400/60 hover:text-red-400 text-base transition-colors"
                  title="Eliminar este evento">×</button>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <button onClick={agregarEvento}
          className="px-3 py-1 text-[11px] text-sky-400 hover:text-sky-300 border border-sky-500/30 hover:border-sky-500/60 bg-sky-500/5 hover:bg-sky-500/10 rounded-lg transition-all font-semibold">
          + Agregar evento
        </button>
        {sorted.length > 0 && (
          <button onClick={limpiarHistorial}
            className="px-3 py-1 text-[11px] text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-500/40 rounded-lg transition-all">
            🔄 Limpiar historial (volver a activo siempre)
          </button>
        )}
      </div>
    </div>
  )
}
